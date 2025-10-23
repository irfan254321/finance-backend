const request = require("supertest")
const app = require("../main")

describe("✅ Income API Tests", () => {
  it("GET /api/income/:year should return income data", async () => {
    const year = 2025
    const res = await request(app).get(`/api/income/${year}`)

    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it("GET /api/categoryIncome should return list of income categories", async () => {
    const res = await request(app).get("/api/categoryIncome")

    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})

afterAll(async () => {
  if (global.knex) await global.knex.destroy()
})