/**
 * Title: plant DB
 * Updated: 2025-04-08
 * Author: 조형준
 */
const mongoose = require("mongoose")
const { Schema } = mongoose

const plantSchema = Schema({
    uid: String,
    nickname: String,
    plant_kind: String,
    water_data: Array,
    light_data: Array,
    humidity_data: Array,
    acidity_data: Array,
    growth_data: Array
}, { timestamps: true })

module.exports = mongoose.model("Plant", plantSchema)