import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import { seedOrg, agentFor, createComplaint } from "./helpers.js";

const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

describe("Profile API", () => {
  let org;

  beforeEach(async () => {
    org = await seedOrg();
    await createComplaint({
      submittedBy: org.student._id,
      status: "Resolved",
    });
    await createComplaint({
      submittedBy: org.student._id,
      status: "Pending",
    });
  });

  it("returns 401 for GET /api/profile without auth", async () => {
    const res = await request(app).get("/api/profile");
    expect(res.status).toBe(401);
  });

  it("GET /api/profile returns profile with complaint stats", async () => {
    const agent = await agentFor(org.student);
    const res = await agent.get("/api/profile");
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(org.student.email);
    expect(res.body.totalComplaints).toBeGreaterThanOrEqual(2);
    expect(res.body).toHaveProperty("successRate");
  });

  it("PUT /api/profile updates name and optional fields", async () => {
    const agent = await agentFor(org.student);
    const res = await agent.put("/api/profile").send({
      name: "Updated Student",
      phone: "555-0100",
      bio: "Test bio",
    });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/updated successfully/i);
    expect(res.body.user.name).toBe("Updated Student");
    expect(res.body.user.phone).toBe("555-0100");
  });

  it("PUT /api/profile rejects invalid name", async () => {
    const agent = await agentFor(org.student);
    const res = await agent.put("/api/profile").send({ name: "A" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least 2 characters/i);
  });

  it("PUT /api/profile/password changes password", async () => {
    const agent = await agentFor(org.student);
    const res = await agent.put("/api/profile/password").send({
      oldPassword: "password123",
      newPassword: "newpass456",
    });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/password updated/i);

    const user = await User.findById(org.student._id);
    const matches = await bcrypt.compare("newpass456", user.password);
    expect(matches).toBe(true);
  });

  it("PUT /api/profile/password rejects wrong old password", async () => {
    const agent = await agentFor(org.student);
    const res = await agent.put("/api/profile/password").send({
      oldPassword: "wrong-old",
      newPassword: "newpass456",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/incorrect/i);
  });

  it("PUT /api/profile/password rejects short new password", async () => {
    const agent = await agentFor(org.student);
    const res = await agent.put("/api/profile/password").send({
      oldPassword: "password123",
      newPassword: "123",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least 6 characters/i);
  });

  it("POST /api/profile/avatar uploads locally when cloud creds absent", async () => {
    const agent = await agentFor(org.student);
    const res = await agent
      .post("/api/profile/avatar")
      .attach("avatar", TINY_PNG, "avatar.png");
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/avatar updated/i);
    expect(res.body.storage).toBe("local");
    expect(res.body.avatarUrl).toMatch(/^\/uploads\/avatars\//);
  });

  it("POST /api/profile/avatar rejects missing file", async () => {
    const agent = await agentFor(org.student);
    const res = await agent.post("/api/profile/avatar");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no file uploaded/i);
  });

  it("PATCH /api/profile/avatar/cloud requires avatarUrl and publicId", async () => {
    const agent = await agentFor(org.student);
    const res = await agent.patch("/api/profile/avatar/cloud").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/avatarUrl and publicId are required/i);
  });

  it("DELETE /api/profile/avatar resets avatar to default", async () => {
    const agent = await agentFor(org.student);
    await agent
      .post("/api/profile/avatar")
      .attach("avatar", TINY_PNG, "avatar.png");

    const res = await agent.delete("/api/profile/avatar");
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/reset to default/i);
    expect(res.body.avatarUrl).toBe("");
  });

  it("GET /api/profile/user/:id returns public profile for another user", async () => {
    const agent = await agentFor(org.admin);
    const res = await agent.get(`/api/profile/user/${org.staff._id}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(org.staff.email);
    expect(res.body.role).toBe("staff");
    expect(res.body).toHaveProperty("submittedTotal");
  });

  it("GET /api/profile/user/:id returns 404 for unknown user", async () => {
    const agent = await agentFor(org.admin);
    const res = await agent.get("/api/profile/user/507f1f77bcf86cd799439011");
    expect(res.status).toBe(404);
  });
});
