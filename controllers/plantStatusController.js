const Plant = require("../db/plant")

const getPlantDataByUid = async (req, res) => {
  try {
    const uid = req.token
    const plant = await Plant.findOne({ uid });
    
    if (!plant) return res.status(404).json({ error: "해당 사용자의 식물 정보가 없습니다." });
    res.send(plant);
  } catch (err) {
    console.error("식물 정보 조회 오류:", err);
    res.status(500).json({ error: "식물 정보를 불러올 수 없습니다." });
  }
};

const uploadPlantProfile = async(req, res) => {
  try {
    const fileLocation = req?.file?.location ?? null;
    const uid = req?.token ?? "user-test-p";

    await Plant.findOneAndUpdate({ uid }, { 
      plant_profile: fileLocation
    })

    res.status(200).json({ message: "plant profile updated"})
  } catch (e) {
    res.status(400).json({ message: "plant profile update fail"})
  }
}

module.exports = {
  getPlantDataByUid,
  uploadPlantProfile
}