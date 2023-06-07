/* eslint-disable no-undef */
const request = require("supertest");
var cheerio = require("cheerio");
const db = require("../models/index");
const app = require("../app");
//const todo = require("../models/todo");
let server, agent;

function extractCsrfToken(res) {
  var $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
}

const login = async (agent, username, password) => {
  let res = await agent.get("/login");
  let csrfToken = extractCsrfToken(res);
  res = await agent.post("/login").send({
    email: username,
    password: password,
    _csrf: csrfToken,
  });
};

describe("Create session", () => {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(4000, () => {});
    agent = request.agent(server);
  });
  afterAll(async () => {
    await db.sequelize.close();
    server.close();
  });
  test("Sign up as admin", async () => {
    let res = await agent.get("/signup");
    const csrfToken = extractCsrfToken(res);
    res = await agent.post("/users").send({
      firstName: "Test",
      lastName: "User A",
      email: "user.a@test.com",
      password: "12345678",
      _csrf: csrfToken,
       submit: "admin",
    });
    expect(res.statusCode).toBe(302);
  });
  
  test("Sign up as player", async () => {
    let res = await agent.get("/signup");
    const csrfToken = extractCsrfToken(res);
    res = await agent.post("/users").send({
      firstName: "sanket",
      lastName: "User B",
      email: "user.b@test.com",
      password: "123456789",
      _csrf: csrfToken,
      submit: "player",
    });
    expect(res.statusCode).toBe(302);
  });
  
  test("Sign out", async () => {
    let res = await agent.get("/sport");
    expect(res.statusCode).toBe(200);
    res = await agent.get("/signout");
    expect(res.statusCode).toBe(302);
    res = await agent.get("/sport");
    expect(res.statusCode).toBe(302);
  });
  
  test("Creating a sport as admin", async () => {
    const agent = request.agent(server);
    await login(agent, "user.a@test.com", "12345678");
    const res = await agent.get("/sport");
    const csrfToken = extractCsrfToken(res);
    const response = await agent.post("/sport").send({
      name: "Cricket",
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });
  
  test("can't Create a sport as player", async () => {
    const agent = request.agent(server);
    await login(agent, "user.a@test.com", "12345678");
    const res = await agent.get("/sport");
    const csrfToken = extractCsrfToken(res);
    const response = await agent.put("/sport").send({
      name: "Cricket",
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(404);
  });
  
  test("Creating a sport session", async () => {
    const agent = request.agent(server);
    await login(agent, "user.a@test.com", "12345678");
    const res = await agent.get("/sportsession/1");
    const csrfToken = extractCsrfToken(res);
    const response = await agent.post("/session").send({
      venue: "Nagpur",
      playerneeded: 3,
      participants: "hari,gopal,sham",
      time:"2023-06-01 00:41:00+05:30",
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });
  
  test("join user to a sport's session", async () => {
    const agent = request.agent(server);
    await login(agent, "user.a@test.com", "12345678");
    const res = await agent.get("/sportsession/1");
    const csrfToken = extractCsrfToken(res);
    const response = await agent.post("/session/1/addParticipants").send({
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });
  
  test("deleting a session", async () => {
    const agent = request.agent(server);
    await login(agent, "user.a@test.com", "12345678");
    const res = await agent.get("/sportsession/1");
    const csrfToken = extractCsrfToken(res);
    const response = await agent.delete("/session/1").send({
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(200);
  });
  
  test("can't delete a others user's session", async () => {
    const agent = request.agent(server);
    await login(agent, "user.b@test.com", "123456789");
    const res = await agent.get("/sportsession/1");
    const csrfToken = extractCsrfToken(res);
    const response = await agent.post("/session/1").send({
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(404);
  });

  // Add more test cases for other scenarios
});
