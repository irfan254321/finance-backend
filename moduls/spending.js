// ==========================================
// 📁 moduls/spending.js (FINAL SECURE VERSION)
// ==========================================
const express = require("express")
const router = express.Router()
const XLSX = require("xlsx")
const upload = require("../middlewares/uploads")
const { verifyToken } = require("../middlewares/verifyToken")

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
      price_per_item: Number(m.price_per_item || 0), // 🟨 tambahkan ini
      detail_spending_id: spendingId,
      created_by: userId,
      created_at: knex.fn.now(),
    }))
    await trx("detail_medicine_spending").insert(medPayload)

    // 🧮 Setelah insert, hitung total semua harga obat
    const total = await trx("detail_medicine_spending")
      .where("detail_spending_id", spendingId)
      .sum({ total: "price_per_item" })
      .first()

    // 🔁 Update ke detail_spending
    await trx("detail_spending")
      .where("id", spendingId)
      .update({
        amount_spending: total?.total ?? 0,
        updated_at: trx.fn.now(),
      })
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
router.post("/uploadSpendingExcelGeneral", verifyToken, async (req, res, next) => {
  try {
    const { rows } = req.body
    const userId = req.user.id

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: "❌ Tidak ada data yang dikirim" })
    }

    // VALIDASI LENGKAP
    const required = ["name_spending", "amount_spending", "category_id", "date_spending"]

    for (const r of rows) {
      const ok = required.every(k => k in r && r[k] !== null && r[k] !== "")
      if (!ok) {
        return res.status(400).json({ message: "❌ Format data tidak lengkap" })
      }
    }

    // TAMBAHKAN created_by
    const finalRows = rows.map(r => ({
      ...r,
      created_by: userId,
      created_at: knex.fn.now(),
    }))

    await knex("detail_spending").insert(finalRows)

    res.status(200).json({
      message: "✅ Spending umum berhasil diimport",
      inserted_spending: finalRows.length
    })
  } catch (err) {
    next(err)
  }
})


// ==========================================
// 💊 POST: Ambil detail obat berdasarkan spending_id
// ==========================================
// 💊 GET detail obat by spending_id (final fix)

function excelDateToIso(date) {
  if (!date) return null

  if (typeof date === "number") {
    const d = new Date((date - 25569) * 86400 * 1000)
    return d.toISOString().slice(0, 10)
  }

  if (typeof date === "string" && date.includes("/")) {
    const [day, month, year] = date.split("/")
    return `${year}-${month.padStart(2,"0")}-${day.padStart(2,"0")}`
  }

  return date
}

// ==========================================
// 📤 POST: Upload spending OBAT (JSON GROUPED, FINAL VERSION)
// ==========================================
router.post("/uploadSpendingExcelObat", verifyToken, async (req, res, next) => {
  try {
    const { data } = req.body
    const userId = req.user.id

    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ message: "Tidak ada data" })
    }

    await knex.transaction(async (trx) => {
      for (const group of data) {
        // HITUNG TOTAL HARGA OBAT
        const totalAmount = group.items.reduce(
          (sum, item) => sum + Number(item.price_per_item || 0),
          0
        )

        // INSERT KE detail_spending
        const [spendingId] = await trx("detail_spending")
          .insert({
            name_spending: group.name_spending,
            category_id: 9,
            company_id: group.company_id,
            date_spending: group.date_spending,
            amount_spending: totalAmount,
            created_by: userId,
            created_at: trx.fn.now(),
          })
          .returning("id")

        const sid = Array.isArray(spendingId) ? spendingId.id : spendingId

        // INSERT OBAT
        const medsPayload = group.items.map((item) => ({
          detail_spending_id: sid,
          name_medicine: item.name_medicine,
          quantity: Number(item.quantity),
          name_unit_id: Number(item.unit_id),
          price_per_item: Number(item.price_per_item || 0),
          created_by: userId,
          created_at: trx.fn.now(),
        }))

        await trx("detail_medicine_spending").insert(medsPayload)
      }
    })

    res.json({ message: "Sukses import obat dengan JSON" })
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
// --- helper konversi tanggal tetap yang kamu punya ---
function excelDateToJSDate(serial) {
  if (!serial || isNaN(serial)) return serial
  const utc_days = Math.floor(serial - 25569)
  const utc_value = utc_days * 86400
  const date_info = new Date(utc_value * 1000)
  return date_info.toISOString().split("T")[0]
}

