// ==========================================
// 📁 moduls/spending.js (FINAL SECURE VERSION)
// ==========================================
const express = require("express")
const router = express.Router()
const XLSX = require("xlsx")
const upload = require("../middlewares/uploads")

function excelDateToJSDate(serial) {
  if (!serial || isNaN(serial)) return serial
  const utc_days = Math.floor(serial - 25569)
  const utc_value = utc_days * 86400
  const date_info = new Date(utc_value * 1000)
  return date_info.toISOString().split("T")[0]
}

// ✅ GET: Semua spending berdasarkan tahun (public dashboard)
router.get("/spending/:year", async (req, res, next) => {
  try {
    const year = req.params.year
    const results = await knex("detail_spending")
      .select("*")
      .whereRaw("YEAR(date_spending) = ?", [year])
      .orderBy("date_spending", "asc")

    res.status(200).json(results)
  } catch (err) {
    next(err)
  }
})

// ✅ GET: Semua spending (tanpa filter)
router.get("/spending", async (req, res, next) => {
  try {
    const results = await knex("detail_spending").select("*").orderBy("date_spending", "desc")
    res.status(200).json(results)
  } catch (err) {
    next(err)
  }
})

// ✅ GET: Semua kategori spending (public)
router.get("/CategorySpending", async (req, res, next) => {
  try {
    const results = await knex("category_spending").select("*").orderBy("id", "asc")
    res.status(200).json(results)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal Server Error" })
  }
})

// ✅ GET: Semua supplier (public, bisa dipakai dropdown)
router.get("/CompanyMedicine", async (req, res, next) => {
  try {
    const { page, limit, search } = req.query
    let query = knex("company_medicine").select("*")

    if (search) query = query.whereILike("name_company", `%${search}%`)

    if (page && limit) {
      const p = Math.max(1, parseInt(page))
      const l = Math.max(1, Math.min(100, parseInt(limit)))
      const offset = (p - 1) * l
      const rows = await query.orderBy("id", "desc").limit(l).offset(offset)
      return res.status(200).json(rows)
    }

    const results = await query.orderBy("id", "desc")
    res.status(200).json(results)
  } catch (err) {
    next(err)
  }
})

// ✅ GET: Semua unit obat (public)
router.get("/unitMedicine", async (req, res, next) => {
  try {
    const rows = await knex("unit_medicine").select("*").orderBy("id", "asc")
    res.status(200).json(rows)
  } catch (err) {
    next(err)
  }
})

// ==========================================
// 📊 POST: Spending per kategori per tahun
// ==========================================
router.post("/spendingCategoryYear", async (req, res, next) => {
  try {
    const { category_id, year } = req.body
    if (!category_id || !year) return res.status(400).send("Category ID or Year is Undefined!")

    const results = await knex("detail_spending")
      .select("name_spending", "amount_spending", "date_spending")
      .where("category_id", category_id)
      .whereRaw("YEAR(date_spending) = ?", [year])
      .groupByRaw("DATE(date_spending), name_spending, amount_spending")
      .orderBy("name_spending", "asc")

    res.status(200).json(results)
  } catch (err) {
    next(err)
  }
})

// ==========================================
// 📅 POST: Spending per kategori per bulan
// ==========================================
router.post("/spendingDetail", async (req, res, next) => {
  try {
    const { category_id, month, year } = req.body
    if (!category_id || !month || !year)
      return res.status(400).send("Category ID or Month or Year is Undefined!")

    const results = await knex("detail_spending")
      .select("name_spending", "amount_spending", "date_spending")
      .where("category_id", category_id)
      .whereRaw("MONTH(date_spending) = ?", [month])
      .whereRaw("YEAR(date_spending) = ?", [year])
      .groupByRaw("DATE(date_spending), name_spending, amount_spending")
      .orderBy("date_spending", "asc")

    res.status(200).json(results)
  } catch (err) {
    next(err)
  }
})

