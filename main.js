// =========================
// 📁 main.js (FINAL VERSION)
// =========================
require("dotenv").config()

const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
const rateLimit = require("express-rate-limit")
const multer = require("multer")
const xlsx = require("xlsx")
const fs = require("fs")
const path = require("path")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")

// Global variable
global.app = express()
global.upload = multer()
global.knex = require("knex")({
  client: "mysql2",
  connection: {
    host: process.env.host,
    user: process.env.user,
    password: process.env.password,
    database: process.env.database,
    timezone: "Z",
  },
})

// =========================
// 🛡️ Basic Security Middlewares
// =========================
app.use(
  cors({
    origin: ["http://localhost:3000"], // ganti ke domain frontend kamu di produksi
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
)
app.use(express.json())
app.use(helmet())
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300, // max 300 request per 15 menit
  })
)

// =========================
// 🔐 Load Middleware VerifyToken
// =========================
const {
  verifyToken
} = require("./middlewares/verifyToken")

// =========================
// 🧑‍💻 Load Modules
// =========================
// 📌 Routes user (register, login, logout, etc.) tetap public
require("./moduls/users")

// 📌 Semua route yang diawali /api akan diproteksi JWT secara global
app.use("/api", verifyToken)

// 📌 Load API modules setelah middleware
require("./moduls/income")
require("./moduls/spending")
require("./moduls/content")

// =========================
// ✅ Default Route (Health Check)
// =========================
app.get("/", (req, res) => {
  res.status(200).json({
    message: "🚀 Backend API running..."
  })
})

// ✅ 404 Handler (jika route tidak ditemukan)
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.originalUrl,
    method: req.method,
  })
})


// ✅ Global Error Handler
app.use((err, req, res, next) => {
  console.error("🔥 Global Error:", err)

  // Kalau error sudah punya statusCode → pakai itu
  const status = err.statusCode || 500
  const message = err.message || "Internal Server Error"

  res.status(status).json({
    success: false,
    error: message,
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  })
})


// =========================
// ✅ Start Server
// =========================
const PORT = process.env.PORT || 3003
app.listen(PORT, () => {
  console.log(`✅ Server jalan di http://localhost:${PORT}`)
})