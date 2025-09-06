import express from "express";
import {
  getAllFeedback,
  getFeedbackForComplaint,
  addFeedbackToComplaint,
  updateFeedback,
  deleteFeedback,
  markFeedbackReviewed,
  getMyTargetedAdminFeedback,
  listMyResolvedFeedback,
  reviewAnyFeedback,
} from "../controllers/feedback.controller.js";
import { protectRoute, adminOnly } from "../middleware/protectRoute.js";

const router = express.Router();

// Admin: Get all feedback
router.get("/all", protectRoute, adminOnly, getAllFeedback);
router.get("/admin/mine", protectRoute, getMyTargetedAdminFeedback);
// Generic: list feedback for complaints resolved by logged-in user (any role)
router.get("/mine", protectRoute, listMyResolvedFeedback);

// Complaint-scoped feedback
router.get("/complaint/:complaintId", protectRoute, getFeedbackForComplaint);
router.post("/complaint/:complaintId", protectRoute, addFeedbackToComplaint);
router.patch("/:id", protectRoute, updateFeedback);
router.delete("/:id", protectRoute, deleteFeedback);
router.post("/:id/review", protectRoute, markFeedbackReviewed);
// Unified review route (embedded or targeted) using body params
router.post("/review/any", protectRoute, reviewAnyFeedback);

export default router;
