/**
 * Title: Start routes
 * Updated: 2025-04-07
 * Author: 조형준
 */
const express = require("express");
const { kakaoLogin, setPlantNickname, plantKindSelect, userAddressSave } = require("../controllers/startController");
const router = express.Router();

// kakao 로그인 라우터
router.post("/login", kakaoLogin);

// 식물 애칭 설정 라우터
router.post("/nickname", setPlantNickname);

// 식물 선택 라우터
router.put("/select", plantKindSelect);

// 유저 주소 설정 라우터
router.post("/address", userAddressSave);

module.exports = router;