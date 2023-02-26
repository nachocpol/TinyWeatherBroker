// Load env variables
require("dotenv").config()

// Ensure we have the required dependencies
const express = require("express")
const mysql = require("mysql")

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

const appPort = process.env.APP_PORT
const app = express()
app.listen(appPort ,() => {
    console.log('App started. Listening on ${appPort}')
})