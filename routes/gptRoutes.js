const express = require("express");
const router = express.Router();
const path = require("path");
const gptController = require("../controllers/gptController");

const mainLayout = path.join("layouts", "main");

// GET /chat → 컨트롤러가 템플릿 이름을 리턴
router.get("/chat_gpt", (req, res) => {
  const locals = {
    title: "마인드플로라 챗봇",
  };
  const view = gptController.getChatPage();
  res.render(view, { locals, layout: mainLayout });
});

// POST /chat → 컨트롤러에서 응답 처리
router.post("/chat_gpt", gptController.postChat);

module.exports = router;
