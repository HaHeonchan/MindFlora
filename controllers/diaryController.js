/**
 * Title: Diary Controller (Gemini 기반)
 * Updated: 2025-04-16
 * Author: 조형준 + ChatGPT
 */
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const Diary = require("../db/diary");

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// 모델 및 설정
const generationConfig = {
  temperature: 0.7,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 1024,
};

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-thinking-exp-01-21",
});

// 사용자별 일기 히스토리 (임시 메모리 구조)
const diaryHistories = {};

// POST /diary
const createDiaryWithReply = async (req, res) => {
  const { title, content, image } = req.body;
  const { token } = req.cookies;

  if (!title || !content) {
    return res.status(400).json({ error: "제목과 내용은 필수입니다." });
  }

  try {
    // const { uid } = jwt.verify(token, process.env.JWT_SECRET);
    const uid = "user-gjscks";

    // 사용자 히스토리 초기화
    if (!diaryHistories[uid]) {
      diaryHistories[uid] = [
        {
          role: "user",
          parts: [{
            text: `너는 사용자에게 말을 거는 식물이야. 너무 똑똑하거나 AI 같지 않고,
사용자가 쓴 일기에 공감해주는, 작고 따뜻한 친구처럼 반응해줘.`,
          }],
        },
        {
          role: "model",
          parts: [{ text: "안녕! 오늘 하루는 어땠어? 나한테 이야기해줘 🌱" }],
        }
      ];
    }

    const prompt = `사용자가 방금 작성한 일기를 읽고 식물의 입장에서 짧게 감정이 담긴 코멘트를 해 줘. 말투는 식물스럽게. 너무 유식하거나 AI 같은 표현은 피하고, 자연스럽게 위로하거나 공감하거나 함께 기뻐해 줘.
일기 내용: """${content}"""`;

    diaryHistories[uid].push({
      role: "user",
      parts: [{ text: prompt }],
    });

    const chatSession = model.startChat({
      generationConfig,
      history: diaryHistories[uid],
      tools: [],
    });

    const result = await chatSession.sendMessage(prompt);
    const reply = await result.response.text();

    diaryHistories[uid].push({
      role: "model",
      parts: [{ text: reply }],
    });

    const diary = new Diary({
      uid,
      title,
      content,
      image,
      reply,
      writer: "user",
    });

    await diary.save();

    res.status(200).json({
      message: "일기와 응답이 저장되었습니다.",
      geminiReply: reply,
    });
  } catch (err) {
    console.error("일기 저장/응답 생성 실패:", err);
    res.status(500).json({ error: "일기 저장 또는 응답 생성 중 오류 발생" });
  }
};

module.exports = {
  createDiaryWithReply,
};
