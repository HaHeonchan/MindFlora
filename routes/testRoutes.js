const express = require("express");
const { getSensorData } = require("../controllers/testController");
const router = express.Router();

// 센서 데이터 조회 라우터
router.get("/sensor", getSensorData);

module.exports = router;