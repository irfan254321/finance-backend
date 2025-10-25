// middlewares/verifyToken.js
const jwt = require("jsonwebtoken")


function verifyToken(req, res, next) {
  try {
    if (!req.cookies) {
      return res.status(400).json({ message: "Cookie parser error" })
    }

    const token = req.cookies.token
    if (!token) {
      return res.status(403).json({ message: "No token provided" })
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: "Invalid or expired token" })
      }
      req.user = decoded
      next()
    })
  } catch (err) {
    next(err) // biar dilempar ke errorHandler
  }
}

function isAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden: Admin only" })
  }
  next()
}

module.exports = { verifyToken, isAdmin }
