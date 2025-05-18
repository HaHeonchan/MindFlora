const OpenAI = require("openai");
const jwt = require("jsonwebtoken");
const ffi = require('ffi-napi');
const fs = require("fs");
const path = require("path");


const Chat = require("../db/chat");
const Plant = require("../db/plant");
const diaryReplyDB = require("../db/diaryReply");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 사용자별 대화 히스토리
const chatHistories = {};

const getChatPage = () => {
  return "chat_gemini"; // 파일명은 유지
};

const postChat = async (req, res) => {
  const { message, temp, humidity, week, status } = req.body;
  const { token } = req.cookies;
  const userId = "user-gjscks"; // 배포 시 JWT에서 추출

  if (!message) return res.status(400).json({ error: "메시지를 입력하세요." });

  // 🔁 식물 데이터 로딩 (기존 코드와 동일)
  let plant = await Plant.findOne({ uid: userId });
  if (!plant) {
    plant = new Plant({
      uid: userId,
      nickname: "애기장대",
      plant_kind: "애기장대",
      temperature_data: temp ? [temp] : [],
      humidity_data: humidity ? [humidity] : [],
      water_data: [null],
      light_data: [null],
      acidity_data: [null],
      growth_data: week ? [week] : [],
    });
  } else {
    if (humidity !== undefined) plant.humidity_data.push(humidity);
    if (temp !== undefined) plant.temperature_data.push(temp);
    plant.water_data.push(null);
    plant.light_data.push(null);
    plant.acidity_data.push(null);
    if (week !== undefined) plant.growth_data.push(week);
  }
  await plant.save();

  // 🌱 사용자 메시지에 환경 정보를 포함
  const fullMessage = `온도: ${temp || "정보 없음"}°C, 습도: ${humidity || "정보 없음"}%, 생애주기: ${week || 1}주차, 상태: ${status || "정보 없음"}\n${message}`;

  // 📄 매 대화마다 프롬프트 불러오기
  const systemPrompt = loadPrompt({ nickname: plant.nickname || "애기장대" });

  const messages = [
    { role: "system", content: systemPrompt },
    ...(chatHistories[userId] || []),
    { role: "user", content: fullMessage },
  ];

  // 대화 히스토리 저장
  if (!chatHistories[userId]) {
    chatHistories[userId] = [];
  }
  chatHistories[userId].push({ role: "user", content: fullMessage });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-nano-2025-04-14",
      messages,
      max_completion_tokens: 2048,
    });

    const text = completion.choices[0].message.content;

    // 응답도 히스토리에 저장
    chatHistories[userId].push({ role: "assistant", content: text });

    res.json({ response: text });
  } catch (err) {
    console.error("GPT 호출 에러:", err.response?.data || err.message || err);
    res.status(500).json({ error: "GPT 호출 실패" });
  }
};

const getChatLogsByUid = async (req, res) => {
  const { token } = req.cookies;
  const { uid } = jwt.verify(token, process.env.JWT_SECRET);

  try {
    const chats = await Chat.find({ uid });
    const diaryReplies = await diaryReplyDB.find({ uid });

    const log = [...chats, ...diaryReplies].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    res.json({ uid, logs: log });
  } catch (err) {
    console.error("채팅 로그 조회 오류:", err);
    res.status(500).json({ error: "채팅 로그를 불러올 수 없습니다." });
  }
};

const getPlantDataByUid = async (req, res) => {
  const { token } = req.cookies;
  const { uid } = jwt.verify(token, process.env.JWT_SECRET);

  try {
    const plant = await Plant.findOne({ uid });
    if (!plant) return res.status(404).json({ error: "해당 사용자의 식물 정보가 없습니다." });
    res.send(plant);
  } catch (err) {
    console.error("식물 정보 조회 오류:", err);
    res.status(500).json({ error: "식물 정보를 불러올 수 없습니다." });
  }
};

module.exports = { getChatPage, postChat, getChatLogsByUid, getPlantDataByUid };


// 프롬프트 파일 읽기
const loadPrompt = (variables = {}) => {
  try {
    const promptPath = path.join(__dirname, "../prompt/prompt.txt");
    let prompt = fs.readFileSync(promptPath, "utf-8");

    // {{변수}} 형식 템플릿 치환
    for (const [key, value] of Object.entries(variables)) {
      const pattern = new RegExp(`{{\\s*${key}\\s*}}`, "g");
      prompt = prompt.replace(pattern, value);
    }

    return prompt;
  } catch (err) {
    console.error("프롬프트 파일 로딩 실패:", err.message);
    return "너는 애기장대야. 사용자에게 친절하게 응답해줘.";
  }
};