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
  getMyFeedback,
  markFeedbackReviewed,
  getFeedbackByRole,
  queryComplaints,
} from "../controllers/complaint.controller.js";
import { getComplaint } from "../controllers/getComplaint.js";
import {
  protectRoute,
  adminOnly,
  adminOrDean,
  staffOnly,
} from "../middleware/protectRoute.js";

const router = express.Router();

// USER
router.post("/submit", protectRoute, createComplaint);
router.get("/my-complaints", protectRoute, getMyComplaints);
router.post("/feedback/:id", protectRoute, giveFeedback);

// ADMIN or DEAN
router.get("/all", protectRoute, adminOrDean, getAllComplaints);
router.put("/assign/:id", protectRoute, adminOrDean, assignComplaint);
router.put("/approve/:id", protectRoute, adminOrDean, approveComplaint);
router.get("/feedback/all", protectRoute, adminOnly, getAllFeedback);

// STAFF
router.put("/update-status/:id", protectRoute, updateComplaintStatus);
router.get("/assigned", protectRoute, staffOnly, getAssignedComplaints);
router.get("/feedback/my", protectRoute, staffOnly, getMyFeedback);
// Role-aware hierarchical feedback
router.get("/feedback/by-role", protectRoute, getFeedbackByRole);
router.put("/feedback/reviewed/:id", protectRoute, markFeedbackReviewed);

// Allow role-aware querying of complaints (used by frontend AllComplaints and dashboards)
router.get("/", protectRoute, queryComplaints); // keep existing behavior for root

// GET single complaint by ID (must be last)
router.get("/:id", protectRoute, getComplaint);

export default router;
