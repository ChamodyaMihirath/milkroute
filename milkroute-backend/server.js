const express    = require("express");
const cors       = require("cors");
const connectDB  = require("./config/db");

const app = express();

// ── Connect to MongoDB ────────────────────────────────────────────────────────
connectDB();

// ── Middleware ────────────────────────────────────────────────────────────────
// CHANGE 1: Allow both local development and your future live frontend URL
const allowedOrigins = ["http://localhost:5173", "https://your-frontend-name.onrender.com"];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error("CORS policy blocked this origin"), false);
    }
    return callback(null, true);
  }
}));

app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/farmers",  require("./routes/farmers"));
app.use("/api/logs",     require("./routes/logs"));
app.use("/api/payments", require("./routes/payments"));

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date() }));

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: "Route not found" }));

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

// CHANGE 2: Remove 'http://localhost' from the log so it doesn't confuse you in production
app.listen(PORT, () => console.log(`MilkRoute API running on port ${PORT}`));