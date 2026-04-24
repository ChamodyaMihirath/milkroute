const express    = require("express");
const cors       = require("cors");
const connectDB  = require("./config/db");

const app = express();

// ── Connect to MongoDB ────────────────────────────────────────────────────────
// This will use the MONGO_URI you added to the Railway Variables tab
connectDB();

// ── Middleware ────────────────────────────────────────────────────────────────
// Updated CORS to allow local development AND your future live site
const allowedOrigins = [
  "http://localhost:5173", 
  "https://milkroute-frontend.vercel.app", // Change this to your actual frontend URL later
  /\.railway\.app$/                        // This allows all Railway subdomains
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) return allowed.test(origin);
      return allowed === origin;
    });

    if (isAllowed) {
      return callback(null, true);
    } else {
      return callback(new Error("CORS policy blocked this origin"), false);
    }
  },
  credentials: true
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
// Railway will automatically provide a PORT, or it defaults to 5000
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`MilkRoute API running on port ${PORT}`);
});