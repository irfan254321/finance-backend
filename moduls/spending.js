// ==========================================
// 📁 moduls/spending.js (FINAL VERSION)
// ==========================================

// ✅ GET: Semua spending berdasarkan tahun
app.get("/api/spending/:year", async (req, res) => {
  try {
    const year = req.params.year
    const results = await knex("detail_spending")
      .select("*")
      .whereRaw("YEAR(date_spending) = ?", [year])
      .orderBy("date_spending", "asc")

    res.status(200).json(results)
  } catch (err) {
    console.error("Error GET /api/spending/:year:", err)
    res.status(500).json({ error: err.message })
  }
})

// ✅ GET: Semua spending (tanpa filter)
app.get("/api/spending", async (req, res) => {
  try {
    const results = await knex("detail_spending").select("*").orderBy("date_spending", "desc")
    res.status(200).json(results)
  } catch (err) {
    console.error("Error GET /api/spending:", err)
    res.status(500).json({ error: err.message })
  }
})

// ✅ GET: Semua kategori spending
app.get("/api/inputCategorySpending", async (req, res) => {
  try {
    const results = await knex("category_spending").select("*").orderBy("id", "asc")
    res.status(200).json(results)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal Server Error" })
  }
})

// ✅ GET: Semua perusahaan supplier
app.get("/api/inputCompanyMedicine", async (req, res) => {
  try {
    const { page, limit } = req.query
    if (page && limit) {
      const p = Math.max(1, parseInt(page))
      const l = Math.max(1, Math.min(100, parseInt(limit)))
      const offset = (p - 1) * l
      const rows = await knex("company_medicine")
        .select("*")
        .orderBy("id", "desc")
        .limit(l)
        .offset(offset)
      return res.status(200).json(rows)
    }

    const results = await knex("company_medicine").select("*").orderBy("id", "desc")
    res.status(200).json(results)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal Server Error" })
  }
})

// ✅ GET: Semua unit obat
app.get("/api/unitMedicine", async (req, res) => {
  try {
    const rows = await knex("unit_medicine").select("*").orderBy("id", "asc")
    res.status(200).json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal Server Error" })
  }
})

// ==========================================
// 📊 POST: Spending per kategori per tahun
// ==========================================
app.post("/api/spendingCategoryYear", async (req, res) => {
  try {
    const { category_id, year } = req.body

    if (!category_id || !year) {
      return res.status(400).send("Category ID or Year is Undefined!")
    }

    const results = await knex("detail_spending")
      .select("name_spending", "amount_spending", "date_spending")
      .where("category_id", category_id)
      .whereRaw("YEAR(date_spending) = ?", [year])
      .groupByRaw("DATE(date_spending), name_spending, amount_spending")
      .orderBy("name_spending", "asc")

    res.status(200).json(results)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal Server Error" })
  }
})

// ==========================================
// 📅 POST: Spending per kategori per bulan
// ==========================================
app.post("/api/spendingDetail", async (req, res) => {
  try {
    const { category_id, month, year } = req.body

    if (!category_id || !month || !year) {
      return res.status(400).send("Category ID or Month or Year is Undefined!")
    }

    const results = await knex("detail_spending")
      .select("name_spending", "amount_spending", "date_spending")
      .where("category_id", category_id)
      .whereRaw("MONTH(date_spending) = ?", [month])
      .whereRaw("YEAR(date_spending) = ?", [year])
      .groupByRaw("DATE(date_spending), name_spending, amount_spending")
      .orderBy("date_spending", "asc")

    res.status(200).json(results)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal Server Error" })
  }
})

// ✅ POST: Ambil daftar obat berdasarkan spending ID
app.post("/api/spendingMedicineBySpendingId", async (req, res) => {
  try {
    const { detail_spending_id } = req.body

    if (!detail_spending_id) {
      return res.status(400).send("detail_spending_id is required!")
    }

    const results = await knex("detail_medicine_spending as dms")
      .select(
        "dms.id",
        "dms.detail_spending_id",
        "dms.name_medicine",
        "dms.quantity",
        "dms.name_unit_id",
        "u.name_unit",
        "dms.created_at"
      )
      .leftJoin("unit_medicine as u", "dms.name_unit_id", "=", "u.id")
      .where("dms.detail_spending_id", detail_spending_id)
      .orderBy("dms.name_medicine", "asc")

    res.status(200).json(results)
  } catch (err) {
    console.error("Error spendingMedicineBySpendingId:", err)
    res.status(500).json({ error: "Internal Server Error" })
  }
})

