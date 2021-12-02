/*
This file contains all the public exports from this folder, except for
models.js, which licenseController.js needs for now.

In the future, this should provide more intelligent services than just these
repositories, functions that can handle form responses or data requests
*/



const {
    Subjects,
    Rooms,
    Applications,
    Licenses
} = require("./repositories.js");



function createServices(databaseConnection){
    const services = {};
    services.subjects = new Subjects(databaseConnection);
    services.rooms = new Rooms(databaseConnection);
    services.applications = new Applications(databaseConnection, services.rooms);
    services.licenses = new Licenses(databaseConnection, services.applications, services.subjects);
    return services;
}
exports.createServices = createServices;
