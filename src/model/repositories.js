/*
This module handles basic CRUD (Create, Read, Update, Delete) operations on the
various entities used by the system. It implements the REPOSITORY design
pattern, where the storage and retrieval of entities is abstractified.

Exports:
    * Subjects(DatabaseConnection)
         name column is in lower case.
        * storeSubject(Subject)=>Promise<>
            Creates a new subject in the database. Throws an error if a subject
            with the given name already exists or if any of its parents do not
            exist.
        * getSubjectByName(name)=>Promise<Subject>
            Returns the subject with the given name. Throws an error if no such
            subject exists with the given name.
        * getAllSubjects()=>Promise<Subject[]>
        * addChild(parentName, childName)=>Promise<>
            Makes the first subject the parent of the second.
        * getAllDescendantSubjects(rootName)=>Promise<Subject[]>

    * Rooms(DatabaseConnection)
        * storeRoom(Room)=>Promise<null>
        * getRoomByAddress(address)=>Promise<Room>
        * getAllRooms()=>Promise<Room[]>

    * Applications(DatabaseConnection, Rooms)
        Rooms parameter is optional.
        * storeApplication(Application)
            Creates a new application in the database. Throws an error if an
            application with the given name already exists.
        * addApplicationToRoom(applicationName, roomAddress)=>Promise<null>
        * getApplicationByName(name)=>Promise<Application>
        * getAllApplications()=>Promise<Application[]>
        * getAllApplicationNames()=>Promise<String[]>

    * Licenses(DatabaseConnection, Applications, Subjects)
        Applications and Subjects are optional.
        * storeLicense(License)=>Promise<null>
        * addApplicationToLicense(applicationName, licenseId)=>Promise<null>
        * getAllLicenses()=>Promise<License[]>
*/



const {escape} = require("mysql");
const {
    Subject,
    Room,
    Application,
    License
} = require("./models.js");



class Subjects {
    constructor(databaseConnection){
        this.db = databaseConnection;
    }

    async storeSubject(subject){
        const q = `
            INSERT INTO ${this.db.table("subject")} (name, description)
            VALUES (${escape(subject.name)}, ${escape(subject.description)});
        `;
        await this.db.query(q);

        await Promise.all(subject.parents.map((parent)=>{
            return this.addChild(parent, subject.name);
        }));
    }

    async getSubjectByName(name){
        name = name.toLowerCase();
        const singleValuesQ = `
            SELECT description
            FROM ${this.db.table("subject")}
            WHERE name = ${escape(name)};
        `;
        const singleValuesResult = await this.db.query(singleValuesQ);

        const multiValuesQ = `
            WITH RECURSIVE parents(id, name) AS (
                SELECT id, name
                FROM ${this.db.table("subject")}
                WHERE name = ${escape(name)}

                UNION DISTINCT

                SELECT parent_id, s.name
                FROM ${this.db.table("subject")} AS s
                    JOIN ${this.db.table("subject_child")} AS c
                    ON s.id = c.parent_id
                    JOIN parents AS p
                    ON p.id = c.child_id
            )
            SELECT DISTINCT(name) AS name FROM parents;
        `;
        const multiValuesResult = await this.db.query(multiValuesQ);

        return new Subject(
            name,
            singleValuesResult.rows[0].description,
            multiValuesResult.rows.map((row)=>row.name)
        );
    }

    async getAllSubjects(){
        const q = `
            SELECT name
            FROM ${this.db.table("subject")};
        `;
        const result = await this.db.query(q);
        return await Promise.all(result.rows.map(({name})=>{
            return this.getSubjectByName(name);
        }));
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
            WITH RECURSIVE descendants(id, name) AS (
                SELECT id, name
                FROM ${this.db.table("subject")}
                WHERE name = ${escape(rootName)}

                UNION DISTINCT

                SELECT child_id, s.name
                FROM ${this.db.table("subject_child")} AS t
                    JOIN ${this.db.table("subject")} AS s ON s.id = t.child_id
                    JOIN descendants AS d ON d.id = t.parent_id
            )
            SELECT * FROM descendants;
        `;
        const r = await this.db.query(q);
        return await Promise.all(r.rows.map(({name})=>{
            return this.getSubjectByName(name);
        }));
    }
}
exports.Subjects = Subjects;

class Rooms {
    constructor(databaseConnection){
        this.db = databaseConnection;
    }

    storeRoom(room){
        const q = `
            INSERT INTO ${this.db.table("room")} (address)
            VALUES (${escape(room.address)});
        `;
        return this.db.query(q);
    }

    async getRoomByAddress(address){
        const q = `
            SELECT address
            FROM ${this.db.table("room")}
            WHERE address = ${escape(address)};
        `;
        const r = await this.db.query(q);
        return new Room(r.rows[0].address); // supposed to throw error if none for that address
    }

    async getAllRooms(){
        const q = `
            SELECT address
            FROM ${this.db.table("room")};
        `;
        const result = await this.db.query(q);
        return result.rows.map((row)=>new Room(row.address));
    }
}
exports.Rooms = Rooms;

class Applications {
    constructor(databaseConnection, rooms = undefined){
        this.db = databaseConnection;
        this.rooms = (rooms == undefined) ? new Rooms(databaseConnection) : rooms;
    }

    async storeApplication(application){
        const q = `
            INSERT INTO ${this.db.table("application")} (name, type)
            VALUES (${escape(application.name)}, ${escape(application.type)});
        `;
        const r = await this.db.query(q);
        await Promise.all(application.rooms.map((room)=>this.addApplicationToRoom(
            application.name,
            room.address
        )));
    }

    addApplicationToRoom(applicationName, roomAddress){
        const q = `
            INSERT INTO ${this.db.table("application_room")} (application_id, room_id)
            VALUES (
                (
                    SELECT id
                    FROM ${this.db.table("application")}
                    WHERE name = ${escape(applicationName)}
                ),
                (
                    SELECT id
                    FROM ${this.db.table("room")}
                    WHERE address = ${escape(roomAddress)}
                )
            );
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

        const getRoomsQ = `
            SELECT address
            FROM ${this.db.table("room")}
            WHERE id IN (
                SELECT room_id
                FROM ${this.db.table("application_room")}
                WHERE application_id IN (
                    SELECT id
                    FROM ${this.db.table("application")}
                    WHERE name = ${escape(name)}
                )
            );
        `;
        const roomNames = await this.db.query(getRoomsQ);
        const rooms = await Promise.all(roomNames.rows.map(({address})=>{
            return this.rooms.getRoomByAddress(address);
        }));
        return new Application(r.rows[0].name, r.rows[0].type, rooms);
    }