/* ===========================
   ==== 1) CATEGORY CRUD ====
   ===========================*/

// POST inputCategorySpending (sudah ada, biarkan)
router.post("/inputCategorySpending", async (req, res, next) => { /* ...existing code kamu... */ })

// PUT update category
router.put("/categorySpending/:id", async (req, res, next) => {
  try {
    const { id } = req.params
    const { name_category } = req.body
    if (!name_category || !name_category.trim()) return res.status(400).send("Nama kategori wajib diisi")
    const updated = await knex("category_spending").where({ id }).update({
      name_category: name_category.trim(),
      updated_at: knex.fn.now(),
    })
    if (!updated) return res.status(404).send("Kategori tidak ditemukan")
    res.status(200).json({ message: "✅ Kategori diupdate" })
  } catch (err) { next(err) }
})

// DELETE category
router.delete("/categorySpending/:id", async (req, res, next) => {
  try {
    const { id } = req.params
    const del = await knex("category_spending").where({ id }).del()
    if (!del) return res.status(404).send("Kategori tidak ditemukan")
    res.status(200).json({ message: "🗑️ Kategori dihapus" })
  } catch (err) { next(err) }
})

/* ===========================
   ===== 2) COMPANY CRUD =====
   ===========================*/

// GET (sudah ada): /CompanyMedicine

// POST inputCompanyMedicine (sudah ada, biarkan)
router.post("/inputCompanyMedicine", async (req, res, next) => { /* ...existing code kamu... */ })

// PUT update company
router.put("/companyMedicine/:id", async (req, res, next) => {
  try {
    const { id } = req.params
    const { name_company } = req.body
    if (!name_company || !name_company.trim()) return res.status(400).send("Nama perusahaan wajib diisi")
    const updated = await knex("company_medicine").where({ id }).update({
      name_company: name_company.trim(),
      updated_at: knex.fn.now(),
    })
    if (!updated) return res.status(404).send("Perusahaan tidak ditemukan")
    res.status(200).json({ message: "✅ Perusahaan diupdate" })
  } catch (err) { next(err) }
})

// DELETE company
router.delete("/companyMedicine/:id", async (req, res, next) => {
  try {
    const { id } = req.params
    const del = await knex("company_medicine").where({ id }).del()
    if (!del) return res.status(404).send("Perusahaan tidak ditemukan")
    res.status(200).json({ message: "🗑️ Perusahaan dihapus" })
  } catch (err) { next(err) }
})

/* ===========================
   ======= 3) UNIT CRUD ======
   ===========================*/

// GET (sudah ada): /unitMedicine

// POST unit
router.post("/unitMedicine", async (req, res, next) => {
  try {
    const { name_unit } = req.body
    const userId = req.user?.id || null
    if (!name_unit || !name_unit.trim()) return res.status(400).send("Nama unit wajib diisi")
    const [id] = await knex("unit_medicine").insert({
      name_unit: name_unit.trim(),
      created_by: userId,
      created_at: knex.fn.now(),
    })
    res.status(200).json({ message: "✅ Unit ditambahkan", id })
  } catch (err) { next(err) }
})

// PUT unit
router.put("/unitMedicine/:id", async (req, res, next) => {
  try {
    const { id } = req.params
    const { name_unit } = req.body
    if (!name_unit || !name_unit.trim()) return res.status(400).send("Nama unit wajib diisi")
    const updated = await knex("unit_medicine").where({ id }).update({
      name_unit: name_unit.trim(),
      updated_at: knex.fn.now(),
    })
    if (!updated) return res.status(404).send("Unit tidak ditemukan")
    res.status(200).json({ message: "✅ Unit diupdate" })
  } catch (err) { next(err) }
})

