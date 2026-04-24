const express = require("express");
const router  = express.Router();
const Payment = require("../models/Payment");
const MilkLog = require("../models/MilkLog");

const PRICE_PER_LITER = 80; // LKR — adjust as needed

// GET /api/payments?farmerId=
router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.farmerId) filter.farmerId = req.query.farmerId;
    const payments = await Payment.find(filter).sort({ date: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments
router.post("/", async (req, res) => {
  try {
    const { farmerId, amount, date, note } = req.body;
    if (!farmerId || amount == null) return res.status(400).json({ error: "farmerId and amount are required" });
    const payment = await Payment.create({ farmerId, amount, date: date || new Date().toISOString().slice(0, 10), note });
    res.status(201).json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/payments/:id
router.delete("/:id", async (req, res) => {
  try {
    const p = await Payment.findByIdAndDelete(req.params.id);
    if (!p) return res.status(404).json({ error: "Payment not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/balance/:farmerId — earnings vs paid
router.get("/balance/:farmerId", async (req, res) => {
  try {
    const { farmerId } = req.params;
    const [logsAgg, paymentsAgg] = await Promise.all([
      MilkLog.aggregate([
        { $match: { farmerId: new (require("mongoose").Types.ObjectId)(farmerId) } },
        { $group: { _id: null, totalLiters: { $sum: "$liters" } } },
      ]),
      Payment.aggregate([
        { $match: { farmerId: new (require("mongoose").Types.ObjectId)(farmerId) } },
        { $group: { _id: null, totalPaid: { $sum: "$amount" } } },
      ]),
    ]);

    const totalLiters  = logsAgg[0]?.totalLiters  || 0;
    const totalPaid    = paymentsAgg[0]?.totalPaid || 0;
    const totalEarned  = totalLiters * PRICE_PER_LITER;
    const balance      = totalEarned - totalPaid;

    res.json({ totalLiters, totalEarned, totalPaid, balance, pricePerLiter: PRICE_PER_LITER });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;