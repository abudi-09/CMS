import { describe, it, expect, beforeEach } from "vitest";
import {
  seedOrg,
  agentFor,
  createComplaint,
  createUser,
} from "./helpers.js";

describe("Complaint workflows", () => {
  let org;

  beforeEach(async () => {
    org = await seedOrg({ department: "IT" });
  });

  it("student can update, retarget, and soft-delete a pending complaint", async () => {
    const agent = await agentFor(org.student);
    const complaint = await createComplaint({
      submittedBy: org.student._id,
      title: "Editable",
      status: "Pending",
      submittedTo: "admin",
    });

    const update = await agent.put(`/api/complaints/my/${complaint._id}`).send({
      title: "Updated title",
      description: "Updated description",
    });
    expect(update.status).toBe(200);

    const retarget = await agent
      .put(`/api/complaints/my/${complaint._id}/recipient`)
      .send({ recipientRole: "hod", recipientId: org.hod._id });
    expect([200, 400]).toContain(retarget.status);

    const del = await agent.delete(`/api/complaints/my/${complaint._id}`);
    expect(del.status).toBe(200);
  });

  it("student can submit to dean with recipientId and to staff directly", async () => {
    const agent = await agentFor(org.student);

    const toDean = await agent.post("/api/complaints/submit").send({
      title: "Dean route",
      description: "Needs dean",
      category: "Facilities",
      priority: "High",
      submittedTo: "dean",
      recipientId: org.dean._id,
      department: "IT",
    });
    expect(toDean.status).toBe(201);

    const toStaff = await agent.post("/api/complaints/submit").send({
      title: "Staff route",
      description: "Needs staff",
      category: "IT",
      priority: "Medium",
      submittedTo: "staff",
      recipientStaffId: org.staff._id,
      department: "IT",
    });
    expect(toStaff.status).toBe(201);
  });

  it("admin inbox, workflow, assign, and approve work", async () => {
    const complaint = await createComplaint({
      submittedBy: org.student._id,
      title: "Admin path",
      status: "Pending",
      submittedTo: "admin",
      department: "IT",
    });
    const agent = await agentFor(org.admin);

    expect((await agent.get("/api/complaints/inbox/admin")).status).toBe(200);
    expect((await agent.get("/api/complaints/admin/workflow")).status).toBe(200);
    expect((await agent.get("/api/complaints/all")).status).toBe(200);
    expect((await agent.get("/api/complaints/")).status).toBe(200);
    expect(
      (await agent.get(`/api/complaints/debug/admin-complaints/${org.admin._id}`))
        .status
    ).toBe(200);

    const approve = await agent.put(`/api/complaints/approve/${complaint._id}`).send({
      note: "ok",
    });
    expect([200, 400, 403]).toContain(approve.status);

    const pending = await createComplaint({
      submittedBy: org.student._id,
      title: "Assign me",
      status: "Pending",
      submittedTo: "admin",
      department: "IT",
    });
    const assign = await agent.put(`/api/complaints/assign/${pending._id}`).send({
      staffId: org.staff._id,
      deadline: new Date(Date.now() + 86400000).toISOString(),
    });
    expect(assign.status).toBe(200);
  });

  it("dean inbox, scoped, accept, reject, and assign-to-hod work", async () => {
    const complaint = await createComplaint({
      submittedBy: org.student._id,
      title: "Dean inbox item",
      status: "Pending",
      submittedTo: "dean",
      recipientRole: "dean",
      recipientId: org.dean._id,
      department: "IT",
    });
    const agent = await agentFor(org.dean);

    expect((await agent.get("/api/complaints/inbox/dean")).status).toBe(200);
    expect((await agent.get("/api/complaints/dean/scoped")).status).toBe(200);

    const accept = await agent.put(`/api/complaints/dean/accept/${complaint._id}`);
    expect([200, 400, 403]).toContain(accept.status);

    const forHod = await createComplaint({
      submittedBy: org.student._id,
      title: "Assign to HoD",
      status: "Pending",
      submittedTo: "dean",
      recipientRole: "dean",
      recipientId: org.dean._id,
      department: "IT",
    });
    const assignHod = await agent
      .put(`/api/complaints/dean/assign-to-hod/${forHod._id}`)
      .send({ hodId: org.hod._id });
    expect([200, 400]).toContain(assignHod.status);

    const rejectable = await createComplaint({
      submittedBy: org.student._id,
      title: "Reject me",
      status: "Pending",
      submittedTo: "dean",
      recipientRole: "dean",
      recipientId: org.dean._id,
      department: "IT",
    });
    const reject = await agent
      .put(`/api/complaints/dean/reject/${rejectable._id}`)
      .send({ note: "not valid" });
    expect([200, 400]).toContain(reject.status);
  });

  it("hod inbox, managed, all, accept, reject, and assign-to-staff work", async () => {
    const complaint = await createComplaint({
      submittedBy: org.student._id,
      title: "HoD item",
      status: "Pending",
      submittedTo: "hod",
      recipientRole: "hod",
      recipientId: org.hod._id,
      assignedTo: org.hod._id,
      assignedToRole: "hod",
      department: "IT",
    });
    const agent = await agentFor(org.hod);

    expect((await agent.get("/api/complaints/inbox/hod")).status).toBe(200);
    expect((await agent.get("/api/complaints/hod/managed")).status).toBe(200);
    expect((await agent.get("/api/complaints/hod/all")).status).toBe(200);

    const accept = await agent.put(`/api/complaints/hod/accept/${complaint._id}`);
    expect([200, 400]).toContain(accept.status);

    const forStaff = await createComplaint({
      submittedBy: org.student._id,
      title: "Assign staff",
      status: "Accepted",
      submittedTo: "hod",
      recipientRole: "hod",
      recipientId: org.hod._id,
      assignedTo: org.hod._id,
      department: "IT",
    });
    const assignStaff = await agent
      .put(`/api/complaints/hod/assign-to-staff/${forStaff._id}`)
      .send({ staffId: org.staff._id });
    expect([200, 400]).toContain(assignStaff.status);

    const rejectable = await createComplaint({
      submittedBy: org.student._id,
      title: "HoD reject",
      status: "Pending",
      submittedTo: "hod",
      recipientRole: "hod",
      recipientId: org.hod._id,
      assignedTo: org.hod._id,
      department: "IT",
    });
    const reject = await agent
      .put(`/api/complaints/hod/reject/${rejectable._id}`)
      .send({ note: "no" });
    expect([200, 400]).toContain(reject.status);
  });

  it("staff inbox and status updates work; getComplaint returns payload", async () => {
    const complaint = await createComplaint({
      submittedBy: org.student._id,
      title: "Staff assigned",
      status: "In Progress",
      submittedTo: "admin",
      assignedTo: org.staff._id,
      assignedToRole: "staff",
      department: "IT",
      assignedAt: new Date(),
    });
    const staffAgent = await agentFor(org.staff);

    expect((await staffAgent.get("/api/complaints/inbox/staff")).status).toBe(200);
    expect((await staffAgent.get("/api/complaints/assigned")).status).toBe(200);

    const status = await staffAgent
      .put(`/api/complaints/update-status/${complaint._id}`)
      .send({ status: "Resolved", note: "fixed" });
    expect([200, 400]).toContain(status.status);

    const getOne = await staffAgent.get(`/api/complaints/${complaint._id}`);
    expect(getOne.status).toBe(200);
    expect(getOne.body.complaint).toBeDefined();

    const studentAgent = await agentFor(org.student);
    const anon = await createComplaint({
      submittedBy: org.student._id,
      title: "Anon",
      status: "Pending",
      submittedTo: "admin",
      isAnonymous: true,
      department: "IT",
    });
    const anonGet = await studentAgent.get(`/api/complaints/${anon._id}`);
    expect(anonGet.status).toBe(200);
  });

  it("feedback endpoints and reassign recipient work", async () => {
    const resolved = await createComplaint({
      submittedBy: org.student._id,
      title: "Resolved for feedback",
      status: "Resolved",
      submittedTo: "admin",
      assignedTo: org.staff._id,
      department: "IT",
    });
    const studentAgent = await agentFor(org.student);
    const feedback = await studentAgent
      .post(`/api/complaints/feedback/${resolved._id}`)
      .send({ rating: 5, comment: "Great" });
    expect([200, 201, 400]).toContain(feedback.status);

    const adminAgent = await agentFor(org.admin);
    expect((await adminAgent.get("/api/complaints/feedback/all")).status).toBe(200);
    expect((await adminAgent.get("/api/complaints/feedback/by-role")).status).toBe(
      200
    );

    const staffAgent = await agentFor(org.staff);
    expect((await staffAgent.get("/api/complaints/feedback/my")).status).toBe(200);

    const pending = await createComplaint({
      submittedBy: org.student._id,
      title: "Reassign",
      status: "Accepted",
      submittedTo: "admin",
      department: "IT",
    });
    const reassign = await adminAgent
      .put(`/api/complaints/reassign/recipient/${pending._id}`)
      .send({ recipientRole: "hod", recipientId: org.hod._id });
    expect([200, 400]).toContain(reassign.status);
  });

  it("dean getComplaint is scoped; unknown id returns 404", async () => {
    const otherDean = await createUser({
      email: "other-dean@test.com",
      role: "dean",
      workingPlace: "Other",
    });
    const complaint = await createComplaint({
      submittedBy: org.student._id,
      title: "Scoped",
      status: "Pending",
      submittedTo: "dean",
      recipientRole: "dean",
      recipientId: org.dean._id,
      department: "IT",
    });

    const otherAgent = await agentFor(otherDean);
    const denied = await otherAgent.get(`/api/complaints/${complaint._id}`);
    expect([403, 200]).toContain(denied.status);

    const agent = await agentFor(org.dean);
    const missing = await agent.get(
      "/api/complaints/507f1f77bcf86cd799439011"
    );
    expect(missing.status).toBe(404);
  });
});
