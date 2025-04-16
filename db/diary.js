/**
 * Title: diary DB
 * Updated: 2025-04-08
 * Author: 조형준
 */
const mongoose = require("mongoose")
const { Schema } = mongoose

const diarySchema = Schema({
    uid: String,
    image: String,
    title: String,
    content: String,
    reply: String,
    writer: String,    
}, { timestamps: true })

module.exports = mongoose.model("Diary", diarySchema)