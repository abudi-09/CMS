import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import User from "../models/user.model.js";
import {
  seedOrg,
  agentFor,
  createComplaint,
  createCategory,
} from "./helpers.js";

function todayDateStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function currentMonthYear() {
  const d = new Date();
  return { month: d.getMonth(), year: d.getFullYear() };
}

describe("Stats API", () => {
  let org;

  beforeEach(async () => {
    org = await seedOrg({ department: "IT" });
    await User.updateOne({ _id: org.dean._id }, { $set: { department: "IT" } });
    org.dean.department = "IT";
    await createCategory("Facilities", "Facility issues");
    await createCategory("IT", "IT issues");

    await createComplaint({
      submittedBy: org.student._id,
      title: "Pending complaint",
      status: "Pending",
      department: "IT",
      priority: "Medium",
      submittedTo: "admin",
      recipientId: org.admin._id,
    });
    await createComplaint({
      submittedBy: org.student._id,
      title: "Resolved complaint",
      status: "Resolved",
      department: "IT",
      priority: "High",
      submittedTo: "dean",
      recipientRole: "dean",
      recipientId: org.dean._id,
      assignedTo: org.staff._id,
      assignedToRole: "staff",
    });
    await createComplaint({
      submittedBy: org.student._id,
      title: "In progress complaint",
      status: "In Progress",
      department: "IT",
      priority: "Low",
      submittedTo: "hod",
      recipientRole: "hod",
      recipientId: org.hod._id,
      assignedTo: org.hod._id,
      assignedToRole: "hod",
    });
  });

  describe("public routes", () => {
    it("GET /api/stats/public/home returns aggregate homepage stats", async () => {
      const res = await request(app).get("/api/stats/public/home");
      expect(res.status).toBe(200);
      expect(res.body).toBeTypeOf("object");
    });

    it("GET /api/stats/university-statistics returns role counts", async () => {
      const res = await request(app).get("/api/stats/university-statistics");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.statistics)).toBe(true);
      expect(res.body.statistics.length).toBeGreaterThan(0);
    });

    it("GET /api/stats/test-db confirms database connectivity", async () => {
      const res = await request(app).get("/api/stats/test-db");
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/database connection working/i);
      expect(res.body.totalComplaints).toBeGreaterThanOrEqual(3);
    });
  });

  describe("admin stats", () => {
    it("GET /api/stats/complaints returns complaint stats for admin", async () => {
      const agent = await agentFor(org.admin);
      const res = await agent.get("/api/stats/complaints");
      expect(res.status).toBe(200);
    });

    it("GET /api/stats/complaints/dean-visible returns dean-visible stats", async () => {
      const agent = await agentFor(org.dean);
      const res = await agent.get("/api/stats/complaints/dean-visible");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("total");
    });

    it("GET /api/stats/feedback returns feedback stats", async () => {
      const agent = await agentFor(org.admin);
      const res = await agent.get("/api/stats/feedback");
      expect(res.status).toBe(200);
    });

    it("GET /api/stats/staff returns staff management stats", async () => {
      const agent = await agentFor(org.admin);
      const res = await agent.get("/api/stats/staff");
      expect(res.status).toBe(200);
    });

    it("GET /api/stats/roles returns role counts", async () => {
      const agent = await agentFor(org.admin);
      const res = await agent.get("/api/stats/roles");
      expect(res.status).toBe(200);
    });

    it("GET /api/stats/students/count returns student count", async () => {
      const agent = await agentFor(org.admin);
      const res = await agent.get("/api/stats/students/count");
      expect(res.status).toBe(200);
    });

    it("GET /api/stats/categories returns category counts", async () => {
      const agent = await agentFor(org.admin);
      const res = await agent.get("/api/stats/categories");
      expect(res.status).toBe(200);
    });

    it("GET /api/stats/complaints/calendar/admin-summary returns calendar summary", async () => {
      const agent = await agentFor(org.admin);
      const { month, year } = currentMonthYear();
      const res = await agent
        .get("/api/stats/complaints/calendar/admin-summary")
        .query({ month, year });
      expect(res.status).toBe(200);
    });

    it("GET /api/stats/complaints/calendar/admin-day returns day items", async () => {
      const agent = await agentFor(org.admin);
      const res = await agent
        .get("/api/stats/complaints/calendar/admin-day")
        .query({ date: todayDateStr() });
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("GET /api/stats/complaints/calendar/admin-month returns month items", async () => {
      const agent = await agentFor(org.admin);
      const { month, year } = currentMonthYear();
      const res = await agent
        .get("/api/stats/complaints/calendar/admin-month")
        .query({ month, year });
      expect(res.status).toBe(200);
    });

    it("GET /api/stats/analytics/admin/summary returns admin analytics", async () => {
      const agent = await agentFor(org.admin);
      const res = await agent.get("/api/stats/analytics/admin/summary");
      expect(res.status).toBe(200);
    });

    it("GET /api/stats/analytics/admin/priority-distribution", async () => {
      const agent = await agentFor(org.admin);
      const res = await agent.get(
        "/api/stats/analytics/admin/priority-distribution"
      );
      expect(res.status).toBe(200);
    });

    it("GET /api/stats/analytics/admin/status-distribution", async () => {
      const agent = await agentFor(org.admin);
      const res = await agent.get(
        "/api/stats/analytics/admin/status-distribution"
      );
      expect(res.status).toBe(200);
    });

    it("GET /api/stats/analytics/admin/monthly-trends", async () => {
      const agent = await agentFor(org.admin);
      const res = await agent.get("/api/stats/analytics/admin/monthly-trends");
      expect(res.status).toBe(200);
    });

    it("GET /api/stats/analytics/admin/department-performance", async () => {
      const agent = await agentFor(org.admin);
      const res = await agent.get(
        "/api/stats/analytics/admin/department-performance"
      );
      expect(res.status).toBe(200);
    });

    it("blocks non-admin from admin-only stats", async () => {
      const agent = await agentFor(org.student);
      const res = await agent.get("/api/stats/feedback");
      expect(res.status).toBe(403);
    });
  });

  describe("dean stats", () => {
    it("GET /api/stats/complaints returns stats for dean", async () => {
      const agent = await agentFor(org.dean);
      const res = await agent.get("/api/stats/complaints");
      expect(res.status).toBe(200);
    });

    it("GET /api/stats/students/count returns student count for dean", async () => {
      const agent = await agentFor(org.dean);
      const res = await agent.get("/api/stats/students/count");
      expect(res.status).toBe(200);
    });

    it("GET /api/stats/categories returns category counts for dean", async () => {
      const agent = await agentFor(org.dean);
      const res = await agent.get("/api/stats/categories");
      expect(res.status).toBe(200);
    });

    it("GET /api/stats/complaints/calendar/dean-summary", async () => {
      const agent = await agentFor(org.dean);
      const { month, year } = currentMonthYear();
      const res = await agent
        .get("/api/stats/complaints/calendar/dean-summary")
        .query({ month, year });
      expect(res.status).toBe(200);
    });

    it("GET /api/stats/complaints/calendar/dean-day", async () => {
      const agent = await agentFor(org.dean);
      const res = await agent
        .get("/api/stats/complaints/calendar/dean-day")
        .query({ date: todayDateStr() });
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("GET /api/stats/complaints/calendar/dean-month", async () => {
      const agent = await agentFor(org.dean);
      const { month, year } = currentMonthYear();
      const res = await agent
        .get("/api/stats/complaints/calendar/dean-month")
        .query({ month, year });
      expect(res.status).toBe(200);
    });

    it("GET /api/stats/analytics/dean/staff-performance", async () => {
      const agent = await agentFor(org.dean);
      const res = await agent.get("/api/stats/analytics/dean/staff-performance");
      expect(res.status).toBe(200);
    });

    it("GET /api/stats/analytics/dean/summary (public)", async () => {
      const res = await request(app).get("/api/stats/analytics/dean/summary");
      expect(res.status).toBe(200);
    });

    it("GET /api/stats/analytics/dean/department-overview (public)", async () => {
      const res = await request(app).get(
        "/api/stats/analytics/dean/department-overview"
      );
      expect(res.status).toBe(200);
    });

    it("GET /api/stats/analytics/dean/monthly-trends (public)", async () => {
      const res = await request(app).get(
        "/api/stats/analytics/dean/monthly-trends"
      );
      expect(res.status).toBe(200);
    });

    it("GET /api/stats/analytics/dean/department-performance (public)", async () => {
      const res = await request(app).get(
        "/api/stats/analytics/dean/department-performance"
      );
      expect(res.status).toBe(200);
    });

    it("GET /api/stats/analytics/dean/charts/category (public)", async () => {
      const res = await request(app).get(
        "/api/stats/analytics/dean/charts/category"
      );
      expect(res.status).toBe(200);
    });

    it("GET /api/stats/analytics/dean/charts/priority (public)", async () => {
      const res = await request(app).get(
        "/api/stats/analytics/dean/charts/priority"
      );
      expect(res.status).toBe(200);
    });

    it("GET /api/stats/analytics/dean/charts/status (public)", async () => {
      const res = await request(app).get(
        "/api/stats/analytics/dean/charts/status"
      );
      expect(res.status).toBe(200);
    });

    it("GET /api/stats/analytics/dean/department-complaints (public)", async () => {
      const res = await request(app).get(
        "/api/stats/analytics/dean/department-complaints"
      );
      expect(res.status).toBe(200);
    });

    it("blocks student from dean calendar routes", async () => {
      const agent = await agentFor(org.student);
      const res = await agent.get("/api/stats/complaints/calendar/dean-summary");
      expect(res.status).toBe(403);
    });
  });

  describe("HoD stats", () => {
    it("GET /api/stats/complaints/department", async () => {
      const agent = await agentFor(org.hod);
      const res = await agent.get("/api/stats/complaints/department");
      expect(res.status).toBe(200);
    });

    it("GET /api/stats/complaints/department/priority-distribution", async () => {
      const agent = await agentFor(org.hod);
      const res = await agent.get(
        "/api/stats/complaints/department/priority-distribution"
      );
      expect(res.status).toBe(200);
    });

    it("GET /api/stats/complaints/department/status-distribution", async () => {
      const agent = await agentFor(org.hod);
      const res = await agent.get(
        "/api/stats/complaints/department/status-distribution"
      );
      expect(res.status).toBe(200);
    });

    it("GET /api/stats/complaints/department/category-distribution", async () => {
      const agent = await agentFor(org.hod);
      const res = await agent.get(
        "/api/stats/complaints/department/category-distribution"
      );
      expect(res.status).toBe(200);
    });

    it("GET /api/stats/complaints/department/monthly-trends", async () => {
      const agent = await agentFor(org.hod);
      const res = await agent.get(
        "/api/stats/complaints/department/monthly-trends"
      );
      expect(res.status).toBe(200);
    });

    it("GET /api/stats/complaints/department/staff-performance", async () => {
      const agent = await agentFor(org.hod);
      const res = await agent.get(
        "/api/stats/complaints/department/staff-performance"
      );
      expect(res.status).toBe(200);
    });

    it("GET /api/stats/complaints/calendar/hod-summary", async () => {
      const agent = await agentFor(org.hod);
      const { month, year } = currentMonthYear();
      const res = await agent
        .get("/api/stats/complaints/calendar/hod-summary")
        .query({ month, year });
      expect(res.status).toBe(200);
    });

    it("GET /api/stats/complaints/calendar/hod-day", async () => {
      const agent = await agentFor(org.hod);
      const res = await agent
        .get("/api/stats/complaints/calendar/hod-day")
        .query({ date: todayDateStr() });
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("blocks student from HoD department stats", async () => {
      const agent = await agentFor(org.student);
      const res = await agent.get("/api/stats/complaints/department");
      expect(res.status).toBe(403);
    });
  });

  describe("staff and user stats", () => {
    it("GET /api/stats/staffs returns staff stats", async () => {
      const agent = await agentFor(org.staff);
      const res = await agent.get("/api/stats/staffs");
      expect(res.status).toBe(200);
    });

    it("GET /api/stats/user returns user stats for any authenticated role", async () => {
      const agent = await agentFor(org.student);
      const res = await agent.get("/api/stats/user");
      expect(res.status).toBe(200);
    });

    it("blocks student from staff-only stats", async () => {
      const agent = await agentFor(org.student);
      const res = await agent.get("/api/stats/staffs");
      expect(res.status).toBe(403);
    });

    it("returns 401 for unauthenticated /api/stats/user", async () => {
      const res = await request(app).get("/api/stats/user");
      expect(res.status).toBe(401);
    });
  });
});
