/**
 * Title: plant DB
 * Updated: 2025-04-08
 * Author: 조형준
 */
const mongoose = require("mongoose");
const { Schema } = mongoose;

const plantSchema = Schema({
  uid: String,
  nickname: String,
  plant_kind: String,
  temperature_data: Number,
  humidity_data: Number,
  soil_moisture_data: Number,
  light_data: Number,
  led_power: Number,
  led_onoff: Boolean,
  growth_data: Number,
  sensor_key: String,
  plant_profile: String,
}, { timestamps: true });

module.exports = mongoose.model("Plant", plantSchema);
