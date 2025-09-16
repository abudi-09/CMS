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
  getPublicHomepageStats,
  getAdminCalendarSummary,
  getAdminCalendarDay,
  getAdminCalendarMonth,
  getAdminAnalyticsSummary,
  getDeanCalendarMonth,
  getDeanCalendarDay,
  getDeanCalendarSummary,
  getHodCalendarSummary,
  getHodCalendarDay,
  // HoD analytics
  getDepartmentPriorityDistribution,
  getDepartmentStatusDistribution,
  getDepartmentCategoryCounts,
  getDepartmentMonthlyTrends,
  getDepartmentStaffPerformance,
  // New Analytics APIs
  // getDeanCalendarSummary,
  // getDeanCalendarDay,
  // getStaffCalendarSummary,
  // getStaffCalendarDay,
  // getHodCalendarSummary,
  // getHodCalendarDay,
  getAdminPriorityDistribution,
  getAdminStatusDistribution,
  getAdminMonthlyTrends,
  getAdminDepartmentPerformance,
  // Dean analytics (implemented subset; remove non-existent to avoid import errors)
  getDeanAnalyticsSummary,
  getDeanDepartmentOverview,
  getDeanAnalyticsMonthlyTrends,
  getDeanDepartmentPerformance,
  getDeanChartCategoryDistribution,
  getDeanChartPriorityDistribution,
  getDeanChartStatusDistribution,
  getDeanDepartmentComplaints,
  // HoD analytics placeholders removed until implemented:
  // getHodAnalyticsSummary,
  // getHodStaffOverview,
  // getHodAnalyticsMonthlyTrends,
  getUniversityStatistics,
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

router.get(
  "/complaints/calendar/dean-summary",
  protectRoute,
  deanOnly,
  getDeanCalendarSummary
);

// Public stats for landing page (no auth, aggregate-only, no PII)
router.get("/public/home", getPublicHomepageStats);
router.get(
  "/complaints/calendar/dean-day",
  protectRoute,
  deanOnly,
  getDeanCalendarDay
);
router.get(
  "/complaints/calendar/dean-month",
  protectRoute,
  deanOnly,
  getDeanCalendarMonth
);

// HOD calendar summary/day
router.get(
  "/complaints/calendar/hod-summary",
  protectRoute,
  hodOnly,
  getHodCalendarSummary
);
router.get(
  "/complaints/calendar/hod-day",
  protectRoute,
  hodOnly,
  getHodCalendarDay
);

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
// HoD: department distributions & analytics
router.get(
  "/complaints/department/priority-distribution",
  protectRoute,
  hodOnly,
  getDepartmentPriorityDistribution
);
router.get(
  "/complaints/department/status-distribution",
  protectRoute,
  hodOnly,
  getDepartmentStatusDistribution
);
router.get(
  "/complaints/department/category-distribution",
  protectRoute,
  hodOnly,
  getDepartmentCategoryCounts
);
router.get(
  "/complaints/department/monthly-trends",
  protectRoute,
  hodOnly,
  getDepartmentMonthlyTrends
);
router.get(
  "/complaints/department/staff-performance",
  protectRoute,
  hodOnly,
  getDepartmentStaffPerformance
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

// Admin calendar summary (direct-to-admin-by-student, admin-assigned)
router.get(
  "/complaints/calendar/admin-summary",
  protectRoute,
  adminOnly,
  getAdminCalendarSummary
);

// Admin calendar day items
router.get(
  "/complaints/calendar/admin-day",
  protectRoute,
  adminOnly,
  getAdminCalendarDay
);

router.get(
  "/complaints/calendar/admin-month",
  protectRoute,
  adminOnly,
  getAdminCalendarMonth
);

// ========================= New Analytics Routes =========================

// Admin Analytics Routes
router.get(
  "/analytics/admin/summary",
  protectRoute,
  adminOnly,
  getAdminAnalyticsSummary
);

router.get(
  "/analytics/admin/priority-distribution",
  protectRoute,
  adminOnly,
  getAdminPriorityDistribution
);

router.get(
  "/analytics/admin/status-distribution",
  protectRoute,
  adminOnly,
  getAdminStatusDistribution
);

router.get(
  "/analytics/admin/monthly-trends",
  protectRoute,
  adminOnly,
  getAdminMonthlyTrends
);

router.get(
  "/analytics/admin/department-performance",
  protectRoute,
  adminOnly,
  getAdminDepartmentPerformance
);

// Dean Analytics Routes
router.get("/analytics/dean/summary", getDeanAnalyticsSummary);
router.get("/analytics/dean/department-overview", getDeanDepartmentOverview);

router.get("/analytics/dean/monthly-trends", getDeanAnalyticsMonthlyTrends);

router.get(
  "/analytics/dean/department-performance",
  getDeanDepartmentPerformance
);

router.get("/analytics/dean/charts/category", getDeanChartCategoryDistribution);

router.get("/analytics/dean/charts/priority", getDeanChartPriorityDistribution);

router.get("/analytics/dean/charts/status", getDeanChartStatusDistribution);
router.get(
  "/analytics/dean/department-complaints",
  getDeanDepartmentComplaints
);

// HoD Analytics Routes
// HoD analytics endpoints temporarily disabled until controller implementations are present
// router.get(
//   "/analytics/hod/summary",
//   protectRoute,
//   hodOnly,
//   getHodAnalyticsSummary
// );
//router.get(
//   "/analytics/hod/staff-overview",
//   protectRoute,
//   hodOnly,
//   getHodStaffOverview
// );
// router.get(
//   "/analytics/hod/monthly-trends",
//   protectRoute,
//   hodOnly,
//   getHodAnalyticsMonthlyTrends
// );

// University Statistics for About Page (Public route)
router.get("/university-statistics", getUniversityStatistics);

export default router;
