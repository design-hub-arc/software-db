/*
This module provides the tools used by other controllers to handle Express
routing and other front-end tasks
*/



class AbstractController {
    constructor(services, routePrefix = ""){
        this.routePrefix = routePrefix;
        this.services = services;
    }

    applyTo(expressApp){
        const prefix = (this.routePrefix === "") ? "" : `/${this.routePrefix}`;
        this.getRoutes().forEach((route)=>{
            route.registerFunction(expressApp, `${prefix}/${route.endpoint}`, route.fn);
            console.log(`Registered route ${prefix}/${route.endpoint}`);
        });
    }

    getRoutes(){
        throw new Error("Method AbstractController::getRoutes is abstract, must be implemented by subclasses");
    }
}
exports.AbstractController = AbstractController;



const REQUEST_TYPES = {
    GET: (app, route, fn)=>app.get(route, fn),
    POST: (app, route, fn)=>app.post(route, fn)
};
exports.REQUEST_TYPES = REQUEST_TYPES;



class Route {
    constructor(type, endpoint, fn){
        this.registerFunction = type;
        this.endpoint = endpoint;
        this.fn = fn;
    }
}
exports.Route = Route;
