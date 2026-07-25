import { describe, it, expect, beforeEach } from "vitest";
import mongoose from "mongoose";
import {
  seedOrg,
  agentFor,
  createComplaint,
  createUser,
} from "./helpers.js";

describe("Complaint deep coverage", () => {
  let org;

  beforeEach(async () => {
    org = await seedOrg({ department: "IT" });
  });

  it("rejects createComplaint with missing or invalid dean recipientId", async () => {
    const agent = await agentFor(org.student);

    const missing = await agent.post("/api/complaints/submit").send({
      title: "No dean id",
      description: "Missing recipient",
      category: "Facilities",
      priority: "Medium",
      submittedTo: "dean",
      department: "IT",
    });
    expect(missing.status).toBe(400);

    const badId = await agent.post("/api/complaints/submit").send({
      title: "Bad dean id",
      description: "Invalid ObjectId",
      category: "Facilities",
      priority: "Medium",
      submittedTo: "dean",
      recipientId: "not-an-objectid",
      department: "IT",
    });
    expect(badId.status).toBe(400);

    const notDean = await agent.post("/api/complaints/submit").send({
      title: "Staff as dean",
      description: "Wrong role",
      category: "Facilities",
      priority: "Medium",
      submittedTo: "dean",
      recipientId: org.staff._id,
      department: "IT",
    });
    expect(notDean.status).toBe(400);
  });

  it("accepts anonymous complaint submission", async () => {
    const agent = await agentFor(org.student);
    const res = await agent.post("/api/complaints/submit").send({
      title: "Anonymous issue",
      description: "Please keep me private",
      category: "Facilities",
      priority: "Low",
      submittedTo: "admin",
      department: "IT",
      isAnonymous: true,
    });
    expect(res.status).toBe(201);
    expect(res.body.complaint?.isAnonymous).toBe(true);
  });

  it("updateMyComplaintRecipient validates dean recipientId", async () => {
    const agent = await agentFor(org.student);
    const complaint = await createComplaint({
      submittedBy: org.student._id,
      title: "Dean retarget",
      status: "Pending",
      submittedTo: "dean",
      recipientRole: "dean",
      recipientId: org.dean._id,
      department: "IT",
    });

    const missingId = await agent
      .put(`/api/complaints/my/${complaint._id}/recipient`)
      .send({ recipientRole: "dean" });
    expect(missingId.status).toBe(400);

    const invalidDean = await agent
      .put(`/api/complaints/my/${complaint._id}/recipient`)
      .send({ recipientRole: "dean", recipientId: org.hod._id });
    expect(invalidDean.status).toBe(400);

    const otherDean = await createUser({
      role: "dean",
      department: "IT",
      workingPlace: "Other Dean",
    });
    const ok = await agent
      .put(`/api/complaints/my/${complaint._id}/recipient`)
      .send({ recipientRole: "dean", recipientId: otherDean._id });
    expect(ok.status).toBe(200);
    expect(String(ok.body.complaint.recipientId)).toBe(String(otherDean._id));
    expect(ok.body.complaint.recipientRole).toBe("dean");
  });

  it("approveComplaint supports assignToSelf and assignedTo", async () => {
    const hodAgent = await agentFor(org.hod);

    const selfComplaint = await createComplaint({
      submittedBy: org.student._id,
      title: "Approve self",
      status: "Pending",
      submittedTo: "hod",
      recipientRole: "hod",
      recipientId: org.hod._id,
      department: "IT",
    });
    const selfApprove = await hodAgent
      .put(`/api/complaints/approve/${selfComplaint._id}`)
      .send({ note: "taking it", assignToSelf: true });
    expect(selfApprove.status).toBe(200);
    expect(selfApprove.body.complaint.status).toBe("Accepted");
    expect(String(selfApprove.body.complaint.assignedTo)).toBe(
      String(org.hod._id)
    );

    const assignComplaintDoc = await createComplaint({
      submittedBy: org.student._id,
      title: "Approve assigned",
      status: "Pending",
      submittedTo: "hod",
      recipientRole: "hod",
      recipientId: org.hod._id,
      department: "IT",
    });
    const assignedApprove = await hodAgent
      .put(`/api/complaints/approve/${assignComplaintDoc._id}`)
      .send({ note: "route to staff", assignedTo: org.staff._id });
    expect(assignedApprove.status).toBe(200);
    expect(assignedApprove.body.complaint.status).toBe("Accepted");
    expect(String(assignedApprove.body.complaint.assignedTo)).toBe(
      String(org.staff._id)
    );
  });

  it("updateComplaintStatus walks Accepted -> In Progress -> Resolved -> Closed", async () => {
    const complaint = await createComplaint({
      submittedBy: org.student._id,
      title: "Status walk",
      status: "Pending",
      submittedTo: "hod",
      recipientRole: "hod",
      recipientId: org.hod._id,
      department: "IT",
    });

    const hodAgent = await agentFor(org.hod);
    const approve = await hodAgent
      .put(`/api/complaints/approve/${complaint._id}`)
      .send({ assignToSelf: true, note: "accepted" });
    expect(approve.status).toBe(200);
    expect(approve.body.complaint.status).toBe("Accepted");

    const inProgress = await hodAgent
      .put(`/api/complaints/update-status/${complaint._id}`)
      .send({ status: "In Progress", description: "working" });
    expect(inProgress.status).toBe(200);
    expect(inProgress.body.complaint.status).toBe("In Progress");

    const deanAgent = await agentFor(org.dean);
    const resolved = await deanAgent
      .put(`/api/complaints/update-status/${complaint._id}`)
      .send({ status: "Resolved", description: "fixed" });
    expect(resolved.status).toBe(200);
    expect(resolved.body.complaint.status).toBe("Resolved");

    const closed = await deanAgent
      .put(`/api/complaints/update-status/${complaint._id}`)
      .send({ status: "Closed", description: "done" });
    expect(closed.status).toBe(200);
    expect(closed.body.complaint.status).toBe("Closed");
  });

  it("markFeedbackReviewed succeeds for assigned staff", async () => {
    const resolved = await createComplaint({
      submittedBy: org.student._id,
      title: "Feedback review",
      status: "Resolved",
      submittedTo: "admin",
      assignedTo: org.staff._id,
      department: "IT",
    });

    const studentAgent = await agentFor(org.student);
    const feedback = await studentAgent
      .post(`/api/complaints/feedback/${resolved._id}`)
      .send({ rating: 4, comment: "Good" });
    expect(feedback.status).toBe(200);

    const staffAgent = await agentFor(org.staff);
    const reviewed = await staffAgent.put(
      `/api/complaints/feedback/reviewed/${resolved._id}`
    );
    expect(reviewed.status).toBe(200);
    expect(reviewed.body.complaint?.feedback?.reviewed).toBe(true);
  });

  it("queryComplaints respects status and department filters", async () => {
    await createComplaint({
      submittedBy: org.student._id,
      title: "Pending IT",
      status: "Pending",
      submittedTo: "admin",
      department: "IT",
    });
    await createComplaint({
      submittedBy: org.student._id,
      title: "Resolved IT",
      status: "Resolved",
      submittedTo: "admin",
      department: "IT",
    });
    await createComplaint({
      submittedBy: org.student._id,
      title: "Pending HR",
      status: "Pending",
      submittedTo: "admin",
      department: "HR",
    });

    const adminAgent = await agentFor(org.admin);
    const byStatus = await adminAgent.get("/api/complaints/?status=Resolved");
    expect(byStatus.status).toBe(200);
    expect(Array.isArray(byStatus.body)).toBe(true);
    expect(byStatus.body.every((c) => c.status === "Resolved")).toBe(true);
    expect(byStatus.body.some((c) => c.title === "Resolved IT")).toBe(true);

    const byDept = await adminAgent.get("/api/complaints/?department=IT");
    expect(byDept.status).toBe(200);
    expect(Array.isArray(byDept.body)).toBe(true);
    expect(byDept.body.every((c) => c.department === "IT")).toBe(true);
    expect(byDept.body.some((c) => c.title === "Pending IT")).toBe(true);
  });

  it("getAllComplaints returns paginated results", async () => {
    for (let i = 0; i < 5; i += 1) {
      await createComplaint({
        submittedBy: org.student._id,
        title: `Page item ${i}`,
        status: "Pending",
        submittedTo: "admin",
        department: "IT",
      });
    }

    const adminAgent = await agentFor(org.admin);
    const page1 = await adminAgent.get("/api/complaints/all?page=1&limit=2");
    expect(page1.status).toBe(200);
    expect(page1.body.page).toBe(1);
    expect(page1.body.pageSize).toBe(2);
    expect(page1.body.total).toBeGreaterThanOrEqual(5);
    expect(Array.isArray(page1.body.items)).toBe(true);
    expect(page1.body.items.length).toBe(2);

    const page2 = await adminAgent.get("/api/complaints/all?page=2&limit=2");
    expect(page2.status).toBe(200);
    expect(page2.body.page).toBe(2);
    expect(page2.body.items.length).toBe(2);
    expect(page2.body.items[0].id).not.toBe(page1.body.items[0].id);
  });

  it("updateMyComplaint and softDeleteMyComplaint reject wrong owner and non-Pending", async () => {
    const otherStudent = await createUser({
      role: "student",
      department: "IT",
    });
    const pending = await createComplaint({
      submittedBy: org.student._id,
      title: "Owner only",
      status: "Pending",
      submittedTo: "admin",
      department: "IT",
    });
    const accepted = await createComplaint({
      submittedBy: org.student._id,
      title: "Not pending",
      status: "Accepted",
      submittedTo: "admin",
      department: "IT",
    });

    const otherAgent = await agentFor(otherStudent);
    const wrongOwnerUpdate = await otherAgent
      .put(`/api/complaints/my/${pending._id}`)
      .send({ title: "Hijack" });
    expect(wrongOwnerUpdate.status).toBe(403);

    const wrongOwnerDelete = await otherAgent.delete(
      `/api/complaints/my/${pending._id}`
    );
    expect(wrongOwnerDelete.status).toBe(403);

    const ownerAgent = await agentFor(org.student);
    const notPendingUpdate = await ownerAgent
      .put(`/api/complaints/my/${accepted._id}`)
      .send({ title: "Too late" });
    expect(notPendingUpdate.status).toBe(400);

    const notPendingDelete = await ownerAgent.delete(
      `/api/complaints/my/${accepted._id}`
    );
    expect(notPendingDelete.status).toBe(400);

    const missing = await ownerAgent
      .put(`/api/complaints/my/${new mongoose.Types.ObjectId()}`)
      .send({ title: "Gone" });
    expect(missing.status).toBe(404);
  });

  it("markFeedbackReviewed rejects complaints without feedback", async () => {
    const resolved = await createComplaint({
      submittedBy: org.student._id,
      title: "No feedback yet",
      status: "Resolved",
      submittedTo: "admin",
      assignedTo: org.staff._id,
      department: "IT",
    });
    const staffAgent = await agentFor(org.staff);
    const res = await staffAgent.put(
      `/api/complaints/feedback/reviewed/${resolved._id}`
    );
    expect(res.status).toBe(400);
  });
});
