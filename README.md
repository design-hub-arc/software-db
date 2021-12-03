# software-db
A database management website for tracking software licenses


# Setup

In the ```config``` folder, create the following files:

* config.json
    - isProduction : a boolean
    - dbPrefix : a string ending in '_'. This will be appended before the name of each table this program creates. See `database.js` for more information.
    - port
    - cookieSecret

* mysql.json
    - host
    - user
    - password
    - database

    You must GRANT ALL privileges to the given user on the given database

Once you have created these files, run the program using
```
node index.js -d
```
The `-d` flag tells the program to create the database tables and indexes it
needs.

# Command Line Options
- `-d`: create database tables and indexes that are missing. Does not delete or
    modify existing tables, so you needn't worry if you run it when tables are
    already set up.
