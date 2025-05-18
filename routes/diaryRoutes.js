/**
 * Title: Diary function router
 * Updated: 2025-04-15
 * Author: 조형준
 */
const express = require("express")
const router = express.Router()
const { createDiaryWithReply } = require("../controllers/diaryController")
const diaryReply = require("../db/diaryReply")

router.post("/", createDiaryWithReply)


module.exports = router