/*
This module handles all of the database interface configuration

About Table Prefixes:
    Since Design Hub interns have limited priviledges on the ARC Power Server,
    they usually cannot create new databases in its MySQL server. Still, we need
    some way of distinguishing between the tables of one project and those of
    another. To resolve this issue, projects such as this one use TABLE
    PREFIXING to logically partition tables within the database. For example,
    suppose two projects, A and B, both want a table named "user". Table
    prefixing is where we do this:

        a_user
        b_user

    In this instance, "a_" and "b_" are the table prefixes, whereas "user" is
    the table name. The DatabaseConnection class has a built-in method for
    proving these fully-qualified table names:

        const projectA = new DatabaseConnection("a_", {...});
        const projectB = new DatabaseConnection("b_", {...});
        console.log(projectA.table("user")); // a_user
        console.log(projectB.table("user")); // b_user



Exports:
    * extractMySqlConfig(object)
        returns an object containing the subset of useful mysql configuration
        attributes in the input

    * DatabaseConnection(tablePrefix, config)
        * query(q)=>Promise<{rows, fields}>
        * table(name)=>String
            * returns the prefixed name of the table in this DB with the given
              base name.

    * setupDatabase(db)=>Promise<null>
        ensures the database schema and data is as the program requires
*/



const mysql = require("mysql");



/*
Filters the properties of obj such that it only includes mysql configuration
properties.
*/
function extractMySqlConfig(obj){
    return {
        host: obj.host,
        user: obj.user,
        password: obj.password,
        database: obj.database
    };
}
exports.extractMySqlConfig = extractMySqlConfig;



/*
An Adapter for converting the callback-based mysql module to a Promise
*/
class DatabaseConnection {
    constructor(databasePrefix, config){
        this.prefix = databasePrefix;
        this.databaseName = config.database; // used later
        // can use mysql.createPool with connectionLimit in config to allow multithreading
        this.connection = mysql.createConnection(extractMySqlConfig(config));
    }

    table(name){
        return `${this.prefix}${name}`;
    }

    query(q){
        return new Promise((resolve, reject)=>{
            this.connection.query(q, (error, rows, fields)=>{
                if(error){
                    reject(error);
                } else {
                    resolve({
                        rows: rows,
                        fields: fields
                    });
                }
            });
        });
    }
}
exports.DatabaseConnection = DatabaseConnection;



class Table {
    /*
    creationQuery is a function that accepts a prefix and complete table name,
    then outputs the table-level definition of this. See REQUIRED_TABLES for
    examples.
    */
    constructor(name, creationQuery, indexedColumns = []){
        this.name = name;
        this.creationQuery = creationQuery;
        this.indexedColumns = indexedColumns;
    }

    async isCreatedIn(db){
        const q = `
            SELECT COUNT(*) AS count
            FROM information_schema.tables
            WHERE table_schema = ${mysql.escape(db.databaseName)}
              AND table_name = ${mysql.escape(db.table(this.name))};
        `;
        const result = await db.query(q);
        return result.rows[0].count !== 0;
    }

    async createIn(db){
        const fullName = db.table(this.name);
        console.log(`creating table ${fullName}`);
        const q = `
            CREATE TABLE ${fullName} (
                ${this.creationQuery(db.prefix, db.table(this.name))}
            );
        `;
        await db.query(q);
    }

    async createIfNotIn(db){
        if(!(await this.isCreatedIn(db))){
            await this.createIn(db);
        }
    }

    async createIndexes(db){
        const fullName = db.table(this.name);
        let idxName;
        let result;
        for(let column of this.indexedColumns){
            // TODO: make sure this isn't too long
            //                                               parens around stuff
            idxName = `${fullName}_${column.replace(/\(.*\)/g, "")}_idx`;
            result = await db.query(`
                SELECT COUNT(*) AS count
                FROM information_schema.statistics
                WHERE index_name = ${mysql.escape(idxName)}
                  AND table_name = ${mysql.escape(fullName)}
                  AND table_schema = ${mysql.escape(db.databaseName)};
            `);
            if(result.rows[0].count === 0){
                console.log(`creating index ${idxName}`);
                await db.query(`
                    CREATE INDEX ${idxName} ON ${fullName} (${column});
                `);
            } else {
                //console.log(`${idxName} exists`);
            }
        }
    }
}

