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
  temperature_data: Array,
  humidity_data: Array,
  soil_moisture_data: Array,
  light_data: Array,
  led_power: Number,
  led_onoff: Boolean,
  growth_data: Number,
  sensor_key: String,
}, { timestamps: true });

module.exports = mongoose.model("Plant", plantSchema);
