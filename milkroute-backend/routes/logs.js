const express = require("express");
const router  = express.Router();
const MilkLog = require("../models/MilkLog");

// GET /api/logs?farmerId=&from=&to=
router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.farmerId) filter.farmerId = req.query.farmerId;
    if (req.query.from || req.query.to) {
      filter.date = {};
      if (req.query.from) filter.date.$gte = req.query.from;
      if (req.query.to)   filter.date.$lte = req.query.to;
    }
    const logs = await MilkLog.find(filter).sort({ date: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/logs — create
router.post("/", async (req, res) => {
  try {
    const { farmerId, date, liters, quality, note } = req.body;
    if (!farmerId || !date || liters == null) return res.status(400).json({ error: "farmerId, date and liters are required" });
    const log = await MilkLog.create({ farmerId, date, liters, quality, note });
    res.status(201).json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/logs/:id
router.delete("/:id", async (req, res) => {
  try {
    const log = await MilkLog.findByIdAndDelete(req.params.id);
    if (!log) return res.status(404).json({ error: "Log not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/logs/summary — aggregated daily totals across all farmers
router.get("/summary", async (req, res) => {
  try {
    const from = req.query.from || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const to   = req.query.to   || new Date().toISOString().slice(0, 10);

    const result = await MilkLog.aggregate([
      { $match: { date: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: "$date",
          totalLiters: { $sum: "$liters" },
          count: { $sum: 1 },
          good:    { $sum: { $cond: [{ $eq: ["$quality", "good"] },    1, 0] } },
          average: { $sum: { $cond: [{ $eq: ["$quality", "average"] }, 1, 0] } },
          poor:    { $sum: { $cond: [{ $eq: ["$quality", "poor"] },    1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;