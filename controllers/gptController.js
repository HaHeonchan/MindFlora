// controllers/gptController.js
const { OpenAI } = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID;

let threadId = null;

const getChatPage = () => {
  return "chat"; // 템플릿 이름만 리턴
};

const postChat = async (req, res) => {
  const { message, temp, humidity } = req.body;

  if (!message) {
    return res.status(400).json({ error: "메시지를 입력하세요." });
  }

  try {
    if (!threadId) {
      const thread = await openai.beta.threads.create();
      threadId = thread.id;
    }

    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: `현재 온도: ${temp || "null"}°C, 습도: ${humidity || "null"}%. 질문: ${message}`,
    });

    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: ASSISTANT_ID,
    });

    let runStatus;
    do {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    } while (runStatus.status !== "completed");

    const messages = await openai.beta.threads.messages.list(threadId);
    const assistantMessage = messages.data.find((msg) => msg.role === "assistant");

    let responseText = "응답을 받지 못했습니다.";
    if (assistantMessage?.content) {
      if (Array.isArray(assistantMessage.content)) {
        responseText = assistantMessage.content.map((item) => item.text?.value || "").join("\n");
      } else {
        responseText = assistantMessage.content;
      }
    }

    res.json({ response: responseText });
  } catch (err) {
    console.error("Assistant API 오류:", err);
    res.status(500).json({ err: "OpenAI 요청 처리 중 오류가 발생했습니다." });
  }
};

module.exports = { getChatPage, postChat };
