// ================================
// 📁 moduls/users.js (FINAL PRODUCTION SAFE)
// ================================

const express = require("express")
const router = express.Router()
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const {
  verifyToken,
  isAdmin
} = require("../../middlewares/verifyToken")

// ================================
// 📝 REGISTER (Admin only, optional open register user biasa)
// ================================
router.post("/register", async (req, res) => {
  try {
    const {
      name_users,
      username,
      password
    } = req.body

    // ✅ 1. Validasi input kosong
    if (!name_users || !username || !password) {
      return res.status(400).json({
        message: "All fields are required",
      })
    }

    // ✅ 2. Validasi kekuatan password
    // Aturan: minimal 8 karakter, ada huruf besar, huruf kecil, angka, dan simbol
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long and include uppercase, lowercase, number, and symbol",
      })
    }

    // ✅ 3. Cek duplikat username
    const existingUser = await knex("login_users").where({
      username
    }).first()
    if (existingUser) {
      return res.status(400).json({
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

    res.status(201).json({
      message: "✅ User registered successfully",
    })
  } catch (err) {
    console.error("Register Error:", err)
    res.status(500).json({
      error: err.message,
    })
  }
})


// ================================
// 🔑 LOGIN (Cookie HTTP-only)
// ================================
router.post("/login", async (req, res) => {
  console.log("📩 LOGIN route hit") // tambahkan baris ini dulu
  try {
    const {
      username,
      password
    } = req.body
    if (!username || !password)
      return res.status(400).json({
        message: "Username & password required"
      })

    const user = await knex("login_users").where({
      username
    }).first()
    if (!user) return res.status(404).json({
      message: "User not found"
    })

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid)
      return res.status(401).json({
        message: "Invalid credentials"
      })

    // 🔐 Buat token
    const token = jwt.sign({
        id: user.id,
        username: user.username,
        role: user.role
      },
      process.env.JWT_SECRET, {
        expiresIn: "1d"
      }
    )

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax", // gunakan "lax" untuk localhost
      secure: false, // jangan true di http://localhost
      path: "/", // tambahkan path agar global
      maxAge: 24 * 60 * 60 * 1000,
    })
    console.log("✅ Sending cookie:", token.slice(0, 20) + "...")


    res.status(200).json({
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
    console.error("Login Error:", err)
    res.status(500).json({
      error: err.message
    })
  }
})



// ================================
// 🚪 LOGOUT (hapus cookie token)
// ================================
router.post("/logout", (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      secure: process.env.NODE_ENV === "production",
    })
    res.status(200).json({
      message: "✅ Logout successful"
    })
  } catch (err) {
    console.error("Logout Error:", err)
    res.status(500).json({
      error: err.message
    })
  }
})

// ================================
// 🧑‍💻 GET CURRENT USER (/me)
// ================================
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await knex("login_users")
      .select("id", "name_users", "username", "role", "last_login", "created_at")
      .where({
        id: req.user.id
      })
      .first()

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      })
    }

    res.status(200).json(user)
  } catch (err) {
    console.error("Get Me Error:", err)
    res.status(500).json({
      error: "Server error"
    })
  }
})

// ================================
// 🧪 DASHBOARD TEST (Protected)
// ================================
router.get("/dashboard", verifyToken, async (req, res) => {
  res.json({
    message: `Welcome ${req.user.role}!`,
    userId: req.user.id,
    username: req.user.username,
  })
})

// ================================
// 📋 GET ALL USERS (Admin Only)
// ================================
router.get("/users", verifyToken, isAdmin, async (req, res) => {
  try {
    const results = await knex("login_users").select(
      "id",
      "name_users",
      "username",
      "role",
      "last_login",
      "created_at"
    )
    res.status(200).json(results)
  } catch (err) {
    console.error("Get Users Error:", err)
    res.status(500).json({
      error: err.message
    })
  }
})

console.log("✅ Module users.js loaded: /login, /register, /logout, /me aktif")
module.exports = router