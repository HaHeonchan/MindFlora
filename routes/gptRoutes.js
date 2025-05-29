const express = require("express");
const router = express.Router();
const path = require("path");
const gptController = require("../controllers/gptController");

const mainLayout = path.join("layouts", "main");

router
  .get("/chat", (req, res) => {
    const locals = { title: "GPT 챗봇" };
    const view = gptController.getChatPage();
    res.render(view, { locals, layout: mainLayout });
  })
  .post("/chat", gptController.postChat);

router.get("/chat/logs", gptController.getChatLogsByUid);
router.get("/plant/:uid", gptController.getPlantDataByUid);
router.post("/chat/dll", gptController.postChatforDLL);

module.exports = router;
