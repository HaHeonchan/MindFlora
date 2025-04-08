// routes/geminiRoutes.js
const express = require("express");
const router = express.Router();
const path = require("path");
const geminiController = require("../controllers/geminiController");

const mainLayout = path.join("layouts", "main");

router.get("/gemini", (req, res) => {
  const locals = {
    title: "Gemini 챗봇",
  };
  const view = geminiController.getChatPage();
  res.render(view, { locals, layout: mainLayout });
});

router.post("/gemini", geminiController.postChat);

module.exports = router;
