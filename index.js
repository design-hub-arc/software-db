
/*
Dependencies
*/
const express = require("express");
const session = require("express-session");
const mysqlSession = require("express-mysql-session");
const mysql = require("mysql");
const bodyParser = require("body-parser");

const {mysqlOptions, get} = require("./src/config.js");
const {createServices} = require("./src/model/export.js");
const {registerControllers} = require("./src/controllers/export.js");
const {parseCommandLineArguments} = require("./src/commandLine.js");
const {
    extractMySqlConfig,
    DatabaseConnection
} = require("./src/model/database.js");



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
const services = createServices(db);

parseCommandLineArguments(db).then(()=>{
    registerControllers(app, services);

    // todo: add host option to config
    const server = app.listen(get("port"), "localhost", ()=>{
        console.log(`Software DB started on http://${server.address().address}:${server.address().port}`);
    });

    process.on("SIGTERM", ()=>{
        server.close(()=>console.log("server closed"));
        db.end(()=>console.log("database connection closed"));
        // do I need to close the sessionStore?
    });
});
