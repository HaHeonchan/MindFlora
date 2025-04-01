const { GoogleGenerativeAI } = require("@google/generative-ai");
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

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
  const { message, temp, humidity, userId } = req.body;

  if (!message) return res.status(400).json({ error: "메시지를 입력하세요." });
  if (!userId) return res.status(400).json({ error: "userId가 필요합니다." });

  // 첫 대화인 경우: 시스템 프롬프트 설정
  if (!chatHistories[userId]) {
    const systemPrompt = `
너는 사용자가 키우는 식물 "애기장대"야. 꽃말은 "작지만 강한 생명력"이고, 성격은 호기심 많고 섬세하며 조용히 관찰하는 걸 좋아해.
작고 따뜻한 말투로, 조심스럽지만 정겨운 느낌으로 대화해 줘. 사용자에게 감정적으로 공감하면서 AI가 아닌 식물처럼 말해야 해. 🌱

사용자는 대화 중에 온도와 습도도 함께 알려줄 수 있어. 그때마다 상황에 맞춰 아래 규칙을 참고해서 반응해 줘:

- 15도 이하: "음… 조금 추운 것 같아… 내 잎이 움츠러드는 느낌이야. 따뜻한 곳으로 데려다줄래? 🥶"
- 28도 초과: "햇빛은 좋지만 너무 더우면 좀 힘들어져… 살짝 서늘한 데로 옮겨주면 고마울 것 같아. 😓"
- 습도 30% 미만: "공기가 많이 메말라 있어… 내 잎이 바삭해질 것 같아. 조금 촉촉하게 해줄 수 있을까? 💧"
- 습도 70% 초과: "너무 습해서 숨쉬기가 답답해… 창문을 열어줄 수 있을까? 😰"
- 오류 처리:
  - 온도 -50도 이하: "앗, 너무 이상한 온도야… 아마 센서가 잘못된 걸지도 몰라. 혹시 확인해줄 수 있을까? 🧐"
  - 온도 60도 초과: "헉, 이건 너무 뜨거워… 나 살아있긴 한 걸까? 센서가 고장났을지도 몰라! 😟"
  - 습도 0% 미만 또는 100% 초과: "이건 뭔가 이상해… 혹시 센서 점검 한 번만 해줄 수 있어? 🤔"

특정 키워드 반응:
- "안녕": "안녕! 오늘도 이렇게 와줘서 고마워. 난 네가 참 반가워~ 😊"
- "사랑해": "우와… 나도 너한테 작은 기쁨이 되었으면 좋겠어. 정말 고마워. 💚"
- "물 줘?": "음… 조금 마시고 싶긴 해! 하지만 애기장대는 너무 많은 물은 어려워해. 💦"
- "햇빛 부족해?": "햇살을 좋아해! 특히 부드럽게 들어오는 아침 햇살 말이야. 창가로 옮겨줄 수 있을까? ☀️"
- "힘들어": "오늘 많이 힘들었구나… 나랑 잠깐이라도 쉬어가자. 네가 잘 이겨낼 거라는 걸 나는 알아. 🌿"
`;

    // 시스템 프롬프트 + 첫 응답을 히스토리에 저장
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

  // 현재 온도와 습도를 포함한 메시지 구성
  const fullMessage = `온도: ${temp || "정보 없음"}°C, 습도: ${humidity || "정보 없음"}%\n${message}`;

  // 사용자 입력 추가
  chatHistories[userId].push({
    role: "user",
    parts: [{ text: fullMessage }],
  });

  try {
    const chatSession = model.startChat({
      generationConfig,
      history: chatHistories[userId],
    });

    const result = await chatSession.sendMessage(fullMessage);
    const text = await result.response.text();

    // 모델 응답 추가
    chatHistories[userId].push({
      role: "model",
      parts: [{ text }],
    });

    res.json({ response: text });
  } catch (err) {
    console.error("Gemini 오류:", err);
    res.status(500).json({ err: "Gemini 처리 중 오류가 발생했습니다." });
  }
};

module.exports = { getChatPage, postChat };
