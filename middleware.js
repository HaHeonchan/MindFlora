const multer = require('multer')
const multerS3 = require('multer-s3')
const AWS = require("aws-sdk");
const path = require('path')
const jwt = require('jsonwebtoken')

//* aws region 및 자격증명 설정
AWS.config.update({
   accessKeyId: process.env.S3_ACCESS_KEY_ID,
   secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
   region: 'ap-northeast-2',
});

//* AWS S3 multer 설정
const upload = multer({
   //* 저장공간
   // s3에 저장
   storage: multerS3({
      // 저장 위치
      s3: new AWS.S3(),
      bucket: 'mind-flora-bucket',
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key(req, file, cb) {
         cb(null, `${Date.now()}_${path.basename(file.originalname)}`) // original 폴더안에다 파일을 저장
      },
   }),
   //* 용량 제한
   limits: { fileSize: 5 * 1024 * 1024 },
});

const jwtAuth = async(req, res, next)  => {
   const encodedToken = req.headers['authorization'].split(' ')[1]
   const { uid } = jwt.verify(encodedToken, process.env.JWT_SECRET);
   req.token = uid;

   next();
}

module.exports = { upload, jwtAuth }