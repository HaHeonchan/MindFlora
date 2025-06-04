const axios = require('axios');
require('dotenv').config();

// ElevenLabs API 키와 음성 ID
const API_KEY = process.env.ELEVENLABS_API_KEY || 'sk_29c8a49d20abb32c049d23e2190a16ba7090bbd6cff6f3dd';
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

// 감정에 따른 음성 파라미터 조정
const emotionSettings = {
  // 기본 설정
  neutral: {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0,
    use_speaker_boost: true
  },
  // 기쁨 - 높은 피치, 빠른 속도
  happy: {
    stability: 0.3,
    similarity_boost: 0.7,
    style: 0.3,
    use_speaker_boost: true
  },
  // 슬픔 - 낮은 피치, 느린 속도
  sad: {
    stability: 0.7,
    similarity_boost: 0.8,
    style: 0.2,
    use_speaker_boost: true
  },
  // 화남 - 높은 강도, 약간 거친 음성
  angry: {
    stability: 0.3,
    similarity_boost: 0.5,
    style: 0.4,
    use_speaker_boost: true
  },
  // 놀람 - 높은 피치, 약간 빠른 속도
  surprised: {
    stability: 0.4,
    similarity_boost: 0.6,
    style: 0.3,
    use_speaker_boost: true
  }
};

/**
 * 텍스트를 음성으로 변환하고 스트림으로 반환하는 함수
 * @param {string} text - 음성으로 변환할 텍스트
 * @param {string} emotion - 감정 타입 (neutral, happy, sad, angry, surprised)
 * @param {number} intensity - 감정 강도 (0.0 ~ 1.0)
 * @returns {Promise<ReadableStream>} - 오디오 스트림
 */
async function textToSpeech(text, emotion = 'neutral', intensity = 0.5) {
  try {
    // 감정이 유효한지 확인
    const validEmotion = emotionSettings[emotion] ? emotion : 'neutral';
    
    // 기본 설정 가져오기
    const voiceSettings = { ...emotionSettings[validEmotion] };
    
    // 감정 강도에 따라 파라미터 조정
    if (intensity > 0) {
      // 강도에 따라 파라미터 스케일링
      if (validEmotion === 'happy' || validEmotion === 'angry' || validEmotion === 'surprised') {
        voiceSettings.stability = Math.max(0.1, voiceSettings.stability - (intensity * 0.2));
        voiceSettings.style = Math.min(1.0, voiceSettings.style + (intensity * 0.3));
      } else if (validEmotion === 'sad') {
        voiceSettings.stability = Math.min(0.9, voiceSettings.stability + (intensity * 0.2));
        voiceSettings.style = Math.min(1.0, voiceSettings.style + (intensity * 0.2));
      }
    }

    // ElevenLabs API 호출
    const response = await axios({
      method: 'POST',
      url: `https://api.elevenlabs.io/v1/text-to-speech/${DEFAULT_VOICE_ID}/stream`,
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': API_KEY
      },
      data: {
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: voiceSettings
      },
      responseType: 'stream'
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      const { status, data } = error.response;
      console.error(`TTS API 호출 실패 (상태: ${status}):`, data);
    } else {
      console.error('TTS API 호출 중 알 수 없는 오류:', error.message);
    }
    throw new Error('음성 생성에 실패했습니다.');
  }
}

module.exports = {
  textToSpeech
}; 