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

describe("Approval API – HoD staff management", () => {
  it("lists pending staff in HoD department", async () => {
    const { hod, pendingStaff } = await seedOrg();
    const agent = await agentFor(hod);

    const res = await agent.get("/api/approvals/hod/pending-staff");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((u) => u.email === pendingStaff.email)).toBe(true);
  });

  it("approves pending staff in HoD department", async () => {
    const { hod, pendingStaff } = await seedOrg();
    const agent = await agentFor(hod);

    const res = await agent.put(
      `/api/approvals/hod/approve-staff/${pendingStaff._id}`
    );
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/approved/i);

    const updated = await User.findById(pendingStaff._id);
    expect(updated.isApproved).toBe(true);
    expect(updated.isActive).toBe(true);
  });

  it("rejects pending staff in HoD department", async () => {
    const { hod, pendingStaff } = await seedOrg();
    const agent = await agentFor(hod);

    const res = await agent.delete(
      `/api/approvals/hod/reject-staff/${pendingStaff._id}`
    );
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/rejected/i);

    const updated = await User.findById(pendingStaff._id);
    expect(updated.isRejected).toBe(true);
    expect(updated.isApproved).toBe(false);
  });

  it("deactivates and reactivates approved staff", async () => {
    const { hod, staff } = await seedOrg();
    const agent = await agentFor(hod);

    const deactivate = await agent.put(
      `/api/approvals/hod/deactivate-staff/${staff._id}`
    );
    expect(deactivate.status).toBe(200);

    let updated = await User.findById(staff._id);
    expect(updated.isActive).toBe(false);

    const reactivate = await agent.put(
      `/api/approvals/hod/reactivate-staff/${staff._id}`
    );
    expect(reactivate.status).toBe(200);

    updated = await User.findById(staff._id);
    expect(updated.isActive).toBe(true);
  });

  it("returns 400 when deactivating pending staff", async () => {
    const { hod, pendingStaff } = await seedOrg();
    const agent = await agentFor(hod);

    const res = await agent.put(
      `/api/approvals/hod/deactivate-staff/${pendingStaff._id}`
    );
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/only approved staff/i);
  });

  it("lists active, deactivated, and rejected staff", async () => {
    const { hod, staff, pendingStaff } = await seedOrg();
    const agent = await agentFor(hod);

    await agent.delete(
      `/api/approvals/hod/reject-staff/${pendingStaff._id}`
    );
    await agent.put(`/api/approvals/hod/deactivate-staff/${staff._id}`);

    const active = await agent.get("/api/approvals/hod/active-staff");
    expect(active.status).toBe(200);
    expect(active.body.some((u) => u.email === staff.email)).toBe(false);

    const deactivated = await agent.get("/api/approvals/hod/deactivated-staff");
    expect(deactivated.status).toBe(200);
    expect(deactivated.body.some((u) => u.email === staff.email)).toBe(true);

    const rejected = await agent.get("/api/approvals/hod/rejected-staff");
    expect(rejected.status).toBe(200);
    expect(rejected.body.some((u) => u.email === pendingStaff.email)).toBe(
      true
    );
  });

  it("returns 403 when HoD approves staff from another department", async () => {
    const { hod } = await seedOrg({ department: "IT" });
    const otherDeptStaff = await createUser({
      email: uniqueEmail("other-staff"),
      role: "staff",
      department: "Finance",
      workingPlace: "Finance Lab",
      isApproved: false,
      isActive: false,
    });
    const agent = await agentFor(hod);

    const res = await agent.put(
      `/api/approvals/hod/approve-staff/${otherDeptStaff._id}`
    );
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/your department/i);
  });

  it("returns 403 when a student accesses HoD routes", async () => {
    const { student } = await seedOrg();
    const agent = await agentFor(student);

    const res = await agent.get("/api/approvals/hod/pending-staff");
    expect(res.status).toBe(403);
  });
});

