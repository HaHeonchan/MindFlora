const express = require("express");
const router = express.Router();
const mainLayout = "../views/layouts/main.ejs";

router.get("/", (req, res) => {
  const locals = {
    title: "Home",
  };
  res.render("index", { locals, layout: mainLayout });
});

module.exports = router;
