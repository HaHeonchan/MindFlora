const OpenAI = require("openai");
const jwt = require("jsonwebtoken");

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
  const userId = "user-gjscks"; // 필요 시 JWT 인증 복원

  if (!message) return res.status(400).json({ error: "메시지를 입력하세요." });

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

  // 첫 대화 시 시스템 메시지 추가
  if (!chatHistories[userId]) {
    const systemPrompt = `너는 사용자가 키우는 식물, 애기장대야...`; // 생략: 기존 프롬프트 그대로
    chatHistories[userId] = [
      { role: "system", content: systemPrompt },
      { role: "assistant", content: "안녕! 나는 애기장대야. 오늘도 잘 와줬구나. 😊" },
    ];
  }

  const fullMessage = `온도: ${temp || "정보 없음"}°C, 습도: ${humidity || "정보 없음"}%, 생애주기: ${week || 1}주차, 상태: ${status || "정보 없음"}\n${message}`;

  chatHistories[userId].push({ role: "user", content: fullMessage });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // 또는 gpt-3.5-turbo
      messages: chatHistories[userId],
      temperature: 0.7,
      max_tokens: 2048,
    });
  
    // 응답 제대로 왔는지 검사
    if (!completion || !completion.choices || !completion.choices.length) {
      console.error("GPT 응답 형식 이상:", completion);
      return res.status(500).json({ error: "GPT 응답 오류: 결과가 없습니다." });
    }
  
    const text = completion.choices[0].message.content;
    res.json({ response: text });
  } catch (err) {
    console.error("❌ GPT 호출 중 에러:", err.response?.data || err.message || err);
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
