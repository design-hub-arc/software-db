const repositories = require("./repositories.js");



async function testDatabase(db){
    const service = new repositories.Licenses(db);
    const licenses = await service.getAllLicenses();
    console.log(JSON.stringify(licenses, null, 4));
}
exports.testDatabase = testDatabase;
