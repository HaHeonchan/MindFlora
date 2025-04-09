/**
 * Title: Start controller
 * Updated: 2025-04-09
 * Author: 조형준
 */
const axios = require("axios")
require("dotenv").config()
const jwt = require("jsonwebtoken")
const userDB = require("../db/user")
const plantDB = require("../db/plant")

/**
 * Title: kakao login
 * API Path: /login
 * HTTP Status: GET
 */
const kakaoLogin = async(req, res) => {
    try {
        const { code } = req.query

        const body = {
            grant_type: "authorization_code",
            client_id: process.env.KAKAO_REST_API_KEY,
            redirect_uri: process.env.KAKAO_REDIRECT_URI,
            code: code
        }

        // get kakao access token
        const kakaoToken = await axios.post(`https://kauth.kakao.com/oauth/token`, 
            body,
            {
                headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" }
            }
        )

        // get kakao user data
        const kakaoUserData = await axios.get(`https://kapi.kakao.com/v2/user/me`, 
            { 
                headers: {
                    Authorization: `Bearer ${kakaoToken.data.access_token}`,
                    "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
                }
            }
        )

        const kakaoUser = kakaoUserData.data.kakao_account

        // user overlap verify using email
        const isOverlap = await userDB.findOne({ email: kakaoUser.email })
        if (isOverlap) {
            // making jwt
            const payload = { uid: isOverlap._id }
            console.log(payload)
            const jwtToken = jwt.sign(payload, process.env.JWT_SECRET)

            return res.status(200)
            .cookie("token", jwtToken, { httpOnly: true })
            .redirect(`${process.env.FE_PORT}/main/status`)
        }

        const kakaoUserInfo = {
            nickname: kakaoUser.profile.nickname,
            profile_image: kakaoUser.profile.profile_image_url,
            email: kakaoUser.email,
        }

        // user create
        userDB.create(kakaoUserInfo) 
        .then(async() => {
            // making jwt
            console.log(kakaoUserInfo)

            const newUser = await userDB.findOne({ email: kakaoUserInfo.email })
            const payload = { uid: newUser._id }
            console.log(payload)
            const jwtToken = jwt.sign(payload, process.env.JWT_SECRET)

            res.status(200)
            .cookie("token", jwtToken, { httpOnly: true })
            .redirect(`${process.env.FE_PORT}/start/access`)
        })
        .catch(error => {
            console.log("Kakao login user create fail")
            console.log(error)
            return res.status(500).send(`Kakao login user create fail`)
        })
    } catch(error) {
        console.log("kakao auth login error")
        console.log(error.response.data)
        return res.redirect(`${process.env.FE_PORT}/start/welcome`)
    }
}

/**
 * Title: plant nickname set
 * API Path: /nickname
 * HTTP Method: POST
 */
const setPlantNickname = async(req, res) => {
    try {
        const { token } = req.cookies
        const { plantNickname } = req.body

        console.log(token)

        const masterId = jwt.verify(token, process.env.JWT_SECRET)
        
        const plantInfo = {
            master_id: masterId.uid,
            nickname: plantNickname
        }

        await plantDB.create(plantInfo)
        .then(() => {
            console.log(`plantDB created`)
            res.status(200).send(`plantDB created`)
        })
        .catch(error => {
            console.log(`plantDB creating is fail`)
            console.log(error)
            res.status(400).redirect("/start/nickname")
        })
    } catch (error) {
        console.log("Plant nickname setting is fail")
        console.log(error)
        res.status(500)
        .send(`Plant nickname setting is fail`)
        .redirect(`${process.env.FE_PORT}/start/nickname`)
    }
}

/**
 * Title: Plant kind select
 * API Path: /select
 * HTTP Method: POST
 */
const plantKindSelect = async(req, res) => {
    try {
        const { token } = req.cookies
        const { plantKind } = req.body

        const masterId = jwt.verify(token, process.env.JWT_SECRET)

        const plantInfo = { plant_kind: plantKind }

        await plantDB.updateOne({ master_id: masterId.uid }, plantInfo)
        .then(() => {
            console.log(`Plant select update is success`)
            res.status(200).send(`Plant select update is success`)
        })
        .catch(error => {
            console.log(`Plant select update is fail`)
            console.log(error)
            res.status(500)
            .send(`Plant select update is fail`)
            .redirect(`${process.env.FE_PORT}/start/select`)
        })
    } catch (error) {
        console.log(`Plant select is fail`)
        console.log(error)
        res.status(500).send(`Plant select is fail`)
    }
}

/**
 * Title: address save
 * API Path: /address
 * HTTP Method: POST
 */
const userAddressSave = async(req, res) => {
    try {
        const { token } = req.cookies
        const { address } = req.body

        const { uid } = jwt.verify(token, process.env.JWT_SECRET)

        const addressInfo = {
            address: address.address + " " + address.detailAddress
        }

        await userDB.findByIdAndUpdate(uid, addressInfo)
        .then(() => {
            console.log(`userDB address save success`)
            res.status(200).send(`userDB address save success`)
        })
        .catch(error => {
            console.log(`userDB address save fail`)
            res.status(500)
            .redirect(`${process.env.FE_PORT}/start/address`)
            .send(`userDB address save fail`)
        })
    } catch (error) {
        console.log(`user address save fail`)
        res.status(500)
        .send(`user address save fail`)
        .redirect(`${process.env.FE_PORT}/start/address`)
    }
}

module.exports = {
    kakaoLogin,
    setPlantNickname,
    plantKindSelect,
    userAddressSave
}