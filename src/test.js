const repositories = require("./repositories.js");
const models = require("./models.js");



async function testDatabase(db){
    const service = new repositories.Subjects(db);
    const subjects = await service.getAllSubjects();
    console.log(JSON.stringify(subjects, null, 4));
}
exports.testDatabase = testDatabase;