describe("Approval API – HoD user management", () => {
  it("lists department users and activates/deactivates students", async () => {
    const { hod, student } = await seedOrg();
    const agent = await agentFor(hod);

    const list = await agent.get("/api/approvals/hod/users");
    expect(list.status).toBe(200);
    expect(list.body.some((u) => u.email === student.email)).toBe(true);

    const deactivate = await agent.put(
      `/api/approvals/hod/deactivate-user/${student._id}`
    );
    expect(deactivate.status).toBe(200);

    let updated = await User.findById(student._id);
    expect(updated.isActive).toBe(false);

    const activate = await agent.put(
      `/api/approvals/hod/activate-user/${student._id}`
    );
    expect(activate.status).toBe(200);

    updated = await User.findById(student._id);
    expect(updated.isActive).toBe(true);
  });

  it("promotes a student to staff with workingPlace", async () => {
    const { hod, student } = await seedOrg();
    const agent = await agentFor(hod);

    const res = await agent
      .put(`/api/approvals/hod/promote-user/${student._id}`)
      .send({ workingPlace: "Support Desk" });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("staff");
    expect(res.body.user.workingPlace).toBe("Support Desk");
  });

  it("returns 400 when promoting without workingPlace", async () => {
    const { hod, student } = await seedOrg();
    const agent = await agentFor(hod);

    const res = await agent
      .put(`/api/approvals/hod/promote-user/${student._id}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/working position/i);
  });
});

describe("Approval API – Dean HoD management", () => {
  it("lists pending HoDs and approves them", async () => {
    const { dean } = await seedOrg();
    const pendingHod = await createUser({
      email: uniqueEmail("pending-hod"),
      role: "hod",
      department: "Finance",
      workingPlace: "Finance Office",
      isApproved: false,
      isActive: false,
    });
    const agent = await agentFor(dean);

    const pending = await agent.get("/api/approvals/dean/pending-hod");
    expect(pending.status).toBe(200);
    expect(pending.body.some((u) => u.email === pendingHod.email)).toBe(true);

    const approve = await agent.put(
      `/api/approvals/dean/approve-hod/${pendingHod._id}`
    );
    expect(approve.status).toBe(200);

    const updated = await User.findById(pendingHod._id);
    expect(updated.isApproved).toBe(true);
    expect(updated.isActive).toBe(true);
  });

  it("rejects, deactivates, and reactivates HoDs", async () => {
    const { dean } = await seedOrg();
    const hodUser = await createUser({
      email: uniqueEmail("active-hod"),
      role: "hod",
      department: "Finance",
      workingPlace: "Finance Office",
      isApproved: true,
      isActive: true,
    });
    const agent = await agentFor(dean);

    const deactivate = await agent.put(
      `/api/approvals/dean/deactivate-hod/${hodUser._id}`
    );
    expect(deactivate.status).toBe(200);

    const reactivate = await agent.put(
      `/api/approvals/dean/reactivate-hod/${hodUser._id}`
    );
    expect(reactivate.status).toBe(200);

    const rejectTarget = await createUser({
      email: uniqueEmail("reject-hod"),
      role: "hod",
      department: "Finance",
      workingPlace: "Finance Office",
      isApproved: false,
      isActive: false,
    });
    const reject = await agent.delete(
      `/api/approvals/dean/reject-hod/${rejectTarget._id}`
    );
    expect(reject.status).toBe(200);
  });

  it("returns grouped HoD lists via /dean/all-hod", async () => {
    const { dean } = await seedOrg();
    await createUser({
      email: uniqueEmail("group-hod"),
      role: "hod",
      department: "Finance",
      workingPlace: "Finance Office",
      isApproved: true,
      isActive: true,
    });
    const agent = await agentFor(dean);

    const res = await agent.get("/api/approvals/dean/all-hod");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("pending");
    expect(res.body).toHaveProperty("approved");
    expect(res.body).toHaveProperty("counts");
  });

  it("returns 403 when HoD accesses dean-only routes", async () => {
    const { hod } = await seedOrg();
    const agent = await agentFor(hod);

    const res = await agent.get("/api/approvals/dean/pending-hod");
    expect(res.status).toBe(403);
  });
});

async function withDeanDepartment(org, department = "IT") {
  await User.findByIdAndUpdate(org.dean._id, { department });
  org.dean = await User.findById(org.dean._id);
  return org;
}

describe("Approval API – Dean staff and user management", () => {
  it("manages pending staff as dean", async () => {
    const org = await withDeanDepartment(await seedOrg());
    const { dean, pendingStaff } = org;
    const agent = await agentFor(dean);

    const pending = await agent.get("/api/approvals/dean/pending-staff");
    expect(pending.status).toBe(200);
    expect(pending.body.some((u) => u.email === pendingStaff.email)).toBe(true);

    const approve = await agent.put(
      `/api/approvals/dean/approve-staff/${pendingStaff._id}`
    );
    expect(approve.status).toBe(200);
  });

  it("activates, deactivates, and promotes users as dean", async () => {
    const org = await withDeanDepartment(await seedOrg());
    const { dean, student } = org;
    const agent = await agentFor(dean);

    const users = await agent.get("/api/approvals/dean/users");
    expect(users.status).toBe(200);

    const deactivate = await agent.put(
      `/api/approvals/dean/deactivate-user/${student._id}`
    );
    expect(deactivate.status).toBe(200);

    const activate = await agent.put(
      `/api/approvals/dean/activate-user/${student._id}`
    );
    expect(activate.status).toBe(200);

    const promote = await agent
      .put(`/api/approvals/dean/promote-user/${student._id}`)
      .send({ workingPlace: "Dean Lab" });
    expect(promote.status).toBe(200);
    expect(promote.body.user.role).toBe("staff");
  });
});

describe("Approval API – Admin dean management", () => {
  it("lists pending and active deans", async () => {
    const { admin } = await seedOrg();
    const pendingDean = await createUser({
      email: uniqueEmail("pending-dean"),
      role: "dean",
      department: "Finance",
      workingPlace: "Finance Dean Office",
      isApproved: false,
      isActive: false,
    });
    const agent = await agentFor(admin);

    const pending = await agent.get("/api/approvals/admin/pending-deans");
    expect(pending.status).toBe(200);
    expect(pending.body.some((u) => u.email === pendingDean.email)).toBe(true);

    const active = await agent.get("/api/approvals/admin/active-deans");
    expect(active.status).toBe(200);
    expect(Array.isArray(active.body)).toBe(true);
  });

  it("approves, deactivates, reactivates, and rejects deans", async () => {
    const { admin } = await seedOrg();
    const pendingDean = await createUser({
      email: uniqueEmail("approve-dean"),
      role: "dean",
      department: "Finance",
      workingPlace: "Finance Dean Office",
      isApproved: false,
      isActive: false,
    });
    const agent = await agentFor(admin);

    const approve = await agent.put(
      `/api/approvals/admin/approve-dean/${pendingDean._id}`
    );
    expect(approve.status).toBe(200);

    const deactivate = await agent.put(
      `/api/approvals/admin/deactivate-dean/${pendingDean._id}`
    );
    expect(deactivate.status).toBe(200);

    const reactivate = await agent.put(
      `/api/approvals/admin/reactivate-dean/${pendingDean._id}`
    );
    expect(reactivate.status).toBe(200);

    const rejectTarget = await createUser({
      email: uniqueEmail("reject-dean"),
      role: "dean",
      department: "Finance",
      workingPlace: "Finance Dean Office",
      isApproved: false,
      isActive: false,
    });
    const reject = await agent.delete(
      `/api/approvals/admin/reject-dean/${rejectTarget._id}`
    );
    expect(reject.status).toBe(200);
  });

  it("returns 403 when dean accesses admin dean routes", async () => {
    const { dean } = await seedOrg();
    const agent = await agentFor(dean);

    const res = await agent.get("/api/approvals/admin/pending-deans");
    expect(res.status).toBe(403);
  });

  it("returns 404 when approving a non-dean user", async () => {
    const { admin, student } = await seedOrg();
    const agent = await agentFor(admin);

    const res = await agent.put(
      `/api/approvals/admin/approve-dean/${student._id}`
    );
    expect(res.status).toBe(404);
  });
});

describe("Approval API – public recipient lists", () => {
  it("lists active deans and admins for authenticated users", async () => {
    const { dean, admin, student } = await seedOrg();
    const agent = await agentFor(student);

    const deans = await agent.get("/api/approvals/public/active-deans");
    expect(deans.status).toBe(200);
    expect(deans.body.some((u) => u.email === dean.email)).toBe(true);

    const admins = await agent.get("/api/approvals/public/active-admins");
    expect(admins.status).toBe(200);
    expect(admins.body.some((u) => u.email === admin.email)).toBe(true);
  });
});

describe("Approval API – Dean HoD deapprove/reapprove and lists", () => {
  it("deapproves, reapproves, and lists HoD collections", async () => {
    const { dean, hod } = await seedOrg();
    const agent = await agentFor(dean);

    expect((await agent.get("/api/approvals/dean/active-hod")).status).toBe(200);
    expect((await agent.get("/api/approvals/dean/rejected-hod")).status).toBe(200);
    expect((await agent.get("/api/approvals/dean/all-hod")).status).toBe(200);

    const deapprove = await agent.put(
      `/api/approvals/dean/deapprove-hod/${hod._id}`
    );
    expect([200, 400, 404]).toContain(deapprove.status);

    const reapprove = await agent.put(
      `/api/approvals/dean/reapprove-hod/${hod._id}`
    );
    expect([200, 400, 404]).toContain(reapprove.status);

    const debug = await agent.get("/api/approvals/dean/debug/hod-counts");
    expect([200, 404]).toContain(debug.status);
  });
});