// ✅ POST: Tambah kategori spending
app.post("/api/inputCategorySpending", async (req, res) => {
  try {
    const { name_category } = req.body
    if (!name_category) return res.status(400).send("name_category is required")

    await knex("category_spending").insert({
      name_category,
      created_at: knex.fn.now(),
    })
    res.status(200).json({ message: "✅ Category created" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal Server Error" })
  }
})

// ✅ POST: Input spending baru (dengan detail obat jika ada)
app.post("/api/inputSpendingDetail", async (req, res) => {
  const trx = await knex.transaction()
  try {
    const { name_spending, amount_spending, category_id, date_spending, company_id, medicines } = req.body

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
        created_at: knex.fn.now(),
      }))
      await trx("detail_medicine_spending").insert(medPayload)
    }

    await trx.commit()
    res.status(200).json({ message: "✅ Spending inserted successfully" })
  } catch (err) {
    await trx.rollback()
    console.error(err)
    res.status(500).json({ error: "Internal Server Error" })
  }
})

// ✅ POST: Upload data spending dari Excel
app.post("/api/uploadSpendingExcel", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send("No file uploaded")

    const wb = xlsx.read(req.file.buffer, { type: "buffer" })
    const sheet = wb.SheetNames[0]
    const rows = xlsx.utils.sheet_to_json(wb.Sheets[sheet])

    const keyOf = (r) =>
      `${String(r.name_spending || "").trim()}|${Number(r.category_id)}|${normalizeDate(r.date_spending)}|${r.company_id ?? ""}`

    function normalizeDate(val) {
      if (val == null) return ""
      let s = String(val).trim()
      if (!s) return ""
      if (/^\d+$/.test(s)) {
        const serial = parseInt(s, 10)
        const jsDate = xlsx.SSF.parse_date_code(serial)
        const y = jsDate.y
        const m = String(jsDate.m).padStart(2, "0")
        const d = String(jsDate.d).padStart(2, "0")
        return `${y}-${m}-${d}`
      }
      const m1 = s.match(/^(\d{2})-(\d{2})-(\d{4})$/)
      if (m1) return `${m1[3]}-${m1[2]}-${m1[1]}`
      return s
    }

    const grouped = new Map()

    for (const r of rows) {
      const name_spending = String(r.name_spending || "").trim()
      const category_id = Number(r.category_id)
      const date_spending = normalizeDate(r.date_spending)
      const company_id = r.company_id !== "" && r.company_id != null ? Number(r.company_id) : null

      if (!name_spending || !category_id || !date_spending) continue

      const key = keyOf({ name_spending, category_id, date_spending, company_id })
      if (!grouped.has(key)) {
        grouped.set(key, {
          name_spending,
          category_id,
          date_spending,
          company_id,
          amount_spending_raw: r.amount_spending,
          medicines: [],
        })
      }

      if (category_id === 9 && r.name_medicine) {
        grouped.get(key).medicines.push({
          name_medicine: String(r.name_medicine).trim(),
          quantity: Number(String(r.quantity || "0").replace(/[^0-9]/g, "")),
          name_unit_id: Number(String(r.unit_id || "0").replace(/[^0-9]/g, "")),
          price_per_item: Number(String(r.price_per_item || "0").replace(/[^0-9]/g, "")),
        })
      }
    }

    let inserted_spending = 0
    let inserted_medicines = 0

    for (const g of grouped.values()) {
      let amount_spending = 0

      if (g.category_id === 9) {
        amount_spending = g.medicines.reduce(
          (sum, m) => sum + Number(m.quantity || 0) * Number(m.price_per_item || 0),
          0
        )
      } else {
        amount_spending = Number(String(g.amount_spending_raw || "0").replace(/[^0-9]/g, ""))
      }

      const [ins] = await knex("detail_spending")
        .insert({
          name_spending: g.name_spending,
          category_id: g.category_id,
          company_id: g.category_id === 9 ? g.company_id ?? null : null,
          amount_spending,
          date_spending: g.date_spending,
          created_at: knex.fn.now(),
        })
        .returning("id")

      const spendingId = typeof ins === "object" ? ins.id : ins
      inserted_spending++

      if (g.category_id === 9 && g.medicines.length > 0) {
        const meds = g.medicines
          .filter((m) => m.name_medicine && m.quantity > 0 && m.name_unit_id > 0)
          .map((m) => ({
            detail_spending_id: spendingId,
            name_medicine: m.name_medicine,
            quantity: m.quantity,
            name_unit_id: m.name_unit_id,
            created_at: knex.fn.now(),
          }))

        if (meds.length) {
          await knex.batchInsert("detail_medicine_spending", meds, 100)
          inserted_medicines += meds.length
        }
      }
    }

    res.status(200).json({
      message: "✅ Excel spending data imported successfully",
      inserted_spending,
      inserted_medicines,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal Server Error" })
  }
})

