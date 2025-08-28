import express from "express";
import {
  getComplaintStats,
  getDepartmentComplaintStats,
  getFeedbackStats,
  getStaffmanagmentStats,
  getStaffStats,
  getUserStats,
  getRoleCounts,
  getDeanVisibleComplaintStats,
} from "../controllers/stats.controller.js";

import {
  protectRoute,
  adminOnly,
  deanOnly,
  staffOnly,
  hodOnly,
} from "../middleware/protectRoute.js";

const router = express.Router();

// Admin or Dean complaint stats
router.get(
  "/complaints",
  protectRoute,
  (req, res, next) => {
    // Allow dean or admin to proceed
    const role = req.user?.role;
    if (role === "admin" || role === "dean") return next();
    return res.status(403).json({ error: "Access denied" });
  },
  getComplaintStats
);
// Dean-visible stats excluding complaints sent to Admin
router.get(
  "/complaints/dean-visible",
  protectRoute,
  (req, res, next) => {
    const role = req.user?.role;
    if (role === "admin" || role === "dean") return next();
    return res.status(403).json({ error: "Access denied" });
  },
  getDeanVisibleComplaintStats
);
// HoD complaint stats (department scoped)
router.get(
  "/complaints/department",
  protectRoute,
  hodOnly,
  getDepartmentComplaintStats
);
router.get("/feedback", protectRoute, adminOnly, getFeedbackStats);
router.get("/staff", protectRoute, adminOnly, getStaffmanagmentStats);
router.get("/roles", protectRoute, adminOnly, getRoleCounts);
// Staff-only stat endpoints
router.get("/staffs", protectRoute, staffOnly, getStaffStats);
// User stat endpoint
router.get("/user", protectRoute, getUserStats);

export default router;
