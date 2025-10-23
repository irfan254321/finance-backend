require("dotenv").config()
const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
const rateLimit = require("express-rate-limit")
const cookieParser = require("cookie-parser")
const multer = require("multer")
const knex = require("knex")
const xlsx = require("xlsx")

const app = express()
const upload = multer()
console.log("🚀 File main.js berhasil dieksekusi sampai atas")

app.use((req, res, next) => {
  console.log("➡️  Request masuk:", req.method, req.url)
  next()
})

// =========================
// 🛢️ Database
// =========================
const db = knex({
  client: "mysql2",
  connection: {
    host: process.env.host,
    user: process.env.user,
    password: process.env.password,
    database: process.env.database,
    timezone: "Z",
  },
})

global.knex = db;

db.raw("SELECT 1")
  .then(() => console.log("✅ MySQL Connected"))
  .catch((err) => {
    console.error("❌ MySQL Connection Failed:", err.message)
    process.exit(1)
  })

// =========================
// ⚙️ Middlewares
// =========================
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? "https://finance.rsbhayangkara.id"
        : "http://127.0.0.1:3000",
    credentials: true,
  })
)
app.use(cookieParser())
app.use(express.json())
app.use(
  helmet({
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false,
    originAgentCluster: false,
  })
)
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
  })
)

// =========================
// 🔐 Middlewares
// =========================
const { verifyToken } = require("./middlewares/verifyToken")

// =========================
// 🧩 Register routes properly
// =========================
const userRoutes = require("./moduls/auth/users")
const incomeRoutes = require("./moduls/income")
const spendingRoutes = require("./moduls/spending")
// const contentRoutes = require("./moduls/content")

app.use("/", userRoutes)
app.use("/api", verifyToken, incomeRoutes)
app.use("/api", verifyToken, spendingRoutes)
// app.use("/api", verifyToken, contentRoutes)

// =========================
// 🩺 Default Route
// =========================
app.get("/", (req, res) => {
  res.status(200).json({ message: "🚀 Backend API running..." })
})

// =========================
// ❌ 404 + Error Handler
// =========================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.originalUrl,
    method: req.method,
  })
})

// =========================
// 🚀 Start Server
// =========================
const PORT = process.env.PORT || 3100
app.listen(PORT, "127.0.0.1", () => {
  console.log(`✅ Server jalan di http://127.0.0.1:${PORT}`)
})
console.log("🚀 Sampai bawah nih, app.listen dieksekusi")
module.exports = app