// middlewares/verifyToken.js
const jwt = require("jsonwebtoken")

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(403).json({ message: "No token provided" })
  }

  const token = authHeader.split(" ")[1]

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Invalid or expired token" })
    }
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
