// Ensure we have the required dependencies
const dotenv = require("dotenv")
const express = require("express")
const mysql = require("mysql")
const path = require("path")
const bcrypt = require("bcryptjs")

// Load env variables
dotenv.config()

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
const appPort = process.env.APP_PORT
const app = express()
app.set("view engine", 'hbs')
app.use(express.static(publicAppDir))
app.use(express.urlencoded({extended: 'false'}))
app.use(express.json())

console.log("Public path for app is: " + publicAppDir)

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

app.listen(appPort ,() => {
    console.log('App started')
})