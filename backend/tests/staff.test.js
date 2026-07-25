import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import { seedOrg, agentFor, createUser, uniqueEmail } from "./helpers.js";

describe("Staff API", () => {
  let org;
  let otherDeptEmail;
  let inactiveHodEmail;

  beforeEach(async () => {
    org = await seedOrg({ department: "IT" });
    otherDeptEmail = uniqueEmail("other-dept-staff");
    await createUser({
      email: otherDeptEmail,
      role: "staff",
      department: "Finance",
      workingPlace: "Finance Office",
      isApproved: true,
      isActive: true,
    });
    inactiveHodEmail = uniqueEmail("inactive-hod");
    await createUser({
      email: inactiveHodEmail,
      role: "hod",
      department: "IT",
      workingPlace: "HoD Office",
      isApproved: false,
      isActive: false,
    });
  });

  it("returns 401 for unauthenticated GET /api/staff/hod/active", async () => {
    const res = await request(app).get("/api/staff/hod/active");
    expect(res.status).toBe(401);
  });

  it("GET /api/staff/hod/active lists active HODs", async () => {
    const agent = await agentFor(org.student);
    const res = await agent.get("/api/staff/hod/active");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((h) => h.email === org.hod.email)).toBe(true);
    expect(res.body.some((h) => h.email === inactiveHodEmail)).toBe(false);
  });

  it("GET /api/staff/department/active returns staff in user department", async () => {
    const agent = await agentFor(org.student);
    const res = await agent.get("/api/staff/department/active");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const emails = res.body.map((s) => s.email);
    expect(emails).toContain(org.staff.email);
    expect(emails).not.toContain(otherDeptEmail);
    expect(emails).not.toContain(org.pendingStaff.email);
  });

  it("GET /api/staff/department/active returns all active staff when user has no department", async () => {
    const agent = await agentFor(org.admin);
    const res = await agent.get("/api/staff/department/active");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const emails = res.body.map((s) => s.email);
    expect(emails).toContain(org.staff.email);
    expect(emails).toContain(otherDeptEmail);
  });

  it("GET /api/staff/department/active is accessible to staff role", async () => {
    const agent = await agentFor(org.staff);
    const res = await agent.get("/api/staff/department/active");
    expect(res.status).toBe(200);
    expect(res.body.some((s) => s.email === org.staff.email)).toBe(true);
  });
});
