/*
This module handles basic CRUD (Create, Read, Update, Delete) operations on the
various entities used by the system. It implements the REPOSITORY design
pattern, where the storage and retrieval of entities is abstractified.

Exports:
    * Subjects(DatabaseConnection)
        Category and name columns are in lower case.
        * storeSubject(category, name, description)=>Promise<>
            Creates a new subject in the database. category is automatically
            converted to the proper case. Throws an error if a subject with the
            given name already exists.
        * getSubjectByName(name)=>Promise<{category, name, description}>
            Returns the subject with the given name. Throws an error if no such
            subject exists with the given name.
        * getAllSubjects()=>Promise<{category, name, description}[]>
        * addChild(parentName, childName)=>Promise<>
            Makes the first subject the parent of the second.
        * getAllDescendantSubjects(rootName)=>Promise<{category, name, description}>
            Returns each subject that is either the named subject or one of its
            descendants.

    * Rooms(DatabaseConnection)
        * storeRoom(address)=>Promise<null>
        * getAllRooms()=>Promise<{address}[]>

    * Applications(DatabaseConnection)
        * storeApplication(name, type)
            Creates a new application in the database. type is automatically
            converted to the proper case, and must be either "desktop", "web", or
            "application". Throws an error if an application with the given name
            already exists.
        * getApplicationByName(name)=>Promise<{name, type}>
        * getAllApplications()=>Promise<{name, type}[]>

    * Licenses(DatabaseConnection)
        * storeLicense(expires, accountingCode, applicationNames, tags)=>Promise<null>
            if accountingCode = undefined, uses the default 'unknown' accounting
            code. tags is an object of name: [values] pairs
        * getAllLicenses()=>Promise<{expires, accountingCode, applicationNames, tags}[]>
            tags is an object of name: [values] pairs
*/



const {escape} = require("mysql");



class Subjects {
    constructor(databaseConnection){
        this.db = databaseConnection;
    }

    storeSubject(category, name, description){
        const q = `
            INSERT INTO ${this.db.table("subject")} (category, name, description)
            VALUES (${escape(category.toLowerCase())}, ${escape(name.toLowerCase())}, ${escape(description)});
        `;
        return this.db.query(q);
    }

    async getSubjectByName(name){
        name = name.toLowerCase();
        const q = `
            SELECT category, description
            FROM ${this.db.table("subject")}
            WHERE name = ${escape(name)};
        `;
        const result = await this.db.query(q);
        return {
            name: name,
            category: result.rows[0].category,
            description: result.rows[0].description
        };
    }

    async getAllSubjects(){
        const q = `
            SELECT name, category, description
            FROM ${this.db.table("subject")};
        `;
        const result = await this.db.query(q);
        return result.rows.map(({name, category, description})=>{
            return {
                name: name,
                category: category,
                description: description
            }; // this filters out properties we don't want to expose (ID)
        });
    }

    addChild(parentName, childName){
        parentName = parentName.toLowerCase();
        childName = childName.toLowerCase();
        const q = `
            INSERT INTO ${this.db.table("subject_child")} (parent_id, child_id)
            VALUES (
                (
                    SELECT id
                    FROM ${this.db.table("subject")}
                    WHERE name = ${escape(parentName)}
                ),
                (
                    SELECT id
                    FROM ${this.db.table("subject")}
                    WHERE name = ${escape(childName)}
                )
            )
        `;
        return this.db.query(q);
    }

    async getAllDescendantSubjects(rootName){
        rootName = rootName.toLowerCase();
        /*
        UNION DISTINCT prevents infinite recursion in the case that two subjects
        are aliases for each other, and thus are each other's parent

        https://dev.mysql.com/doc/refman/8.0/en/with.html
        */
        const q = `
            WITH RECURSIVE descendants(id, category, name, description) AS (
                SELECT id, category, name, description
                FROM ${this.db.table("subject")}
                WHERE name = ${escape(rootName)}

                UNION DISTINCT

                SELECT child_id, s.category, s.name, s.description
                FROM ${this.db.table("subject_child")} AS t
                    JOIN ${this.db.table("subject")} AS s ON s.id = t.child_id
                    JOIN descendants AS d ON d.id = t.parent_id
            )
            SELECT * FROM descendants;
        `;
        const r = await this.db.query(q);
        return r.rows.map((row)=>{
            return {
                category: row.category,
                name: row.name,
                description: row.description
            };
        });
    }
}
exports.Subjects = Subjects;

class Rooms {
    constructor(databaseConnection){
        this.db = databaseConnection;
    }

