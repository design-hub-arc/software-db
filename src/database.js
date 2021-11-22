/*
This module handles all of the database interface configuration
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
