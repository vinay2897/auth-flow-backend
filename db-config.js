const pgp = require('pg-promise')();
const cn = {
    host: 'localhost',
    port: 5432,
    database: 'auth',
    user: 'auth_admin',
    password: '1234',

};
const db = pgp(cn);

module.exports = db;