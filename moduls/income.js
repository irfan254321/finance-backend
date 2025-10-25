  // ==========================================
  // 📁 moduls/income.js (FINAL SECURE VERSION)
  // ==========================================
  const express = require("express")
  const router = express.Router()
  const XLSX = require("xlsx")
  const upload = require("../middlewares/uploads")
  const { verifyToken, isAdmin } = require("../middlewares/verifyToken")

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
      const { category_id, year } = req.body

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
      const { category_id, month, year } = req.body

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
      const { name_income, amount_income, category_id, date_income } = req.body

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

      res.status(200).json({ message: "✅ Income inserted successfully", result })
    } catch (err) {
      next(err)
    }
  })

  // ✅ POST: Tambah kategori income baru (🧠 admin only)
  router.post("/inputCategoryIncome", verifyToken, isAdmin, async (req, res, next) => {
    try {
      const { name_category } = req.body
      if (!name_category) {
        return res.status(400).send("Name Category is required!")
      }

      const result = await knex("category_income").insert({
        name_category,
        created_by: req.user.id,
      })

      res.status(200).json({ message: "✅ Category added successfully", result })
    } catch (err) {
      next(err)
    }
  })

  // ✅ POST: Upload income Excel (🧠 hanya user login)
  router.post("/uploadIncomeExcel", verifyToken, upload.single("file"), async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).send("❌ Tidak ada file yang diupload.")

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" })
      const sheetName = workbook.SheetNames[0]
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName])

      if (!data.length) return res.status(400).send("❌ File kosong atau tidak valid.")

      const requiredCols = ["name_income", "amount_income", "category_id", "date_income"]
      const invalid = data.find(row => !requiredCols.every(c => c in row))
      if (invalid) {
        return res.status(400).send("❌ Kolom Excel tidak sesuai. Harus ada: name_income, amount_income, category_id, date_income")
      }

      const parsedData = data.map(row => {
        let dateValue = row.date_income
        if (typeof dateValue === "number") {
          dateValue = XLSX.SSF.format("yyyy-mm-dd", dateValue)
        }
        return {
          ...row,
          date_income: dateValue,
          created_by: req.user.id, // ← user login dari token
        }
      })

      await knex("detail_income").insert(parsedData)

      res.status(200).json({
        message: "✅ Data Excel berhasil diimport!",
        inserted: parsedData.length,
      })
    } catch (err) {
      next(err)
    }
  })

  console.log("✅ Module income.js loaded: /api/income aktif")
  module.exports = router
