// ================================
// 📁 moduls/users.js (FINAL)
// ================================
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const { verifyToken } = require("../middlewares/verifyToken")

// ================================
// 📝 REGISTER
// ================================
app.post("/register", async (req, res) => {
  try {
    const { name_users, username, password, role } = req.body

    if (!name_users || !username || !password || !role) {
      return res.status(400).json({ message: "All fields are required" })
    }

    // 🔐 Cek jika username sudah dipakai
    const existingUser = await knex("login_users").where({ username }).first()
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" })
    }

    // 🔐 Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    const [id] = await knex("login_users").insert({
      name_users,
      username,
      password: hashedPassword,
      role,
      created_at: knex.fn.now(),
    })

    res.status(201).json({ id, message: "✅ User registered successfully" })
  } catch (err) {
    console.error("Register Error:", err)
    res.status(500).json({ error: err.message })
  }
})

// ================================
// 🔑 LOGIN
// ================================
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ message: "Username & password required" })
    }

    // 🔍 Cek user
    const user = await knex("login_users").where({ username }).first()
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // 🔐 Bandingkan password
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    // 🪪 Buat token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    )

    // 📌 Simpan token & last_login ke DB
    await knex("login_users").where({ id: user.id }).update({
      token,
      last_login: knex.fn.now(),
    })

    res.status(200).json({
      message: "✅ Login success",
      token,
      user: {
        id: user.id,
        name_users: user.name_users,
        username: user.username,
        role: user.role,
      },
    })
  } catch (err) {
    console.error("Login Error:", err)
    res.status(500).json({ error: err.message })
  }
})

// ================================
// 🚪 LOGOUT
// ================================
app.post("/logout", verifyToken, async (req, res) => {
  try {
    await knex("login_users").where({ id: req.user.id }).update({ token: null })
    res.status(200).json({ message: "✅ Logout successful" })
  } catch (err) {
    console.error("Logout Error:", err)
    res.status(500).json({ error: err.message })
  }
})

// ================================
// 🧑‍💻 GET USER LOGIN DATA (/me)
// ================================
app.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await knex("login_users")
      .select("id", "name_users", "username", "role", "last_login", "created_at")
      .where({ id: req.user.id })
      .first()

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.status(200).json(user)
  } catch (err) {
    console.error("Get Me Error:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// ================================
// 🧪 DASHBOARD TEST (Protected)
// ================================
app.get("/dashboard", verifyToken, async (req, res) => {
  res.json({ message: `Welcome ${req.user.role}!`, userId: req.user.id })
})

// ================================
// 📋 DEBUG: GET ALL USERS (Admin Only)
// ================================
app.get("/login", verifyToken, async (req, res) => {
  try {
    const results = await knex("login_users").select("id", "name_users", "username", "role", "last_login", "created_at")
    res.status(200).json(results)
  } catch (err) {
    console.error("Get Users Error:", err)
    res.status(500).json({ error: err.message })
  }
})
