import express from "express";
import {
  getAllFeedback,
  getFeedbackForComplaint,
  addFeedbackToComplaint,
  updateFeedback,
  deleteFeedback,
  markFeedbackReviewed,
  getMyTargetedAdminFeedback,
} from "../controllers/feedback.controller.js";
import { protectRoute, adminOnly } from "../middleware/protectRoute.js";

const router = express.Router();

// Admin: Get all feedback
router.get("/all", protectRoute, adminOnly, getAllFeedback);
router.get("/admin/mine", protectRoute, getMyTargetedAdminFeedback);

// Complaint-scoped feedback
router.get("/complaint/:complaintId", protectRoute, getFeedbackForComplaint);
router.post("/complaint/:complaintId", protectRoute, addFeedbackToComplaint);
router.patch("/:id", protectRoute, updateFeedback);
router.delete("/:id", protectRoute, deleteFeedback);
router.post("/:id/review", protectRoute, markFeedbackReviewed);

export default router;