// ==========================================
// 🧾 POST: Input spending baru (login required)
// ==========================================
router.post("/inputSpendingDetail", async (req, res, next) => {
  const trx = await knex.transaction()
  try {
    const { name_spending, amount_spending, category_id, date_spending, company_id, medicines } = req.body
    const userId = req.user.id // ambil dari cookie JWT

    if (!name_spending || !category_id || !date_spending) {
      await trx.rollback()
      return res.status(400).send("Incomplete payload")
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date_spending)) {
      await trx.rollback()
      return res.status(400).send("date_spending must be YYYY-MM-DD")
    }

    const isObat = Number(category_id) === 9
    if (isObat) {
      if (!company_id) {
        await trx.rollback()
        return res.status(400).send("company_id is required for OBAT category")
      }
      if (!Array.isArray(medicines) || medicines.length === 0) {
        await trx.rollback()
        return res.status(400).send("medicines[] is required for OBAT category")
      }
    }

    const [inserted] = await trx("detail_spending")
      .insert({
        name_spending,
        amount_spending: Number(amount_spending),
        category_id: Number(category_id),
        company_id: isObat ? Number(company_id) : null,
        date_spending,
        created_by: userId,
        created_at: knex.fn.now(),
      })
      .returning("id")

    const spendingId = typeof inserted === "object" ? inserted.id : inserted

    if (isObat) {
      const medPayload = medicines.map((m) => ({
        name_medicine: m.name_medicine,
        quantity: Number(m.quantity),
        name_unit_id: Number(m.name_unit_id),
        detail_spending_id: spendingId,
        created_by: userId,
        created_at: knex.fn.now(),
      }))
      await trx("detail_medicine_spending").insert(medPayload)
    }

    await trx.commit()
    res.status(200).json({ message: "✅ Spending inserted successfully" })
  } catch (err) {
    await trx.rollback()
    next(err)
  }
})

// ==========================================
// 📤 POST: Upload spending Excel (login required)
// ==========================================
router.post("/uploadSpendingExcelGeneral", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).send("No file uploaded")

    const wb = XLSX.read(req.file.buffer, { type: "buffer" })
    const sheet = wb.SheetNames[0]
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet])
    const userId = req.user.id
    let inserted_spending = 0

    for (const r of rows) {
      const name_spending = String(r.name_spending || "").trim()
      const category_id = Number(r.category_id)
      let date_spending = r.date_spending
      
        if (!r.date_spending) {
            const now = new Date()
            const year = now.getFullYear()
            const month = String(now.getMonth() + 1).padStart(2, "0")
            const daysInMonth = new Date(year, month, 0).getDate()
            date_spending = `${year}-${month}-${String(daysInMonth).padStart(2, "0")}`
          } else {
            date_spending = excelDateToJSDate(r.date_spending)
          }

      if (typeof date_spending === "number") date_spending = excelDateToJSDate(date_spending)
      const amount_spending = Number(String(r.amount_spending || "0").replace(/[^0-9]/g, ""))

      if (!name_spending || !category_id || !date_spending || !amount_spending) continue

      await knex("detail_spending").insert({
        name_spending,
        category_id,
        amount_spending,
        date_spending,
        created_by: userId,
        created_at: knex.fn.now(),
      })
      inserted_spending++
    }

    res.status(200).json({
      message: "✅ Excel spending umum berhasil diimport",
      inserted_spending,
    })
  } catch (err) {
    next(err)
  }
})

