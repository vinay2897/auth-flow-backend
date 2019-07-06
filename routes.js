const express = require('express');
const router = express.Router();
const validator = require('validator')
const bcrypt = require('bcrypt');
const saltRounds = 10;
const uuidv4 = require('uuid/v4');
const db = require("./db-config");


//Dummy authorized endpoint
router.post("/get-details", checkAuthorization, (req, res) => {
    db.any("SELECT firstname, lastname from users WHERE uid=$1", [req.cookies.uid])
    .then(data => {
        res.status(200).json({
            firstname: data[0].firstname,
            lastname: data[0].lastname
        })
    })
    .catch(err => {
        res.status(500).json({
            err
        })
    })
})

router.post("/logout", logout, (req, res) => {
})


//handles login requests
router.post("/login", (req, res) => {
    // console.log(req.body.email);
    if (req.cookies.uid || req.cookies.at || req.cookies.rt) {
        res.status(500).json({
            "error": "Already logged in"
        })
    }
    else {
        // TODO sanitize all request attributes
        if (req.body.email && req.body.password) {
            db.any("SELECT password, uid FROM users WHERE email=$1;", [req.body.email])
                .then(data => {
                    if (data.length === 0) {
                        res.status(500).json({
                            "error": "This email is not registered. Create a new account",
                            "code": 0
                        })
                    }
                    else {
                        bcrypt.compare(req.body.password, data[0].password, (err, hashCompare) => {
                            if (hashCompare === false) {
                                res.status(200).json({
                                    "error": "Incorrect Password",
                                    "code": 0
                                })
                            }
                            else {
                                let rt = uuidv4();
                                let at = uuidv4();
                                db.any("SELECT EXISTS(SELECT * FROM auth WHERE uid=$1);", [data[0].uid])
                                    .then(data1 => {
                                        if (data1[0].exists === false) {
                                            db.any("INSERT INTO auth(rt, at, uid) VALUES($1, $2, $3)", [rt, at, data[0].uid])
                                                .then(data2 => {
                                                    res.cookie("uid", data[0].uid, { expires: new Date(Date.now() + 432000000), maxAge: 432000000, secure: false, sameSite: true });
                                                    res.cookie("at", at, { expires: new Date(Date.now() + 3600000), maxAge: 3600000, secure: false, sameSite: true });
                                                    res.cookie("rt", rt, { expires: new Date(Date.now() + 432000000), maxAge: 432000000, secure: false, sameSite: true });
                                                    res.status(200).json({
                                                        "msg": "Logged in",
                                                        "code": 1
                                                    })
                                                })
                                                .catch(err => {
                                                    res.status(500).json({
                                                        err
                                                    })
                                                })
                                        }
                                        else {
                                            db.any("UPDATE auth SET rt=$1, at=$2 WHERE uid=$3", [rt, at, data[0].uid])
                                                .then(data2 => {
                                                    res.cookie("uid", data[0].uid, { expires: new Date(Date.now() + 432000000), maxAge: 432000000, secure: false, sameSite: true });
                                                    res.cookie("at", at, { expires: new Date(Date.now() + 3600000), maxAge: 3600000, secure: false, sameSite: true });
                                                    res.cookie("rt", rt, { expires: new Date(Date.now() + 432000000), maxAge: 432000000, secure: false, sameSite: true });
                                                    res.status(200).json({
                                                        "msg": "Logged in",
                                                        "code": 1
                                                    })
                                                })
                                                .catch(err => {
                                                    res.status(500).json({
                                                        err
                                                    })
                                                })
                                        }
                                        //secure: false, while testing, in production it will be secure: true
                                    })
                                    .catch(error => {
                                        console.log(error)
                                        if (error) {
                                            res.status(500).json({
                                                error
                                            })
                                        }
                                    })

                            }
                        })
                    }
                })
                .catch(error => {
                    console.log(error)
                    res.status(500).json({
                        error
                    })
                })
        }
        else {
            res.status(200).json({
                "msg": "Enter all Fields",
                "code": 0
            })
        }
    }
})


