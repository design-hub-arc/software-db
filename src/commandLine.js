/*
This is a basic command line argument parser. Future versions will want to use a
real CLI library as the program grows more complicated.
*/



const {createRequiredTablesIn} = require("./model/database.js");
const {testDatabase} = require("./test.js");



async function parseCommandLineArguments(databaseConnection){
    const args = process.argv;

    if(args.includes("-h")){
        console.log(`
            Options:
            * -h : display this help message
            * -d : create database schema
            * -t : run tests
        `);
    }
    if(args.includes("-d")){
        await createRequiredTablesIn(databaseConnection);
    }
    if(args.includes("-t")){
        await testDatabase(databaseConnection);
    }
}
exports.parseCommandLineArguments = parseCommandLineArguments;
