/**
 * Title: Diary controller
 * Updated: 2025-04-11
 * Author: 조형준
 */
require(`dotenv`).config()
const diaryDB = require("../db/diary")
const diaryReplyDB = require("../db/diaryReply")
const jwt = require("jsonwebtoken")
const mongoose = require("mongoose")

const getAllDiary = async(req, res) => {
    try {
        await diaryDB.find({}, { _id: 1, title: 1, image: 1, writer: 1, createdAt: 1 })
        .then(allDiaryHeader => {
            console.log(allDiaryHeader)
            res.status(200).send(allDiaryHeader)
        })
        .catch(error => {
            console.log(`Get all diary from diary DB is fail`)
            console.log(error)
            res.status(500).send(`Get all diary from diary DB is fail`)
        })
    } catch (error) {
        console.log(`Get all diary fail`)
        console.log(error)
        res.status(500).send("Get all diary fail")
    }
}

const getDiaryContent = async (req, res) => {
    const { id } = req.params;

    try {
        const diaryContent = await diaryDB.findById(id, {
            _id: 1,
            title: 1,
            image: 1,
            writer: 1,
            content: 1
        });

        if (!diaryContent) {
            return res.status(404).send("Diary not found");
        }

        res.send(diaryContent);
    } catch (error) {
        console.error("Error getting diary content:", error);
        res.status(500).send("Error getting diary content");
    }
};

const createDiary = async(req, res) => {
    const { body } = req
    const { token } = req.cookies

    const { uid } = jwt.verify(token, process.env.JWT_SECRET)

    const diaryInfo = {
        ...body,
        uid: uid,
        writer: "user"
    }

    await diaryDB.create(diaryInfo)
    .then(() => {
        res.send(`success`)
    })
}

const replyToDiary = async(req, res) => {
    const { body } = req
    const { token } = req.cookies

    const { uid } = jwt.verify(token, process.env.JWT_SECRET)

    
    await diaryReplyDB.create({
        ...body,
        uid: uid,
        sender: "user"
    })
}

const getDiaryReply = async(req, res) => {
    const { diaryReplyId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(diaryReplyId)) {
        console.log("Invalid diaryReplyId:", diaryReplyId);
        return res.status(400).send("Invalid diaryReplyId");
    }

    try {
        const diaryReply = await diaryReplyDB.findById(diaryReplyId);
        if (!diaryReply) return res.status(404).send("Diary reply not found");

        const repliedDiary = await diaryDB.findById(diaryReply.diary_id, { title: 1, _id: 1 });
        if (!repliedDiary) return res.status(404).send("Diary not found");

        const sendData = {
            ...diaryReply.toObject(),
            ...repliedDiary.toObject()
        }

        res.send(sendData);
    } catch (error) {
        console.error("Error fetching diary reply:", error);
        res.status(500).send("Server error");
    }
}

module.exports = {
    getAllDiary,
    getDiaryContent,
    createDiary,
    replyToDiary,
    getDiaryReply
}