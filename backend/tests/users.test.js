import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";
import User from "../models/user.model.js";
import { seedOrg, agentFor, createUser, uniqueEmail } from "./helpers.js";

describe("Users API – activate/deactivate", () => {
  it("activates a user via POST /activate with userId body", async () => {
    const { admin, student } = await seedOrg();
    await User.findByIdAndUpdate(student._id, { isActive: false });
    const agent = await agentFor(admin);

    const res = await agent
      .post("/api/users/activate")
      .send({ userId: student._id.toString() });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/activated/i);
    expect(res.body.user.isActive).toBe(true);
  });

  it("deactivates a user via POST /deactivate with userId body", async () => {
    const { admin, student } = await seedOrg();
    const agent = await agentFor(admin);

    const res = await agent
      .post("/api/users/deactivate")
      .send({ userId: student._id.toString() });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deactivated/i);
    expect(res.body.user.isActive).toBe(false);
  });

  it("activates a user via PATCH /:id/activate", async () => {
    const { admin, student } = await seedOrg();
    await User.findByIdAndUpdate(student._id, { isActive: false });
    const agent = await agentFor(admin);

    const res = await agent.patch(`/api/users/${student._id}/activate`);
    expect(res.status).toBe(200);
    expect(res.body.user.isActive).toBe(true);
  });

  it("deactivates a user via PATCH /:id/deactivate", async () => {
    const { admin, student } = await seedOrg();
    const agent = await agentFor(admin);

    const res = await agent.patch(`/api/users/${student._id}/deactivate`);
    expect(res.status).toBe(200);
    expect(res.body.user.isActive).toBe(false);
  });

  it("returns 400 when userId is missing", async () => {
    const { admin } = await seedOrg();
    const agent = await agentFor(admin);

    const res = await agent.post("/api/users/activate").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/userId is required/i);
  });

  it("returns 400 for an invalid user id", async () => {
    const { admin } = await seedOrg();
    const agent = await agentFor(admin);

    const res = await agent
      .post("/api/users/activate")
      .send({ userId: "not-a-valid-id" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid user id/i);
  });

  it("returns 404 when activating a missing user", async () => {
    const { admin } = await seedOrg();
    const agent = await agentFor(admin);

    const res = await agent
      .post("/api/users/activate")
      .send({ userId: "507f1f77bcf86cd799439011" });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/user not found/i);
  });

  it("returns 403 for non-admin users", async () => {
    const { staff, student } = await seedOrg();
    const agent = await agentFor(staff);

    const res = await agent
      .post("/api/users/deactivate")
      .send({ userId: student._id.toString() });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/admins only/i);
  });
});

describe("Users API – promote", () => {
  it("promotes a staff user to admin via PATCH /:id/promote", async () => {
    const { admin, staff } = await seedOrg();
    const agent = await agentFor(admin);

    const res = await agent
      .patch(`/api/users/${staff._id}/promote`)
      .query({ role: "admin" });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("admin");
    expect(res.body.message).toMatch(/updated to admin/i);
  });

  it("reverts an admin back to their previous role", async () => {
    const adminUser = await createUser({
      email: uniqueEmail("temp-admin"),
      role: "staff",
      department: "IT",
      workingPlace: "Lab",
      isApproved: true,
      isActive: true,
    });
    const superAdmin = await createUser({
      email: uniqueEmail("super-admin"),
      role: "admin",
    });
    const agent = await agentFor(superAdmin);

    const promote = await agent
      .patch(`/api/users/${adminUser._id}/promote`)
      .query({ role: "admin" });
    expect(promote.status).toBe(200);

    const revert = await agent
      .patch(`/api/users/${adminUser._id}/promote`)
      .send({ role: "staff" });
    expect(revert.status).toBe(200);
    expect(revert.body.user.role).toBe("staff");
  });

  it("returns 400 when role is missing", async () => {
    const { admin, student } = await seedOrg();
    const agent = await agentFor(admin);

    const res = await agent.patch(`/api/users/${student._id}/promote`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/role is required/i);
  });

  it("returns 400 when promoting a non-admin user to staff", async () => {
    const { admin, student } = await seedOrg();
    const agent = await agentFor(admin);

    const res = await agent
      .patch(`/api/users/${student._id}/promote`)
      .query({ role: "staff" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/only promotion to admin/i);
  });

  it("returns 400 for an invalid role value", async () => {
    const { admin, staff } = await seedOrg();
    const agent = await agentFor(admin);

    const res = await agent
      .patch(`/api/users/${staff._id}/promote`)
      .query({ role: "invalid-role" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid role/i);
  });
});

describe("Users API – department HoD lookup", () => {
  it("returns HoDs for the logged-in user's department", async () => {
    const { hod, student } = await seedOrg();
    const agent = await agentFor(student);

    const res = await agent.get("/api/users/department/hod/active");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((u) => u.email === hod.email)).toBe(true);
  });

  it("returns 400 when user has no department", async () => {
    const admin = await createUser({
      email: uniqueEmail("no-dept-admin"),
      role: "admin",
    });
    const agent = await agentFor(admin);

    const res = await agent.get("/api/users/department/hod/active");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not assigned to a department/i);
  });
});