// ==========================================
// 📤 POST: Upload spending OBAT (login required)
// ==========================================
router.post("/uploadSpendingExcelObat", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).send("No file uploaded")
    const wb = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true })
    const sheet = wb.SheetNames[0]
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet])
    const userId = req.user.id

    const toNum = (v) => Number(String(v ?? "").replace(/[^0-9.-]/g, "")) || 0
    const excelSerialToYMD = (serial) => {
      const utcDays = Math.floor(serial - 25569)
      const date = new Date(utcDays * 86400 * 1000)
      return date.toISOString().slice(0, 10)
    }
    const normalizeDate = (d) => {
      if (!d && d !== 0) return ""
      if (d instanceof Date && !isNaN(d.getTime())) return d.toISOString().slice(0, 10)
      if (typeof d === "number") return excelSerialToYMD(d)
      if (typeof d === "string") {
        const s = d.trim()
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
        const m = s.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/)
        if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`
        const t = new Date(s)
        if (!isNaN(t.getTime())) return t.toISOString().slice(0, 10)
      }
      return String(d)
    }

    const grouped = {}
    for (const r of rows) {
      if (Number(r.category_id) !== 9) continue
      const normDate = normalizeDate(r.date_spending)
      const d = new Date(normDate)
      const monthYear = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      const key = `${r.name_spending}_${monthYear}_${r.company_id}`
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(r)
    }

    let inserted_spending = 0
    let inserted_medicines = 0

    await knex.transaction(async (trx) => {
      for (const [key, meds] of Object.entries(grouped)) {
        const { name_spending, company_id } = meds[0]
        const firstDate = normalizeDate(meds[0].date_spending)
        const d = new Date(firstDate)
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, "0")
        const daysInMonth = new Date(year, Number(month), 0).getDate()
        const date_spending = `${year}-${month}-${String(daysInMonth).padStart(2, "0")}`
        const totalAmount = meds.reduce((sum, m) => sum + toNum(m.price_per_item), 0)

        const [spendingId] = await trx("detail_spending").insert({
          name_spending: String(name_spending || "").trim(),
          category_id: 9,
          company_id: toNum(company_id),
          date_spending,
          amount_spending: totalAmount,
          created_by: userId,
          created_at: trx.fn.now(),
        })

        inserted_spending++

        for (const m of meds) {
          const name_medicine = String(m.name_medicine || "").trim()
          const quantity = toNum(m.quantity)
          const unitId = toNum(m.unit_id)
          const pricePerItem = toNum(m.price_per_item)
          if (!name_medicine || !quantity || !unitId || !pricePerItem) continue

          await trx("detail_medicine_spending").insert({
            detail_spending_id: spendingId,
            name_medicine,
            quantity,
            name_unit_id: unitId,
            price_per_item: pricePerItem,
            created_by: userId,
            created_at: trx.fn.now(),
          })
          inserted_medicines++
        }
      }
    })

    res.status(200).json({
      message: "✅ Excel spending obat berhasil diimport",
      inserted_spending,
      inserted_medicines,
    })
  } catch (err) {
    next(err)
  }
})

// ==========================================
// 💊 POST: Ambil detail obat berdasarkan spending_id
// ==========================================
router.post("/spendingMedicineBySpendingId", async (req, res, next) => {
  try {
    const { detail_spending_id } = req.body
    if (!detail_spending_id)
      return res.status(400).json({ error: "detail_spending_id is required" })

    const medicines = await knex("detail_medicine_spending as dms")
      .select(
        "dms.id as medicine_id",
        "dms.name_medicine",
        "dms.quantity",
        "u.name_unit",
        "dms.price_per_item",
        "dms.created_by",
        "dms.created_at"
      )
      .leftJoin("unit_medicine as u", "dms.name_unit_id", "u.id")
      .where("dms.detail_spending_id", detail_spending_id)
      .orderBy("dms.name_medicine", "asc")

    res.status(200).json(medicines)
  } catch (err) {
    next(err)
  }
})

router.post("/inputCompanyMedicine", async (req, res, next) => {
  try {
    const { name_company } = req.body
    const userId = req.user.id

    if (!name_company || !name_company.trim())
      return res.status(400).json({ error: "Nama perusahaan wajib diisi" })

    const [inserted] = await knex("company_medicine").insert({
      name_company: name_company.trim(),
      created_by: userId,
      created_at: knex.fn.now(),
    })

    res.status(200).json({ message: "✅ Perusahaan baru berhasil ditambahkan", id: inserted })
  } catch (err) {
    next(err)
  }
})

router.post("/inputCategorySpending", async (req, res, next) => {
  try {
    const { name_category } = req.body
    const userId = req.user?.id || null // kalau pakai verifyToken global, ini aman

    if (!name_category || !name_category.trim()) {
      return res.status(400).json({ error: "Nama kategori wajib diisi" })
    }

    const existing = await knex("category_spending")
      .where("name_category", name_category.trim())
      .first()
    if (existing) {
      return res.status(400).json({ error: "Kategori sudah ada" })
    }

    const [inserted] = await knex("category_spending").insert({
      name_category: name_category.trim(),
      created_by: userId,
      created_at: knex.fn.now(),
    })

    res.status(200).json({
      message: "✅ Kategori spending baru berhasil disimpan!",
      id: inserted,
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
