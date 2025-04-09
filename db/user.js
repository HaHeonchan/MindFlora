/**
 * Title: user DB
 * Updated: 2025-04-08
 * Author: 조형준
 */
const mongoose = require("mongoose")
const { Schema } = mongoose

const userSchema = new Schema({
    nickname: String,
    profile_image: String,
    email: String,
    name: String,
    gender: String,
    birthday: Date,
    phone: String,
    address: String
})

module.exports = mongoose.model('User', userSchema)