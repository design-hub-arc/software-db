const repositories = require("./repositories.js");



async function testDatabase(db){
    const service = new repositories.Rooms(db);
    await service.storeRoom("Tech Ed");
    await service.storeRoom("Computer Math Complex");
    await service.storeRoom("Internet");
    const rooms = await service.getAllRooms();
    console.log(JSON.stringify(rooms, null, 4));
}
exports.testDatabase = testDatabase;
