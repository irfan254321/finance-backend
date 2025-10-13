# API Finance RS Bhayangkara

**Base URL:** `https://api.rs/api`  
**Author:** Irfan IT RS Bhayangkara  
**Last updated:** 2025-10-12 08:13:02Z (UTC)

> All production endpoints are prefixed with `/api` except **Auth** public endpoints (`/register`, `/login`, `/logout`, `/me`).  
> Protected endpoints are marked with: **🔐 Protected: YES (Authorization: Bearer <token>)**

---

## Table of Contents

- [HTTP Status Codes](#http-status-codes)
- [Auth](#auth)
  - [Register](#register)
  - [Login](#login)
  - [Logout](#logout)
  - [Me (Current User)](#me-current-user)
- [Income](#income)
  - [Get Income by Year](#get-income-by-year-🔐)
  - [Get All Income](#get-all-income-🔐)
  - [Get Income Categories](#get-income-categories-🔐)
  - [Income by Category & Year](#income-by-category--year-🔐)
  - [Income Detail (by Category, Month, Year)](#income-detail-by-category-month-year-🔐)
  - [Create Income](#create-income-🔐)
  - [Create Income Category](#create-income-category-🔐)
  - [Upload Income via Excel](#upload-income-via-excel-🔐)
- [Spending](#spending)
  - [Get Spending by Year](#get-spending-by-year-🔐)
  - [Get All Spending](#get-all-spending-🔐)
  - [Get Spending Categories](#get-spending-categories-🔐)
  - [Get Suppliers (Company Medicine)](#get-suppliers-company-medicine-🔐)
  - [Get Units (Medicine Unit)](#get-units-medicine-unit-🔐)
  - [Spending by Category & Year](#spending-by-category--year-🔐)
  - [Spending Detail (by Category, Month, Year)](#spending-detail-by-category-month-year-🔐)
  - [Get Medicines by Spending ID](#get-medicines-by-spending-id-🔐)
  - [Create Spending Category](#create-spending-category-🔐)
  - [Create Spending (with optional medicine details)](#create-spending-with-optional-medicine-details-🔐)
  - [Upload Spending via Excel](#upload-spending-via-excel-🔐)
  - [Create Supplier](#create-supplier-🔐)
  - [Update/Delete Category, Supplier, Unit](#updatedelete-category-supplier-unit-🔐)
  - [Update/Delete Spending](#updatedelete-spending-🔐)
  - [Update/Delete Medicine Detail Item](#updatedelete-medicine-detail-item-🔐)
- [Content](#content)
  - [Public: News (paginated)](#public-news-paginated)
  - [Public: Slides](#public-slides)
  - [Admin: Slides CRUD](#admin-slides-crud-🔐)
  - [Admin: News CRUD](#admin-news-crud-🔐)
- [Database Schema (Overview)](#database-schema-overview)

---

## HTTP Status Codes

| Code | Meaning | Notes |
|------|---------|-------|
| 200 | OK | Successful request |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Missing or invalid parameters |
| 401 | Unauthorized | Invalid or expired token / bad credentials |
| 403 | Forbidden | No token provided / insufficient role |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limiter triggered |
| 500 | Internal Server Error | Unexpected server error |

> Production middleware: `helmet()` for HTTP security headers and `express-rate-limit` for DoS/bruteforce mitigation.

---

## Auth

### Register
**POST** `/register`  
Protected: **NO**

**Request (JSON)**
```json
{
  "name_users": "Admin",
  "username": "admin",
  "password": "admin123",
  "role": "admin"
}
```

**Response 201**
```json
{ "id": 1, "message": "✅ User registered successfully" }
```

**cURL**
```bash
curl -X POST https://api.rs/register   -H "Content-Type: application/json"   -d '{"name_users":"Admin","username":"admin","password":"admin123","role":"admin"}'
```

---

### Login
**POST** `/login`  
Protected: **NO**

**Request**
```json
{ "username": "admin", "password": "admin123" }
```

**Response 200**
```json
{
  "message": "✅ Login success",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1, "name_users": "Admin", "username": "admin", "role": "admin"
  }
}
```

**cURL**
```bash
curl -X POST https://api.rs/login   -H "Content-Type: application/json"   -d '{"username":"admin","password":"admin123"}'
```

---

### Logout
**POST** `/logout`  
🔐 Protected: YES (Authorization: Bearer <token>)

**Response 200**
```json
{ "message": "✅ Logout successful" }
```

**cURL**
```bash
curl -X POST https://api.rs/logout   -H "Authorization: Bearer <token>"
```

---

### Me (Current User)
**GET** `/me`  
🔐 Protected: YES (Authorization: Bearer <token>)

**Response 200**
```json
{
  "id": 1,
  "name_users": "Admin",
  "username": "admin",
  "role": "admin",
  "last_login": "2025-10-12T12:00:00.000Z",
  "created_at": "2025-01-01T00:00:00.000Z"
}
```

**cURL**
```bash
curl -X GET https://api.rs/me   -H "Authorization: Bearer <token>"
```

---

## Income

### Get Income by Year 🔐
**GET** `/income/:year`  
🔐 Protected: YES (Authorization: Bearer <token>)

**Example**: `/income/2025`

**Response 200**
```json
[
  {"id":101,"name_income":"JKN","amount_income":1200000,"category_id":1,"date_income":"2025-01-03"},
  {"id":102,"name_income":"UMUM","amount_income":800000,"category_id":2,"date_income":"2025-01-05"}
]
```

**cURL**
```bash
curl -X GET https://api.rs/api/income/2025   -H "Authorization: Bearer <token>"
```

---

### Get All Income 🔐
**GET** `/income`  
🔐 Protected: YES

**cURL**
```bash
curl -X GET https://api.rs/api/income   -H "Authorization: Bearer <token>"
```

---

### Get Income Categories 🔐
**GET** `/categoryIncome`  
🔐 Protected: YES

**Response 200**
```json
[{"id":1,"name_category":"JKN"},{"id":2,"name_category":"Umum"}]
```

**cURL**
```bash
curl -X GET https://api.rs/api/categoryIncome   -H "Authorization: Bearer <token)"
```

---

### Income by Category & Year 🔐
**POST** `/incomeCategoryYear`  
🔐 Protected: YES

**Request**
```json
{ "category_id": 1, "year": 2025 }
```

**Response 200**
```json
[{"name_income":"JKN","amount_income":1200000,"date_income":"2025-03-02"}]
```

**cURL**
```bash
curl -X POST https://api.rs/api/incomeCategoryYear   -H "Authorization: Bearer <token>" -H "Content-Type: application/json"   -d '{"category_id":1,"year":2025}'
```

---

### Income Detail (by Category, Month, Year) 🔐
**POST** `/incomeDetail`  
🔐 Protected: YES

**Request**
```json
{ "category_id": 1, "month": 3, "year": 2025 }
```

**Response 200**
```json
[{"name_income":"JKN","amount_income":500000,"date_income":"2025-03-01"}]
```

**cURL**
```bash
curl -X POST https://api.rs/api/incomeDetail   -H "Authorization: Bearer <token>" -H "Content-Type: application/json"   -d '{"category_id":1,"month":3,"year":2025}'
```

---

### Create Income 🔐
**POST** `/inputIncomeDetail`  
🔐 Protected: YES

**Request**
```json
{ "name_income":"JKN","amount_income":1200000,"category_id":1,"date_income":"2025-03-02" }
```

**Response 200**
```json
{ "message": "✅ Income inserted successfully" }
```

**cURL**
```bash
curl -X POST https://api.rs/api/inputIncomeDetail   -H "Authorization: Bearer <token>" -H "Content-Type: application/json"   -d '{"name_income":"JKN","amount_income":1200000,"category_id":1,"date_income":"2025-03-02"}'
```

---

### Create Income Category 🔐
**POST** `/inputCategoryIncome`  
🔐 Protected: YES

**Request**
```json
{ "name_category": "Umum" }
```

**Response 200**
```json
{ "message": "✅ Category added successfully" }
```

**cURL**
```bash
curl -X POST https://api.rs/api/inputCategoryIncome   -H "Authorization: Bearer <token>" -H "Content-Type: application/json"   -d '{"name_category":"Umum"}'
```

---

### Upload Income via Excel 🔐
**POST** `/uploadIncomeExcel`  
🔐 Protected: YES  
Form field: `file` (xlsx)

**cURL**
```bash
curl -X POST https://api.rs/api/uploadIncomeExcel   -H "Authorization: Bearer <token>"   -F "file=@/path/to/income.xlsx"
```

**Success Response**
```json
{ "message":"✅ Data Excel berhasil diimport!", "inserted": 35 }
```

---

## Spending

### Get Spending by Year 🔐
**GET** `/spending/:year`  
🔐 Protected: YES

**cURL**
```bash
curl -X GET https://api.rs/api/spending/2025   -H "Authorization: Bearer <token>"
```

---

### Get All Spending 🔐
**GET** `/spending`  
🔐 Protected: YES

**cURL**
```bash
curl -X GET https://api.rs/api/spending   -H "Authorization: Bearer <token>"
```

---

### Get Spending Categories 🔐
**GET** `/inputCategorySpending`  
🔐 Protected: YES

**cURL**
```bash
curl -X GET https://api.rs/api/inputCategorySpending   -H "Authorization: Bearer <token>"
```

---

### Get Suppliers (Company Medicine) 🔐
**GET** `/inputCompanyMedicine` (supports `?page=&limit=`)  
🔐 Protected: YES

**cURL**
```bash
curl -X GET "https://api.rs/api/inputCompanyMedicine?page=1&limit=20"   -H "Authorization: Bearer <token>"
```

---

### Get Units (Medicine Unit) 🔐
**GET** `/unitMedicine`  
🔐 Protected: YES

**cURL**
```bash
curl -X GET https://api.rs/api/unitMedicine   -H "Authorization: Bearer <token>"
```

---

### Spending by Category & Year 🔐
**POST** `/spendingCategoryYear`  
🔐 Protected: YES

**Request**
```json
{ "category_id": 9, "year": 2025 }
```

**Response 200**
```json
[{"name_spending":"Obat","amount_spending":2500000,"date_spending":"2025-02-05"}]
```

**cURL**
```bash
curl -X POST https://api.rs/api/spendingCategoryYear   -H "Authorization: Bearer <token>" -H "Content-Type: application/json"   -d '{"category_id":9,"year":2025}'
```

---

### Spending Detail (by Category, Month, Year) 🔐
**POST** `/spendingDetail`  
🔐 Protected: YES

**Request**
```json
{ "category_id": 9, "month": 2, "year": 2025 }
```

**Response 200**
```json
[{"name_spending":"Obat","amount_spending":1200000,"date_spending":"2025-02-01"}]
```

**cURL**
```bash
curl -X POST https://api.rs/api/spendingDetail   -H "Authorization: Bearer <token)" -H "Content-Type: application/json"   -d '{"category_id":9,"month":2,"year":2025}'
```

---

### Get Medicines by Spending ID 🔐
**POST** `/spendingMedicineBySpendingId`  
🔐 Protected: YES

**Request**
```json
{ "detail_spending_id": 123 }
```

**Response 200**
```json
[{"id":1,"detail_spending_id":123,"name_medicine":"Paracetamol","quantity":10,"name_unit_id":2,"name_unit":"Tablet"}]
```

**cURL**
```bash
curl -X POST https://api.rs/api/spendingMedicineBySpendingId   -H "Authorization: Bearer <token)" -H "Content-Type: application/json"   -d '{"detail_spending_id":123}'
```

---

### Create Spending Category 🔐
**POST** `/inputCategorySpending`  
🔐 Protected: YES

**Request**
```json
{ "name_category": "Obat" }
```

**Response 200**
```json
{ "message": "✅ Category created" }
```

**cURL**
```bash
curl -X POST https://api.rs/api/inputCategorySpending   -H "Authorization: Bearer <token)" -H "Content-Type: application/json"   -d '{"name_category":"Obat"}'
```

---

### Create Spending (with optional medicine details) 🔐
**POST** `/inputSpendingDetail`  
🔐 Protected: YES

**Request**
```json
{
  "name_spending":"Pembelian Obat",
  "amount_spending": 2500000,
  "category_id": 9,
  "date_spending":"2025-02-05",
  "company_id": 3,
  "medicines":[
    {"name_medicine":"Paracetamol","quantity":10,"name_unit_id":2},
    {"name_medicine":"Amoxicillin","quantity":5,"name_unit_id":2}
  ]
}
```

**Response 200**
```json
{ "message": "✅ Spending inserted successfully" }
```

**cURL**
```bash
curl -X POST https://api.rs/api/inputSpendingDetail   -H "Authorization: Bearer <token)" -H "Content-Type: application/json"   -d '{"name_spending":"Pembelian Obat","amount_spending":2500000,"category_id":9,"date_spending":"2025-02-05","company_id":3,"medicines":[{"name_medicine":"Paracetamol","quantity":10,"name_unit_id":2},{"name_medicine":"Amoxicillin","quantity":5,"name_unit_id":2}]}'
```

---

### Upload Spending via Excel 🔐
**POST** `/uploadSpendingExcel`  
🔐 Protected: YES  
Form field: `file` (xlsx)

**Columns expected:** `name_spending, category_id, date_spending, company_id (optional), amount_spending (non-obat), name_medicine, quantity, unit_id, price_per_item`

**cURL**
```bash
curl -X POST https://api.rs/api/uploadSpendingExcel   -H "Authorization: Bearer <token)"   -F "file=@/path/to/spending.xlsx"
```

**Response 200**
```json
{ "message":"✅ Excel spending data imported successfully","inserted_spending":10,"inserted_medicines":28 }
```

---

### Create Supplier 🔐
**POST** `/inputCompanyMedicine`  
🔐 Protected: YES

**Request**
```json
{ "name_company":"PT Sehat Selalu" }
```

**Response 200**
```json
{ "message": "✅ Company added" }
```

**cURL**
```bash
curl -X POST https://api.rs/api/inputCompanyMedicine   -H "Authorization: Bearer <token)" -H "Content-Type: application/json"   -d '{"name_company":"PT Sehat Selalu"}'
```

---

### Update/Delete Category, Supplier, Unit 🔐
**PUT** `/categorySpending/:id`  
**DELETE** `/categorySpending/:id`  
**PUT** `/companyMedicine/:id`  
**DELETE** `/companyMedicine/:id`  
**PUT** `/unitMedicine/:id`  
**DELETE** `/unitMedicine/:id`  
🔐 Protected: YES

**cURL (example)**
```bash
curl -X PUT https://api.rs/api/categorySpending/5   -H "Authorization: Bearer <token)" -H "Content-Type: application/json"   -d '{"name_category":"Operasional"}'
```

---

### Update/Delete Spending 🔐
**PUT** `/detailSpending/:id`  
**DELETE** `/detailSpending/:id`  
🔐 Protected: YES

**PUT Request**
```json
{ "name_spending":"Perbaikan AC","amount_spending":750000,"category_id":3,"date_spending":"2025-04-01","company_id":null }
```

**cURL**
```bash
curl -X PUT https://api.rs/api/detailSpending/77   -H "Authorization: Bearer <token)" -H "Content-Type: application/json"   -d '{"name_spending":"Perbaikan AC","amount_spending":750000,"category_id":3,"date_spending":"2025-04-01","company_id":null}'
```

---

### Update/Delete Medicine Detail Item 🔐
**PUT** `/detailMedicineSpending/:id`  
**DELETE** `/detailMedicineSpending/:id`  
🔐 Protected: YES

**PUT Request**
```json
{ "name_medicine":"Paracetamol","quantity":12,"name_unit_id":2 }
```

**cURL**
```bash
curl -X PUT https://api.rs/api/detailMedicineSpending/12   -H "Authorization: Bearer <token)" -H "Content-Type: application/json"   -d '{"name_medicine":"Paracetamol","quantity":12,"name_unit_id":2}'
```

---

## Content

### Public: News (paginated)
**GET** `/contents/berita?{page=1}&{limit=5}`  
Protected: **NO**

**Response 200**
```json
{
  "data":[{"id":1,"title":"Renovation complete","type":"berita"}],
  "total": 25,
  "page": 1,
  "totalPages": 5
}
```

**cURL**
```bash
curl -X GET "https://api.rs/contents/berita?page=1&limit=5"
```

---

### Public: Slides
**GET** `/contents/slide`  
Protected: **NO**

**cURL**
```bash
curl -X GET https://api.rs/contents/slide
```

---

### Admin: Slides CRUD 🔐
**POST** `/admin/slide`  
**GET** `/admin/slide`  
**PUT** `/admin/slide/:id`  
**DELETE** `/admin/slide/:id`  
🔐 Protected: YES (Admin only)

**Create Request**
```json
{ "title":"Welcome", "image_url":"https://cdn.example.com/slide1.jpg" }
```

---

### Admin: News CRUD 🔐
**POST** `/admin/berita`  
**GET** `/admin/berita`  
**PUT** `/admin/berita/:id`  
**DELETE** `/admin/berita/:id`  
🔐 Protected: YES (Admin only)

**Create Request**
```json
{ "title":"New MRI installed", "content":"Details..." }
```

---

## Database Schema (Overview)

> Field names below reflect the current backend code. Timestamps like `created_at` may be automatically set via `knex.fn.now()`.

### `login_users`
- `id` (PK, int, auto)  
- `name_users` (varchar)  
- `username` (varchar, unique)  
- `password` (varchar, **bcrypt hash**)  
- `role` (enum: `admin` | `user`)  
- `token` (text, nullable)  
- `last_login` (datetime, nullable)  
- `created_at` (datetime, default now)

### `detail_income`
- `id` (PK, int)  
- `name_income` (varchar)  
- `amount_income` (decimal/int)  
- `category_id` (int, FK -> `category_income.id`)  
- `date_income` (date)  
- `created_at` (datetime, optional)

### `category_income`
- `id` (PK)  
- `name_category` (varchar)

### `detail_spending`
- `id` (PK)  
- `name_spending` (varchar)  
- `amount_spending` (decimal/int)  
- `category_id` (int, FK -> `category_spending.id`)  
- `company_id` (int, nullable, FK -> `company_medicine.id`)  
- `date_spending` (date)  
- `created_at` (datetime)

### `category_spending`
- `id` (PK)  
- `name_category` (varchar)  
- `created_at` (datetime)

### `company_medicine`
- `id` (PK)  
- `name_company` (varchar)  
- `created_at` (datetime)

### `unit_medicine`
- `id` (PK)  
- `name_unit` (varchar)

### `detail_medicine_spending`
- `id` (PK)  
- `detail_spending_id` (FK -> `detail_spending.id`)  
- `name_medicine` (varchar)  
- `quantity` (int)  
- `name_unit_id` (FK -> `unit_medicine.id`)  
- `created_at` (datetime)

### `contents`
- `id` (PK)  
- `type` (`slide` | `berita`)  
- `title` (varchar)  
- `content` (text, optional)  
- `image_url` (text, for slides)  
- `created_at` (datetime)

---

## Security Notes

- JWT secret is stored in `.env` as `JWT_SECRET` (never commit to Git).  
- Always send `Authorization: Bearer <token>` for any `/api/**` routes.  
- Server uses `helmet()` and `express-rate-limit` globally (adjust limits as needed).  
- Enforce CORS to allow only trusted frontends.

---

## Changelog

- Initial secure refactor with JWT, bcrypt, helmet, rate limit, and cleaned routes.  
- This documentation generated for production readiness.

---

© 2025 RS Bhayangkara — **API Finance**. Maintained by *Irfan IT RS Bhayangkara*.