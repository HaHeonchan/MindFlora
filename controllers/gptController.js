const OpenAI = require("openai");
const jwt = require("jsonwebtoken");
const ffi = require("ffi-napi");
const ref = require('ref-napi');
const fs = require("fs");
const path = require("path");
const https = require('https');
const os = require("os");

const Chat = require("../db/chat");
const Plant = require("../db/plant");
const User = require("../db/user");

const Memory = require("../db/memory");
const Summary = require("../db/summary");
const diaryReplyDB = require("../db/diaryReply");
const LongTermMemory = require("../db/longTermMemory");
const { json } = require("stream/consumers");
const User = require("../db/user")

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const getChatPage = () => "chat_gemini";

const chatMemory = {};
const api_key = process.env.OPENAI_API_KEY;
const test_sensor_key = '4FC259BF';

let lib = null;

try {
  const isLinux = os.platform() === "linux";
  const libPath = isLinux ? "./mymodule.so" : "./mymodule.dll";

  lib = ffi.Library(libPath, {
    gpt_json_string: ['string', ['string', 'string']],
    analyze_text: ['string', ['string', 'string']],
    prompt_builder: ['string', ['string', 'string']],
    get_binary_json: ['string', ['string']],
    initialize_db: ["bool", []],
    start_chat: ["bool", []],
    end_chat: ["void", []],
    add_nonsector_from_json: ["bool", ["string"]],
    post_binary_c: ["void", ["string", "uint8", "uint8", "uint8", "uint8"]],
    onoff_bin_c: ['string', ['string', 'uint8', 'int']]
  });
} catch (err) {
  console.error("❌ FFI 모듈 로딩 실패:", err.message);
}

