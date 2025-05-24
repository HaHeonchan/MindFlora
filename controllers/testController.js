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




const getSensorData = async (req, res) => {
    const { apiKey } = req.body;
    const URL = `https://blackwhite12.pythonanywhere.com/get_binary/${apiKey}`;
  
    https.get(URL, (response) => {
      let chunks = [];
  
      response.on("data", (chunk) => {
        chunks.push(chunk);
      });
  
      response.on("end", () => {
        const buffer = Buffer.concat(chunks);
  
        let offset = 0;
        const parsedData = {};
  
        while (offset < buffer.length) {
          const key = buffer.slice(offset, offset + 8).toString(); // API key
          const type = buffer[offset + 8];  // 0x01, 0x02, 0x03
          const len = buffer[offset + 9];   // length
          const value = buffer.slice(offset + 10, offset + 10 + len);
  
          switch (type) {
            case 0x01: // 센서 데이터
              parsedData.sensors = [...value];
              break;
            case 0x02: // on/off 문자
              parsedData.onoff = value.toString();
              break;
            case 0x03: // led 값
              parsedData.led = value[0];
              break;
          }
  
          offset += 8 + 1 + 1 + len;
        }
  
        res.json(parsedData);
      });
  
      response.on("error", (err) => {
        console.error("응답 오류:", err);
        res.status(500).json({ error: "응답 처리 중 오류 발생" });
      });
    }).on("error", (err) => {
      console.error("요청 오류:", err);
      res.status(500).json({ error: "서버 요청 실패" });
    });
  };
  
  module.exports = {
    getSensorData,
  };