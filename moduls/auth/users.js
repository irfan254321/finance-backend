// ================================
// 📁 moduls/users.js (FINAL PRODUCTION SAFE)
// ================================

const express = require("express")
const router = express.Router()
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const { verifyToken, isAdmin } = require("../../middlewares/verifyToken")


function getClientIp(req) {
  // jika server ada di belakang proxy (heroku/nginx/load balancer) pastikan `app.set('trust proxy', true)` di express app
  const forwarded = req.headers["x-forwarded-for"]
  if (forwarded) {
    // bisa berisi daftar ip `client, proxy1, proxy2`
    return forwarded.split(",")[0].trim()
  }
  return req.ip || req.connection?.remoteAddress || null
}

// ================================
// 📝 REGISTER (Admin only, optional open register user biasa)
// ================================
router.post("/register", async (req, res, next) => {
  try {
    const { name_users, username, password } = req.body

    // ✅ 1. Validasi input kosong
    if (!name_users || !username || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      })
    }

    // ✅ 2. Validasi kekuatan password
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters long and include uppercase, lowercase, number, and symbol",
      })
    }

    // ✅ 3. Cek duplikat username
    const existingUser = await knex("login_users").where({ username }).first()
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Username already exists",
      })
    }

    // ✅ 4. Hash password dan simpan
    const hashedPassword = await bcrypt.hash(password, 10)
    await knex("login_users").insert({
      name_users,
      username,
      password: hashedPassword,
      role: "user",
      created_at: knex.fn.now(),
    })

    return res.status(201).json({
      success: true,
      message: "✅ User registered successfully",
    })
  } catch (err) {
    next(err)
  }
})

// ================================
// 🔑 LOGIN (Cookie HTTP-only)
// ================================
router.post("/login", async (req, res, next) => {
  console.log("📩 LOGIN route hit")
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username & password required",
      })
    }

    const ip = getClientIp(req)

     await knex("login_users").where({ id: user.id }).update({
      token,
      ip_address: ip,
      last_login: knex.fn.now(),
      updated_at: knex.fn.now(),
    })

    const user = await knex("login_users").where({ username }).first()
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Wrong Password",
      })
    }

    // 🔐 Buat token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    )

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      path: "/",
      maxAge: 24 * 60 * 60 * 1000,
    })

    console.log("✅ Sending cookie:", token.slice(0, 20) + "...")

    return res.status(200).json({
      success: true,
      message: "✅ Login success",
      user: {
        id: user.id,
        name_users: user.name_users,
        token,
        role: user.role,
      },
    })
  } catch (err) {
    next(err)
  }
})

// ================================
// 🚪 LOGOUT (hapus cookie token)
// ================================
router.post("/logout", (req, res, next) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/", // ⬅️ wajib!
    })

    return res.status(200).json({
      success: true,
      message: "✅ Logout successful",
    })
  } catch (err) {
    next(err)
  }
})


// ================================
// 🧑‍💻 GET CURRENT USER (/me)
// ================================
router.get("/me", verifyToken, async (req, res, next) => {
  try {
    const user = await knex("login_users")
      .select("id", "name_users", "username", "role", "last_login", "created_at")
      .where({ id: req.user.id })
      .first()

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    return res.status(200).json({
      success: true,
      data: user,
    })
  } catch (err) {
    next(err)
  }
})

// ================================
// 🧪 DASHBOARD TEST (Protected)
// ================================
router.get("/dashboard", verifyToken, async (req, res) => {
  return res.status(200).json({
    success: true,
    message: `Welcome ${req.user.role}!`,
    userId: req.user.id,
    username: req.user.username,
  })
})

// ================================
// 📋 GET ALL USERS (Admin Only)
// ================================
router.get("/users", verifyToken, isAdmin, async (req, res, next) => {
  try {
    const results = await knex("login_users").select(
      "id",
      "name_users",
      "username",
      "role",
      "last_login",
      "created_at"
    )
    return res.status(200).json({
      success: true,
      data: results,
    })
  } catch (err) {
    next(err)
  }
})

console.log("✅ Module users.js loaded: /login, /register, /logout, /me aktif")

// ================================
// ✏️ UPDATE PROFILE (user sendiri)
// ================================
router.put("/me/update", verifyToken, async (req, res, next) => {
  try {
    const { name_users, username, password } = req.body

    // Validasi input dasar
    if (!name_users || !username) {
      return res.status(400).json({
        success: false,
        message: "Nama dan username wajib diisi",
      })
    }

    // Cek user ada atau tidak
    const existingUser = await knex("login_users")
      .where({ id: req.user.id })
      .first()

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      })
    }

    // Siapkan data update
    const updateData = {
      name_users,
      username,
      updated_at: knex.fn.now(),
    }

    // Kalau password diisi → hash baru
    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10)
      updateData.password = hashedPassword
    }

    // Update ke database
    await knex("login_users").where({ id: req.user.id }).update(updateData)

    // Ambil data terbaru
    const updatedUser = await knex("login_users")
      .select("id", "name_users", "username", "role", "last_login", "created_at")
      .where({ id: req.user.id })
      .first()

    return res.status(200).json({
      success: true,
      message: "Profil berhasil diperbarui",
      user: updatedUser,
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
