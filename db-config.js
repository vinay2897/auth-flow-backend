const pgp = require('pg-promise')();
let cn = {
    host: 'localhost',
    port: 5432,
    database: 'auth',
    user: 'auth_admin',
    password: '1234',
};

if(process.env.DATABASE_URL){
    cn = {
        connectionString: process.env.DATABASE_URL,
        ssl: true
    };
}
const db = pgp(cn);

module.exports = db;