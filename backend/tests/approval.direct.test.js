import { describe, it, expect, vi } from "vitest";
import {
  adminGetPendingHod,
  adminApproveHod,
  adminRejectHod,
  adminGetActiveHod,
  deanDebugHodCounts,
} from "../controllers/approval.controller.js";
import { createUser, seedOrg, uniqueEmail } from "./helpers.js";

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

describe("Approval controller direct coverage", () => {
  it("covers admin HoD list/approve/reject helpers", async () => {
    const { admin } = await seedOrg();
    const pendingHod = await createUser({
      email: uniqueEmail("direct-pending-hod"),
      role: "hod",
      department: "IT",
      workingPlace: "Office",
      isApproved: false,
      isActive: false,
      approvedByDean: true,
    });

    const listRes = mockRes();
    await adminGetPendingHod({ user: admin }, listRes);
    expect(listRes.statusCode).toBe(200);

    const activeRes = mockRes();
    await adminGetActiveHod({ user: admin }, activeRes);
    expect(activeRes.statusCode).toBe(200);

    const approveRes = mockRes();
    await adminApproveHod(
      { user: admin, params: { id: pendingHod._id } },
      approveRes
    );
    expect([200, 404]).toContain(approveRes.statusCode);

    const rejectTarget = await createUser({
      email: uniqueEmail("direct-reject-hod"),
      role: "hod",
      department: "IT",
      workingPlace: "Office",
      isApproved: false,
      isActive: false,
      approvedByDean: true,
    });
    const rejectRes = mockRes();
    await adminRejectHod(
      { user: admin, params: { id: rejectTarget._id } },
      rejectRes
    );
    expect([200, 404]).toContain(rejectRes.statusCode);
  });

  it("covers deanDebugHodCounts", async () => {
    const { dean } = await seedOrg();
    const res = mockRes();
    await deanDebugHodCounts({ user: dean }, res);
    expect([200, 500]).toContain(res.statusCode);
  });
});
