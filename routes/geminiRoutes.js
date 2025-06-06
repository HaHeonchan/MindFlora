// routes/geminiRoutes.js
const express = require("express");
const router = express.Router();
const path = require("path");
const geminiController = require("../controllers/geminiController");

const mainLayout = path.join("layouts", "main");

router
  .get("/chat_gemini", (req, res) => {
    const locals = {
      title: "Gemini 챗봇",
    };
    const view = geminiController.getChatPage();
    res.render(view, { locals, layout: mainLayout });
  })
  .post("/chat_gemini", geminiController.postChat);

router.get("/chat/logs", geminiController.getChatLogsByUid);
router.get("/plant/:uid", geminiController.getPlantDataByUid);

module.exports = router;
