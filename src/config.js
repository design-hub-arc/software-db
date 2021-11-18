


const fs = require("fs");



const mysqlContent = fs.readFileSync("./config/mysql.json", "utf8");
const mysqlOptions = JSON.parse(mysqlContent);
exports.mysqlOptions = mysqlOptions;



console.log("loaded config.js");
