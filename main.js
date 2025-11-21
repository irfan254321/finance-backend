/**
 * =========================================
 * 🚀 Express Application Core
 * =========================================
 */
const express = require("express")
const cors = require("cors")
const rateLimit = require("express-rate-limit")
const cookieParser = require("cookie-parser")
const errorHandler = require("./middlewares/errorHandler")

// 🛢️ Koneksi database global
const db = require("./src/db/knex")
global.knex = db

const app = express()

// 🌍 Trust proxy (Cloudflare, Nginx, dll.)
app.set("trust proxy", 1)

// 📦 Global middleware
app.use(express.json({
  limit: "10mb",
  strict: false
}))
app.use(express.urlencoded({
  extended: true
}))
app.use(cookieParser())

// 🧩 Logger sederhana
app.use((req, res, next) => {
  res.on("finish", () =>
    console.log("📤 Response terkirim:", res.statusCode)
  )
  next()
})

// ⚙️ Security & Rate limit
app.use(
  cors({
    origin: [
      "http://127.0.0.1:3000",
      "http://localhost:3000",
      "http://localhost:3002",
      "https://app.portofolioirfan.com",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
)

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 300, // maksimal 300 request / 15 menit
  })
)

// 🔐 Middleware custom
const {
  verifyToken
} = require("./middlewares/verifyToken")

// 🧩 Routes
const userRoutes = require("./moduls/auth/users")
const incomeRoutes = require("./moduls/income")
const spendingRoutes = require("./moduls/spending")
const yearRoutes = require("./moduls/year")

app.use("/", userRoutes)
app.use("/api", verifyToken, incomeRoutes)
app.use("/api", verifyToken, spendingRoutes)
app.use("/api", verifyToken, yearRoutes)

// 🩺 Default route
app.get("/", (req, res) => {
  res.status(200).json({
    message: "🚀 Backend API running..."
  })
})

// ❌ 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.originalUrl,
    method: req.method,
  })
})

// 🧱 Global error handler
app.use(errorHandler)

module.exports = app