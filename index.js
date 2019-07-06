const express = require('express')
const app = express()
const port = 3000
const cors = require("cors")
const cookieParser = require("cookie-parser")
const routes = require("./routes")

/*------------------Middleware---------------*/

//So that the server allows resource requests from the domain http://localhost:4200
app.use(cors({ origin: "http://localhost:3000", credentials: true }))
//So that the server is able to parse application/json data in the request
app.use(express.json())
//To parse cookies from request headers
app.use(cookieParser())

app.use("/api", routes)

const distDir = __dirname + "/dist";
app.use(express.static(distDir));

app.use('/*', function (req, res) {
    res.sendFile(__dirname + '/dist/index.html');
});
/*------------------Middleware---------------*/

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port, () => {
    console.log(`Listening on port ${port}`);
})