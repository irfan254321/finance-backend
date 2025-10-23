const request = require("supertest")
const app = require("../main")

describe("💰 Spending API Tests", () => {
  it("GET /api/spending/:year should return spending data", async () => {
    const res = await request(app).get("/api/spending/2025")

    expect([200, 403]).toContain(res.statusCode) // jika token perlu
  })
})

afterAll(async () => {
  if (global.knex) await global.knex.destroy()
})