import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";
import ActivityLog from "../models/activityLog.model.js";
import {
  seedOrg,
  createUser,
  createComplaint,
} from "./helpers.js";

describe("Activity Log API", () => {
  it("creates an activity log entry via POST", async () => {
    const student = await createUser({ email: "log-student@test.com" });
    const complaint = await createComplaint({ submittedBy: student._id });

    const res = await request(app).post("/api/activity-logs").send({
      complaintId: complaint._id.toString(),
      action: "Status Updated",
      description: "Complaint moved to In Progress",
      performedBy: student._id.toString(),
      role: "student",
    });

    expect(res.status).toBe(201);
    expect(res.body.action).toBe("Status Updated");
    expect(res.body.complaint).toBe(complaint._id.toString());
    expect(res.body.user).toBeTruthy();
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await request(app).post("/api/activity-logs").send({
      action: "Incomplete",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing required fields/i);
  });

  it("fetches logs for a specific complaint", async () => {
    const student = await createUser({ email: "log-student2@test.com" });
    const complaint = await createComplaint({ submittedBy: student._id });

    await ActivityLog.create({
      complaint: complaint._id,
      action: "Complaint Submitted",
      user: student._id,
      role: "student",
      details: { description: "Initial submission" },
    });

    const res = await request(app).get(
      `/api/activity-logs/complaint/${complaint._id}`
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].action).toBe("Complaint Submitted");
  });

  it("returns an empty array for a complaint with no logs", async () => {
    const student = await createUser({ email: "log-student3@test.com" });
    const complaint = await createComplaint({ submittedBy: student._id });

    const res = await request(app).get(
      `/api/activity-logs/complaint/${complaint._id}`
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns example logs when example=true query param is set", async () => {
    const res = await request(app).get(
      "/api/activity-logs/complaint/any-id?example=true"
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toHaveProperty("action");
  });

  it("lists all activity logs via GET /all", async () => {
    const { student } = await seedOrg();
    const complaint = await createComplaint({ submittedBy: student._id });

    await ActivityLog.create({
      complaint: complaint._id,
      action: "Assigned",
      user: student._id,
      role: "student",
      details: { description: "Assigned to staff" },
    });

    const res = await request(app).get("/api/activity-logs/all");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].action).toBe("Assigned");
  });
});
