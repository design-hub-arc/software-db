/*
This file contains the various Data Transfer Object (DTO) classes.
*/



/*
    {
        name: String,
        description: String,
        parents: String[]
    }
*/
class Subject {
    constructor(name, description, parents=[]){
        this.name = name.toLowerCase();
        this.description = description;
        this.parents = parents;
    }

    toString(){
        return JSON.stringify(this);
    }
}
exports.Subject = Subject;



/*
    {
        address: String
    }
*/
class Room {
    constructor(address){
        this.address = address;
    }

    toString(){
        return JSON.stringify(this);
    }
}
exports.Room = Room;



/*
    {
        name: String,
        type: String,
        rooms: {
            address: String
        }[]
    }
*/
class Application {
    constructor(name, type, rooms=[]){
        this.name = name;
        this.type = type.toLowerCase();
        this.rooms = rooms;
    }

    toString(){
        return JSON.stringify(this);
    }
}
exports.Application = Application;



/*
    {
        expires: Date,
        applications: {
            name: String,
            type: String,
            rooms: {
                address: String
            }[]
        }[],
        tags: {
            String: {
                name: String,
                description: String,
                parents: String[],

                values: String[] // added by License
            }
        },
        accountingCode: String
    }

Will also have an id: int field upon retrieving from the database
*/
class License {
    constructor(expires, applications=[], tags={}, accountingCode=undefined){
        this.expires = expires;
        this.applications = applications;
        this.tags = tags;
        this.accountingCode = accountingCode;
    }

    toString(){
        return JSON.stringify(this);
    }
}
exports.License = License;
