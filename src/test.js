const repositories = require("./repositories.js");



async function testDatabase(db){
    const service = new repositories.Rooms(db);
    const rooms = await service.getAllRooms();
    console.log(JSON.stringify(rooms, null, 4));
}
exports.testDatabase = testDatabase;
