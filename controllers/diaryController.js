/**
 * Title: Diary controller
 * Updated: 2025-04-11
 * Author: 조형준
 */
require(`dotenv`).config()
const diaryDB = require("../db/diary")
const diaryReplyDB = require("../db/diaryReply")

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

    console.log(body)

    const diaryInfo = {
        ...body,
        writer: "user"
    }

    await diaryDB.create(diaryInfo)
    .then(() => {
        res.send(`success`)
    })
}

const replyToDiary = async(req, res) => {
    const { body } = req

    console.log(body)
    
    await diaryReplyDB.create(body)
}

module.exports = {
    getAllDiary,
    getDiaryContent,
    createDiary,
    replyToDiary
}