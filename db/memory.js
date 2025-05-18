const mongoose = require("mongoose");
const { Schema } = mongoose;

const memorySchema = new Schema(
  {
    uid: String,
    role: String,  // 'user' or 'assistant'
    content: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Memory", memorySchema);