//handles signup requests
router.post("/signup", (req, res) => {

    // TODO sanitize all request attributes
    if (req.body.email && req.body.firstname && req.body.lastname && req.body.password) {
        //Hashes the password
        db.any('SELECT EXISTS (SELECT * FROM users WHERE email = $1);', [req.body.email])
            .then(data => {
                if (data[0].exists === false) {
                    bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
                        if (err) {
                            res.status(200).json({
                                "error": err
                            })
                        }
                        else {
                            db.none('INSERT INTO users(uid, firstname, lastname, email, password) VALUES($1, $2, $3, $4, $5);', [uuidv4(), req.body.firstname, req.body.lastname, req.body.email, hash])
                                .then((data2) => {
                                    res.status(200).json({
                                        "msg": "Successfully signed up.",
                                        "code": 1
                                    })
                                })
                                .catch(error => {
                                    console.log(error)
                                    res.status(500).json({
                                        error
                                    })
                                });

                        }
                    })
                }
                else {
                    res.status(500).json({
                        code: 0,
                        error: "Account already exists"
                    })
                }
            })
            .catch(err => {
                console.log(err)
                res.status(500).json({
                    err
                })
            })
    }
    else {
        res.status(500).json({
            "error": "Please enter all fields",
            "code": 0
        })
    }
})


/*------------------------Routes----*/

/*-----------------Utility Functions---------------------*/


function checkAuthorization(req, res, next) {
    if (req.cookies.uid && req.cookies.rt) {
        if (req.cookies.at) {
            db.any("SELECT at FROM auth WHERE uid=$1", [req.cookies.uid])
                .then(data => {
                    if (data[0].at === req.cookies.at) {
                        
                        next()
                    }
                    else {
                        
                        logout(req, res, next)
                    }
                })
                .catch(err => {
                    console.log(err)
                    res.status(500).json({
                        err
                    })
                })
        }
        else {
            db.any("SELECT rt from auth WHERE uid=$1", [req.cookies.uid])
                .then(data => {
                    if (data.rt === req.cookies.rt) {
                        let rt = uuidv4();
                        let at = uuidv4();
                        db.any("UPDATE auth SET rt=$1, at=$2 WHERE uid=$3;", [rt, at, req.cookies.uid])
                            .then(data => {
                                res.cookie("uid", req.cookies.uid, { expires: new Date(Date.now() + 432000000), maxAge: 432000000, secure: false, sameSite: true });
                                res.cookie("at", at, { expires: new Date(Date.now() + 3600000), maxAge: 3600000, secure: false, sameSite: true });
                                res.cookie("rt", rt, { expires: new Date(Date.now() + 432000000), maxAge: 432000000, secure: false, sameSite: true });
                                next()
                            })
                            .catch(err => {
                                res.status(500).json({
                                    err
                                })
                            })
                    }
                    else {
                        logout(req, res, next)
                    }
                })
                .catch(err => {
                    res.status(500).json({
                        err
                    })
                })
        }
    }
    else {
        logout(req, res, next)
    }
}

function logout(req, res, next) {
    if(req.cookies.uid){
        db.any("DELETE FROM auth WHERE uid=$1", [req.cookies.uid])
        .then(data => {
            res.cookie("uid", "", { expires: new Date(Date.now()), maxAge: 0, secure: false, sameSite: true })
            res.cookie("at", "", { expires: new Date(Date.now()), maxAge: 0, secure: false, sameSite: true })
            res.cookie("rt", "", { expires: new Date(Date.now()), maxAge: 0, secure: false, sameSite: true })
            res.status(200).json({
                "msg": "Logged Out",
                "code": 1
            })
        })
        .catch(err => {
            console.log(err)
            res.status(500).json({
                err
            })
        })
    }
    else{
        res.cookie("uid", "", { expires: new Date(Date.now()), maxAge: 0, secure: false, sameSite: true })
        res.cookie("at", "", { expires: new Date(Date.now()), maxAge: 0, secure: false, sameSite: true })
        res.cookie("rt", "", { expires: new Date(Date.now()), maxAge: 0, secure: false, sameSite: true })
        res.status(200).json({
            "msg": "Logged Out",
            "code": 1
        })
    }
}
/*-----------------Utility Functions---------------------*/


module.exports = router;