    async getAllApplications(){
        const names = await this.getAllApplicationNames();
        return await Promise.all(names.map((name)=>this.getApplicationByName(name)));
    }

    async getAllApplicationNames(){
        const q = `
            SELECT name
            FROM ${this.db.table("application")};
        `;
        const r = await this.db.query(q);
        return r.rows.map(({name})=>name);
    }
}
exports.Applications = Applications;

class Licenses {
    constructor(databaseConnection, applications=undefined, subjects=undefined){
        this.db = databaseConnection;
        this.applications = (applications == undefined)
            ? new Applications(databaseConnection)
            : applications;
        this.subjects = (subjects == undefined)
            ? new Subjects(databaseConnection)
            : subjects;
    }

    async storeLicense(license){
        if(license.applications.length === 0){
            throw new Error("license must contain at least 1 application");
        }
        const licenseQ = (license.accountingCode == undefined) ?
            `
                INSERT INTO ${this.db.table("license")} (expires)
                VALUES (${escape(license.expires)});
            `
            :
            `
                INSERT INTO ${this.db.table("license")} (expires, accounting_code)
                VALUES (${escape(license.expires)}, ${escape(license.accountingCode)});
            `
        ; // excludes accountingCode if undefined
        const result = await this.db.query(licenseQ);
        const licenseId = result.rows.insertId;

        const bridgeQs = license.applications.map(({name})=>`
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
        Object.entries(license.tags).forEach(([name, subject])=>{
            subject.values.forEach((value)=>{
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
                            WHERE name = ${escape(name)}
                        ),
                        ${escape(value)}
                    );
                `);
            });
        });
        await Promise.all(tagQs.map((q)=>this.db.query(q)));
    }

    addApplicationToLicense(applicationName, licenseId){
        const q = `
            INSERT INTO ${this.db.table("license_application")} (license_id, application_id)
            VALUES (${escape(licenseId)}, (
                SELECT id
                FROM ${this.db.table("application")}
                WHERE name = ${escape(applicationName)}
            ));
        `;
        return this.db.query(q);
    }

    async getAllLicenses(){
        // get the single-value fields
        const nonArrayPartsQ = `
            SELECT id, expires, accounting_code
            FROM ${this.db.table("license")};
        `;
        const allNonArrayPartsResult = await this.db.query(nonArrayPartsQ);

        const licenses = new Map();
        let license;
        allNonArrayPartsResult.rows.forEach((row)=>{
            if(!licenses.has(row.id)){
                license = new License(row.expires, [], {}, row.accounting_code);
                license.id = row.id;
                licenses.set(row.id, license);
            }
        });

        // get applications
        const applicationsQ = `
            SELECT license_id, a.name AS application_name
            FROM ${this.db.table("license_application")} AS la
                JOIN ${this.db.table("application")} AS a
                ON la.application_id = a.id
            ;
        `;
        const applicationResult = await this.db.query(applicationsQ);
        await Promise.all(applicationResult.rows.map(async (row)=>{
            licenses.get(row.license_id).applications.push(
                await this.applications.getApplicationByName(row.application_name)
            );
        }));

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
        // must do these two loops seperately
        for(let row of tagResult.rows){
            tags = licenses.get(row.license_id).tags;
            if(!tags[row.subject_name]){
                tags[row.subject_name] = await this.subjects.getSubjectByName(row.subject_name);
                tags[row.subject_name].values = [];
            }
        }
        tagResult.rows.map((row)=>{
            tags = licenses.get(row.license_id).tags;
            tags[row.subject_name].values.push(row.value);
        });

        return Array.from(licenses.values());
    }
}
exports.Licenses = Licenses;
