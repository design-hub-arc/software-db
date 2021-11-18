


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
