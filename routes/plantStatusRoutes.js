const express = require("express");
const router = express.Router();
const { jwtAuth, upload } = require("../middleware");
const {
    getPlantDataByUid,
    uploadPlantProfile
} = require("../controllers/plantStatusController");

router
.get("/", jwtAuth, getPlantDataByUid)
.put("/profile", jwtAuth, upload.single('file'), uploadPlantProfile)

module.exports = router