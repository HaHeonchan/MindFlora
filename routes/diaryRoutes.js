/**
 * Title: Diary function router
 * Updated: 2025-04-15
 * Author: 조형준
 */
const express = require("express")
const router = express.Router()
const { createDiaryWithReply, getDiaries, createDiaryReply, getDiaryReply } = require("../controllers/diaryController")

/**
 * TODO:
 * - 일기 가져오는 API
 * - 식물이 작성한 일기에 답장 남기는 API
 */
router
.get("/", getDiaries)
.get("/reply/:id", getDiaryReply)
.post("/", createDiaryWithReply)
.post("/reply", createDiaryReply)

module.exports = router