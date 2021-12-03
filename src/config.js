/*
Use this module to read the contents of config.json.

Note that this module is only loaded once, regardless of how many times you use
a require statement for it. Therefore, you needn't worry about reparsing the
JSON file multiple times.

https://stackoverflow.com/questions/8958097/is-there-a-way-to-require-a-js-file-only-once-in-nodejs
*/


const fs = require("fs");



const config = JSON.parse(fs.readFileSync("./config/config.json", "utf8"));

function get(property, defaultValue=undefined){
    if(defaultValue != undefined && !(property in config)){
        throw new Error(`config.json does not contain property "${property}"`);
    }
    return (property in config) ? config[property] : defaultValue;
}
exports.get = get;


const mysqlContent = fs.readFileSync("./config/mysql.json", "utf8");
const mysqlOptions = JSON.parse(mysqlContent);
exports.mysqlOptions = mysqlOptions;



console.log("loaded config.js");
