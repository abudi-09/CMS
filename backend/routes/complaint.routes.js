import express from "express";

import {
  createComplaint,
  getMyComplaints,
  getAllComplaints,
  assignComplaint,
  updateComplaintStatus,
  giveFeedback,
  getAllFeedback,
  getAssignedComplaints,
  approveComplaint,
  updateMyComplaint,
  softDeleteMyComplaint,
  updateMyComplaintRecipient,
  reassignRecipient,
  getMyFeedback,
  markFeedbackReviewed,
  getFeedbackByRole,
  queryComplaints,
  deanAssignToHod,
  deanAcceptComplaint,
  deanRejectComplaint,
  getDeanInbox,
  getDeanScopedComplaints,
  getAdminInbox,
  getAdminWorkflowComplaints,
  getHodInbox,
  hodAssignToStaff,
  hodAcceptAssignment,
  hodRejectAssignment,
  getHodManagedComplaints,
  getHodAll,
  getStaffInbox,
  getAdminComplaintsDebug,
} from "../controllers/complaint.controller.js";
import { getComplaint } from "../controllers/getComplaint.js";
import {
  protectRoute,
  adminOnly,
  adminOrDean,
  staffOnly,
  hodOnly,
  adminDeanOrHod,
  deanOnly,
} from "../middleware/protectRoute.js";

const router = express.Router();

// USER
router.post("/submit", protectRoute, createComplaint);
router.get("/my-complaints", protectRoute, getMyComplaints);
// Student-owned edit/delete (only while Pending)
router.put("/my/:id", protectRoute, updateMyComplaint);
router.delete("/my/:id", protectRoute, softDeleteMyComplaint);
router.put("/my/:id/recipient", protectRoute, updateMyComplaintRecipient);
router.post("/feedback/:id", protectRoute, giveFeedback);

// All complaints (role-aware: Admin or Dean)
router.get("/all", protectRoute, adminOrDean, getAllComplaints);
router.put("/assign/:id", protectRoute, adminOrDean, assignComplaint);
// Admin/HOD/Dean can reassign recipient role (post-acceptance)
router.put(
  "/reassign/recipient/:id",
  protectRoute,
  adminDeanOrHod,
  reassignRecipient
);
// Approval can be performed by Dean or HoD (their respective inbox acceptance)
router.put("/approve/:id", protectRoute, adminDeanOrHod, approveComplaint);
// Dean -> assign to HoD (keeps status Pending for HoD acceptance)
router.put("/dean/assign-to-hod/:id", protectRoute, deanOnly, deanAssignToHod);
router.put("/dean/accept/:id", protectRoute, deanOnly, deanAcceptComplaint);
router.put("/dean/reject/:id", protectRoute, deanOnly, deanRejectComplaint);
// Role-scoped inboxes
router.get("/inbox/dean", protectRoute, deanOnly, getDeanInbox);
router.get("/dean/scoped", protectRoute, deanOnly, getDeanScopedComplaints);
router.get("/inbox/admin", protectRoute, adminOnly, getAdminInbox);
// Admin: full workflow list (all statuses for direct/admin path complaints)
router.get(
  "/admin/workflow",
  protectRoute,
  adminOnly,
  getAdminWorkflowComplaints
);
router.get("/inbox/hod", protectRoute, hodOnly, getHodInbox);
// Development-only debug route: GET /api/complaints/debug/admin-complaints/:adminId
if (process.env.NODE_ENV !== "production") {
  router.get(
    "/debug/admin-complaints/:adminId",
    protectRoute,
    adminOnly,
    getAdminComplaintsDebug
  );
}
// HoD assignment to staff within department
router.put("/hod/assign-to-staff/:id", protectRoute, hodOnly, hodAssignToStaff);
// HoD decision on dean-assigned item
router.put("/hod/accept/:id", protectRoute, hodOnly, hodAcceptAssignment);
router.put("/hod/reject/:id", protectRoute, hodOnly, hodRejectAssignment);
// HoD managed complaints (self or staff in dept)
router.get("/hod/managed", protectRoute, hodOnly, getHodManagedComplaints);
// HoD consolidated data
router.get("/hod/all", protectRoute, hodOnly, getHodAll);
router.get("/feedback/all", protectRoute, adminOnly, getAllFeedback);

// STAFF
router.put("/update-status/:id", protectRoute, updateComplaintStatus);
router.get("/assigned", protectRoute, staffOnly, getAssignedComplaints);
router.get("/feedback/my", protectRoute, staffOnly, getMyFeedback);
// Role-aware hierarchical feedback
router.get("/feedback/by-role", protectRoute, getFeedbackByRole);
router.put("/feedback/reviewed/:id", protectRoute, markFeedbackReviewed);
// Staff inbox (direct student -> this staff)
router.get("/inbox/staff", protectRoute, staffOnly, getStaffInbox);

// Allow role-aware querying of complaints (used by frontend AllComplaints and dashboards)
router.get("/", protectRoute, queryComplaints); // keep existing behavior for root

// GET single complaint by ID (must be last)
router.get("/:id", protectRoute, getComplaint);

export default router;