const postChatforDLL = async (req, res) => {
  // gpt_json_string
  // const gpt_json_string_result = lib.gpt_json_string(loadPrompt({ nickname: plant.nickname || "애기장대" }), api_key);
  // const responseObj = JSON.parse(gpt_json_string_result);
  // const content = responseObj.choices?.[0]?.message?.content;

  //analyze_text
  // const analyze_text_result = lib.analyze_text(content, api_key);

  //prompt_builder
  // const prompt_builder_result = lib.prompt_builder(api_key, "응애장대");

  //get_binary_json
  // const get_binary_json_result = JSON.parse(lib.get_binary_json(sensor_key));

  //initialize_db
  // const result = lib.initialize_db();
  // console.log("DB 초기화 성공:", result);

  //nonsector
  // const answer = {
  //   id: 0,
  //   chat_id: "chat123",
  //   role: "user",
  //   content: "오늘 날씨 어때?",
  //   timestamp: Math.floor(Date.now() / 1000),
  //   key1: "날씨",
  //   key2: "기분",
  //   key3: "대화"
  // };
  // const success = lib.add_nonsector_from_json(JSON.stringify(answer));

  const { message } = req.body;
  const encodedToken = req.headers['authorization'].split(' ')[1]

  let userId = "user-test-p"; // 기본값 설정
  const username = "홍길동";

  // User DB 활용해서 정보 가져오기
  try {
    const decoded = jwt.verify(encodedToken, process.env.JWT_SECRET);
    if (decoded && decoded.uid) {
      const uid = decoded.uid

      userId = uid;
      const user = await User.findOne({ id: uid })
      username = user.nickname
    }
  } catch (err) {
    console.warn("JWT 검증 실패, 테스트 아이디 사용:", err.message);
  }

  if (!message) return res.status(400).json({ error: "메시지를 입력하세요." });

  try {
    let user = await User.findOne({uid: userId});
    username = user.nickname;  
  } catch (err) {
    console.warn("유저 이름 가져오기 실패, 테스트 이름 사용:", err.message);
  }

let plant = await Plant.findOne({ uid: userId });

let isNewPlant = false;

if (!plant) {
  isNewPlant = true;
  plant = new Plant({
    uid: userId,
    nickname: "애기장대",
    plant_kind: "애기장대",
    temperature_data: [],
    humidity_data: [],
    soil_moisture_data: [],
    light_data: [],
    led_power: 0,
    led_onoff: false,
    growth_data: 1,
    sensor_key: test_sensor_key
  });
}

const data = JSON.parse(lib.get_binary_json(test_sensor_key));

if (!isNewPlant) {
  const now = new Date();
  const createdAt = new Date(plant.createdAt);
  const diffMs = now - createdAt;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  let plant_week = Math.floor(diffDays / 7);
  if (plant_week < 1) {
    plant_week = 1;
  }
  plant.growth_data = plant_week;
}

if (data.sensor1 !== undefined) plant.temperature_data.push(data.sensor1);
if (data.sensor2 !== undefined) plant.humidity_data.push(data.sensor2);
if (data.sensor3 !== undefined) plant.soil_moisture_data.push(data.sensor3);
if (data.sensor4 !== undefined) plant.light_data.push(data.sensor4);
if (data.led !== undefined) plant.led_power = data.led;
if (data.onoff !== undefined) plant.led_onoff = data.onoff;

await plant.save();
  //사용자 메세지 분석
  const analyze_text_result_user = JSON.parse(lib.analyze_text(message, api_key));
  let pump = 0
  if(analyze_text_result_user.water_pump){
    pump = 1;
  }
  lib.onoff_bin_c(test_sensor_key, analyze_text_result_user.water_pump, 100)


  if (!chatMemory[userId]) {
    const mems = await Memory.find({ uid: userId }).sort({ createdAt: 1 }).lean();
    chatMemory[userId] = mems.map(m => ({ role: m.role, content: m.content }));
  }

  const MAX_RECENT = 3;
  const historySlice = chatMemory[userId].slice(-MAX_RECENT); 
  
  const historyText = historySlice.map(m => `[${m.role}] ${m.content}`).join('\n');

  //장기&영구 기억 로드
  const memoryDoc = await LongTermMemory.findOne({ uid: userId });
  let sector = "";
  let endless = "";

  // 장기 기억 문자열 구성
  if (memoryDoc && memoryDoc.sector.length > 0) {
    sector = memoryDoc.sector.map(mem => {
      return `- [${mem.role}] ${mem.text} (인상도: ${mem.approval})`;
    }).join('\n');
  }

  // 영구 기억 문자열 구성
  if (memoryDoc && memoryDoc.endless.length > 0) {
    endless = memoryDoc.endless.map(mem => {
      return `- [${mem.role}] ${mem.text} (인상도: ${mem.approval})`;
    }).join('\n');
  }

  const plantPrompt = loadPrompt(username);
  const prompt_builder_result = lib.prompt_builder(test_sensor_key, "응애장대");

const fullMessage = `
[시스템 프롬프트]
${plantPrompt}

[식물 정보]
${prompt_builder_result}
- 생애 주기 : ${plant.growth_data}주차 째

[과거 정보]
중요하지 않으면 언급하지 마
${sector}
${endless}

이전 대화는 참고만, 현재 사용자의 입력을 최우선으로 반응.
[최근 대화 내역]
${historyText}

[사용자 입력]
"${message}"

위 내용을 바탕으로 자연스럽고 연관성 있는 답변을 생성하세요.
`;

  //gpt 호출
  const gpt_json_string_result = lib.gpt_json_string(fullMessage, api_key);
  const responseObj = JSON.parse(gpt_json_string_result);
  const content = responseObj.choices?.[0]?.message?.content;

  const analyze_text_result_ai = JSON.parse(lib.analyze_text(content, api_key));

  //전체 기억 저장장
  const memoryDocs = [
    { uid: userId, role: "user", content: message },
    { uid: userId, role: "assistant", content: content },
  ];
  await Memory.insertMany(memoryDocs);
  chatMemory[userId].push(...memoryDocs.map(({ role, content }) => ({ role, content })));

  //장기기억 갱신
  memorize(userId, analyze_text_result_user, analyze_text_result_ai, message, content)

  res.json({ response: content, prompt: fullMessage, analyzeUser: analyze_text_result_user, analyzeAi: analyze_text_result_ai });
};

const getBinary = async (req, res) => {
  const sensorKey = req.body?.sensorKey || test_sensor_key;
  if (sensorKey == test_sensor_key) {
    console.log("테스트 API 키를 사용합니다.")
  };
  const test = JSON.parse(lib.get_binary_json(sensorKey));
  res.json({ test });
};

