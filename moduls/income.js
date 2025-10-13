// ==========================================
// 📁 moduls/income.js (FINAL VERSION)
// ==========================================

// ✅ GET: Semua income berdasarkan tahun
app.get("/api/income/:year", async (req, res) => {
    try {
        const year = req.params.year
        const results = await knex("detail_income")
            .select("*")
            .whereRaw("YEAR(date_income) = ?", [year])
            .orderBy("date_income", "asc")

        res.status(200).json(results)
    } catch (err) {
        console.error("Error GET /api/income/:year:", err)
        res.status(500).json({
            error: err.message
        })
    }
})

// ✅ GET: Semua income (tanpa filter)
app.get("/api/income", async (req, res) => {
    try {
        const results = await knex("detail_income").select("*").orderBy("date_income", "desc")
        res.status(200).json(results)
    } catch (err) {
        console.error("Error GET /api/income:", err)
        res.status(500).json({
            error: err.message
        })
    }
})

// ✅ GET: Semua kategori income
app.get("/api/categoryIncome", async (req, res) => {
    try {
        const results = await knex("category_income").select("*").orderBy("id", "asc")
        res.status(200).json(results)
    } catch (err) {
        console.error("Error GET /api/categoryIncome:", err)
        res.status(500).json({
            error: err.message
        })
    }
})

// ✅ POST: Filter income by kategori + tahun
app.post("/api/incomeCategoryYear", async (req, res) => {
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
        console.error("Error POST /api/incomeCategoryYear:", err)
        res.status(500).send("Internal Server Error!")
    }
})

// ✅ POST: Filter income by kategori + bulan + tahun
app.post("/api/incomeDetail", async (req, res) => {
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
        console.error("Error POST /api/incomeDetail:", err)
        res.status(500).send("Internal Server Error!")
    }
})

// ✅ POST: Input data income baru
app.post("/api/inputIncomeDetail", async (req, res) => {
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

        // Validasi format tanggal
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date_income)) {
            return res.status(400).send("date_income must be in YYYY-MM-DD format")
        }

        const result = await knex("detail_income").insert({
            name_income,
            amount_income,
            category_id,
            date_income,
            created_at: knex.fn.now(),
        })

        res.status(200).json({
            message: "✅ Income inserted successfully",
            result
        })
    } catch (err) {
        console.error("Error POST /api/inputIncomeDetail:", err)
        res.status(500).send("Internal Server Error!")
    }
})

// ✅ POST: Tambah kategori income baru
app.post("/api/inputCategoryIncome", async (req, res) => {
    try {
        const {
            name_category
        } = req.body
        if (!name_category) {
            return res.status(400).send("Name Category is required!")
        }

        const result = await knex("category_income").insert({
            name_category,
            created_at: knex.fn.now(),
        })

        res.status(200).json({
            message: "✅ Category added successfully",
            result
        })
    } catch (err) {
        console.error("Error POST /api/inputCategoryIncome:", err)
        res.status(500).send("Internal Server Error!")
    }
})

// ✅ POST: Upload income Excel
app.post("/api/uploadIncomeExcel", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send("❌ Tidak ada file yang diupload.")
        }

        const filePath = req.file.path
        const workbook = xlsx.readFile(filePath)
        const sheetName = workbook.SheetNames[0]
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName])

        if (!data.length) {
            fs.unlinkSync(filePath)
            return res.status(400).send("❌ File kosong atau tidak valid.")
        }

        // Validasi kolom
        const requiredCols = ["name_income", "amount_income", "category_id", "date_income"]
        const invalid = data.find((row) => !requiredCols.every((c) => c in row))
        if (invalid) {
            fs.unlinkSync(filePath)
            return res.status(400).send("❌ Kolom Excel tidak sesuai. Harus ada: name_income, amount_income, category_id, date_income")
        }

        // Format tanggal
        const parsedData = data.map((row) => {
            let dateValue = row.date_income
            if (typeof dateValue === "number") {
                dateValue = xlsx.SSF.format("yyyy-mm-dd", dateValue)
            }
            return {
                ...row,
                date_income: dateValue,
            }
        })

        await knex("detail_income").insert(parsedData)
        fs.unlinkSync(filePath)

        res.status(200).json({
            message: "✅ Data Excel berhasil diimport!",
            inserted: parsedData.length,
        })
    } catch (err) {
        console.error("❌ Upload Excel Error:", err)
        res.status(500).send("Internal Server Error")
    }
})