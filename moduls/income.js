  // ==========================================
  // 📁 moduls/income.js (FINAL SECURE VERSION)
  // ==========================================
  const express = require("express")
  const router = express.Router()
  const XLSX = require("xlsx")
  const upload = require("../middlewares/uploads")
  const {
    verifyToken,
    isAdmin
  } = require("../middlewares/verifyToken")

  // ✅ GET: Semua income berdasarkan tahun
  router.get("/income/:year", async (req, res, next) => {
    try {
      const year = req.params.year
      const results = await knex("detail_income")
        .select("*")
        .whereRaw("YEAR(date_income) = ?", [year])
        .orderBy("date_income", "asc")

      res.status(200).json(results)
    } catch (err) {
      next(err)
    }
  })

  // ✅ GET: Semua income (tanpa filter)
  router.get("/income", async (req, res, next) => {
    try {
      const results = await knex("detail_income")
        .select("*")
        .orderBy("date_income", "desc")
      res.status(200).json(results)
    } catch (err) {
      next(err)
    }
  })

  // ✅ GET: Semua kategori income (public)
  router.get("/categoryIncome", async (req, res, next) => {
    try {
      const results = await knex("category_income").select("*").orderBy("id", "asc")
      res.status(200).json(results)
    } catch (err) {
      next(err)
    }
  })



  // ✅ POST: Filter income by kategori + tahun
  router.post("/incomeCategoryYear", async (req, res, next) => {
    try {
      const {
        category_id,
        year
      } = req.body

      if (!category_id || !year) {
        return res.status(400).send("Category ID or Year is Undefined!")
      }

      const results = await knex("detail_income")
        .select("name_income", "amount_income", "date_income")
        .where("category_id", category_id)
        .whereRaw("YEAR(date_income) = ?", [year])
        .groupByRaw("DATE(date_income), name_income, amount_income")
        .orderBy("name_income", "asc")

      res.status(200).json(results)
    } catch (err) {
      next(err)
    }
  })

  // ✅ POST: Filter income by kategori + bulan + tahun
  router.post("/incomeDetail", async (req, res, next) => {
    try {
      const {
        category_id,
        month,
        year
      } = req.body

      if (!category_id || !month || !year) {
        return res.status(400).send("Category ID or Month or Year is Undefined!")
      }

      const results = await knex("detail_income")
        .select("name_income", "amount_income", "date_income")
        .where("category_id", category_id)
        .whereRaw("MONTH(date_income) = ?", [month])
        .whereRaw("YEAR(date_income) = ?", [year])
        .groupByRaw("DATE(date_income), name_income, amount_income")
        .orderBy("date_income", "asc")

      res.status(200).json(results)
    } catch (err) {
      next(err)
    }
  })

  // ✅ POST: Input data income baru (🧠 hanya user login)
  router.post("/inputIncomeDetail", verifyToken, async (req, res, next) => {
    try {
      const {
        name_income,
        amount_income,
        category_id,
        date_income
      } = req.body

      if (!name_income || !amount_income || !category_id || !date_income) {
        return res.status(400).send("All fields are required!")
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(date_income)) {
        return res.status(400).send("date_income must be in YYYY-MM-DD format")
      }

      const result = await knex("detail_income").insert({
        name_income,
        amount_income,
        category_id,
        date_income,
        created_by: req.user.id, // ← ambil ID user dari cookie JWT
      })

      res.status(200).json({
        message: "✅ Income inserted successfully",
        result
      })
    } catch (err) {
      next(err)
    }
  })

  // ✅ POST: Tambah kategori income baru (🧠 admin only)
  router.post("/inputCategoryIncome", verifyToken, isAdmin, async (req, res, next) => {
    try {
      const {
        name_category
      } = req.body
      if (!name_category) {
        return res.status(400).send("Name Category is required!")
      }

      const result = await knex("category_income").insert({
        name_category,
        created_by: req.user.id,
      })

      res.status(200).json({
        message: "✅ Category added successfully",
        result
      })
    } catch (err) {
      next(err)
    }
  })

  // ✅ POST: Upload income Excel (🧠 hanya user login)
  router.post("/uploadIncomeExcel", verifyToken, async (req, res, next) => {
    try {
      const {
        rows
      } = req.body

      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({
          message: "❌ Tidak ada data untuk diupload."
        })
      }

      // Pastikan semua row lengkap
      const requiredCols = ["name_income", "amount_income", "category_id", "date_income"]

      for (const row of rows) {
        const valid = requiredCols.every((c) => c in row && row[c] !== null && row[c] !== "")
        if (!valid)
          return res.status(400).json({
            message: "❌ Data tidak lengkap. Pastikan semua kolom terisi."
          })
      }

      // Tambahkan created_by
      const parsed = rows.map(r => ({
        ...r,
        created_by: req.user.id
      }))

      await knex("detail_income").insert(parsed)

      res.status(200).json({
        message: "✅ Data berhasil dimasukkan!",
        inserted: parsed.length
      })
    } catch (err) {
      next(err)
    }
  })


  // ✅ PUT: Update income
  router.put("/detailIncome/:id", verifyToken, async (req, res, next) => {
    try {
      const {
        id
      } = req.params
      let {
        name_income,
        amount_income,
        category_id,
        date_income
      } = req.body

      // 💡 pastikan format YYYY-MM-DD saja
      if (date_income && date_income.includes("T")) {
        date_income = date_income.split("T")[0]
      }

      await knex("detail_income")
        .where({
          id
        })
        .update({
          name_income,
          amount_income,
          category_id,
          date_income
        })

      res.status(200).json({
        message: "✅ Income updated"
      })
    } catch (err) {
      next(err)
    }
  })

  // ✅ DELETE: Hapus income
  router.delete("/detailIncome/:id", verifyToken, async (req, res, next) => {
    try {
      const {
        id
      } = req.params
      await knex("detail_income").where({
        id
      }).del()
      res.status(200).json({
        message: "🗑️ Income deleted"
      })
    } catch (err) {
      next(err)
    }
  })

  // ✅ PUT: Update kategori income
  router.put("/categoryIncome/:id", verifyToken, isAdmin, async (req, res, next) => {
    try {
      const {
        id
      } = req.params
      const {
        name_category
      } = req.body
      await knex("category_income").where({
        id
      }).update({
        name_category
      })
      res.status(200).json({
        message: "✅ Kategori income updated"
      })
    } catch (err) {
      next(err)
    }
  })

  // ✅ DELETE: Hapus kategori income
  router.delete("/categoryIncome/:id", verifyToken, isAdmin, async (req, res, next) => {
    try {
      const {
        id
      } = req.params
      await knex("category_income").where({
        id
      }).del()
      res.status(200).json({
        message: "🗑️ Kategori income deleted"
      })
    } catch (err) {
      next(err)
    }
  })

  module.exports = router