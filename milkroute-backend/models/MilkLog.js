const mongoose = require("mongoose");

const milkLogSchema = new mongoose.Schema(
  {
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: "Farmer", required: true },
    date:     { type: String, required: true },   // ISO date string YYYY-MM-DD
    liters:   { type: Number, required: true, min: 0 },
    quality:  { type: String, enum: ["good", "average", "poor"], default: "good" },
    note:     { type: String, default: "" },
  },
  { timestamps: true }
);

// Compound index so queries by farmer + date are fast
milkLogSchema.index({ farmerId: 1, date: -1 });

module.exports = mongoose.model("MilkLog", milkLogSchema);