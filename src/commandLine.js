/*
This is a basic command line argument parser. Future versions will want to use a
real CLI library as the program grows more complicated.
*/



const {createRequiredTablesIn} = require("./model/database.js");



async function parseCommandLineArguments(databaseConnection){
    const args = process.argv;

    if(args.includes("-d")){
        await createRequiredTablesIn(databaseConnection);
    }
}
exports.parseCommandLineArguments = parseCommandLineArguments;
