import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import Feedback from "../models/Feedback.js";
import Complaint from "../models/complaint.model.js";
import {
  seedOrg,
  agentFor,
  createComplaint,
} from "./helpers.js";

describe("Feedback API", () => {
  let org;
  let resolvedComplaint;
  let pendingComplaint;

  beforeEach(async () => {
    org = await seedOrg();
    resolvedComplaint = await createComplaint({
      submittedBy: org.student._id,
      title: "Resolved for feedback",
      status: "Resolved",
      assignedTo: org.staff._id,
      assignedToRole: "staff",
    });
    pendingComplaint = await createComplaint({
      submittedBy: org.student._id,
      title: "Still pending",
      status: "Pending",
    });
  });

  it("GET /api/feedback/all returns all feedback for admin", async () => {
    await Feedback.create({
      complaintId: resolvedComplaint._id,
      user: org.student._id,
      rating: 4,
      comments: "Good service",
    });

    const agent = await agentFor(org.admin);
    const res = await agent.get("/api/feedback/all");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
  });

  it("blocks non-admin from GET /api/feedback/all", async () => {
    const agent = await agentFor(org.student);
    const res = await agent.get("/api/feedback/all");
    expect(res.status).toBe(403);
  });

  it("GET /api/feedback/admin/mine returns targeted admin feedback", async () => {
    await Feedback.create({
      complaintId: resolvedComplaint._id,
      user: org.student._id,
      rating: 5,
      comments: "Thanks admin",
      isAdminFeedback: true,
      targetAdmin: org.admin._id,
    });

    const agent = await agentFor(org.admin);
    const res = await agent.get("/api/feedback/admin/mine");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0].rating).toBe(5);
  });

  it("GET /api/feedback/mine lists feedback for resolver staff", async () => {
    await Complaint.findByIdAndUpdate(resolvedComplaint._id, {
      feedback: {
        rating: 3,
        comment: "Okay",
        submittedAt: new Date(),
        reviewed: false,
      },
    });

    const agent = await agentFor(org.staff);
    const res = await agent.get("/api/feedback/mine");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    expect(res.body.items[0].kind).toBe("embedded");
  });

  it("blocks student from GET /api/feedback/mine", async () => {
    const agent = await agentFor(org.student);
    const res = await agent.get("/api/feedback/mine");
    expect(res.status).toBe(403);
  });

  it("GET /api/feedback/complaint/:id returns feedback for authorized viewer", async () => {
    await Feedback.create({
      complaintId: resolvedComplaint._id,
      user: org.student._id,
      rating: 4,
      comments: "Visible",
    });

    const agent = await agentFor(org.student);
    const res = await agent.get(
      `/api/feedback/complaint/${resolvedComplaint._id}`
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBe(1);
  });

  it("POST /api/feedback/complaint/:id adds feedback on resolved complaint", async () => {
    const agent = await agentFor(org.student);
    const res = await agent
      .post(`/api/feedback/complaint/${resolvedComplaint._id}`)
      .send({ rating: 5, comment: "Excellent resolution" });
    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/feedback added/i);
    expect(res.body.feedback.rating).toBe(5);
  });

  it("POST /api/feedback/complaint/:id rejects feedback on unresolved complaint", async () => {
    const agent = await agentFor(org.student);
    const res = await agent
      .post(`/api/feedback/complaint/${pendingComplaint._id}`)
      .send({ rating: 2, comment: "Too slow" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/only after resolution/i);
  });

  it("PATCH /api/feedback/:id lets author update unreviewed feedback", async () => {
    const doc = await Feedback.create({
      complaintId: resolvedComplaint._id,
      user: org.student._id,
      rating: 3,
      comments: "Initial",
    });

    const agent = await agentFor(org.student);
    const res = await agent.patch(`/api/feedback/${doc._id}`).send({
      rating: 4,
      comment: "Updated comment",
    });
    expect(res.status).toBe(200);
    expect(res.body.feedback.rating).toBe(4);
    expect(res.body.feedback.comments).toBe("Updated comment");
  });

  it("DELETE /api/feedback/:id lets author delete their feedback", async () => {
    const doc = await Feedback.create({
      complaintId: resolvedComplaint._id,
      user: org.student._id,
      rating: 2,
      comments: "Remove me",
    });

    const agent = await agentFor(org.student);
    const res = await agent.delete(`/api/feedback/${doc._id}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);

    const gone = await Feedback.findById(doc._id);
    expect(gone).toBeNull();
  });

  it("POST /api/feedback/:id/review lets target admin mark reviewed", async () => {
    const doc = await Feedback.create({
      complaintId: resolvedComplaint._id,
      user: org.student._id,
      rating: 5,
      comments: "For admin eyes",
      isAdminFeedback: true,
      targetAdmin: org.admin._id,
    });

    const agent = await agentFor(org.admin);
    const res = await agent.post(`/api/feedback/${doc._id}/review`);
    expect(res.status).toBe(200);
    expect(res.body.feedback.reviewStatus).toBe("Reviewed");
  });

  it("POST /api/feedback/review/any marks targeted feedback reviewed", async () => {
    const doc = await Feedback.create({
      complaintId: resolvedComplaint._id,
      user: org.student._id,
      rating: 4,
      comments: "Staff review",
    });

    const agent = await agentFor(org.staff);
    const res = await agent.post("/api/feedback/review/any").send({
      entryId: doc._id,
    });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/reviewed/i);
  });
});
