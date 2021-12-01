const repositories = require("./repositories.js");
const models = require("./models.js");



async function testDatabase(db){
    const service = new repositories.Licenses(db);
    await service.addApplicationToLicense("Google Chrome", 14);
    const list = await service.getAllLicenses();
    console.log(JSON.stringify(list, null, 4));
}
exports.testDatabase = testDatabase;
