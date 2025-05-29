/**
 * Title: BE main file
 * Updated: 2025-04-09
 * Author: 조형준
 */
require("dotenv").config();
const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const mainLayout = "../views/layouts/main.ejs";
const path = require("path");
const connect = require("./db/dbConnect.js")
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();
const port = process.env.PORT || 3000;

// Body-parser 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(expressLayouts);
app.set("view engine", "ejs");
app.set("views", "./views");
app.use(express.static("public"));
app.use(cookieParser())

// cors setting
const origin = ["http://localhost:3000", `http://localhost:8080`]
app.use(cors({
  origin: origin,
  credentials: true
}))

// mongoDB connect
connect()

app.use("/", require("./routes/main"));
app.use("/", require("./routes/gptRoutes"));
app.use("/", require("./routes/geminiRoutes"));
app.use("/", require("./routes/startRoutes"));
app.use("/diary", require("./routes/diaryRoutes.js"))
app.use("/user", require("./routes/mypageRoutes.js"))
app.use("/test", require("./routes/testRoutes.js"))
app.use("/api", require("./routes/ttsRoutes.js"))

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});