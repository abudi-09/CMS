import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";
import { createUser, loginAgent, uniqueEmail } from "./helpers.js";

describe("Auth API", () => {
  it("returns 401 for /api/auth/me without a session cookie", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("logs in a student and returns profile via /api/auth/me", async () => {
    const email = uniqueEmail("auth-student");
    await createUser({ email, role: "student" });

    const agent = request.agent(app);
    const login = await loginAgent(agent, email);
    expect(login.status).toBe(200);

    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(email);
    expect(me.body.role).toBe("student");
  });

  it("rejects invalid login credentials", async () => {
    const email = uniqueEmail("bad");
    await createUser({ email });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "wrong-password" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it("rejects unknown email and logs out successfully", async () => {
    const missing = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@test.com", password: "password123" });
    expect(missing.status).toBe(400);

    const email = uniqueEmail("logout");
    await createUser({ email });
    const agent = request.agent(app);
    await loginAgent(agent, email);
    const logout = await agent.post("/api/auth/logout");
    expect(logout.status).toBe(200);
  });

  it("blocks pending and rejected staff logins", async () => {
    const pendingEmail = uniqueEmail("pending-staff");
    await createUser({
      email: pendingEmail,
      role: "staff",
      isApproved: false,
      isRejected: false,
      isActive: false,
    });
    const pending = await request(app)
      .post("/api/auth/login")
      .send({ email: pendingEmail, password: "password123" });
    expect(pending.status).toBe(403);

    const rejectedEmail = uniqueEmail("rejected-staff");
    await createUser({
      email: rejectedEmail,
      role: "staff",
      isApproved: false,
      isRejected: true,
      isActive: false,
    });
    const rejected = await request(app)
      .post("/api/auth/login")
      .send({ email: rejectedEmail, password: "password123" });
    expect(rejected.status).toBe(403);

    const inactiveStaffEmail = uniqueEmail("inactive-staff");
    await createUser({
      email: inactiveStaffEmail,
      role: "staff",
      isApproved: true,
      isActive: false,
    });
    const inactiveStaff = await request(app)
      .post("/api/auth/login")
      .send({ email: inactiveStaffEmail, password: "password123" });
    expect(inactiveStaff.status).toBe(403);
  });

  it("blocks inactive student/hod/dean/admin and pending hod/dean", async () => {
    for (const [role, emailPrefix] of [
      ["student", "inactive-student"],
      ["hod", "inactive-hod"],
      ["dean", "inactive-dean"],
      ["admin", "inactive-admin"],
    ]) {
      const email = uniqueEmail(emailPrefix);
      await createUser({
        email,
        role,
        isApproved: true,
        isActive: false,
        workingPlace: role === "student" || role === "admin" ? undefined : "Office",
      });
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email, password: "password123" });
      expect(res.status).toBe(403);
    }

    const pendingHod = uniqueEmail("pending-hod-login");
    await createUser({
      email: pendingHod,
      role: "hod",
      isApproved: false,
      isActive: false,
    });
    expect(
      (
        await request(app)
          .post("/api/auth/login")
          .send({ email: pendingHod, password: "password123" })
      ).status
    ).toBe(403);

    const pendingDean = uniqueEmail("pending-dean-login");
    await createUser({
      email: pendingDean,
      role: "dean",
      isApproved: false,
      isActive: false,
      workingPlace: "Dean Office",
    });
    expect(
      (
        await request(app)
          .post("/api/auth/login")
          .send({ email: pendingDean, password: "password123" })
      ).status
    ).toBe(403);
  });

  it("signs up student, staff, hod, dean, and admin with validation", async () => {
    const studentEmail = uniqueEmail("signup-student");
    const student = await request(app).post("/api/auth/signup").send({
      name: "Student One",
      username: studentEmail.split("@")[0],
      email: studentEmail,
      password: "password123",
      role: "student",
      department: "IT",
    });
    expect(student.status).toBe(201);

    const staffEmail = uniqueEmail("signup-staff");
    const staff = await request(app).post("/api/auth/signup").send({
      name: "Staff One",
      username: staffEmail.split("@")[0],
      email: staffEmail,
      password: "password123",
      role: "staff",
      department: "IT",
      workingPlace: "Lab",
    });
    expect(staff.status).toBe(201);

    const hodEmail = uniqueEmail("signup-hod");
    const hod = await request(app).post("/api/auth/signup").send({
      name: "HoD One",
      username: hodEmail.split("@")[0],
      email: hodEmail,
      password: "password123",
      role: "hod",
      department: "IT",
      workingPlace: "Office",
    });
    expect(hod.status).toBe(201);

    const deanEmail = uniqueEmail("signup-dean");
    const dean = await request(app).post("/api/auth/signup").send({
      name: "Dean One",
      username: deanEmail.split("@")[0],
      email: deanEmail,
      password: "password123",
      role: "dean",
      workingPlace: "Dean Office",
    });
    expect(dean.status).toBe(201);

    const adminEmail = uniqueEmail("signup-admin");
    const admin = await request(app).post("/api/auth/signup").send({
      name: "Admin One",
      username: adminEmail.split("@")[0],
      email: adminEmail,
      password: "password123",
      role: "admin",
    });
    expect(admin.status).toBe(201);

    const badRole = await request(app).post("/api/auth/signup").send({
      name: "Bad",
      email: uniqueEmail("badrole"),
      password: "password123",
      role: "wizard",
    });
    expect(badRole.status).toBe(400);

    const shortPass = await request(app).post("/api/auth/signup").send({
      name: "Short",
      email: uniqueEmail("short"),
      password: "123",
      role: "student",
      department: "IT",
    });
    expect(shortPass.status).toBe(400);
  });
});

describe("Role guards", () => {
  it("blocks staff-only routes for students", async () => {
    const email = uniqueEmail("student-guard");
    await createUser({ email, role: "student" });
    const agent = request.agent(app);
    await loginAgent(agent, email);

    const res = await agent.get("/api/complaints/assigned");
    expect(res.status).toBe(403);
  });
});
