
/*
Dependencies
*/
const express = require("express");
const session = require("express-session");
const mysqlSession = require("express-mysql-session");
const mysql = require("mysql");

const {mysqlOptions, get} = require("./src/config.js");
const {extractMySqlConfig, DatabaseConnection} = require("./src/database.js");



const app = express();
app.use(express.static("public"));

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

const db = new DatabaseConnection(mysqlOptions);

app.get("/", (req, res)=>{
    if(!req.session.count){
        req.session.count = 0;
    }
    ++req.session.count;
    res.send(`This works! ${req.session.count}`);
});

app.get("/logout", (req, res)=>{
   req.session.destroy((error)=>{
       console.error("Failed to destroy session");
       console.error(error);
   });
});



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
