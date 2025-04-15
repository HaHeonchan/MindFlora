/**
 * Title: Diary reply DB
 * Updated: 2025-04-11
 * Author: 조형준
 */
const mongoose = require("mongoose")
const { Schema } = mongoose

const diaryReplySchema = Schema({
    uid: String,
    sender: String,
    diary_id: String,
    content: String
}, { timestamps: true })

module.exports = mongoose.model("DiaryReply", diaryReplySchema)