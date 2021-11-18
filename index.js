
/*
Dependencies
*/
const express = require("express");
const session = require("express-session");



const PORT = 3000; // TODO: read from config file



const app = express();
app.use(express.static("public"));
app.use(session({
    secret: "get a better secret!", // TODO: read from config file
    resave: false, // only save when cookies change
    saveUninitialized: false, // don't save cookies with no data
    cookie: {
        path: "/",
        secure: !true, // TODO: needs to be false for localhost, true for production
        maxAge: 1000 * 60 * 60 // keep cookie for 1 hour
    }
}));



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



app.listen(PORT, ()=>{
    console.log(`Software DB started on http://localhost:${PORT}`);
});
