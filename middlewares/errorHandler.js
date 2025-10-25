// ===============================
// 📁 middlewares/errorHandler.js (FINAL VERSION)
// ===============================
const multer = require("multer")

module.exports = (err, req, res, next) => {
  console.error("❌ ERROR CAUGHT BY GLOBAL HANDLER:", err)

  // default values
  let status = err.status || 500
  let message = err.message || "Internal Server Error"
  let details = undefined

  // ===============================
  // 🧱 JWT / AUTH ERRORS
  // ===============================
  if (err.name === "JsonWebTokenError") {
    status = 401
    message = "Token tidak valid"
  }
  if (err.name === "TokenExpiredError") {
    status = 401
    message = "Token sudah kedaluwarsa"
  }

  // ===============================
  // 📦 MULTER ERRORS
  // ===============================
  if (err instanceof multer.MulterError) {
    status = 400
    switch (err.code) {
      case "LIMIT_FILE_SIZE":
        message = "Ukuran file terlalu besar (maksimal 5MB)"
        break
      case "LIMIT_FILE_COUNT":
        message = "Terlalu banyak file yang diupload"
        break
      default:
        message = "Kesalahan saat upload file"
    }
  }

  // ===============================
  // 🗄️ MYSQL / KNEX ERRORS
  // ===============================
  if (err.code && typeof err.code === "string" && err.code.startsWith("ER_")) {
    status = 500
    message = "Kesalahan database MySQL"
    details = err.sqlMessage || err.message
  }

  // ===============================
  // ✅ VALIDATION (YUP/JOI/INPUT)
  // ===============================
  if (err.isJoi) {
    status = 400
    message = "Validasi data gagal"
    details = err.details?.map((d) => d.message)
  }

  // ===============================
  // 🧾 JSON PARSE ERROR
  // ===============================
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    status = 400
    message = "Format JSON tidak valid"
  }

  // ===============================
  // 🌐 AXIOS / EXTERNAL REQUEST
  // ===============================
  if (err.isAxiosError) {
    status = err.response?.status || 502
    message = `Gagal menghubungi service eksternal: ${err.message}`
    details = err.response?.data
  }

  // ===============================
  // 🧠 DEFAULT (Dev Mode)
  // ===============================
  if (process.env.NODE_ENV === "development") {
    details = {
      name: err.name,
      stack: err.stack,
      raw: err,
    }
  }

  // ===============================
  // 📤 FINAL RESPONSE
  // ===============================
  res.status(status).json({
    success: false,
    status,
    message,
    details,
  })
}
