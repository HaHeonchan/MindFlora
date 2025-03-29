require("dotenv").config();
const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const mainLayout = "../views/layouts/main.ejs";
const path = require("path");



const app = express();
const port = process.env.PORT || 3000;

// Body-parser 미들웨어 (req.body 사용 가능하게 함)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(expressLayouts);
app.set("view engine", "ejs");
app.set("views", "./views");
app.use(express.static("public"));

app.use("/", require("./routes/main"));
app.use("/", require("./routes/gptRoutes"));
app.use("/", require("./routes/geminiRoutes"));

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});

app.get("/test", (req, res) => {
  const locals = {
    title: "Test",
  };
  res.render("test", { locals, layout: mainLayout });
});
