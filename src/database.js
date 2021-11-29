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

    * createRequiredTablesIn(db)=>Promise<null>
        creates all tables this program requires in the given database. Does not
        create tables that already exist.
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
    creationQuery is a function that accepts a table name and outputs a query to
    generate this table.
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
        await db.query(this.creationQuery(db.prefix, db.table(this.name)));
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
            idxName = `${db.prefix}${this.name}_${column.replace(/\(.*\)/g, "")}_idx`;
            result = await db.query(`
                SELECT COUNT(*) AS count
                FROM information_schema.statistics
                WHERE index_name = ${mysql.escape(idxName)}
                  AND table_name = ${mysql.escape(fullName)}
                  AND table_schema = ${mysql.escape(db.databaseName)};
            `);
            if(result.rows[0].count === 0){
                await db.query(`
                    CREATE INDEX ${idxName} ON ${fullName} (${column});
                `);
            } else {
                console.log(`${idxName} exists`);
            }
        }
    }
}

const REQUIRED_TABLES = [
    new Table("test", (pre, name)=>`
        CREATE TABLE ${name} (
            id  int PRIMARY KEY AUTO_INCREMENT,
            msg VARCHAR(20) NOT NULL,
            num int NOT NULL
        );
    `, ["msg(10)", "num"]),

    new Table("subject", (pre, name)=>`
        CREATE TABLE ${name} (
            id int PRIMARY KEY AUTO_INCREMENT,
            category VARCHAR(5) NOT NULL,
            name VARCHAR(20) NOT NULL,
            description VARCHAR(255) NOT NULL DEFAULT '',

            CONSTRAINT ${name}_category_ck CHECK (category IN ('who', 'what', 'when', 'where', 'why')),
            CONSTRAINT ${name}_name_uk UNIQUE(name)
        );
    `, ["name"]),

    new Table("subject_child", (pre, name)=>`
        CREATE TABLE ${name} (
            id int PRIMARY KEY AUTO_INCREMENT,
            parent_id int NOT NULL,
            child_id int NOT NULL,

            CONSTRAINT ${name}_parent_id_child_id_uk UNIQUE (parent_id, child_id),
            CONSTRAINT ${name}_parent_id_child_id_ck CHECK (parent_id != child_id),
            CONSTRAINT ${name}_parent_id_fk FOREIGN KEY (parent_id) REFERENCES ${pre}subject (id) ON DELETE CASCADE,
            CONSTRAINT ${name}_child_id_fk FOREIGN KEY (child_id) REFERENCES ${pre}subject (id) ON DELETE CASCADE
        );
    `, ["parent_id", "child_id"]),

    new Table("application", (pre, name)=>`
        CREATE TABLE ${name} (
            id int PRIMARY KEY AUTO_INCREMENT,
            name VARCHAR(128) NOT NULL,
            type VARCHAR(12) NOT NULL,

            CONSTRAINT ${name}_name_uk UNIQUE (name),
            CONSTRAINT ${name}_type_ck CHECK (type IN (
                'application', 'desktop', 'web'
            ))
        );
    `),

    new Table("license", (pre, name)=>`
        CREATE TABLE ${name} (
            id int PRIMARY KEY AUTO_INCREMENT,
            expires DATE NOT NULL,
            accounting_code VARCHAR(32) NOT NULL DEFAULT 'UNKNOWN'
        );
    `, ["expires"])
];

async function createRequiredTablesIn(db){
    for(let table of REQUIRED_TABLES){
        await table.createIfNotIn(db);
        await table.createIndexes(db);
    }
}
exports.createRequiredTablesIn = createRequiredTablesIn;
