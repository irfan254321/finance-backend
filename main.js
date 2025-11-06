const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
const rateLimit = require("express-rate-limit")
const cookieParser = require("cookie-parser")
const multer = require("multer")
const knex = require("knex")
const xlsx = require("xlsx")
const errorHandler = require("./middlewares/errorHandler");
const path = require("path")
const dotenv = require("dotenv")

const app = express()
const upload = multer()

app.set("trust proxy", 1)

app.use((req, res, next) => {
  console.log("📥 Request masuk:", req.method, req.originalUrl)
  res.on("finish", () => {
    console.log("📤 Response terkirim:", res.statusCode)
  })
  next()
})

process.on("unhandledRejection", (reason) => {
  console.error("⚠️ UNHANDLED PROMISE REJECTION:", reason)
})

process.on("uncaughtException", (err) => {
  console.error("💥 UNCAUGHT EXCEPTION:", err)
  process.exit(1)
})

app.use(express.json({ limit: "10mb", strict: false }))
app.use(express.urlencoded({ extended: true }))

const envFile = process.env.NODE_ENV === "production" ? ".env.prod" : ".env.dev"
dotenv.config({ path: path.resolve(__dirname, envFile) })

console.log(`🌱 Loaded environment: ${process.env.NODE_ENV} (${envFile})`)

// =========================
// 🛢️ Database
// =========================
const db = knex({
  client: "mysql2",
  connection: {
    host: process.env.DB_HOST || "127.0.0.1",
    user: process.env.DB_USER || "finance_irfan",
    password: process.env.DB_PASSWORD || "Handsome27",
    database: process.env.DB_NAME || "finance",
    port: process.env.DB_PORT || 3306,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: true } : false,
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

  app.use((req, res, next) => {
  console.log("📡 Request masuk:", req.method, req.url)
  next()
})

// =========================
// ⚙️ Middlewares
// =========================
app.use(
  cors({
    origin: [
      "http://127.0.0.1:3000",
      "http://localhost:3000",
      "https://app.portofolioirfan.com",
      "http://localhost:3002",
      "http://127.0.0.1:3002",
    ],
    credentials: true,
  })
)

app.use(cookieParser())
app.use(express.json())
// app.use(
//   helmet({
//     crossOriginOpenerPolicy: false,
//     crossOriginResourcePolicy: false,
//     contentSecurityPolicy: false,
//     originAgentCluster: false,
//   })
// )
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

app.use(errorHandler)

// =========================
// 🚀 Start Server
// =========================
const PORT = process.env.PORT || 3100
const HOST = process.env.HOST || "0.0.0.0"

app.listen(PORT, HOST, () => {
  console.log(`🚀 Backend running on http://${HOST}:${PORT}`)
})
module.exports = app