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
} from "../controllers/complaint.controller.js";
import {
  protectRoute,
  adminOnly,
  staffOnly,
} from "../middleware/protectRoute.js";

const router = express.Router();

// USER
router.post("/submit", protectRoute, createComplaint);
router.get("/my-complaints", protectRoute, getMyComplaints);
router.post("/feedback/:id", protectRoute, giveFeedback);

// ADMIN
router.get("/all", protectRoute, adminOnly, getAllComplaints);
router.put("/assign/:id", protectRoute, adminOnly, assignComplaint);
router.get("/feedback/all", protectRoute, adminOnly, getAllFeedback);

// STAFF
router.put("/update-status/:id", protectRoute, updateComplaintStatus);
router.get("/assigned", protectRoute, staffOnly, getAssignedComplaints);

export default router;
