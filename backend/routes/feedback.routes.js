import express from "express";
import { getAllFeedback } from "../controllers/feedback.controller.js";
import { protectRoute, adminOnly } from "../middleware/protectRoute.js";

const router = express.Router();

// Admin: Get all feedback
router.get("/all", protectRoute, adminOnly, getAllFeedback);

export default router;
