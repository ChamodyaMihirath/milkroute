const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: "Farmer", required: true },
    amount:   { type: Number, required: true, min: 0 },
    date:     { type: String, required: true },   // YYYY-MM-DD
    note:     { type: String, default: "" },
  },
  { timestamps: true }
);

paymentSchema.index({ farmerId: 1 });

module.exports = mongoose.model("Payment", paymentSchema);