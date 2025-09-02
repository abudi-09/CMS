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
  getStudentCount,
  getCategoryCounts,
} from "../controllers/stats.controller.js";
import Complaint from "../models/complaint.model.js";

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
); // TEMPORARY: Test endpoint to check database without auth
router.get("/test-db", async (req, res) => {
  try {
    const total = await Complaint.countDocuments();
    const sample = await Complaint.find()
      .limit(3)
      .select("title status submittedTo isEscalated");
    res.json({
      totalComplaints: total,
      sampleComplaints: sample,
      message: "Database connection working",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TEMPORARY: Test endpoint to check database without auth
router.get("/test-db", async (req, res) => {
  try {
    const total = await Complaint.countDocuments();
    const sample = await Complaint.find()
      .limit(3)
      .select("title status submittedTo isEscalated");
    res.json({
      totalComplaints: total,
      sampleComplaints: sample,
      message: "Database connection working",
    });
  } catch (err) {
    console.error("/api/stats/test-db error:", err);
    res.status(500).json({ error: "test-db failed", details: err.message });
  }
});

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
// Admin or Dean: total student count (active students)
router.get(
  "/students/count",
  protectRoute,
  (req, res, next) => {
    const role = req.user?.role;
    if (role === "admin" || role === "dean") return next();
    return res.status(403).json({ error: "Access denied" });
  },
  getStudentCount
);
// Admin or Dean: category counts
router.get(
  "/categories",
  protectRoute,
  (req, res, next) => {
    const role = req.user?.role;
    if (role === "admin" || role === "dean") return next();
    return res.status(403).json({ error: "Access denied" });
  },
  getCategoryCounts
);
// Staff-only stat endpoints
router.get("/staffs", protectRoute, staffOnly, getStaffStats);
// User stat endpoint
router.get("/user", protectRoute, getUserStats);

export default router;
