const request = require("supertest")
const app = require("../main")

describe("🔐 Auth API Tests", () => {
  const fakeUser = {
    name_users: "Tester Jest",
    username: "jest_user",
    password: "StrongPass@123"
  }

  it("POST /register should create a new user", async () => {
    const res = await request(app).post("/register").send(fakeUser)
    expect([200, 201, 400]).toContain(res.statusCode) // allow already exists
  })

  it("POST /login should return a token", async () => {
    const res = await request(app).post("/login").send({
      username: fakeUser.username,
      password: fakeUser.password
    })
    expect(res.statusCode).toBe(200)
    expect(res.body).toHaveProperty("token")
  })
})

afterAll(async () => {
  if (global.knex) await global.knex.destroy()
})