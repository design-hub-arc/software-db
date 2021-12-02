const pug = require("pug");
const {
    AbstractController,
    Route,
    REQUEST_TYPES
} = require("./controller.js");
const {License} = require("../model/models.js");



class LicenseController extends AbstractController {
    constructor(services){
        super(services, "licenses");
    }

    getRoutes(){
        return [
            new Route(REQUEST_TYPES.GET, "edit-create", this.createLicense.bind(this)),
            new Route(REQUEST_TYPES.POST, "submit-edit-create", this.handleCreateLicense.bind(this))
        ].map((route)=>{
            console.log("TODO: authentication");
            return route;
        });
    }

    async createLicense(req, res){
        const pugFunc = pug.compileFile("./views/edit-create-license.pug");
        const license = new License(new Date());
        res.send(pugFunc({
            license: license
        }));
    }

    async handleCreateLicense(req, res){
        console.log(JSON.stringify(req.body, null, 4));
        res.redirect("/");
    }
}
exports.LicenseController = LicenseController;