const getDecodedBinary = async (req, res) => {
  const sensorKey = req.body?.sensorKey || test_sensor_key;
  if (sensorKey === test_sensor_key) {
    console.log("테스트 API 키를 사용합니다.");
  }

  const raw = JSON.parse(lib.get_binary_json(sensorKey)); // { sensor1, ..., onoff, led }
  // 변환 수식 적용
  const decodeSensor = (val, scale) =>
    typeof val === 'number' ? Math.round((val / 255.0) * scale) : null;

  const decoded = {
    raw,
    sensor: {
      temp: raw.sensor1,
      humidity: raw.sensor2,
      soil: raw.sensor3,
      light: raw.sensor4,
      onoff: raw.onoff,
      led: raw.led,
    }
  };

  res.json(decoded);
};

const postBinary = async (req, res) => {
  const sensorKey = req.body?.sensorKey || test_sensor_key;
  const { temp, humidity, soil, light } = req.body;
  if (sensorKey == test_sensor_key) {
    console.log("테스트 API 키를 사용합니다.")
  };

  lib.post_binary_c(sensorKey, temp, humidity, soil, light);
  const test = JSON.parse(lib.get_binary_json(sensorKey));
  res.json({ test });
};

const postChat = async (req, res) => {
  const { message, week, status, apiKey } = req.body;
  // const { token } = req.cookies;
  // const userId = jwt.verify(token, process.env.JWT_SECRET).uid;
  const userId = "user-test";

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
    plant = new Plant({
      uid: userId, nickname: "애기장대", plant_kind: "애기장대",
      temperature_data: temp ? [temp] : [], humidity_data: humidity ? [humidity] : [],
      water_data: [null], light_data: [null], acidity_data: [null], growth_data: week ? [week] : []
    });
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

    await Chat.create({ uid: userId, reqText: fullMessage, resText: reply });
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
  const encodedToken = req.headers['authorization'].split(' ')[1]
  const { uid } = jwt.verify(encodedToken, process.env.JWT_SECRET);
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
  postChatforDLL,
  getBinary,
  postBinary,
  getDecodedBinary,
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

function memorize(uid, newUserMemory, newAiMemory, user_content, ai_content) {
  const user = {
    role: "user", // 또는 "assistant" 등 실제 상황에 맞게 지정
    text: user_content, // 사용자가 분석한 원문 텍스트
    key1: newUserMemory.keywords[0] || "",
    key2: newUserMemory.keywords[1] || "",
    key3: newUserMemory.keywords[2] || "",
    approval: newUserMemory.impression || 0,
    timestamp: Date.now(),
  };

  const assistant = {
    role: "assistant", // 또는 "assistant" 등 실제 상황에 맞게 지정
    text: ai_content, // 사용자가 분석한 원문 텍스트
    key1: newAiMemory.keywords[0] || "",
    key2: newAiMemory.keywords[1] || "",
    key3: newAiMemory.keywords[2] || "",
    approval: newAiMemory.impression || 0,
    timestamp: Date.now(),
  };

  if (user.approval >= 9 && assistant.approval >= 9) {
    addToEndlessMemory(uid, user)
  } else if (user.approval >= 3 && assistant.approval >= 3) {
    addToSectorMemory(uid, user)
  }

  // if (assistant.approval >= 9) {
  //   addToEndlessMemory(uid, assistant)
  // } else if (assistant.approval >= 3) {
  //   addToSectorMemory(uid, assistant)
  // }
};

// 장기 기억 추가 (최대 10개)
async function addToSectorMemory(uid, newMemory) {
  await LongTermMemory.findOneAndUpdate(
    { uid },
    {
      $push: {
        sector: {
          $each: [newMemory],
          $slice: -10 // 최신 10개만 유지
        }
      }
    },
    { upsert: true, new: true }
  );
  console.log("장기기억 갱신!");
}

// 영구 기억 추가 (최대 5개)
async function addToEndlessMemory(uid, newMemory) {
  await LongTermMemory.findOneAndUpdate(
    { uid },
    {
      $push: {
        endless: {
          $each: [newMemory],
          $slice: -5 // 최신 5개만 유지
        }
      }
    },
    { upsert: true, new: true }
  );
  console.log("영구기억 갱신!");
}
