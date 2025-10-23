// ===============================
// 📁 middlewares/uploads.js
// ===============================
const multer = require("multer")

// 💾 Simpan file di memory (bukan folder)
const storage = multer.memoryStorage()

// ✅ Filter tipe file (hanya Excel)
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || // .xlsx
    file.mimetype === "application/vnd.ms-excel" // .xls
  ) {
    cb(null, true)
  } else {
    cb(new Error("Only Excel files (.xls, .xlsx) are allowed!"), false)
  }
}

// 🚀 Export upload middleware
const upload = multer({ storage, fileFilter })

module.exports = upload
