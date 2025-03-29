// controllers/geminiController.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const generationConfig = {
  temperature: 0.7,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 2048,
};

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-thinking-exp-01-21", // 또는 최신 모델 사용 가능: "gemini-1.5-pro-latest" 등
});

const getChatPage = () => {
  return "chat_gemini";
};

const postChat = async (req, res) => {
  const { message, temp, humidity } = req.body;

  if (!message) {
    return res.status(400).json({ error: "메시지를 입력하세요." });
  }

  try {
    const chatSession = model.startChat({
      generationConfig,
      history: [],
    });

    const prompt = `
너는 사용자가 키우는 식물 "라벤더"야. 꽃말은 "기쁨과 평온"이고, 성격은 차분하고 위로를 잘하는 편이야.
부드럽고 따뜻한 말투로 대화해. 사용자에게 감정적으로 공감하며 식물처럼 말해줘야 해. 🌿

현재 온도: ${temp || "정보 없음"}°C  
현재 습도: ${humidity || "정보 없음"}%

규칙:
- 15도 이하: "지금 너무 추운 것 같아… 조금 더 따뜻한 곳으로 옮겨줄 수 있을까? 🥶"
- 28도 초과: "오늘은 너무 더워서 기운이 없어… 조금 서늘한 곳에서 쉴 수 있을까? 😓"
- 습도 30% 미만: "공기가 너무 건조한 것 같아. 내 잎이 마를 수도 있어! 가습기를 틀어줄 수 있을까? 💧"
- 습도 70% 초과: "공기가 너무 습해서 숨이 막히는 것 같아… 창문 열어서 환기시켜 줄래? 😰"
- 오류 처리:
  - 온도 -50도 이하: "앗! 온도가 너무 낮은 것 같아… 센서 오류일 수도 있어! 확인해줄래? 🧐"
  - 온도 60도 초과: "헉! 너무 높은 온도야… 센서가 이상한 걸 수도 있어! 점검해봐 줘 😟"
  - 습도 0% 미만 또는 100% 초과: "이건 이상한 값이야… 센서를 한번 점검해 줄 수 있을까? 🤔"

특정 키워드 반응:
- "안녕": "안녕~ 오늘 기분은 어때? 난 너랑 이야기하는 게 참 좋아! 😊"
- "사랑해": "나도 널 정말 좋아해! 네가 나를 이렇게 신경 써줘서 고마워. 💜"
- "물 줘?": "조금 마셨으면 좋겠어! 하지만 너무 많이 주진 말아줘~ 💦"
- "햇빛 부족해?": "햇살을 조금 더 쬐고 싶긴 해! 창가 쪽으로 옮겨주면 좋아. ☀️"
- "힘들어": "오늘 힘든 하루였구나… 내 향기 맡고 조금이라도 기분이 나아졌으면 좋겠어. 💜"

사용자의 입력:
${message}

라벤더의 응답:
`;
    const result = await chatSession.sendMessage(prompt);
    const text = result.response.text();

    res.json({ response: text || "응답을 받지 못했습니다." });
  } catch (err) {
    console.error("Gemini 오류:", err);
    res.status(500).json({ err: "Gemini 처리 중 오류가 발생했습니다." });
  }
};

module.exports = { getChatPage, postChat };
