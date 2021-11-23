/*
This module handles all of the database interface configuration

Exports:
    extractMySqlConfig(object)
        returns an object containing the subset of useful mysql configuration
        attributes in the input

    DatabaseConnection(config)
        query(q)=>Promise<{rows, fields}>

    createRequiredTablesIn(db, prefix)=>Promise<null>
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
    constructor(config){
        this.databaseName = config.database; // used later
        // can use mysql.createPool with connectionLimit in config to allow multithreading
        this.connection = mysql.createConnection(extractMySqlConfig(config));
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

    async isCreatedIn(db, prefix){
        const fullName = mysql.escape(`${prefix}${this.name}`);
        const q = `
            SELECT COUNT(*) AS count
            FROM information_schema.tables
            WHERE table_schema = ${mysql.escape(db.databaseName)}
              AND table_name = ${fullName};
        `;
        const result = await db.query(q);
        return result.rows[0].count !== 0;
    }

    async createIn(db, prefix){
        await db.query(this.creationQuery(`${prefix}${this.name}`));
    }

    async createIfNotIn(db, prefix){
        if(!(await this.isCreatedIn(db, prefix))){
            await this.createIn(db, prefix);
        }
    }

    async createIndexes(db, prefix){
        const fullName = `${prefix}${this.name}`;
        let idxName;
        let result;
        for(let column of this.indexedColumns){
            // TODO: make sure this isn't too long
            //                                               parens around stuff
            idxName = `${prefix}${this.name}_${column.replace(/\(.*\)/g, "")}_idx`;
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
    new Table("test", (name)=>`
        CREATE TABLE ${name} (
            id  int         PRIMARY KEY AUTO_INCREMENT,
            msg VARCHAR(20) NOT NULL,
            num int NOT NULL
        );
    `, ["msg(10)", "num"])
];

async function createRequiredTablesIn(db, prefix){
    for(let table of REQUIRED_TABLES){
        await table.createIfNotIn(db, prefix);
        await table.createIndexes(db, prefix);
    }
}
exports.createRequiredTablesIn = createRequiredTablesIn;
