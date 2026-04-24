const mongoose = require("mongoose");

const farmerSchema = new mongoose.Schema(
  {
    name:  { type: String, required: true, trim: true },
    milk:  { type: Number, required: true, min: 0 },  // expected litres/day
    phone: { type: String, trim: true, default: "" },
    lat:   { type: Number, default: 7.8731 },
    lng:   { type: Number, default: 80.7718 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Farmer", farmerSchema);