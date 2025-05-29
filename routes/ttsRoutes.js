const express = require('express');
const router = express.Router();
const { textToSpeech } = require('../services/ttsService');

// TTS 변환 엔드포인트
router.post('/tts', async (req, res) => {
  try {
    const { text, emotion, intensity } = req.body;
    
    // 스트림 설정
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Transfer-Encoding', 'chunked');
    
    // TTS 스트림을 클라이언트로 직접 전송
    const audioStream = await textToSpeech(text, emotion, intensity);
    audioStream.pipe(res);
    
  } catch (error) {
    console.error('TTS 처리 중 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || '음성 생성 중 오류가 발생했습니다.' 
    });
  }
});

module.exports = router; 