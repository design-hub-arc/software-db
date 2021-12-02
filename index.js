
/*
Dependencies
*/
const express = require("express");
const session = require("express-session");
const mysqlSession = require("express-mysql-session");
const mysql = require("mysql");
const bodyParser = require("body-parser");

const {mysqlOptions, get} = require("./src/config.js");
const repositories = require("./src/repositories.js");
const {IndexController} = require("./src/controllers/indexController.js");
const {LicenseController} = require("./src/controllers/licenseController.js");
const {
    extractMySqlConfig,
    DatabaseConnection,
    createRequiredTablesIn
} = require("./src/database.js");
const {testDatabase} = require("./src/test.js");



const app = express();
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.json());

const MySQLStore = mysqlSession(session);
app.use(session({
    secret: "get a better secret!", // TODO: read from config file
    resave: false, // only save when cookies change
    saveUninitialized: false, // don't save cookies with no data,
    store: new MySQLStore(extractMySqlConfig(mysqlOptions)),
    cookie: {
        path: "/",
        secure: get("isProduction"), // needs to be false for localhost, true for production
        maxAge: 1000 * 60 * 60 // keep cookie for 1 hour
    }
}));



const db = new DatabaseConnection(get("dbPrefix"), mysqlOptions);
createRequiredTablesIn(db); //todo only run when cmd line flag is passed
//testDatabase(db);

const licenses = new repositories.Licenses(db);
const services = {
    licenses: licenses
};



new IndexController(services).applyTo(app);
new LicenseController(services).applyTo(app);



const server = app.listen(get("port"), ()=>{
    console.log(`Software DB started on http://localhost:${get("port")}`);
});

process.on("SIGTERM", ()=>{
    server.close(()=>{
        console.log("server closed");
    });
    db.end(()=>{
        console.log("database connection closed");
    });
    // do I need to close the sessionStore?
});