// ✅ POST: Tambah perusahaan supplier
app.post("/api/inputCompanyMedicine", async (req, res) => {
  try {
    const { name_company } = req.body
    if (!name_company || !name_company.trim()) {
      return res.status(400).send("name_company is required")
    }

    await knex("company_medicine").insert({
      name_company: name_company.trim(),
      created_at: knex.fn.now(),
    })

    res.status(200).json({ message: "✅ Company added" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal Server Error" })
  }
})

// ==========================================
// ✏️ PUT: Update kategori spending
// ==========================================
app.put("/api/categorySpending/:id", async (req, res) => {
  try {
    const { name_category } = req.body
    const { id } = req.params
    if (!name_category) return res.status(400).send("name_category is required")

    const rows = await knex("category_spending").where({ id }).update({ name_category })
    if (!rows) return res.status(404).send("Not found")
    res.status(200).json({ message: "✅ Category updated" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal Server Error" })
  }
})

// ✅ DELETE: Hapus kategori spending
app.delete("/api/categorySpending/:id", async (req, res) => {
  try {
    const { id } = req.params
    const rows = await knex("category_spending").where({ id }).del()
    if (!rows) return res.status(404).send("Not found")
    res.status(200).json({ message: "✅ Category deleted" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal Server Error" })
  }
})

// ✏️ PUT: Update perusahaan supplier
app.put("/api/companyMedicine/:id", async (req, res) => {
  try {
    const { name_company } = req.body
    const { id } = req.params
    if (!name_company || !name_company.trim()) return res.status(400).send("name_company is required")

    const rows = await knex("company_medicine").where({ id }).update({ name_company: name_company.trim() })
    if (!rows) return res.status(404).send("Not found")
    res.status(200).json({ message: "✅ Company updated" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal Server Error" })
  }
})

// ✅ DELETE: Hapus perusahaan supplier
app.delete("/api/companyMedicine/:id", async (req, res) => {
  try {
    const { id } = req.params
    const rows = await knex("company_medicine").where({ id }).del()
    if (!rows) return res.status(404).send("Not found")
    res.status(200).json({ message: "✅ Company deleted" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal Server Error" })
  }
})

// ✏️ PUT: Update unit obat
app.put("/api/unitMedicine/:id", async (req, res) => {
  try {
    const { name_unit } = req.body
    const { id } = req.params
    if (!name_unit || !name_unit.trim()) return res.status(400).send("name_unit is required")

    const rows = await knex("unit_medicine").where({ id }).update({ name_unit: name_unit.trim() })
    if (!rows) return res.status(404).send("Not found")
    res.status(200).json({ message: "✅ Unit updated" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal Server Error" })
  }
})

// ✅ DELETE: Hapus unit obat
app.delete("/api/unitMedicine/:id", async (req, res) => {
  try {
    const { id } = req.params
    const rows = await knex("unit_medicine").where({ id }).del()
    if (!rows) return res.status(404).send("Not found")
    res.status(200).json({ message: "✅ Unit deleted" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal Server Error" })
  }
})

// ✏️ PUT: Edit spending utama
app.put("/api/detailSpending/:id", async (req, res) => {
  try {
    const { id } = req.params
    const { name_spending, amount_spending, category_id, date_spending, company_id } = req.body

    if (!name_spending || !category_id || !date_spending) {
      return res.status(400).send("name_spending, category_id, date_spending are required")
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date_spending)) {
      return res.status(400).send("date_spending must be YYYY-MM-DD")
    }

    const payload = {
      name_spending,
      category_id: Number(category_id),
      date_spending,
      company_id: company_id != null && company_id !== "" ? Number(company_id) : null,
    }

    if (amount_spending != null) payload.amount_spending = Number(amount_spending)

    const rows = await knex("detail_spending").where({ id }).update(payload)
    if (!rows) return res.status(404).send("Not found")
    res.status(200).json({ message: "✅ Spending updated" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal Server Error" })
  }
})

// ✅ DELETE: Hapus spending + detail obat
app.delete("/api/detailSpending/:id", async (req, res) => {
  const trx = await knex.transaction()
  try {
    const { id } = req.params
    await trx("detail_medicine_spending").where({ detail_spending_id: id }).del()
    const rows = await trx("detail_spending").where({ id }).del()
    await trx.commit()
    if (!rows) return res.status(404).send("Not found")
    res.status(200).json({ message: "✅ Spending deleted" })
  } catch (err) {
    await trx.rollback()
    console.error(err)
    res.status(500).json({ error: "Internal Server Error" })
  }
})

// ✏️ PUT: Update item detail obat
app.put("/api/detailMedicineSpending/:id", async (req, res) => {
  try {
    const { id } = req.params
    const { name_medicine, quantity, name_unit_id } = req.body
    if (!name_medicine || !quantity || !name_unit_id) {
      return res.status(400).send("name_medicine, quantity, name_unit_id are required")
    }

    const rows = await knex("detail_medicine_spending")
      .where({ id })
      .update({
        name_medicine,
        quantity: Number(quantity),
        name_unit_id: Number(name_unit_id),
      })

    if (!rows) return res.status(404).send("Not found")
    res.status(200).json({ message: "✅ Medicine detail updated" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal Server Error" })
  }
})

// ✅ DELETE: Hapus item detail obat
app.delete("/api/detailMedicineSpending/:id", async (req, res) => {
  try {
    const { id } = req.params
    const rows = await knex("detail_medicine_spending").where({ id }).del()
    if (!rows) return res.status(404).send("Not found")
    res.status(200).json({ message: "✅ Medicine detail deleted" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal Server Error" })
  }
})
