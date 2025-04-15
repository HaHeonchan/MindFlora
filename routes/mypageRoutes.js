/**
 * Title: Mypage router
 * Updated: 2025-04-11
 * Author: 조형준
 */
const express = require("express")
const { getUserInfo, userLogout, deleteUserAccount } = require("../controllers/mypageController")
const router = express.Router()

/**
 * Title: Get user data
 * API Path: /user
 * HTTP Method: GET
 */
router.get("/", getUserInfo)

/**
 * Title: User logout
 * Content: Delete user token from client
 * API Path: /user/logout
 * HTTP Method: DELETE
 */
router.delete("/logout", userLogout)

/**
 * Content: Delete user account
 * API Path: /user
 * HTTP Method: DELETE
 */
router.delete("/", deleteUserAccount)

module.exports = router