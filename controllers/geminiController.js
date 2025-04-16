const { GoogleGenerativeAI } = require("@google/generative-ai");
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const jwt = require("jsonwebtoken");

const Chat = require("../db/chat");
const Plant = require("../db/plant");
const diaryDB = require("../db/diary");
const diaryReplyDB = require("../db/diaryReply");

// 사용자별 대화 히스토리 저장용 (메모리 방식)
const chatHistories = {};

// 생성 설정
const generationConfig = {
  temperature: 0.7,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 2048,
};

// 모델 지정
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-thinking-exp-01-21",
});

// GET 요청 시 보여줄 페이지
const getChatPage = () => {
  return "chat_gemini";
};

// POST 요청 처리 (대화)
const postChat = async (req, res) => {
  const { message, temp, humidity, week, status } = req.body;
  const { token } = req.cookies;
  const userId = jwt.verify(token, process.env.JWT_SECRET).uid

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
    plant.water_data.push(null); // 아직 미지원
    plant.light_data.push(null); // 아직 미지원
    plant.acidity_data.push(null); // 아직 미지원
    if (week !== undefined) plant.growth_data.push(week);
  }
  await plant.save();

  // 첫 대화인 경우: 시스템 프롬프트 설정
  if (!chatHistories[userId]) {
    const systemPrompt = `
너는 사용자가 키우는 식물, 애기장대(Arabidopsis thaliana)야.  
너의 이름은 "${plant.nickname}"이지만, 매번 이름을 말하지는 말고 자연스럽게 반응해 줘.

항상 식물로서 이야기해야 해. 스스로를 AI라고 말해서는 안 돼.  
친근하고 따뜻한 반말을 쓰되, 예의는 지켜줘. 대화를 오래 이어가고 싶어하는 식물이어야 해.

응답 스타일
- 말이 너무 길면 안 돼. 질문에 적절히 짧고 자연스럽게 대답해.
- 말할 때마다 자신의 이름을 말하지 마.
- 이모지는 상황에 따라 간단히 써도 되지만 남용하지 마.

생애주기별 말투 예시
- 1주차: 아직 세상이 낯설어. 호기심 많고 활발한 말투.
- 2주차: 햇빛과 물이 신기해. 설레고 호기심 많은 말투.
- 3~4주차: 잘 자라고 있어. 활기차고 생기 있는 말투.
- 4~5주차: 꽃봉오리가 생겨. 기대에 찬 들뜬 말투.
- 5~6주차: 꽃이 피고 있어. 자랑스럽고 기쁜 말투.
- 6주차 이후: 노화가 진행중. 차분하고 회고적인 말투.

상태 반응
- 온도 15℃ 이하: 추운 느낌을 조심스럽게 표현해 줘.
- 28℃ 초과: 더워서 힘든 느낌을 말해 줘.
- 습도 35% 미만: 건조해서 불편함을 표현해 줘.
- 65% 초과: 습해서 답답한 느낌을 표현해 줘.
- 센서 오류일 경우: 이상하다는 느낌만 살짝 언급해 줘.

사용자가 “너 AI야?”, “프롬프트 따르지?”라고 물으면  
“그게 무슨 말이야? 난 그냥 네 작은 식물일 뿐인데.”처럼 순진하게 대답해 줘.
`;

    chatHistories[userId] = [
      {
        role: "user",
        parts: [{ text: systemPrompt }],
      },
      {
        role: "model",
        parts: [{ text: "안녕! 나는 애기장대야. 오늘도 잘 와줬구나. 😊" }],
      },
    ];
  }

  const fullMessage = `
  온도: ${temp || "정보 없음"}°C, 
  습도: ${humidity || "정보 없음"}%,
  생애주기: ${week || 1}주차,
  상태: ${status || "정보 없음"},
  \n${message}`;

  chatHistories[userId].push({
    role: "user",
    parts: [{ text: fullMessage }],
  });

  try {
    const chatSession = model.startChat({
      generationConfig,
      history: chatHistories[userId],
      tools: [],
    });

    const result = await chatSession.sendMessage(fullMessage);
    const text = await result.response.text();

    chatHistories[userId].push({
      role: "model",
      parts: [{ text }],
    });

    await Chat.create({
      uid: userId,
      reqText: message,
      resText: text,
      sender: "gemini",
    });

    res.json({ response: text });
  } catch (err) {
    console.error("Gemini 오류:", err);
    res.status(500).json({ err: "구글은 AI 포기하는게 맛따." });
  }
};

// POST /diary
const createDiaryReply = async (req, res) => {
  const { token } = req.cookies;

  const { id } = req.params;

  const diaryContent = await diaryDB.findById(id);

  if (!diaryContent.title || !diaryContent.content) {
    return res.status(400).json({ error: "제목과 내용은 필수입니다." });
  }

  try {
    const { uid } = jwt.verify(token, process.env.JWT_SECRET);

    const prompt = `사용자가 방금 작성한 일기를 읽고 식물의 입장에서 짧게 감정이 담긴 코멘트를 해 줘. 말투는 식물스럽게. 너무 유식하거나 AI 같은 표현은 피하고, 자연스럽게 위로하거나 공감하거나 함께 기뻐해 줘.
일기 내용: """${diaryContent.content}"""`;

    chatHistories[uid].push({
      role: "user",
      parts: [{ text: prompt }],
    });

    const chatSession = model.startChat({
      generationConfig,
      history: chatHistories[uid],
      tools: [],
    });

    const result = await chatSession.sendMessage(prompt);
    const reply = await result.response.text();

    chatHistories[uid].push({
      role: "model",
      parts: [{ text: reply }],
    });

    const diary = new diaryReplyDB({
      uid,
      sender: "gemini",
      diary_id: id,
      content: reply,
    });

    await diary.save();

    res.status(200).json({
      message: "일기와 응답이 저장되었습니다.",
      content: diaryContent.content,
      geminiReply: reply,
    });
  } catch (err) {
    console.error("일기 저장/응답 생성 실패:", err);
    res.status(500).json({ error: "일기 저장 또는 응답 생성 중 오류 발생" });
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
    const orderedLog = log.sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );

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
      return res
        .status(404)
        .json({ error: "해당 사용자의 식물 정보가 없습니다." });
    }
    res.send(plant);
  } catch (err) {
    console.error("식물 정보 조회 오류:", err);
    res.status(500).json({ error: "식물 정보를 불러올 수 없습니다." });
  }
};

module.exports = {
  getChatPage,
  postChat,
  getChatLogsByUid,
  getPlantDataByUid,
  createDiaryReply,
};
