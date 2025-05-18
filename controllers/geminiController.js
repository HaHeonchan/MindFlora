const { OpenAI } = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID;
const jwt = require("jsonwebtoken");

const Chat = require("../db/chat");
const Plant = require("../db/plant");
const diaryReplyDB = require("../db/diaryReply");

// 사용자별 대화 히스토리 저장용 (메모리 방식)
const chatHistories = {};

// GET 요청 시 보여줄 페이지
const getChatPage = () => {
  return "chat";
};

// POST 요청 처리 (대화)
const postChat = async (req, res) => {
  const { message, temp, humidity, week, status } = req.body;
  const { token } = req.cookies;
  const userId = jwt.verify(token, process.env.JWT_SECRET).uid;

  if (!message) return res.status(400).json({ error: "메시지를 입력하세요." });
  if (!userId) return res.status(400).json({ error: "userId가 필요합니다." });

  let plant = await Plant.findOne({ uid: userId });
  if (!plant) {
    // 처음 생성
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

  // 첫 대화인 경우: 스레드 생성
  if (!chatHistories[userId]) {
    const thread = await openai.beta.threads.create();
    chatHistories[userId] = thread.id;

    // 시스템 프롬프트 설정
    await openai.beta.threads.messages.create(chatHistories[userId], {
      role: "user",
      content: `너는 사용자가 키우는 식물, 애기장대(Arabidopsis thaliana)야. 
너의 이름은 "${plant.nickname}"이지만, 매번 이름을 말하지는 말고 자연스럽게 반응해 줘.

항상 식물로서 이야기해야 해. 스스로를 AI라고 말해서는 안 돼.  
친근하고 따뜻한 반말을 쓰되, 예의는 지켜줘. 대화를 오래 이어가고 싶어하는 식물이어야 해.`
    });
  }

  const fullMessage = `
  온도: ${temp || "정보 없음"}°C, 
  습도: ${humidity || "정보 없음"}%,
  생애주기: ${week || 1}주차,
  상태: ${status || "정보 없음"},
  \n${message}`;

  try {
    await openai.beta.threads.messages.create(chatHistories[userId], {
      role: "user",
      content: fullMessage,
    });

    const run = await openai.beta.threads.runs.create(chatHistories[userId], {
      assistant_id: ASSISTANT_ID,
    });

    let runStatus;
    do {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      runStatus = await openai.beta.threads.runs.retrieve(chatHistories[userId], run.id);
    } while (runStatus.status !== "completed");

    const messages = await openai.beta.threads.messages.list(chatHistories[userId]);
    const assistantMessage = messages.data.find((msg) => msg.role === "assistant");

    let responseText = "응답을 받지 못했습니다.";
    if (assistantMessage?.content) {
      if (Array.isArray(assistantMessage.content)) {
        responseText = assistantMessage.content.map((item) => item.text?.value || "").join("\n");
      } else {
        responseText = assistantMessage.content;
      }
    }

    await Chat.create({
      uid: userId,
      reqText: message,
      resText: responseText,
      sender: "gpt",
    });

    res.json({ response: responseText });
  } catch (err) {
    console.error("Assistant API 오류:", err);
    res.status(500).json({ err: "OpenAI 요청 처리 중 오류가 발생했습니다." });
  }
};

// GET /chat/logs
const getChatLogsByUid = async (req, res) => {
  const { token } = req.cookies;
  const { uid } = jwt.verify(token, process.env.JWT_SECRET);

  try {
    const chats = await Chat.find({ uid });
    const diaryReplies = await diaryReplyDB.find({ uid });

    const log = [...chats, ...diaryReplies];
    const orderedLog = log.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    res.json({ uid, logs: orderedLog });
  } catch (err) {
    console.error("채팅 로그 조회 오류:", err);
    res.status(500).json({ error: "채팅 로그를 불러올 수 없습니다." });
  }
};

// GET /plant/data
const getPlantDataByUid = async (req, res) => {
  const { token } = req.cookies;
  const { uid } = jwt.verify(token, process.env.JWT_SECRET);

  try {
    const plant = await Plant.findOne({ uid });
    if (!plant) {
      return res.status(404).json({ error: "해당 사용자의 식물 정보가 없습니다." });
    }
    res.send(plant);
  } catch (err) {
    console.error("식물 정보 조회 오류:", err);
    res.status(500).json({ error: "식물 정보를 불러올 수 없습니다." });
  }
};

module.exports = { getChatPage, postChat, getChatLogsByUid, getPlantDataByUid };