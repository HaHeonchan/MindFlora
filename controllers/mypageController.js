/**
 * Title: Mypage Controller
 * Updated: 2025-04-11
 * Author: 조형준
 */
require("dotenv").config()
const userDB = require("../db/user")
const plantDB = require("../db/plant")
const diaryDB = require("../db/diary")
const diaryReplyDB = require("../db/diaryReply")
const chatDB = require("../db/chat")
const jwt = require("jsonwebtoken")

/**
 * Content: Get user information from user DB
 * API Path: /user
 * HTTP Method: GET
 */
const getUserInfo = async(req, res) => {
    const { token } = req.cookies

    const { uid } = jwt.verify(token, process.env.JWT_SECRET)

    const userInfo = await userDB.findById(uid, { nickname: 1, profile_image: 1 })
    const plantInfo = await plantDB.findOne({ uid: uid }, { nickname: 1, createdAt: 1 })

    const today = new Date()
    const createdAt = new Date(plantInfo.createdAt)
    const diffTime = today.getTime() - createdAt.getTime()
    const plantDday = Math.floor(diffTime / (1000 * 60 * 60 * 24)) // 일 수 차이
    console.log(today, createdAt)

    const myInfo = {
        userNickname: userInfo.nickname,
        profileImage: userInfo.profile_image,
        plantNickname: plantInfo.nickname,
        plantDday: plantDday
    }

    res.status(200).send(myInfo)
}

/**
 * Title: User logout
 * Content: Delete user token from client
 * API Path: /user/token
 * HTTP Method: GET
 */
const userLogout = async(req, res) => {
    res.clearCookie("token", { httpOnly: true }).status(200).send("cookie clear")
}

const deleteUserAccount = async (req, res) => {
    try {
        const { token } = req.cookies
        const { uid } = jwt.verify(token, process.env.JWT_SECRET)

        await Promise.all([
            plantDB.deleteOne({ uid }),
            diaryDB.deleteMany({ uid }),
            diaryReplyDB.deleteMany({ uid }),
            chatDB.deleteMany({ uid }),
            userDB.findByIdAndDelete(uid)
        ])

        res.status(200)
        .clearCookie("token", { httpOnly: true })
        .json({ message: "User account and related data deleted successfully." })
    } catch (error) {
        console.error("Error deleting user account:", error)
        res.status(500).json({ message: "Failed to delete user account." })
    }
}

module.exports = {
    getUserInfo,
    userLogout,
    deleteUserAccount
}