    storeRoom(address){
        const q = `
            INSERT INTO ${this.db.table("room")} (address)
            VALUES (${escape(address)});
        `;
        return this.db.query(q);
    }

    async getAllRooms(){
        const q = `
            SELECT address
            FROM ${this.db.table("room")};
        `;
        const result = await this.db.query(q);
        return result.rows.map((row)=>{
            return {
                address: row.address
            };
        })
    }
}
exports.Rooms = Rooms;

class Applications {
    constructor(databaseConnection){
        this.db = databaseConnection;
    }

    storeApplication(name, type){
        type = type.toLowerCase();
        const q = `
            INSERT INTO ${this.db.table("application")} (name, type)
            VALUES (${escape(name)}, ${escape(type)});
        `;
        return this.db.query(q);
    }

    async getApplicationByName(name){
        const q = `
            SELECT name, type
            FROM ${this.db.table("application")}
            WHERE name = ${escape(name)};
        `;
        const r = await this.db.query(q);
        return {
            name: r.rows[0].name,
            type: r.rows[0].type
        };
    }

    async getAllApplications(){
        const q = `
            SELECT name, type
            FROM ${this.db.table("application")};
        `;
        const r = await this.db.query(q);
        return r.rows.map(({name, type})=>{
           return {
               name: name,
               type: type
           };
        });
    }
}
exports.Applications = Applications;

class Licenses {
    constructor(databaseConnection){
        this.db = databaseConnection;
    }

    async storeLicense(expires, accountingCode, applicationNames, tags){
        if(applicationNames.length === 0){
            throw new Error("license must contain at least 1 application");
        }
        const licenseQ = (accountingCode == undefined) ?
            `
                INSERT INTO ${this.db.table("license")} (expires)
                VALUES (${escape(expires)});
            `
            :
            `
                INSERT INTO ${this.db.table("license")} (expires, accounting_code)
                VALUES (${escape(expires)}, ${escape(accountingCode)});
            `
        ; // exclude accountingCode if undefined
        const result = await this.db.query(licenseQ);
        const licenseId = result.rows.insertId;

        const bridgeQs = applicationNames.map((name)=>`
            INSERT INTO ${this.db.table("license_application")} (license_id, application_id)
            VALUES (
                ${escape(licenseId)},
                (
                    SELECT id
                    FROM ${this.db.table("application")}
                    WHERE name = ${escape(name)}
                )
            );
        `);
        await Promise.all(bridgeQs.map((q)=>this.db.query(q)));


        // insert tags
        const tagQs = [];
        Object.entries(tags).forEach(([subject, values])=>{
            values.forEach((value)=>{
                tagQs.push(`
                    INSERT INTO ${this.db.table("license_subject")} (
                        license_id,
                        subject_id,
                        value
                    ) VALUES (
                        ${escape(licenseId)},
                        (
                            SELECT id
                            FROM ${this.db.table("subject")}
                            WHERE name = ${escape(subject)}
                        ),
                        ${escape(value)}
                    );
                `);
            });
        });
        await Promise.all(tagQs.map((q)=>this.db.query(q)));
    }

    async getAllLicenses(){
        // get the single-value fields
        const nonArrayPartsQ = `
            SELECT id, expires, accounting_code
            FROM ${this.db.table("license")};
        `;
        const allNonArrayPartsResult = await this.db.query(nonArrayPartsQ);

        const licenses = new Map();
        allNonArrayPartsResult.rows.forEach((row)=>{
            licenses.set(row.id, {
                expires: row.expires,
                accountingCode: row.accounting_code,
                applicationNames: [],
                tags: {

                }
            });
        });

        // get application names
        const applicationsQ = `
            SELECT license_id, a.name AS application_name
            FROM ${this.db.table("license_application")} AS la
                JOIN ${this.db.table("application")} AS a
                ON la.application_id = a.id
            ;
        `;
        const applicationResult = await this.db.query(applicationsQ);
        applicationResult.rows.forEach((row)=>{
            licenses.get(row.license_id).applicationNames.push(row.application_name);
        });

        // get tags
        const tagsQ = `
            SELECT license_id, s.name AS subject_name, value
            FROM ${this.db.table("license_subject")} AS ls
                JOIN ${this.db.table("subject")} AS s
                ON ls.subject_id = s.id
            ;
        `;
        const tagResult = await this.db.query(tagsQ);
        let tags;
        tagResult.rows.forEach((row)=>{
            tags = licenses.get(row.license_id).tags;
            if(!tags[row.subject_name]){
                tags[row.subject_name] = [];
            }
            tags[row.subject_name].push(row.value);
        });

        return Array.from(licenses.values());
    }
}
exports.Licenses = Licenses;
