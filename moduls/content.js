// ==========================================
// 📁 moduls/content.js (FINAL VERSION)
// ==========================================
const { verifyToken, isAdmin } = require("../middlewares/verifyToken")

// ✅ GET: Daftar berita dengan pagination
app.get("/contents/berita", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 5
    const offset = (page - 1) * limit

    const berita = await knex("contents")
      .where({ type: "berita" })
      .orderBy("created_at", "desc")
      .limit(limit)
      .offset(offset)

    const total = await knex("contents").where({ type: "berita" }).count("id as count").first()

    res.status(200).json({
      data: berita,
      total: total.count,
      page,
      totalPages: Math.ceil(total.count / limit),
    })
  } catch (err) {
    console.error("GET /contents/berita error:", err)
    res.status(500).json({ error: "Internal Server Error" })
  }
})

// ✅ GET: Semua slide (publik)
app.get("/contents/slide", async (req, res) => {
  try {
    const slides = await knex("contents").where({ type: "slide" }).orderBy("created_at", "desc")
    res.status(200).json(slides)
  } catch (err) {
    console.error("GET /contents/slide error:", err)
    res.status(500).json({ error: "Internal Server Error" })
  }
})

// ==========================================
// ✏️ ADMIN: SLIDER CRUD
// ==========================================

// 📸 CREATE Slide (Admin)
app.post("/admin/slide", verifyToken, isAdmin, async (req, res) => {
  try {
    const { title, image_url } = req.body
    if (!title || !image_url) {
      return res.status(400).json({ error: "title and image_url are required" })
    }

    await knex("contents").insert({
      title,
      image_url,
      type: "slide",
      created_at: knex.fn.now(),
    })
    res.status(201).json({ message: "✅ Slide berhasil ditambahkan" })
  } catch (err) {
    console.error("POST /admin/slide error:", err)
    res.status(500).json({ error: "Internal Server Error" })
  }
})

// 📋 READ Semua Slide (Admin)
app.get("/admin/slide", verifyToken, isAdmin, async (req, res) => {
  try {
    const slides = await knex("contents").where({ type: "slide" }).orderBy("created_at", "desc")
    res.status(200).json(slides)
  } catch (err) {
    console.error("GET /admin/slide error:", err)
    res.status(500).json({ error: "Internal Server Error" })
  }
})

// ✏️ UPDATE Slide (Admin)
app.put("/admin/slide/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { title, image_url } = req.body

    if (!title || !image_url) {
      return res.status(400).json({ error: "title and image_url are required" })
    }

    const updated = await knex("contents").where({ id, type: "slide" }).update({ title, image_url })
    if (!updated) return res.status(404).json({ error: "Slide not found" })

    res.status(200).json({ message: "✅ Slide berhasil diperbarui" })
  } catch (err) {
    console.error("PUT /admin/slide/:id error:", err)
    res.status(500).json({ error: "Internal Server Error" })
  }
})

// 🗑️ DELETE Slide (Admin)
app.delete("/admin/slide/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const deleted = await knex("contents").where({ id, type: "slide" }).del()
    if (!deleted) return res.status(404).json({ error: "Slide not found" })
    res.status(200).json({ message: "✅ Slide berhasil dihapus" })
  } catch (err) {
    console.error("DELETE /admin/slide/:id error:", err)
    res.status(500).json({ error: "Internal Server Error" })
  }
})

// ==========================================
// ✏️ ADMIN: BERITA CRUD (Optional - Bonus)
// ==========================================

// 📰 CREATE Berita
app.post("/admin/berita", verifyToken, isAdmin, async (req, res) => {
  try {
    const { title, content } = req.body
    if (!title || !content) return res.status(400).json({ error: "title and content are required" })

    await knex("contents").insert({
      title,
      content,
      type: "berita",
      created_at: knex.fn.now(),
    })
    res.status(201).json({ message: "✅ Berita berhasil ditambahkan" })
  } catch (err) {
    console.error("POST /admin/berita error:", err)
    res.status(500).json({ error: "Internal Server Error" })
  }
})

// 📋 GET Semua Berita (Admin)
app.get("/admin/berita", verifyToken, isAdmin, async (req, res) => {
  try {
    const berita = await knex("contents").where({ type: "berita" }).orderBy("created_at", "desc")
    res.status(200).json(berita)
  } catch (err) {
    console.error("GET /admin/berita error:", err)
    res.status(500).json({ error: "Internal Server Error" })
  }
})

// ✏️ UPDATE Berita
app.put("/admin/berita/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { title, content } = req.body
    if (!title || !content) return res.status(400).json({ error: "title and content are required" })

    const updated = await knex("contents").where({ id, type: "berita" }).update({ title, content })
    if (!updated) return res.status(404).json({ error: "Berita not found" })

    res.status(200).json({ message: "✅ Berita berhasil diperbarui" })
  } catch (err) {
    console.error("PUT /admin/berita/:id error:", err)
    res.status(500).json({ error: "Internal Server Error" })
  }
})

// 🗑️ DELETE Berita
app.delete("/admin/berita/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const deleted = await knex("contents").where({ id, type: "berita" }).del()
    if (!deleted) return res.status(404).json({ error: "Berita not found" })
    res.status(200).json({ message: "✅ Berita berhasil dihapus" })
  } catch (err) {
    console.error("DELETE /admin/berita/:id error:", err)
    res.status(500).json({ error: "Internal Server Error" })
  }
})
