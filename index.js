
/*
Dependencies
*/
const express = require("express");



const PORT = 3000; // TODO: read from config file



const app = express();
app.use(express.static("public"));
app.get("/", (req, res)=>{
    res.send("This works!");
});



app.listen(PORT, ()=>{
    console.log(`Software DB started on http://localhost:${PORT}`);
});
