const express = require("express");
const router  = express.Router();
const Farmer  = require("../models/Farmer");

// GET /api/farmers — list all
router.get("/", async (req, res) => {
  try {
    const farmers = await Farmer.find().sort({ createdAt: 1 });
    res.json(farmers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/farmers — create
router.post("/", async (req, res) => {
  try {
    const { name, milk, phone, lat, lng } = req.body;
    if (!name || milk == null) return res.status(400).json({ error: "name and milk are required" });
    const farmer = await Farmer.create({ name, milk, phone, lat, lng });
    res.status(201).json(farmer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/farmers/:id — update
router.put("/:id", async (req, res) => {
  try {
    const farmer = await Farmer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!farmer) return res.status(404).json({ error: "Farmer not found" });
    res.json(farmer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/farmers/:id — delete farmer + cascade logs/payments
router.delete("/:id", async (req, res) => {
  try {
    const farmer = await Farmer.findByIdAndDelete(req.params.id);
    if (!farmer) return res.status(404).json({ error: "Farmer not found" });

    // Cascade delete
    const MilkLog = require("../models/MilkLog");
    const Payment = require("../models/Payment");
    await MilkLog.deleteMany({ farmerId: req.params.id });
    await Payment.deleteMany({ farmerId: req.params.id });

    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;