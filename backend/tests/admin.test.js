import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";
import User from "../models/user.model.js";
import {
  seedOrg,
  agentFor,
  createUser,
  uniqueEmail,
} from "./helpers.js";

describe("Admin API", () => {
  it("lists pending staff registrations", async () => {
    const { admin, pendingStaff } = await seedOrg();
    const agent = await agentFor(admin);

    const res = await agent.get("/api/admin/pending-staff");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((u) => u.email === pendingStaff.email)).toBe(true);
  });

  it("lists all staff members", async () => {
    const { admin, staff } = await seedOrg();
    const agent = await agentFor(admin);

    const res = await agent.get("/api/admin/all-staff");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((u) => u.email === staff.email)).toBe(true);
  });

  it("lists all users with optional role filter", async () => {
    const { admin, student } = await seedOrg();
    const agent = await agentFor(admin);

    const all = await agent.get("/api/admin/users");
    expect(all.status).toBe(200);
    expect(all.body.length).toBeGreaterThanOrEqual(1);

    const students = await agent.get("/api/admin/users?role=student");
    expect(students.status).toBe(200);
    expect(students.body.every((u) => u.role === "student")).toBe(true);
    expect(students.body.some((u) => u.email === student.email)).toBe(true);
  });

  it("approves pending staff", async () => {
    const { admin, pendingStaff } = await seedOrg();
    const agent = await agentFor(admin);

    const res = await agent.put(`/api/admin/approve/${pendingStaff._id}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/approved/i);

    const updated = await User.findById(pendingStaff._id);
    expect(updated.isApproved).toBe(true);
  });

  it("rejects pending staff", async () => {
    const { admin, pendingStaff } = await seedOrg();
    const agent = await agentFor(admin);

    const res = await agent.delete(`/api/admin/reject/${pendingStaff._id}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/rejected/i);

    const updated = await User.findById(pendingStaff._id);
    expect(updated.isRejected).toBe(true);
    expect(updated.isApproved).toBe(false);
  });

  it("deactivates and activates staff", async () => {
    const { admin, staff } = await seedOrg();
    const agent = await agentFor(admin);

    const deactivate = await agent.put(`/api/admin/deactivate/${staff._id}`);
    expect(deactivate.status).toBe(200);

    let updated = await User.findById(staff._id);
    expect(updated.isActive).toBe(false);

    const activate = await agent.put(`/api/admin/activate/${staff._id}`);
    expect(activate.status).toBe(200);

    updated = await User.findById(staff._id);
    expect(updated.isActive).toBe(true);
  });

  it("returns 404 when activating a non-staff user", async () => {
    const { admin, student } = await seedOrg();
    const agent = await agentFor(admin);

    const res = await agent.put(`/api/admin/activate/${student._id}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/staff not found/i);
  });

  it("returns 404 when approving a non-existent staff id", async () => {
    const { admin } = await seedOrg();
    const agent = await agentFor(admin);

    const res = await agent.put(
      `/api/admin/approve/507f1f77bcf86cd799439011`
    );
    expect(res.status).toBe(404);
  });

  it("returns 403 for non-admin users", async () => {
    const { staff } = await seedOrg();
    const agent = await agentFor(staff);

    const res = await agent.get("/api/admin/pending-staff");
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/admins only/i);
  });

  it("returns 401 without authentication", async () => {
    const res = await request(app).get("/api/admin/pending-staff");
    expect(res.status).toBe(401);
  });

  it("filters users by department query param", async () => {
    const { admin } = await seedOrg({ department: "IT" });
    await createUser({
      email: uniqueEmail("finance-student"),
      role: "student",
      department: "Finance",
    });
    const agent = await agentFor(admin);

    const res = await agent.get("/api/admin/users?department=IT");
    expect(res.status).toBe(200);
    expect(res.body.every((u) => u.department === "IT")).toBe(true);
  });
});
