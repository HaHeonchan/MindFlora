const OpenAI = require("openai");
const jwt = require("jsonwebtoken");
const ffi = require("ffi-napi");
const fs = require("fs");
const path = require("path");

const Chat = require("../db/chat");
const Plant = require("../db/plant");
const Memory = require("../db/memory");
const diaryReplyDB = require("../db/diaryReply");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const getChatPage = () => "chat_gemini";

// ✅ 메모리 캐시 (앱 꺼졌다 켜져도 복구용 캐시)
const chatMemory = {};

const postChat = async (req, res) => {
  const { message, temp, humidity, week, status } = req.body;
  const { token } = req.cookies;
  const userId = "user-gjscks"

  // let userId;
  
  // try {
  //   const decoded = jwt.verify(token, process.env.JWT_SECRET);
  //   userId = decoded.uid;
  // } catch (err) {
  //   return res.status(401).json({ error: "인증 실패: JWT 오류" });
  // }

  if (!message) return res.status(400).json({ error: "메시지를 입력하세요." });

  // ✅ 식물 정보 갱신
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

  const fullMessage = `사용자 메세지 : ${message}\n온도: ${temp || "정보 없음"}°C, 습도: ${humidity || "정보 없음"}%, 생애주기: ${week || 1}주차, 상태: ${status || "정보 없음"}`;
  const systemPrompt = loadPrompt({ nickname: plant.nickname || "애기장대" });

  // ✅ GPT 컨텍스트용 메모리 초기화 (DB에서 불러오기)
  if (!chatMemory[userId]) {
    const mems = await Memory.find({ uid: userId }).sort({ createdAt: 1 }).lean();
    chatMemory[userId] = mems.map(m => ({ role: m.role, content: m.content }));
  }

  // ✅ GPT 메시지 구성
  const messages = [
    { role: "system", content: systemPrompt },
    ...chatMemory[userId],
    { role: "user", content: fullMessage }
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-nano-2025-04-14",
      messages,
      max_completion_tokens: 2048,
    });

    const reply = completion.choices[0].message.content;

    // ✅ Memory 캐시와 DB에 저장
    const memoryDocs = [
      { uid: userId, role: "user", content: fullMessage },
      { uid: userId, role: "assistant", content: reply },
    ];
    await Memory.insertMany(memoryDocs);
    chatMemory[userId].push(...memoryDocs.map(({ role, content }) => ({ role, content })));

    // ✅ 프론트 연동용 Chat DB 저장
    await Chat.create({
      uid: userId,
      reqText: fullMessage,
      resText: reply,
      sender: "user",
    });

    res.json({ response: reply });
  } catch (err) {
    console.error("GPT 호출 에러:", err.response?.data || err.message || err);
    res.status(500).json({ error: "GPT 호출 실패" });
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

// ✅ 프롬프트 불러오기
const loadPrompt = (variables = {}) => {
  try {
    const promptPath = path.join(__dirname, "../prompt/prompt.txt");
    let prompt = fs.readFileSync(promptPath, "utf-8");

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

module.exports = {
  getChatPage,
  postChat,
  getChatLogsByUid, 
  getPlantDataByUid,
};
