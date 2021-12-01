const repositories = require("./repositories.js");
const models = require("./models.js");



async function testDatabase(db){
    const service = new repositories.Applications(db);
    await service.storeApplication(new models.Application(
        "Google Chrome",
        "desktop",
        [
            new models.Room("Tech Ed"),
            new models.Room("Computer Math Complex")
        ]
    ));
    const obj = await service.getApplicationByName("Google Chrome");
    console.log(JSON.stringify(obj));
    const list = await service.getAllApplications();
    console.log(JSON.stringify(list, null, 4));
}
exports.testDatabase = testDatabase;
