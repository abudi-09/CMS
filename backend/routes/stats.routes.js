import express from "express";
import {
  getComplaintStats,
  getFeedbackStats,
  getStaffmanagmentStats,
  getStaffStats,
  getUserStats,
} from "../controllers/stats.controller.js";

import {
  protectRoute,
  adminOnly,
  staffOnly,
} from "../middleware/protectRoute.js";

const router = express.Router();

// Admin-only stat endpoints
router.get("/complaints", protectRoute, adminOnly, getComplaintStats);
router.get("/feedback", protectRoute, adminOnly, getFeedbackStats);
router.get("/staff", protectRoute, adminOnly, getStaffmanagmentStats);
// Staff-only stat endpoints
router.get("/staffs", protectRoute, staffOnly, getStaffStats);
// User stat endpoint
router.get("/user", protectRoute, getUserStats);

export default router;
