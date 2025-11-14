// middlewares/verifyToken.js
const jwt = require("jsonwebtoken")
const knex = require("../src/db/knex") // ⬅️ pastiin path ini sesuai struktur proyek lo

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"]
  if (forwarded) return forwarded.split(",")[0].trim()
  return req.ip || req.connection?.remoteAddress || null
}

async function verifyToken(req, res, next) {
  try {
    if (!req.cookies) {
      return res.status(400).json({ message: "Cookie parser error" })
    }

    const token = req.cookies.token
    if (!token) {
      return res.status(403).json({ message: "No token provided" })
    }

    // ✅ Verifikasi JWT
    let decoded
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET)
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token" })
    }

    // ✅ Cek ke database apakah token masih sama
    const user = await knex("login_users").where({ id: decoded.id }).first()
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    if (!user.token || user.token !== token) {
      return res.status(401).json({
        message: "Session replaced: user logged in from another device",
      })
    }

    // (Optional) — kalau mau IP consistency check juga
    // const currentIp = getClientIp(req)
    // if (user.ip_address && currentIp !== user.ip_address) {
    //   return res.status(401).json({ message: "IP address mismatch" })
    // }

    // attach data user
    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
    }

    next()
  } catch (err) {
    console.error("verifyToken error:", err)
    next(err)
  }
}

function isAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden: Admin only" })
  }
  next()
}

module.exports = { verifyToken, isAdmin }
