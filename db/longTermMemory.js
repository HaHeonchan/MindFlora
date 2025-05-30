const mongoose = require("mongoose");
const { Schema } = mongoose;

// 기억 항목 스키마
const memoryItemSchema = new Schema({
  role: String,
  text: String,
  key1: String,
  key2: String,
  key3: String,
  approval: Number,
  timestamp: Number,
}, { _id: false });

// longTermMemory 스키마
const longTermMemorySchema = new Schema({
  uid: { type: String, required: true },
  sector: {
    type: [memoryItemSchema],
    default: [],
    validate: {
      validator: function(arr) {
        return arr.length <= 10;
      },
      message: "sector memory는 최대 10개까지 저장할 수 있습니다."
    }
  },
  endless: {
    type: [memoryItemSchema],
    default: [],
    validate: {
      validator: function(arr) {
        return arr.length <= 5;
      },
      message: "endless memory는 최대 5개까지 저장할 수 있습니다."
    }
  }
}, { timestamps: true });

module.exports = mongoose.model("longTermMemory", longTermMemorySchema);