const REQUIRED_TABLES = [
    new Table("subject", (pre, name)=>`
        id int PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(20) NOT NULL,
        description VARCHAR(255) NOT NULL DEFAULT '',

        CONSTRAINT ${name}_name_uk UNIQUE(name)
    `, ["name"]),

    new Table("subject_child", (pre, name)=>`
        id int PRIMARY KEY AUTO_INCREMENT,
        parent_id int NOT NULL,
        child_id int NOT NULL,

        CONSTRAINT ${name}_parent_id_child_id_uk UNIQUE (parent_id, child_id),
        CONSTRAINT ${name}_parent_id_child_id_ck CHECK (parent_id != child_id),
        CONSTRAINT ${name}_parent_id_fk FOREIGN KEY (parent_id) REFERENCES ${pre}subject (id) ON DELETE CASCADE,
        CONSTRAINT ${name}_child_id_fk FOREIGN KEY (child_id) REFERENCES ${pre}subject (id) ON DELETE CASCADE
    `, ["parent_id", "child_id"]),

    new Table("application", (pre, name)=>`
        id int PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(128) NOT NULL,
        type VARCHAR(12) NOT NULL,

        CONSTRAINT ${name}_name_uk UNIQUE (name),
        CONSTRAINT ${name}_type_ck CHECK (type IN (
            'application', 'desktop', 'web'
        ))
    `),

    new Table("license", (pre, name)=>`
        id int PRIMARY KEY AUTO_INCREMENT,
        expires DATE NOT NULL,
        accounting_code VARCHAR(32) NOT NULL DEFAULT 'UNKNOWN'
    `, ["expires"]),

    new Table("license_application", (pre, name)=>`
        id int PRIMARY KEY AUTO_INCREMENT,
        license_id int NOT NULL,
        application_id int NOT NULL,

        CONSTRAINT ${name}_license_id_application_id_uk UNIQUE(license_id, application_id),
        CONSTRAINT ${name}_license_id_fk FOREIGN KEY (license_id) REFERENCES ${pre}license (id) ON DELETE CASCADE,
        CONSTRAINT ${name}_application_id_fk FOREIGN KEY (application_id) REFERENCES ${pre}application (id) ON DELETE CASCADE
    `, ["license_id", "application_id"]),

    new Table("license_subject", (pre, name)=>`
        id int PRIMARY KEY AUTO_INCREMENT,
        license_id int NOT NULL,
        subject_id int NOT NULL,
        value VARCHAR(256) NOT NULL,

        CONSTRAINT ${name}_uk UNIQUE (license_id, subject_id, value),
        CONSTRAINT ${name}_license_id_fk FOREIGN KEY (license_id) REFERENCES ${pre}license (id) ON DELETE CASCADE,
        CONSTRAINT ${name}_subject_id_fk FOREIGN KEY (subject_id) REFERENCES ${pre}subject (id) ON DELETE CASCADE
    `, ["license_id", "subject_id"]),

    new Table("room", (pre, name)=>`
        id int PRIMARY KEY AUTO_INCREMENT,
        address VARCHAR(256) NOT NULL,

        CONSTRAINT ${name}_address_uk UNIQUE (address)
    `),

    new Table("application_room", (pre, name)=>`
        id int PRIMARY KEY AUTO_INCREMENT,
        application_id int NOT NULL,
        room_id int NOT NULL,

        CONSTRAINT ${name}_uk UNIQUE(application_id, room_id),
        CONSTRAINT ${name}_application_id_fk FOREIGN KEY (application_id) REFERENCES ${pre}application (id),
        CONSTRAINT ${name}_room_id_fk FOREIGN KEY (room_id) REFERENCES ${pre}room (id)
    `, ["application_id", "room_id"])
];

async function createRequiredTablesIn(db){
    for(let table of REQUIRED_TABLES){
        await table.createIfNotIn(db);
        await table.createIndexes(db);
    }
}

async function createRequiredDataIn(db){
    // create base categories if they do not exist
    const subjectQ = `
        INSERT IGNORE INTO ${db.table("subject")} (name, description)
        VALUES
            ('who', 'a person'),
            ('what', 'a thing'),
            ('when', 'a time'),
            ('where', 'a place'),
            ('why', 'a purpose')
        ;
    `;
    await db.query(subjectQ);
}

async function setupDatabase(db){
    await createRequiredTablesIn(db);
    await createRequiredDataIn(db);
}
exports.setupDatabase = setupDatabase;
