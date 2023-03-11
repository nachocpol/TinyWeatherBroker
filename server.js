// Ensure we have the required dependencies
const dotenv = require("dotenv")
const express = require("express")
const mysql = require("mysql")
const path = require("path")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const cookieParser = require("cookie-parser")
const handlebars = require("express-handlebars")

// Load env variables
dotenv.config()

// Startup connection with DB
const db = mysql.createPool({
    host : process.env.DB_HOST,
    port : process.env.DB_PORT,
    user : process.env.DB_USER,
    password : process.env.DB_USER_PASS,
    database: process.env.DB_SCHEMA
})

db.getConnection((err, connection) => {
    if(err)
    {
        throw (err)
    }
    else
    {
        console.log("Connected with the DB")
    }
})

// Configure app
const publicAppDir = path.join(__dirname, "./public")
console.log("Public path for app is: " + publicAppDir)
const appPort = process.env.APP_PORT
const app = express()

// Configure handlebars
const hbs = handlebars.create({
    layoutsDir: path.join(__dirname, "views/layouts"),
    partialsDir: path.join(__dirname, "views/partials"),
    extname : "hbs",
    defaultLayout : "main"
});
app.engine("hbs", hbs.engine);
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

// Other configurations for the app
app.use(express.static(publicAppDir))
app.use(express.urlencoded({extended: 'false'}))
app.use(express.json())
app.use(cookieParser())

app.get("/", (req, res) => {
    res.render("index")
})

app.get("/register", (req, res) => {
    res.render("register")
})

app.get("/login", (req, res) => {
    res.render("login")
})

app.post("/auth/register", (req, res) => {
    const { email, password, password_confirm } = req.body

    db.query("SELECT email FROM users WHERE email = ?", [email], async(error, dbSelectResult) => {
        if(error)
        {
            console.error(error);
            return res.render("register", {message: "Unexpected DB error"})
        }
        else if(dbSelectResult.length > 0)
        {
            return res.render("register", {message: "Email already in use"})
        }
        else if(password !== password_confirm)
        {
            return res.render("register", {message: "Passwords don't match"})
        }
        else
        {
            // TODO: Check email validity (could we do this on the client side maybe?)
            // TODO: Enforce good password 

            let hashedPassword = await bcrypt.hash(password, 8)
            db.query("INSERT INTO users SET?", {email : email, password: hashedPassword}, (error) =>{
                if(error)
                {
                    console.error(error);
                    return res.render("register", {message: "Unexpected DB error"})
                }
                else
                {
                    return res.render("register", {message: "User registered!"})
                }
            })
        }
    })
})

app.post("/auth/login", (req, res) => {
    const {email, password} = req.body

    if(req.cookies)
    {
        console.log("Got a session from the user, auth again? ")
        console.log(req.cookies)
    }

    db.query("SELECT email FROM users WHERE email = ?", [email], async(error, dbSelectResult) => {
        if(error)
        {
            console.error(error)
            res.render("login", {message: "Unexpected DB error"})
        }
        else if(dbSelectResult.length <= 0)
        {
            res.render("login", {message: "Email not in use"})
        }
        else
        {
            db.query("SELECT password FROM users WHERE email =?", [email], async(error, dbPassSelectResult) => {
                if(error)
                {
                    console.error(error)
                    res.render("login", {message: "Unexpected DB error"})
                }
                else
                {
                    if(await bcrypt.compare(password, dbPassSelectResult[0].password))
                    {
                        var token = jwt.sign({data : email}, process.env.APP_SECRET, {expiresIn: '5m'})

                        // User will store the session token as a cookie. Cookie will expire and delete after 5m
                        res.cookie("sessionToken", token, {
                            maxAge : 300000,
                            httpOnly : true,
                            sameSite : "lax"
                        })

                        res.render("login", {message: "User loged in!"})
                    }
                    else
                    {
                        res.render("login", {message: "Invalid password"})
                    }
                }
            })
        }
    })    
})

// This will deal with the data sent by the sensors
app.post("/data", (req, res) => {
    
})

app.listen(appPort ,() => {
    console.log('App started')
})