// DELETE unit
router.delete("/unitMedicine/:id", async (req, res, next) => {
  try {
    const { id } = req.params
    const del = await knex("unit_medicine").where({ id }).del()
    if (!del) return res.status(404).send("Unit tidak ditemukan")
    res.status(200).json({ message: "🗑️ Unit dihapus" })
  } catch (err) { next(err) }
})

/* ==========================================
   ======= 4) SPENDING + MEDICINE CRUD ======
   ==========================================*/

// GET (sudah ada): /spending  &  /spending/:year
// POST (sudah ada): /inputSpendingDetail

// PUT detailSpending
router.put("/detailSpending/:id", async (req, res, next) => {
  try {
    const { id } = req.params
    const { name_spending, amount_spending, category_id, date_spending, company_id } = req.body

    if (!name_spending || !category_id || !date_spending)
      return res.status(400).send("Incomplete payload")

    const isObat = Number(category_id) === 9
    const payload = {
      name_spending,
      category_id: Number(category_id),
      date_spending,
      amount_spending: isObat ? null : Number(amount_spending || 0),
      company_id: isObat ? (company_id ? Number(company_id) : null) : null,
      updated_at: knex.fn.now(),
    }

    const updated = await knex("detail_spending").where({ id }).update(payload)
    if (!updated) return res.status(404).send("Spending tidak ditemukan")
    res.status(200).json({ message: "✅ Spending diupdate" })
  } catch (err) { next(err) }
})

// DELETE detailSpending (sekalian hapus medicine-nya)
router.delete("/detailSpending/:id", async (req, res, next) => {
  try {
    const { id } = req.params
    await knex.transaction(async (trx) => {
      await trx("detail_medicine_spending").where({ detail_spending_id: id }).del()
      const del = await trx("detail_spending").where({ id }).del()
      if (!del) throw new Error("NOT_FOUND")
    })
    res.status(200).json({ message: "🗑️ Spending dihapus" })
  } catch (err) {
    if (err.message === "NOT_FOUND") return res.status(404).send("Spending tidak ditemukan")
    next(err)
  }
})

// PUT detailMedicineSpending
router.put("/detailMedicineSpending/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name_medicine, quantity, name_unit_id, price_per_item } = req.body;

    await knex.transaction(async (trx) => {
      const exists = await trx("detail_medicine_spending")
        .where({ id })
        .select("detail_spending_id")
        .first();
      if (!exists) throw new Error("NOT_FOUND");

      // Update detail obat
      await trx("detail_medicine_spending").where({ id }).update({
        name_medicine,
        quantity: Number(quantity ?? 0),
        name_unit_id: Number(name_unit_id ?? 0),
        price_per_item: Number(price_per_item ?? 0),
        updated_at: trx.fn.now(),
        updated_by: req.user?.id ?? null,
      });

      // Hitung ulang total belanja dari semua obat
      const total = await trx("detail_medicine_spending")
        .where("detail_spending_id", exists.detail_spending_id)
        .sum({ total: "price_per_item" })
        .first();

      await trx("detail_spending")
        .where("id", exists.detail_spending_id)
        .update({
          amount_spending: total?.total ?? 0,
          updated_at: trx.fn.now(),
        });
    });

    res.status(200).json({ message: "✅ Detail obat diperbarui & total spending disinkronkan" });
  } catch (err) {
    if (err.message === "NOT_FOUND")
      return res.status(404).json({ error: "Detail obat tidak ditemukan" });
    next(err);
  }
});

// DELETE detailMedicineSpending
router.delete("/detailMedicineSpending/:id", async (req, res, next) => {
  try {
    const { id } = req.params
    const del = await knex("detail_medicine_spending").where({ id }).del()
    if (!del) return res.status(404).send("Detail obat tidak ditemukan")
    res.status(200).json({ message: "🗑️ Obat dihapus" })
  } catch (err) { next(err) }
})

/* ==========================================
   💊 GET detail obat by spending_id (selaraskan field)
   ==========================================*/
