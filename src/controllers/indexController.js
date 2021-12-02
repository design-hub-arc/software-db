/*
This module contains all the routes all users can access - no authentication
required.
*/



const pug = require("pug");
const {
    AbstractController,
    Route,
    REQUEST_TYPES
} = require("./controller.js");



class IndexController extends AbstractController {
    constructor(services){
        super(services);
    }

    getRoutes(){
        return [
            new Route(REQUEST_TYPES.GET, "", this.index.bind(this)),
            new Route(REQUEST_TYPES.GET, "table", this.table.bind(this)),
            new Route(REQUEST_TYPES.GET, "logout", this.logout.bind(this))
        ];
    }

    index(req, res){
        if(!req.session.count){
            req.session.count = 0;
        }
        ++req.session.count;

        const pugFunc = pug.compileFile("./views/index.pug");

        res.send(pugFunc({
            name: `Test run #${req.session.count}`
        }));
    }

    async table(req, res){
        const pugFunc = pug.compileFile("./views/table.pug");
        res.send(pugFunc({
            licenses: await this.services.licenses.getAllLicenses()
        }));
    }

    logout(req, res){
        req.session.destroy((error)=>{
            console.error("Failed to destroy session");
            console.error(error);
        });
    }
}
exports.IndexController = IndexController;
