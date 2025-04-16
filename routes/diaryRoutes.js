/**
 * Title: Diary function router
 * Updated: 2025-04-15
 * Author: 조형준
 */
const express = require("express")
const router = express.Router()
const { getAllDiary, getDiaryContent, createDiary, replyToDiary, getDiaryReplyById, getDiaryReplyByDiaryId } = require("../controllers/diaryController")
const diaryReply = require("../db/diaryReply")

/**
 * Title: Get all diary
 * API Path: /diary
 * HTTP Method: GET
 */
router.get("/", getAllDiary)

/**
 * Title: Get diary by id
 * API Path: /diary/:id
 * HTTP Method: GET
 */
router.get("/:id", getDiaryContent)

/**
 * Title: Create diary
 * API Path: /diary
 * HTTP Method: POST
 */
router.post("/", createDiary)

/**
 * Title: Reply to diary
 * API Path: /diary/reply
 * HTTP Method: POST
 */
router.post(`/reply`, replyToDiary)

/**
 * Title: Get diary reply
 * API Path: /diary/reply/{params}
 * HTTP Method: GET
 */
router.get(`/reply/:diaryReplyId`, getDiaryReplyById)

/**
 * Title: Get diary reply by diary id
 * API Path: /diary/reply/diary/{id}
 * HTTP Method: GET
 */
router.get("/reply/diary/:id", getDiaryReplyByDiaryId)

module.exports = router