router.post("/spendingMedicineBySpendingId", async (req, res, next) => {
  try {
    const { detail_spending_id } = req.body
    if (!detail_spending_id) return res.status(400).json({ error: "detail_spending_id is required" })

    const medicines = await knex("detail_medicine_spending as dms")
      .select(
        "dms.id",
        "dms.detail_spending_id",
        "dms.name_medicine",
        "dms.quantity",
        "dms.name_unit_id",
        "u.name_unit",
        "dms.created_at"
      )
      .leftJoin("unit_medicine as u", "dms.name_unit_id", "u.id")
      .where("dms.detail_spending_id", detail_spending_id)
      .orderBy("dms.name_medicine", "asc")

    res.status(200).json(medicines)
  } catch (err) { next(err) }
})

// ========= UPDATE & DELETE: CATEGORY SPENDING =========
router.put("/categorySpending/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name_category } = req.body;
    if (!name_category || !name_category.trim()) return res.status(400).json({ error: "Nama kategori wajib diisi" });

    const exists = await knex("category_spending").where({ id }).first();
    if (!exists) return res.status(404).json({ error: "Kategori tidak ditemukan" });

    await knex("category_spending").where({ id }).update({
      name_category: name_category.trim(),
      updated_at: knex.fn.now(),
      updated_by: req.user?.id ?? null,
    });
    res.status(200).json({ message: "✅ Kategori diupdate" });
  } catch (err) { next(err); }
});

router.delete("/categorySpending/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const exists = await knex("category_spending").where({ id }).first();
    if (!exists) return res.status(404).json({ error: "Kategori tidak ditemukan" });

    await knex("category_spending").where({ id }).del();
    res.status(200).json({ message: "🗑️ Kategori dihapus" });
  } catch (err) { next(err); }
});

// ========= UPDATE & DELETE: COMPANY MEDICINE =========
router.put("/companyMedicine/:id", async (req, res, next) => {
  try {
    const { id } = req.params; const { name_company } = req.body;
    if (!name_company || !name_company.trim()) return res.status(400).json({ error: "Nama perusahaan wajib diisi" });

    const exists = await knex("company_medicine").where({ id }).first();
    if (!exists) return res.status(404).json({ error: "Perusahaan tidak ditemukan" });

    await knex("company_medicine").where({ id }).update({
      name_company: name_company.trim(),
      updated_at: knex.fn.now(), updated_by: req.user?.id ?? null,
    });
    res.status(200).json({ message: "✅ Perusahaan diupdate" });
  } catch (err) { next(err); }
});

router.delete("/companyMedicine/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const exists = await knex("company_medicine").where({ id }).first();
    if (!exists) return res.status(404).json({ error: "Perusahaan tidak ditemukan" });

    await knex("company_medicine").where({ id }).del();
    res.status(200).json({ message: "🗑️ Perusahaan dihapus" });
  } catch (err) { next(err); }
});

// ========= CREATE/UPDATE/DELETE: UNIT MEDICINE =========
router.post("/unitMedicine", async (req, res, next) => {
  try {
    const { name_unit } = req.body;
    if (!name_unit || !name_unit.trim()) return res.status(400).json({ error: "Nama unit wajib diisi" });
    const [id] = await knex("unit_medicine").insert({
      name_unit: name_unit.trim(),
      created_at: knex.fn.now(), created_by: req.user?.id ?? null,
    });
    res.status(200).json({ message: "✅ Unit ditambahkan", id });
  } catch (err) { next(err); }
});

router.put("/unitMedicine/:id", async (req, res, next) => {
  try {
    const { id } = req.params; const { name_unit } = req.body;
    if (!name_unit || !name_unit.trim()) return res.status(400).json({ error: "Nama unit wajib diisi" });

    const exists = await knex("unit_medicine").where({ id }).first();
    if (!exists) return res.status(404).json({ error: "Unit tidak ditemukan" });

    await knex("unit_medicine").where({ id }).update({
      name_unit: name_unit.trim(),
      updated_at: knex.fn.now(), updated_by: req.user?.id ?? null,
    });
    res.status(200).json({ message: "✅ Unit diupdate" });
  } catch (err) { next(err); }
});

router.delete("/unitMedicine/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const exists = await knex("unit_medicine").where({ id }).first();
    if (!exists) return res.status(404).json({ error: "Unit tidak ditemukan" });

    await knex("unit_medicine").where({ id }).del();
    res.status(200).json({ message: "🗑️ Unit dihapus" });
  } catch (err) { next(err); }
});

