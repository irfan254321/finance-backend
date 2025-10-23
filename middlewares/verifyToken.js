// middlewares/verifyToken.js
const jwt = require("jsonwebtoken")


function verifyToken(req, res, next) {
  console.log("🔍 verifyToken masuk:", req.method, req.originalUrl)
  const token = req.cookies.token
  if (!token) {
    console.log("❌ Tidak ada token, stop di sini")
    return res.status(403).json({ message: "No token provided" })
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log("❌ Token invalid:", err.message)
      return res.status(401).json({ message: "Invalid or expired token" })
    }
    console.log("✅ Token valid untuk user:", decoded.username)
    req.user = decoded
    next()
  })
}


function isAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden: Admin only" })
  }
  next()
}

module.exports = { verifyToken, isAdmin }
