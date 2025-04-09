/**
 * Title: chat DB
 * Updated: 2025-04-08
 * Author: 조형준
 */
const mongoose = require("mongoose")
const { Schema } = mongoose

const chatSchema = Schema({
    text: String,
    sender: String,
}, { timestamps: true })

module.exports = mongoose.model("Chat", chatSchema)