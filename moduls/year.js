const express = require("express")
const router = express.Router()
const {
    verifyToken
} = require("../middlewares/verifyToken")

// ✅ GET: Ambil semua tahun dari database
router.get("/year", async (req, res, next) => {
    try {
        const results = await knex("year").select("*").orderBy("year", "desc")
        res.status(200).json(results)
    } catch (err) {
        next(err)
    }
})

// ✅ POST: Tambah tahun baru
router.post("/year", verifyToken, async (req, res, next) => {
    try {
        const {
            year
        } = req.body
        if (!year) return res.status(400).json({
            message: "Year is required"
        })

        // Cek duplikasi
        const existing = await knex("year").where({
            year
        }).first()
        if (existing) return res.status(400).json({
            message: "Year already exists"
        })

        await knex("year").insert({
            year
        })
        res.status(201).json({
            message: "✅ Year added successfully"
        })
    } catch (err) {
        next(err)
    }
})

// ✅ DELETE: Hapus tahun
router.delete("/year/:id", verifyToken, async (req, res, next) => {
    try {
        const {
            id
        } = req.params
        await knex("year").where({
            id
        }).del()
        res.status(200).json({
            message: "🗑️ Year deleted successfully"
        })
    } catch (err) {
        next(err)
    }
})

module.exports = router