require("dotenv").config();
const express    = require("express");
const cors       = require("cors");
const connectDB  = require("./config/db");

const app = express();

// ── Connect to MongoDB ────────────────────────────────────────────────────────
// Ensure MONGO_URI is set in Railway Variables tab
connectDB();

// ── Middleware ────────────────────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:5173", 
  "https://milkroute-production.up.railway.app",
  "https://milkroute-ny4cpzblh-chamodyamihiraths-projects.vercel.app", 
  /\.vercel\.app$/,   // Regex to allow all Vercel preview deployments
  /\.railway\.app$/    // Regex to allow Railway subdomains
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or Postman)
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) return allowed.test(origin);
      return allowed === origin;
    });

    if (isAllowed) {
      return callback(null, true);
    } else {
      console.log("CORS blocked origin:", origin);
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
app.get("/api/health", (req, res) => res.json({ 
  status: "ok", 
  message: "MilkRoute API is live",
  timestamp: new Date() 
}));

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: "Route not found" }));

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// ── Start ─────────────────────────────────────────────────────────────────────
// Railway will provide the PORT automatically
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`MilkRoute API running on port ${PORT}`);
});