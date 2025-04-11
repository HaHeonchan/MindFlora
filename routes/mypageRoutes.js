/**
 * Title: Mypage router
 * Updated: 2025-04-11
 * Author: 조형준
 */
const express = require("express")
const { getUserInfo } = require("../controllers/mypageController")
const router = express.Router()

/**
 * Title: Get user data
 * API Path: /user
 * HTTP Method: GET
 */
router.get("/", getUserInfo)

module.exports = router