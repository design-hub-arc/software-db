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
