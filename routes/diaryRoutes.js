/**
 * Title: Diary function router
 * Updated: 2025-04-15
 * Author: 조형준
 */
const express = require("express")
const router = express.Router()
const { createDiaryWithReply, getDiaries, createDiaryReply, getDiaryReply } = require("../controllers/diaryController")
const { upload } = require("../middleware")

router
.get("/", getDiaries)
.get("/reply/:id", getDiaryReply)
.post("/", upload.single('file'), createDiaryWithReply)
.post("/reply", createDiaryReply)

module.exports = router