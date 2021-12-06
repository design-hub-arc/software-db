const models = require("./model/models.js");
const repositories = require("./model/repositories.js");



async function testDatabase(db){
    const subjects = new repositories.Subjects(db);

    const whats = await subjects.getAllDescendantSubjects("what");
    console.table(whats);

    const whys = await subjects.getAllDescendantSubjects("why");
    console.table(whys);
}
exports.testDatabase = testDatabase;
