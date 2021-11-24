/*
This module handles basic CRUD (Create, Read, Update, Delete) operations on the
various entities used by the system. It implements the REPOSITORY design
pattern, where the storage and retrieval of entities is abstractified.

Exports:
    * Subjects(DatabaseConnection)
        Category and name columns are in lower case.
        * storeSubject(category, name, description)=>Promise<>
            Creates a new subject in the database. category is automatically
            converted to the proper case. Throws an error if a subject with the
            given name already exists.
        * getSubjectByName(name)=>Promise<{category, name, description}>
            Returns the subject with the given name. Throws an error if no such
            subject exists with the given name.
        * getAllSubjects()=>Promise<{category, name, description}[]>
        * addChild(parentName, childName)=>Promise<>
            Makes the first subject the parent of the second.
*/



const {escape} = require("mysql");



class Subjects {
    constructor(databaseConnection){
        this.db = databaseConnection;
    }

    storeSubject(category, name, description){
        const q = `
            INSERT INTO ${this.db.table("subject")} (category, name, description)
            VALUES (${escape(category.toLowerCase())}, ${escape(name.toLowerCase())}, ${escape(description)});
        `;
        return this.db.query(q);
    }

    async getSubjectByName(name){
        name = name.toLowerCase();
        const q = `
            SELECT category, description
            FROM ${this.db.table("subject")}
            WHERE name = ${escape(name)};
        `;
        const result = await this.db.query(q);
        return {
            name: name,
            category: result.rows[0].category,
            description: result.rows[0].description
        };
    }

    async getAllSubjects(){
        const q = `
            SELECT name, category, description
            FROM ${this.db.table("subject")};
        `;
        const result = await this.db.query(q);
        return result.rows.map(({name, category, description})=>{
            return {
                name: name,
                category: category,
                description: description
            }; // this filters out properties we don't want to expose (ID)
        });
    }

    addChild(parentName, childName){
        parentName = parentName.toLowerCase();
        childName = childName.toLowerCase();
        const q = `
            INSERT INTO ${this.db.table("subject_child")} (parent_id, child_id)
            VALUES (
                (
                    SELECT id
                    FROM ${this.db.table("subject")}
                    WHERE name = ${escape(parentName)}
                ),
                (
                    SELECT id
                    FROM ${this.db.table("subject")}
                    WHERE name = ${escape(childName)}
                )
            )
        `;
        return this.db.query(q);
    }
}
exports.Subjects = Subjects;
