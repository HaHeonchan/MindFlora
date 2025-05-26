const OpenAI = require("openai");
const jwt = require("jsonwebtoken");
const ffi = require("ffi-napi");
const fs = require("fs");
const path = require("path");
const https = require('https');

const Chat = require("../db/chat");
const Plant = require("../db/plant");
const Memory = require("../db/memory");
const Summary = require("../db/summary");
const diaryReplyDB = require("../db/diaryReply");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const getChatPage = () => "chat_gemini";

const chatMemory = {};

const postChat = async (req, res) => {
  const { message, week, status, apiKey } = req.body;
  const { token } = req.cookies;
  // const userId = jwt.verify(token, process.env.JWT_SECRET).uid;
  const userId = "user-gjscks";

  if (!message) return res.status(400).json({ error: "메시지를 입력하세요." });


  let data;
  let temp, humidity, soilMoisture, light, ledOn, ledPower;
  try {
    data = await getSensorValue(apiKey);

    console.log("센서 데이터:", data.sensors);
    temp = data.sensors[0];
    humidity = data.sensors[1];
    soilMoisture = data.sensors[2];
    light = data.sensors[3];
    
    console.log("전원 상태:", data.onoff);
    ledOn = data.onoff;
    console.log("LED 값:", data.led);
    ledPower = data.led;
  } catch (err) {
    console.error("에러 발생:", err);
  }

  let plant = await Plant.findOne({ uid: userId });
  if (!plant) {
    plant = new Plant({ uid: userId, nickname: "애기장대", plant_kind: "애기장대",
      temperature_data: temp ? [temp] : [], humidity_data: humidity ? [humidity] : [],
      water_data: [null], light_data: [null], acidity_data: [null], growth_data: week ? [week] : [] });
  } else {
    if (humidity !== undefined) plant.humidity_data.push(humidity);
    if (temp !== undefined) plant.temperature_data.push(temp);
    plant.water_data.push(null); plant.light_data.push(null); plant.acidity_data.push(null);
    if (week !== undefined) plant.growth_data.push(week);
  }
  await plant.save();

  const fullMessage = `
  사용자 메세지 : ${message}\n
  온도: ${temp || "정보 없음"}°C, 
  습도: ${humidity || "정보 없음"}%, 
  토지 습도: ${soilMoisture || "정보 없음"}%, 
  조도: ${light || "정보 없음"},
  식물등 상태: ${ledOn || "정보 없음"},
  식물등 파워: ${ledPower || "정보 없음"},
  생애주기: ${week || 1}주차, 
  상태: ${status || "정보 없음"}`;

  if (!chatMemory[userId]) {
    const mems = await Memory.find({ uid: userId }).sort({ createdAt: 1 }).lean();
    chatMemory[userId] = mems.map(m => ({ role: m.role, content: m.content }));
  }

  const MAX_RECENT = 30;
  let summary = "";

  if (chatMemory[userId].length > 100 && chatMemory[userId].length % 20 === 0) {
    const oldHistory = chatMemory[userId].slice(0, -MAX_RECENT);
    const previousSummary = await Summary.findOne({ uid: userId }).sort({ createdAt: -1 });

    const summaryResponse = await openai.chat.completions.create({
      model: "gpt-4.1-nano-2025-04-14",
      messages: [
        { role: "system", content: "다음 사용자-어시스턴트 대화를 요약해줘. 핵심만 간결하게 서술해줘." },
        ...oldHistory
      ],
      max_tokens: 300,
    });

    summary = summaryResponse.choices?.[0]?.message?.content || "";
    if (summary) {
      await Summary.create({ uid: userId, content: summary });
    }
  } else {
    const existing = await Summary.findOne({ uid: userId }).sort({ createdAt: -1 });
    summary = existing?.content || "";
  }

  const basePrompt = loadPrompt({ nickname: plant.nickname || "애기장대" });
  const systemPrompt = summary ? `${basePrompt}\n\n[이전 대화 요약]\n${summary}` : basePrompt;

  console.log(systemPrompt);

  const recentHistory = chatMemory[userId].slice(-MAX_RECENT);
  const messages = [
    { role: "system", content: systemPrompt },
    ...recentHistory,
    { role: "user", content: fullMessage }
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-nano-2025-04-14",
      messages,
      max_completion_tokens: 2048,
    });

    const reply = completion.choices?.[0]?.message?.content;
    if (!reply) return res.status(500).json({ error: "GPT 응답이 비어있습니다." });

    const memoryDocs = [
      { uid: userId, role: "user", content: fullMessage },
      { uid: userId, role: "assistant", content: reply },
    ];
    await Memory.insertMany(memoryDocs);
    chatMemory[userId].push(...memoryDocs.map(({ role, content }) => ({ role, content })));

    await Chat.create({ uid: userId, reqText: fullMessage, resText: reply, sender: "user" });
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

function getSensorValue(apiKey) {
  const URL = `https://blackwhite12.pythonanywhere.com/get_binary/${apiKey}`;

  return new Promise((resolve, reject) => {
    https.get(URL, (response) => {
      const chunks = [];

      response.on("data", (chunk) => chunks.push(chunk));

      response.on("end", () => {
        const buffer = Buffer.concat(chunks);
        let offset = 0;
        const parsedData = {};

        while (offset < buffer.length) {
          const key = buffer.slice(offset, offset + 8).toString();
          const type = buffer[offset + 8];
          const len = buffer[offset + 9];
          const value = buffer.slice(offset + 10, offset + 10 + len);

          switch (type) {
            case 0x01:
              parsedData.sensors = [...value];
              break;
            case 0x02:
              parsedData.onoff = value.toString();
              break;
            case 0x03:
              parsedData.led = value[0];
              break;
          }

          offset += 8 + 1 + 1 + len;
        }

        resolve(parsedData);
      });

      response.on("error", (err) => reject(err));
    }).on("error", (err) => reject(err));
  });
}