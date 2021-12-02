/*
This file provides all the public exports this folder should provide: You need
not worry yourself over importing the other files from outside this package!
*/



const {IndexController} = require("./indexController.js");
const {LicenseController} = require("./licenseController.js");



function registerControllers(expressApp, services){
    new IndexController(services).applyTo(expressApp);
    new LicenseController(services).applyTo(expressApp);
}
exports.registerControllers = registerControllers;