// ========= UPDATE & DELETE: DETAIL SPENDING =========
router.put("/detailSpending/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name_spending, amount_spending, category_id, date_spending, company_id } = req.body;

    const exists = await knex("detail_spending").where({ id }).first();
    if (!exists) return res.status(404).json({ error: "Spending tidak ditemukan" });

    // validasi ringan
    if (!name_spending || !category_id || !date_spending)
      return res.status(400).json({ error: "name_spending/category_id/date_spending wajib" });

    const isObat = Number(category_id) === 9;
    await knex("detail_spending").where({ id }).update({
      name_spending,
      category_id: Number(category_id),
      amount_spending: isObat ? exists.amount_spending : Number(amount_spending ?? 0),
      company_id: isObat ? Number(company_id ?? 0) : null,
      date_spending,
      updated_at: knex.fn.now(), updated_by: req.user?.id ?? null,
    });

    res.status(200).json({ message: "✅ Spending diupdate" });
  } catch (err) { next(err); }
});

router.delete("/detailSpending/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const exists = await knex("detail_spending").where({ id }).first();
    if (!exists) return res.status(404).json({ error: "Spending tidak ditemukan" });

    await knex.transaction(async trx => {
      await trx("detail_medicine_spending").where({ detail_spending_id: id }).del();
      await trx("detail_spending").where({ id }).del();
    });

    res.status(200).json({ message: "🗑️ Spending & detail obat dihapus" });
  } catch (err) { next(err); }
});

// ========= UPDATE & DELETE: DETAIL MEDICINE SPENDING =========
router.put("/detailMedicineSpending/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name_medicine, quantity, name_unit_id } = req.body;

    const exists = await knex("detail_medicine_spending").where({ id }).first();
    if (!exists) return res.status(404).json({ error: "Detail obat tidak ditemukan" });

    await knex.transaction(async trx => {
      const [exists] = await trx("detail_medicine_spending").where({ id }).select("detail_spending_id");
      if (!exists) return res.status(404).json({ error: "Detail obat tidak ditemukan" });

    await trx("detail_medicine_spending").where({ id }).update({
      name_medicine,
      quantity: Number(quantity ?? 0),
      name_unit_id: Number(name_unit_id ?? 0),
      updated_at: trx.fn.now(),
      updated_by: req.user?.id ?? null,
    });

    // Hitung ulang total harga semua obat dalam spending ini
    const total = await trx("detail_medicine_spending")
      .where("detail_spending_id", exists.detail_spending_id)
      .sum({ total: "price_per_item" })
      .first();

    await trx("detail_spending")
      .where("id", exists.detail_spending_id)
      .update({
        amount_spending: total?.total ?? 0,
        updated_at: trx.fn.now(),
      });
  });
  res.status(200).json({ message: "✅ Detail obat & total spending diperbarui" });
  } catch (err) { next(err); }
});

router.delete("/detailMedicineSpending/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    await knex.transaction(async (trx) => {
      // Cek dulu apakah obat ada dan ambil spending_id-nya
      const exists = await trx("detail_medicine_spending")
        .where({ id })
        .select("detail_spending_id")
        .first();
      if (!exists) throw new Error("NOT_FOUND");

      // Hapus obat
      await trx("detail_medicine_spending").where({ id }).del();

      // Hitung ulang total harga semua obat di spending ini
      const total = await trx("detail_medicine_spending")
        .where("detail_spending_id", exists.detail_spending_id)
        .sum({ total: "price_per_item" })
        .first();

      // Update total ke tabel detail_spending
      await trx("detail_spending")
        .where("id", exists.detail_spending_id)
        .update({
          amount_spending: total?.total ?? 0,
          updated_at: trx.fn.now(),
        });
    });

    res.status(200).json({ message: "🗑️ Obat dihapus & total spending diupdate" });
  } catch (err) {
    if (err.message === "NOT_FOUND")
      return res.status(404).json({ error: "Detail obat tidak ditemukan" });
    next(err);
  }
});

module.exports = router