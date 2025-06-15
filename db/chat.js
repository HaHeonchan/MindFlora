/**
 * Title: chat DB
 * Updated: 2025-04-08
 * Author: 조형준
 */
const mongoose = require("mongoose");
const { Schema } = mongoose;

const chatSchema = Schema(
  {
    uid: String,
    reqText: String,
    resText: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Chat", chatSchema);
