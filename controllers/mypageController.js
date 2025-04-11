/**
 * Title: Mypage Controller
 * Updated: 2025-04-11
 * Author: 조형준
 */
require("dotenv").config()
const userDB = require("../db/user")
const plantDB = require("../db/plant")
const jwt = require("jsonwebtoken")

const getUserInfo = async(req, res) => {
    const { token } = req.cookies
    console.log(token)

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

module.exports = {
    getUserInfo
}