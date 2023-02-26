// Ensure we have the required dependencies
const dotenv = require("dotenv")
const express = require("express")
const mysql = require("mysql")
const path = require("path")

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


const publicAppDir = path.join(__dirname, "./public")
const appPort = process.env.APP_PORT
const app = express()
app.set("view engine", 'hbs')
app.use(express.static(publicAppDir))
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

app.listen(appPort ,() => {
    console.log('App started')
})