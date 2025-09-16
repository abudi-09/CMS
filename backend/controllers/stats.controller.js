import mongoose from "mongoose";
import Complaint from "../models/complaint.model.js";
import User from "../models/user.model.js";
// Added missing ActivityLog import (was causing ReferenceError -> 500 responses for dean calendar endpoints)
import ActivityLog from "../models/activityLog.model.js";
import { buildHodScopeFilter } from "../utils/hodFiltering.js";

import Notification from "../models/notification.model.js";
import fs from "fs";
import path from "path";

// Small helpers to provide color hints for priority/status distribution
function getPriorityColor(priority) {
  if (!priority) return "#8884d8";
  const p = String(priority).toLowerCase();
  if (p === "critical") return "#ef4444";
  if (p === "high") return "#f97316";
  if (p === "medium") return "#eab308";
  if (p === "low") return "#22c55e";
  return "#8884d8";
}

function getStatusColor(status) {
  if (!status) return "#82ca9d";
  const s = String(status).toLowerCase();
  if (s === "pending") return "#f59e0b"; // amber
  if (s === "in progress" || s === "in-progress") return "#3b82f6"; // blue
  if (s === "resolved") return "#10b981"; // green
  if (s === "rejected") return "#ef4444"; // red
  return "#94a3b8"; // gray
}

// Complaints Stats //  admin
export const getComplaintStats = async (req, res) => {
  try {
    const [total, pending, inProgress, resolved, unassigned] =
      await Promise.all([
        Complaint.countDocuments({ isDeleted: { $ne: true } }),
        Complaint.countDocuments({
          status: "Pending",
          isDeleted: { $ne: true },
        }),
        Complaint.countDocuments({
          status: "In Progress",
          isDeleted: { $ne: true },
        }),
        Complaint.countDocuments({
          status: "Resolved",
          isDeleted: { $ne: true },
        }),
        Complaint.countDocuments({
          assignedTo: null,
          isDeleted: { $ne: true },
        }),
      ]);

    res.status(200).json({ total, pending, inProgress, resolved, unassigned });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch complaint stats" });
  }
};

// Category counts across all complaints (admin)
export const getCategoryCounts = async (req, res) => {
  try {
    const results = await Complaint.aggregate([
      {
        $match: {
          $or: [{ isDeleted: { $exists: false } }, { isDeleted: false }],
        },
      },
      {
        $group: {
          _id: {
            $cond: [{ $ifNull: ["$category", false] }, "$category", "Unknown"],
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const total = results.reduce((acc, r) => acc + (r.count || 0), 0);
    const categories = results.map((r) => ({
      category: r._id,
      count: r.count,
    }));
    res.status(200).json({ total, categories });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch category counts" });
  }
};

// Department-scoped complaint stats (for HoD)
export const getDepartmentComplaintStats = async (req, res) => {
  try {
    // Ensure only HoD may access this endpoint and derive department from session
    const user = req.user;
    if (!user || String(user.role).toLowerCase() !== "hod") {
      return res.status(403).json({ error: "Access denied" });
    }

    // Build base HoD-scoped filter using centralized helper
    const staffInDept = await User.find({
      role: "staff",
      department: new RegExp(
        `^${String(user.department).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        "i"
      ),
    })
      .select("_id")
      .lean();
    const staffIds = staffInDept.map((u) => u._id);
    // Base HoD scope (department, excludes admin/dean-only unless internally assigned)
    const base = buildHodScopeFilter(user, { staffIds });
    // Managed-only: handled by this HoD OR this HoD assigned to staff in department
    const managedOnly = {
      ...base,
      $and: [
        ...(base.$and || []),
        {
          $or: [
            { assignedTo: user._id },
            {
              $and: [
                { assignedTo: { $in: staffIds } },
                { assignedBy: user._id },
              ],
            },
          ],
        },
      ],
    };

    const inProgressSet = ["Assigned", "In Progress", "Under Review"];

    const [total, pending, inProgress, resolved, unassigned] =
      await Promise.all([
        Complaint.countDocuments(base),
        Complaint.countDocuments({ ...base, status: "Pending" }),
        Complaint.countDocuments({ ...base, status: { $in: inProgressSet } }),
        Complaint.countDocuments({ ...base, status: "Resolved" }),
        Complaint.countDocuments({ ...base, assignedTo: null }),
      ]);

    return res
      .status(200)
      .json({ total, pending, inProgress, resolved, unassigned });
  } catch (err) {
    console.error("getDepartmentComplaintStats error:", err?.message || err);
    return res.status(500).json({
      error: "Failed to fetch department stats",
      details: err?.message,
    });
  }
};

// Feedback Stats //
export const getFeedbackStats = async (req, res) => {
  try {
    const complaints = await Complaint.find({
      "feedback.comment": { $exists: true },
    });
    const total = complaints.length;
    const averageRating =
      complaints.reduce((sum, c) => sum + (c.feedback?.rating || 0), 0) /
      (total || 1);
    const positive = complaints.filter((c) => c.feedback.rating >= 4).length;
    const satisfactionRate = Math.round((positive / (total || 1)) * 100);

    res.status(200).json({
      total,
      averageRating: averageRating.toFixed(2),
      positive,
      satisfactionRate,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch feedback stats" });
  }
};

// Staff Stats
export const getStaffmanagmentStats = async (req, res) => {
  try {
    const [total, approved, pending] = await Promise.all([
      User.countDocuments({ role: "staff" }),
      User.countDocuments({ role: "staff", isApproved: true }),
      User.countDocuments({ role: "staff", isApproved: false }),
    ]);
    const rejected = total - approved - pending;

    res.status(200).json({ total, approved, pending, rejected });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch staff stats" });
  }
};

// STAFF STATS
export const getStaffStats = async (req, res) => {
  try {
    const staffId = req.user._id; // Get the staff ID from the authenticated user

    const [assigned, pending, inProgress, resolved] = await Promise.all([
      Complaint.countDocuments({
        assignedTo: staffId,
        isDeleted: { $ne: true },
      }),
      Complaint.countDocuments({
        assignedTo: staffId,
        status: "Pending",
        isDeleted: { $ne: true },
      }),
      Complaint.countDocuments({
        assignedTo: staffId,
        status: "In Progress",
        isDeleted: { $ne: true },
      }),
      Complaint.countDocuments({
        assignedTo: staffId,
        status: "Resolved",
        isDeleted: { $ne: true },
      }),
    ]);

    res.status(200).json({ assigned, pending, inProgress, resolved });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch staff stats" });
  }
};

// USER STATS
export const getUserStats = async (req, res) => {
  try {
    const userId = req.user._id; // Get the user ID from the authenticated user

    const [total, pending, inProgress, resolved, closed] = await Promise.all([
      Complaint.countDocuments({
        submittedBy: userId,
        isDeleted: { $ne: true },
      }),
      Complaint.countDocuments({
        submittedBy: userId,
        status: "Pending",
        isDeleted: { $ne: true },
      }),
      Complaint.countDocuments({
        submittedBy: userId,
        status: "In Progress",
        isDeleted: { $ne: true },
      }),
      Complaint.countDocuments({
        submittedBy: userId,
        status: "Resolved",
        isDeleted: { $ne: true },
      }),
      Complaint.countDocuments({
        submittedBy: userId,
        status: "Closed",
        isDeleted: { $ne: true },
      }),
    ]);

    res.status(200).json({
      totalSubmitted: total,
      pending,
      inProgress,
      resolved,
      closed,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user stats" });
  }
};

// ========================= HoD Department Analytics =========================

// Derive HoD's department from authenticated user or query fallback
function getHodDepartment(req) {
  const user = req.user;
  const role = user && String(user.role || "").toLowerCase();
  if (role !== "hod") return { error: "Access denied", status: 403 };
  const deptFromUser = user.department && String(user.department).trim();
  const deptFromQuery =
    typeof req.query.department === "string" && req.query.department.trim()
      ? req.query.department.trim()
      : null;
  const department = deptFromUser || deptFromQuery || null;
  if (!department)
    return { error: "Department is required for HoD analytics", status: 400 };
  return { department, status: 200 };
}

// /complaints/department/priority-distribution (HoD)
export const getDepartmentPriorityDistribution = async (req, res) => {
  const { department, error, status } = getHodDepartment(req);
  if (error) return res.status(status || 400).json({ error });
  try {
    // Use the same HoD base scope as summary stats
    const user = req.user;
    const staffInDept = await User.find({
      role: "staff",
      department: new RegExp(
        `^${String(user.department).replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}$`,
        "i"
      ),
    })
      .select("_id")
      .lean();
    const staffIds = staffInDept.map((u) => u._id);
    const base = buildHodScopeFilter(user, { staffIds });

    const results = await Complaint.aggregate([
      {
        $match: base,
      },
      {
        $group: {
          _id: {
            $cond: [{ $ifNull: ["$priority", false] }, "$priority", "Unknown"],
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const priorities = results.map((r) => ({
      priority: r._id,
      count: r.count,
      color: getPriorityColor(r._id),
    }));

    return res.status(200).json({ department, priorities });
  } catch (err) {
    console.error(
      "getDepartmentPriorityDistribution error:",
      err?.message || err
    );
    return res
      .status(500)
      .json({ error: "Failed to fetch priority distribution" });
  }
};

// /complaints/department/status-distribution (HoD)
export const getDepartmentStatusDistribution = async (req, res) => {
  const { department, error, status } = getHodDepartment(req);
  if (error) return res.status(status || 400).json({ error });
  try {
    // Use the same HoD base scope as summary stats
    const user = req.user;
    const staffInDept = await User.find({
      role: "staff",
      department: new RegExp(
        `^${String(user.department).replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}$`,
        "i"
      ),
    })
      .select("_id")
      .lean();
    const staffIds = staffInDept.map((u) => u._id);
    const base = buildHodScopeFilter(user, { staffIds });

    const results = await Complaint.aggregate([
      {
        $match: base,
      },
      {
        $group: {
          _id: { $ifNull: ["$status", "Unknown"] },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const statuses = results.map((r) => ({
      status: r._id,
      count: r.count,
      color: getStatusColor(r._id),
    }));

    return res.status(200).json({ department, statuses });
  } catch (err) {
    console.error(
      "getDepartmentStatusDistribution error:",
      err?.message || err
    );
    return res
      .status(500)
      .json({ error: "Failed to fetch status distribution" });
  }
};

// /complaints/department/category-distribution (HoD)
export const getDepartmentCategoryCounts = async (req, res) => {
  const { department, error, status } = getHodDepartment(req);
  if (error) return res.status(status || 400).json({ error });
  try {
    // Use the same HoD base scope as summary stats
    const user = req.user;
    const staffInDept = await User.find({
      role: "staff",
      department: new RegExp(
        `^${String(user.department).replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}$`,
        "i"
      ),
    })
      .select("_id")
      .lean();
    const staffIds = staffInDept.map((u) => u._id);
    const base = buildHodScopeFilter(user, { staffIds });

    const results = await Complaint.aggregate([
      {
        $match: base,
      },
      {
        $group: {
          _id: {
            $cond: [{ $ifNull: ["$category", false] }, "$category", "Unknown"],
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const total = results.reduce((acc, r) => acc + (r.count || 0), 0);
    const categories = results.map((r) => ({
      category: r._id,
      count: r.count,
    }));
    return res.status(200).json({ department, total, categories });
  } catch (err) {
    console.error("getDepartmentCategoryCounts error:", err?.message || err);
    return res
      .status(500)
      .json({ error: "Failed to fetch category distribution" });
  }
};

// /complaints/department/monthly-trends (HoD)
export const getDepartmentMonthlyTrends = async (req, res) => {
  const { department, error, status } = getHodDepartment(req);
  if (error) return res.status(status || 400).json({ error });
  try {
    const months = Math.max(1, Math.min(24, Number(req.query.months) || 6));
    const end = new Date();
    const start = new Date(end);
    start.setMonth(start.getMonth() - (months - 1));
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    // Use the same HoD base scope as summary stats
    const user = req.user;
    const staffInDept = await User.find({
      role: "staff",
      department: new RegExp(
        `^${String(user.department).replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}$`,
        "i"
      ),
    })
      .select("_id")
      .lean();
    const staffIds = staffInDept.map((u) => u._id);
    const matchBase = buildHodScopeFilter(user, { staffIds });

    const submittedAgg = await Complaint.aggregate([
      { $match: { ...matchBase, createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" } },
          submitted: { $sum: 1 },
        },
      },
      { $sort: { "_id.y": 1, "_id.m": 1 } },
    ]);

    const resolvedAgg = await Complaint.aggregate([
      {
        $match: {
          ...matchBase,
          status: "Resolved",
          resolvedAt: { $ne: null, $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: { y: { $year: "$resolvedAt" }, m: { $month: "$resolvedAt" } },
          resolved: { $sum: 1 },
        },
      },
      { $sort: { "_id.y": 1, "_id.m": 1 } },
    ]);

    // Build contiguous months array
    const data = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth() + 1;
      const key = `${y}-${m}`;
      const sub = submittedAgg.find((r) => r._id.y === y && r._id.m === m);
      const reso = resolvedAgg.find((r) => r._id.y === y && r._id.m === m);
      data.push({
        month: new Date(y, m - 1, 1).toLocaleString("en", { month: "short" }),
        year: y,
        submitted: sub ? sub.submitted : 0,
        resolved: reso ? reso.resolved : 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return res.status(200).json({ department, range: { start, end }, data });
  } catch (err) {
    console.error("getDepartmentMonthlyTrends error:", err?.message || err);
    return res.status(500).json({ error: "Failed to fetch monthly trends" });
  }
};

// /complaints/department/staff-performance (HoD)
export const getDepartmentStaffPerformance = async (req, res) => {
  const { department, error, status } = getHodDepartment(req);
  if (error) return res.status(status || 400).json({ error });
  try {
    // 1) Fetch ONLY APPROVED staff in this department (exclude other roles/departments)
    const staffUsers = await User.find({
      role: "staff",
      department,
      isApproved: true,
    })
      .select("_id name email department role")
      .lean();
    const staffIds = staffUsers.map((u) => u._id);

    // 2) Aggregate ONLY their complaints within HoD base scope (align with summary)
    const base = buildHodScopeFilter(req.user, { staffIds });
    const agg = await Complaint.aggregate([
      {
        $match: { ...base, assignedTo: { $in: staffIds } },
      },
      {
        $group: {
          _id: "$assignedTo",
          totalComplaints: { $sum: 1 },
          resolvedComplaints: {
            $sum: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] },
          },
          pendingComplaints: {
            $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] },
          },
          inProgress: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$status",
                    ["Accepted", "Assigned", "In Progress", "Under Review"],
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const aggMap = new Map(agg.map((a) => [String(a._id), a]));

    // 3) Build rows for every staff user, including zeros for no-complaint staff
    const rows = staffUsers.map((u) => {
      const a = aggMap.get(String(u._id));
      const total = a?.totalComplaints || 0;
      const resolved = a?.resolvedComplaints || 0;
      const pending = a?.pendingComplaints || 0;
      const inProgress = a?.inProgress || 0;
      const successRate = total ? (resolved / total) * 100 : 0;
      return {
        staffId: u._id,
        staffName: u.name || u.email || "Unknown",
        department,
        totalComplaints: total,
        resolvedComplaints: resolved,
        pendingComplaints: pending,
        inProgress,
        successRate: Number(successRate.toFixed(1)),
      };
    });

    // Sort by totalComplaints desc by default
    rows.sort((a, b) => (b.totalComplaints || 0) - (a.totalComplaints || 0));

    return res.status(200).json({ department, rows, count: rows.length });
  } catch (err) {
    console.error("getDepartmentStaffPerformance error:", err?.message || err);
    return res.status(500).json({ error: "Failed to fetch staff performance" });
  }
};

// ROLE COUNTS (Admin): total number of deans, department heads, students, staff that have access
export const getRoleCounts = async (req, res) => {
  try {
    const [deans, departmentHeads, students, staff] = await Promise.all([
      // Active deans
      User.countDocuments({ role: "dean", isActive: true }),
      // Active heads of department
      User.countDocuments({ role: "hod", isActive: true }),
      // Active students
      User.countDocuments({ role: "student", isActive: true }),
      // Staff with access: approved, active, not rejected
      User.countDocuments({
        role: "staff",
        isApproved: true,
        isActive: true,
        isRejected: { $ne: true },
      }),
    ]);

    res.status(200).json({ deans, departmentHeads, students, staff });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch role counts" });
  }
};

export const getStudentCount = async (req, res) => {
  try {
    const students = await User.countDocuments({
      role: "student",
      isActive: true,
    });
    res.status(200).json({ students });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch student count" });
  }
};

// Public, non-sensitive homepage stats for landing page
// Returns aggregate numbers only — no PII and no auth required.
export const getPublicHomepageStats = async (req, res) => {
  try {
    // 1) Resolved complaints count
    const resolvedCountPromise = Complaint.countDocuments({
      status: "Resolved",
      isDeleted: { $ne: true },
    });

    // 2) Average response time (hours) from createdAt -> resolvedAt for resolved complaints
    const avgResponseAggPromise = Complaint.aggregate([
      {
        $match: {
          status: "Resolved",
          isDeleted: { $ne: true },
          createdAt: { $ne: null },
          resolvedAt: { $ne: null },
        },
      },
      {
        $project: {
          diffHours: {
            $divide: [
              { $subtract: ["$resolvedAt", "$createdAt"] },
              1000 * 60 * 60,
            ],
          },
        },
      },
      { $group: { _id: null, avgHours: { $avg: "$diffHours" } } },
    ]);

    // 3) Average satisfaction rating (0-5) from embedded feedback.rating
    const avgRatingAggPromise = Complaint.aggregate([
      {
        $match: {
          isDeleted: { $ne: true },
          "feedback.rating": { $gte: 0 },
        },
      },
      {
        $group: {
          _id: null,
          avg: { $avg: "$feedback.rating" },
          count: { $sum: 1 },
        },
      },
    ]);

    // 4) Active users: all roles that can access the system
    const activeStudentsPromise = User.countDocuments({
      role: "student",
      isActive: true,
    });
    const activeStaffPromise = User.countDocuments({
      role: "staff",
      isApproved: true,
      isActive: true,
      isRejected: { $ne: true },
    });
    const activeDeansPromise = User.countDocuments({
      role: "dean",
      isActive: true,
    });
    const activeHodsPromise = User.countDocuments({
      role: "hod",
      isActive: true,
    });
    const activeAdminsPromise = User.countDocuments({
      role: "admin",
      isActive: true,
    });

    const [
      resolvedCount,
      avgResponseAgg,
      avgRatingAgg,
      activeStudents,
      activeStaff,
      activeDeans,
      activeHods,
      activeAdmins,
    ] = await Promise.all([
      resolvedCountPromise,
      avgResponseAggPromise,
      avgRatingAggPromise,
      activeStudentsPromise,
      activeStaffPromise,
      activeDeansPromise,
      activeHodsPromise,
      activeAdminsPromise,
    ]);

    const averageResponseHoursRaw =
      Array.isArray(avgResponseAgg) && avgResponseAgg.length
        ? avgResponseAgg[0].avgHours
        : null;
    const averageRatingRaw =
      Array.isArray(avgRatingAgg) && avgRatingAgg.length
        ? avgRatingAgg[0].avg
        : null;

    const activeUsersTotal =
      (activeStudents || 0) +
      (activeStaff || 0) +
      (activeDeans || 0) +
      (activeHods || 0) +
      (activeAdmins || 0);

    const payload = {
      totalResolved: resolvedCount || 0,
      averageResponseHours:
        typeof averageResponseHoursRaw === "number" &&
        isFinite(averageResponseHoursRaw)
          ? Number(averageResponseHoursRaw)
          : null,
      averageRating:
        typeof averageRatingRaw === "number" && isFinite(averageRatingRaw)
          ? Number(averageRatingRaw)
          : null,
      // Legacy field for compatibility with existing clients
      activeStudentsAndStaff: (activeStudents || 0) + (activeStaff || 0),
      // New field: all users that can access the system
      activeUsers: activeUsersTotal,
    };

    return res.status(200).json(payload);
  } catch (err) {
    console.error("getPublicHomepageStats error:", err?.message || err);
    // Fail-open for homepage UX: return zeros with degraded flag so frontend can still render
    return res.status(200).json({
      totalResolved: 0,
      averageResponseHours: null,
      averageRating: null,
      activeStudentsAndStaff: 0,
      activeUsers: 0,
      degraded: true,
      error: "stats-degraded",
    });
  }
};

// Dean-visible complaint stats: exclude complaints that were sent to Admin or escalated
export const getDeanVisibleComplaintStats = async (req, res) => {
  try {
    if (!req.user || String(req.user.role).toLowerCase() !== "dean") {
      return res.status(403).json({ error: "Access denied" });
    }
    const deanId = req.user._id;
    // Strict dean scope
    const base = {
      isDeleted: { $ne: true },
      isEscalated: { $ne: true },
      $or: [
        { recipientRole: "dean", recipientId: deanId },
        { assignedBy: deanId },
      ],
    };
    const [total, pending, inProgressAcceptedAssigned, resolved, unassigned] =
      await Promise.all([
        Complaint.countDocuments(base),
        Complaint.countDocuments({ ...base, status: "Pending" }),
        Complaint.countDocuments({
          ...base,
          status: { $in: ["Accepted", "Assigned", "In Progress"] },
        }),
        Complaint.countDocuments({ ...base, status: "Resolved" }),
        Complaint.countDocuments({ ...base, assignedTo: null }),
      ]);
    return res.status(200).json({
      total,
      pending,
      inProgress: inProgressAcceptedAssigned,
      resolved,
      unassigned,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to fetch dean-visible stats" });
  }
};

// Admin calendar summary: STRICT per-admin scoping (only complaints where admin is recipient or assignee)
export const getAdminCalendarSummary = async (req, res) => {
  try {
    const user = req.user;
    if (!user || String(user.role).toLowerCase() !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    // Accept optional assignedTo param but ignore unless it's this admin
    const assignedToQuery = req.query.assignedTo;
    const requestedAssignedTo =
      assignedToQuery &&
      typeof assignedToQuery === "string" &&
      assignedToQuery.match(/^[0-9a-fA-F]{24}$/)
        ? new mongoose.Types.ObjectId(assignedToQuery)
        : null;
    const adminId = new mongoose.Types.ObjectId(user._id);
    const assignedFilter =
      requestedAssignedTo && String(requestedAssignedTo) === String(adminId)
        ? adminId
        : adminId; // always restrict to current admin

    // Debug: log admin scoping and filters
    console.log("getAdminCalendarSummary: adminId=", String(adminId));
    console.log(
      "getAdminCalendarSummary: requestedAssignedTo=",
      String(requestedAssignedTo)
    );

    const status = req.query.status || null;
    const priority = req.query.priority || null;
    const categoriesParam = req.query.categories;
    const categories = Array.isArray(categoriesParam)
      ? categoriesParam
      : typeof categoriesParam === "string" && categoriesParam.length
      ? categoriesParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const viewType =
      req.query.viewType === "deadline" ? "deadline" : "submission";
    const month = parseInt(req.query.month, 10);
    const year = parseInt(req.query.year, 10);
    const now = new Date();
    const baseMonth = isNaN(month) ? now.getMonth() : month;
    const baseYear = isNaN(year) ? now.getFullYear() : year;
    const monthStart = new Date(baseYear, baseMonth, 1, 0, 0, 0, 0);
    const monthEnd = new Date(baseYear, baseMonth + 1, 0, 23, 59, 59, 999);

    const submissionFrom = req.query.submissionFrom
      ? new Date(String(req.query.submissionFrom) + "T00:00:00.000Z")
      : null;
    const submissionTo = req.query.submissionTo
      ? new Date(String(req.query.submissionTo) + "T23:59:59.999Z")
      : null;
    const deadlineFrom = req.query.deadlineFrom
      ? new Date(String(req.query.deadlineFrom) + "T00:00:00.000Z")
      : null;
    const deadlineTo = req.query.deadlineTo
      ? new Date(String(req.query.deadlineTo) + "T23:59:59.999Z")
      : null;

    // STRICT base: admin must be either recipientId or assignedTo (no unassigned admin pool)
    const base = {
      isDeleted: { $ne: true },
      $or: [{ recipientId: assignedFilter }, { assignedTo: assignedFilter }],
    };
    if (status && status !== "all") base.status = status;
    if (priority && priority !== "all") base.priority = priority;
    if (categories && categories.length) base.category = { $in: categories };
    if (submissionFrom || submissionTo) {
      base.createdAt = {};
      if (submissionFrom) base.createdAt.$gte = submissionFrom;
      if (submissionTo) base.createdAt.$lte = submissionTo;
    }
    if (deadlineFrom || deadlineTo) {
      base.deadline = {};
      if (deadlineFrom) base.deadline.$gte = deadlineFrom;
      if (deadlineTo) base.deadline.$lte = deadlineTo;
    }

    const summaryDateConstraint =
      viewType === "submission"
        ? {
            $or: [
              {
                createdAt: {
                  ...(base.createdAt || {}),
                  $gte: monthStart,
                  $lte: monthEnd,
                },
              },
              { submittedDate: { $gte: monthStart, $lte: monthEnd } },
            ],
          }
        : {
            deadline: {
              ...(base.deadline || {}),
              $gte: monthStart,
              $lte: monthEnd,
            },
          };

    const monthFilter = { $and: [base, summaryDateConstraint] };

    const [totalThisMonth, overdue, dueToday, resolvedThisMonth] =
      await Promise.all([
        Complaint.countDocuments(monthFilter),
        Complaint.countDocuments({
          ...base,
          deadline: { ...(base.deadline || {}), $lt: new Date() },
          status: { $nin: ["Resolved", "Closed"] },
        }),
        (() => {
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          const end = new Date();
          end.setHours(23, 59, 59, 999);
          return Complaint.countDocuments({
            ...base,
            deadline: { ...(base.deadline || {}), $gte: start, $lte: end },
          });
        })(),
        // Resolved This Month: count by resolution timestamp within the selected month
        Complaint.countDocuments({
          ...base,
          status: "Resolved",
          resolvedAt: { $gte: monthStart, $lte: monthEnd },
        }),
      ]);

    const [byStatusAgg, byPriorityAgg, byCategoryAgg] = await Promise.all([
      Complaint.aggregate([
        { $match: monthFilter },
        {
          $group: {
            _id: { $ifNull: ["$status", "Unknown"] },
            count: { $sum: 1 },
          },
        },
      ]),
      Complaint.aggregate([
        { $match: monthFilter },
        {
          $group: {
            _id: { $ifNull: ["$priority", "Unknown"] },
            count: { $sum: 1 },
          },
        },
      ]),
      Complaint.aggregate([
        { $match: monthFilter },
        {
          $group: {
            _id: { $ifNull: ["$category", "Unknown"] },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const countsByStatus = Object.fromEntries(
      (byStatusAgg || []).map((r) => [r._id, r.count])
    );
    const countsByPriority = Object.fromEntries(
      (byPriorityAgg || []).map((r) => [r._id, r.count])
    );
    const countsByCategory = Object.fromEntries(
      (byCategoryAgg || []).map((r) => [r._id, r.count])
    );

    return res.status(200).json({
      totalThisMonth,
      overdue,
      dueToday,
      resolvedThisMonth,
      countsByStatus,
      countsByPriority,
      countsByCategory,
    });
  } catch (err) {
    console.error("getAdminCalendarSummary error:", err?.message || err);
    return res
      .status(500)
      .json({ error: "Failed to fetch admin calendar summary" });
  }
};

// Admin calendar day list: STRICT per-admin scoping (recipientId or assignedTo = current admin)
export const getAdminCalendarDay = async (req, res) => {
  try {
    const user = req.user;
    if (!user || String(user.role).toLowerCase() !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    const status = req.query.status || null;
    const priority = req.query.priority || null;
    const categoriesParam = req.query.categories;
    const categories = Array.isArray(categoriesParam)
      ? categoriesParam
      : typeof categoriesParam === "string" && categoriesParam.length
      ? categoriesParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const viewType =
      req.query.viewType === "deadline" ? "deadline" : "submission";
    const dateStr = String(req.query.date || "");
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(dateStr)) {
      return res.status(400).json({ error: "Invalid or missing date" });
    }
    const [yStr, mStr, dStr] = dateStr.split("-");
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10) - 1;
    const d = parseInt(dStr, 10);
    const dayStart = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
    const dayEnd = new Date(Date.UTC(y, m, d, 23, 59, 59, 999));

    const adminId = new mongoose.Types.ObjectId(user._id);
    // STRICT per-admin visibility: Only complaints directly submitted to or assigned to this admin.
    // This enforces zero leakage between admin accounts regardless of pool submissions.
    const visibilityOr = [{ recipientId: adminId }, { assignedTo: adminId }];
    const base = {
      isDeleted: { $ne: true },
      $or: visibilityOr,
    };
    if (status && status !== "all") base.status = status;
    if (priority && priority !== "all") base.priority = priority;
    if (categories && categories.length) base.category = { $in: categories };

    const dateFilter =
      viewType === "submission"
        ? {
            $or: [
              { createdAt: { $gte: dayStart, $lte: dayEnd } },
              { submittedDate: { $gte: dayStart, $lte: dayEnd } },
            ],
          }
        : { deadline: { $gte: dayStart, $lte: dayEnd } };

    // Debug: log effective query for day
    console.log("getAdminCalendarDay: adminId=", String(adminId));
    console.log(
      "getAdminCalendarDay: date=",
      dateStr,
      "dayStart=",
      dayStart.toISOString(),
      "dayEnd=",
      dayEnd.toISOString()
    );
    console.log("getAdminCalendarDay: base=", JSON.stringify(base));
    console.log("getAdminCalendarDay: dateFilter=", JSON.stringify(dateFilter));

    const items = await Complaint.find({ $and: [base, dateFilter] })
      .select(
        "title status priority category submittedBy createdAt submittedDate updatedAt lastUpdated deadline isEscalated submittedTo department sourceRole assignedByRole assignmentPath"
      )
      .populate("submittedBy", "name email")
      .sort({ createdAt: -1 })
      .lean();
    // Debug: show which complaints matched and their ownership fields
    try {
      console.log(
        "getAdminCalendarDay: matched items=",
        (items || []).map((it) => ({
          id: String(it._id),
          title: it.title,
          assignedTo: it.assignedTo ? String(it.assignedTo) : null,
          recipientId: it.recipientId ? String(it.recipientId) : null,
        }))
      );
    } catch (e) {
      console.error(
        "getAdminCalendarDay: failed to log items",
        e?.message || e
      );
    }

    return res.status(200).json(items || []);
  } catch (err) {
    console.error("getAdminCalendarDay error:", err?.message || err);
    return res
      .status(500)
      .json({ error: "Failed to fetch admin calendar day complaints" });
  }
};

// Admin calendar month list (all complaints in selected month for this admin)
export const getAdminCalendarMonth = async (req, res) => {
  try {
    const user = req.user;
    if (!user || String(user.role).toLowerCase() !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }
    const viewType =
      req.query.viewType === "deadline" ? "deadline" : "submission";
    const month = parseInt(req.query.month, 10);
    const year = parseInt(req.query.year, 10);
    const now = new Date();
    const baseMonth = isNaN(month) ? now.getMonth() : month;
    const baseYear = isNaN(year) ? now.getFullYear() : year;
    const monthStart = new Date(baseYear, baseMonth, 1, 0, 0, 0, 0);
    const monthEnd = new Date(baseYear, baseMonth + 1, 0, 23, 59, 59, 999);

    const adminId = new mongoose.Types.ObjectId(user._id);
    const status = req.query.status || null;
    const priority = req.query.priority || null;
    const categoriesParam = req.query.categories;
    const categories = Array.isArray(categoriesParam)
      ? categoriesParam
      : typeof categoriesParam === "string" && categoriesParam.length
      ? categoriesParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    // Enforce strict scoping: only complaints where this admin is the direct recipient or assignee.
    const visibilityOr = [{ recipientId: adminId }, { assignedTo: adminId }];
    const base = {
      isDeleted: { $ne: true },
      $or: visibilityOr,
    };
    if (status && status !== "all") base.status = status;
    if (priority && priority !== "all") base.priority = priority;
    if (categories && categories.length) base.category = { $in: categories };

    const monthFilter =
      viewType === "submission"
        ? {
            $or: [
              { createdAt: { $gte: monthStart, $lte: monthEnd } },
              { submittedDate: { $gte: monthStart, $lte: monthEnd } },
            ],
          }
        : { deadline: { $gte: monthStart, $lte: monthEnd } };

    // Debug: log effective query for month
    console.log("getAdminCalendarMonth: adminId=", String(adminId));
    console.log(
      "getAdminCalendarMonth: monthStart=",
      monthStart.toISOString(),
      "monthEnd=",
      monthEnd.toISOString()
    );
    console.log("getAdminCalendarMonth: base=", JSON.stringify(base));
    console.log(
      "getAdminCalendarMonth: monthFilter=",
      JSON.stringify(monthFilter)
    );

    const items = await Complaint.find({ $and: [base, monthFilter] })
      .select(
        "title status priority category submittedBy createdAt submittedDate updatedAt lastUpdated deadline isEscalated submittedTo department sourceRole assignedByRole assignmentPath"
      )
      .populate("submittedBy", "name email")
      .sort({ createdAt: -1 })
      .lean();
    // Debug: show which complaints matched and their ownership fields
    try {
      console.log(
        "getAdminCalendarMonth: matched items=",
        (items || []).map((it) => ({
          id: String(it._id),
          title: it.title,
          assignedTo: it.assignedTo ? String(it.assignedTo) : null,
          recipientId: it.recipientId ? String(it.recipientId) : null,
        }))
      );
    } catch (e) {
      console.error(
        "getAdminCalendarMonth: failed to log items",
        e?.message || e
      );
    }

    return res.status(200).json(items || []);
  } catch (err) {
    console.error("getAdminCalendarMonth error:", err?.message || err);
    return res
      .status(500)
      .json({ error: "Failed to fetch admin calendar month complaints" });
  }
};

// Dean calendar day list (per-dean scoped, by selected day)
export const getDeanCalendarDay = async (req, res) => {
  try {
    const user = req.user;
    if (!user || String(user.role).toLowerCase() !== "dean") {
      return res.status(403).json({ error: "Access denied" });
    }

    const status = req.query.status || null;
    const priority = req.query.priority || null;
    const categoriesParam = req.query.categories;
    const categories = Array.isArray(categoriesParam)
      ? categoriesParam
      : typeof categoriesParam === "string" && categoriesParam.length
      ? categoriesParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const viewType =
      req.query.viewType === "deadline" ? "deadline" : "submission";
    const dateStr = String(req.query.date || "");
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(dateStr)) {
      return res.status(400).json({ error: "Invalid or missing date" });
    }
    const [yStr, mStr, dStr] = dateStr.split("-");
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10) - 1;
    const d = parseInt(dStr, 10);
    const dayStart = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
    const dayEnd = new Date(Date.UTC(y, m, d, 23, 59, 59, 999));

    const deanId = new mongoose.Types.ObjectId(user._id);

    // Identify complaints this dean has assigned (via ActivityLog), and include those in visibility
    const deanAssignedLogs = await ActivityLog.aggregate([
      { $match: { role: "dean", user: deanId, action: { $regex: /assign/i } } },
      { $group: { _id: "$complaint", latest: { $max: "$timestamp" } } },
    ]);
    const deanAssignedIds = deanAssignedLogs.map((r) => r._id);

    // Strict per-dean visibility
    const base = {
      isDeleted: { $ne: true },
      $or: [
        { recipientRole: "dean", recipientId: deanId },
        { _id: { $in: deanAssignedIds } },
        { assignedBy: deanId },
      ],
    };
    if (status && status !== "all") base.status = status;
    if (priority && priority !== "all") base.priority = priority;
    if (categories && categories.length) base.category = { $in: categories };

    const dateFilter =
      viewType === "submission"
        ? {
            $or: [
              { createdAt: { $gte: dayStart, $lte: dayEnd } },
              { submittedDate: { $gte: dayStart, $lte: dayEnd } },
            ],
          }
        : { deadline: { $gte: dayStart, $lte: dayEnd } };

    const items = await Complaint.find({ $and: [base, dateFilter] })
      .select(
        "title status priority category submittedBy createdAt submittedDate updatedAt lastUpdated deadline isEscalated submittedTo department sourceRole assignedByRole assignmentPath assignedTo recipientRole recipientId"
      )
      .populate("submittedBy", "name email")
      .populate("assignedTo", "name role")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(items || []);
  } catch (err) {
    console.error("getDeanCalendarDay error:", err?.message || err);
    return res
      .status(500)
      .json({ error: "Failed to fetch dean calendar day complaints" });
  }
};

// Dean calendar month list (all dean-visible complaints in selected month)
export const getDeanCalendarMonth = async (req, res) => {
  try {
    const user = req.user;
    if (!user || String(user.role).toLowerCase() !== "dean") {
      return res.status(403).json({ error: "Access denied" });
    }
    const viewType =
      req.query.viewType === "deadline" ? "deadline" : "submission";
    const month = parseInt(req.query.month, 10);
    const year = parseInt(req.query.year, 10);
    const now = new Date();
    const baseMonth = isNaN(month) ? now.getMonth() : month;
    const baseYear = isNaN(year) ? now.getFullYear() : year;
    const monthStart = new Date(baseYear, baseMonth, 1, 0, 0, 0, 0);
    const monthEnd = new Date(baseYear, baseMonth + 1, 0, 23, 59, 59, 999);

    const deanId = new mongoose.Types.ObjectId(user._id);
    const status = req.query.status || null;
    const priority = req.query.priority || null;
    const categoriesParam = req.query.categories;
    const categories = Array.isArray(categoriesParam)
      ? categoriesParam
      : typeof categoriesParam === "string" && categoriesParam.length
      ? categoriesParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    // Match direct-to-this-dean or complaints this dean has assigned previously (activity logs)
    const deanAssignedLogs = await ActivityLog.aggregate([
      { $match: { role: "dean", user: deanId, action: { $regex: /assign/i } } },
      { $group: { _id: "$complaint", latest: { $max: "$timestamp" } } },
    ]);
    const deanAssignedIds = deanAssignedLogs.map((r) => r._id);
    // Base dean visibility:
    //  - Direct to this dean (recipientRole/dean + recipientId)
    //  - Any complaint this dean has an assignment ActivityLog for
    //  - Any complaint the dean directly assigned onward (assignedBy = deanId)
    // (The last clause protects visibility even if ActivityLog aggregation misses an entry.)
    const base = {
      isDeleted: { $ne: true },
      $or: [
        { recipientRole: "dean", recipientId: deanId },
        { _id: { $in: deanAssignedIds } },
        { assignedBy: deanId },
      ],
    };
    if (status && status !== "all") base.status = status;
    if (priority && priority !== "all") base.priority = priority;
    if (categories && categories.length) base.category = { $in: categories };

    const monthFilter =
      viewType === "submission"
        ? {
            $or: [
              { createdAt: { $gte: monthStart, $lte: monthEnd } },
              { submittedDate: { $gte: monthStart, $lte: monthEnd } },
            ],
          }
        : { deadline: { $gte: monthStart, $lte: monthEnd } };

    if (process.env.NODE_ENV !== "production") {
      console.log("getDeanCalendarMonth: deanId=", String(deanId));
      console.log(
        "getDeanCalendarMonth: monthStart=",
        monthStart.toISOString(),
        "monthEnd=",
        monthEnd.toISOString()
      );
      console.log("getDeanCalendarMonth: base=", JSON.stringify(base));
      console.log(
        "getDeanCalendarMonth: monthFilter=",
        JSON.stringify(monthFilter)
      );
    }

    const items = await Complaint.find({ $and: [base, monthFilter] })
      .select(
        "title status priority category submittedBy createdAt submittedDate updatedAt lastUpdated deadline isEscalated submittedTo department sourceRole assignedByRole assignmentPath assignedTo recipientRole recipientId"
      )
      .populate("submittedBy", "name email")
      .populate("assignedTo", "name role")
      .sort({ createdAt: -1 })
      .lean();

    if (!items || items.length === 0) {
      // Lightweight debug to help diagnose empty dean calendar (non-production only)
      if (process.env.NODE_ENV !== "production") {
        console.log(
          "getDeanCalendarMonth: NO ITEMS FOUND for dean",
          String(deanId)
        );
      }
    }
    return res.status(200).json(items || []);
  } catch (err) {
    console.error("getDeanCalendarMonth error:", err?.message || err);
    return res
      .status(500)
      .json({ error: "Failed to fetch dean calendar month complaints" });
  }
};

// Dean calendar summary: counts for the logged-in dean, direct-to-dean-by-student complaints only
export const getDeanCalendarSummary = async (req, res) => {
  try {
    const user = req.user;
    if (!user || String(user.role).toLowerCase() !== "dean") {
      return res.status(403).json({ error: "Access denied" });
    }

    // Optional: allow narrowing to a specific assignee when requested.
    // By default, do NOT restrict to assignedTo so deans see all direct-to-dean complaints.
    const assignedToQuery = req.query.assignedTo;
    const assignedTo =
      assignedToQuery &&
      typeof assignedToQuery === "string" &&
      assignedToQuery.match(/^[0-9a-fA-F]{24}$/)
        ? new mongoose.Types.ObjectId(assignedToQuery)
        : null;

    const status = req.query.status || null;
    const priority = req.query.priority || null;
    const categoriesParam = req.query.categories;
    const categories = Array.isArray(categoriesParam)
      ? categoriesParam
      : typeof categoriesParam === "string" && categoriesParam.length
      ? categoriesParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const viewType =
      req.query.viewType === "deadline" ? "deadline" : "submission";
    const month = parseInt(req.query.month, 10); // 0-11
    const year = parseInt(req.query.year, 10);
    const now = new Date();
    const baseMonth = isNaN(month) ? now.getMonth() : month;
    const baseYear = isNaN(year) ? now.getFullYear() : year;
    const monthStart = new Date(baseYear, baseMonth, 1, 0, 0, 0, 0);
    const monthEnd = new Date(baseYear, baseMonth + 1, 0, 23, 59, 59, 999);

    const submissionFrom = req.query.submissionFrom
      ? new Date(String(req.query.submissionFrom) + "T00:00:00.000Z")
      : null;
    const submissionTo = req.query.submissionTo
      ? new Date(String(req.query.submissionTo) + "T23:59:59.999Z")
      : null;
    const deadlineFrom = req.query.deadlineFrom
      ? new Date(String(req.query.deadlineFrom) + "T00:00:00.000Z")
      : null;
    const deadlineTo = req.query.deadlineTo
      ? new Date(String(req.query.deadlineTo) + "T23:59:59.999Z")
      : null;

    // Per-dean private scope (protected calendar):
    //  - Direct to this dean (recipientRole=dean & recipientId=this dean)
    //  - Complaints this dean has ever assigned (activity log)
    //  - Complaints in the dean's department (department filter) so they can monitor departmental flow
    // NOTE: This ensures no cross-dean leakage across departments; if multiple deans share a department
    // and stricter isolation is later desired, remove the department clause.
    // ActivityLog lookup (assign actions by this dean)
    const deanAssignedLogs = await ActivityLog.aggregate([
      {
        $match: { role: "dean", user: user._id, action: { $regex: /assign/i } },
      },
      { $group: { _id: "$complaint", latest: { $max: "$timestamp" } } },
    ]);
    const deanAssignedIds = deanAssignedLogs.map((r) => r._id);
    // Strict per-dean isolation: ONLY direct-to-this-dean OR dean-assigned complaints.
    // Removed department clause to prevent cross-dean leakage.
    const base = {
      isDeleted: { $ne: true },
      $and: [
        {
          $or: [
            { recipientRole: "dean", recipientId: user._id },
            { _id: { $in: deanAssignedIds } },
            { assignedBy: user._id },
          ],
        },
      ],
      ...(assignedTo ? { assignedTo } : {}),
    };
    // Debug logging for parity verification
    if (process.env.NODE_ENV !== "production") {
      console.log("[DeanCalendarSummary] user=", String(user._id));
      console.log(
        "[DeanCalendarSummary] assignedIds=",
        deanAssignedIds.map(String)
      );
      console.log("[DeanCalendarSummary] baseFilter=", JSON.stringify(base));
    }
    if (status && status !== "all") base.status = status;
    if (priority && priority !== "all") base.priority = priority;
    if (categories && categories.length) base.category = { $in: categories };
    const submissionRange = {};
    if (submissionFrom) submissionRange.$gte = submissionFrom;
    if (submissionTo) submissionRange.$lte = submissionTo;
    if (Object.keys(submissionRange).length) base.createdAt = submissionRange;

    const deadlineRange = {};
    if (deadlineFrom) deadlineRange.$gte = deadlineFrom;
    if (deadlineTo) deadlineRange.$lte = deadlineTo;
    if (Object.keys(deadlineRange).length) base.deadline = deadlineRange;

    const monthFilter = {
      ...base,
      ...(viewType === "submission"
        ? {
            $or: [
              {
                createdAt: {
                  ...(base.createdAt || {}),
                  $gte: monthStart,
                  $lte: monthEnd,
                },
              },
              {
                submittedDate: {
                  ...(base.submittedDate || {}),
                  $gte: monthStart,
                  $lte: monthEnd,
                },
              },
            ],
          }
        : {
            deadline: {
              ...(base.deadline || {}),
              $gte: monthStart,
              $lte: monthEnd,
            },
          }),
    };

    const [totalThisMonth, overdue, dueToday, resolvedThisMonth] =
      await Promise.all([
        Complaint.countDocuments(monthFilter),
        Complaint.countDocuments({
          ...base,
          deadline: { ...(base.deadline || {}), $lt: new Date() },
          status: { $nin: ["Resolved", "Closed"] },
        }),
        (() => {
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          const end = new Date();
          end.setHours(23, 59, 59, 999);
          return Complaint.countDocuments({
            ...base,
            deadline: { ...(base.deadline || {}), $gte: start, $lte: end },
          });
        })(),
        Complaint.countDocuments({
          ...base,
          status: "Resolved",
          ...(viewType === "submission"
            ? {
                $or: [
                  {
                    createdAt: {
                      ...(base.createdAt || {}),
                      $gte: monthStart,
                      $lte: monthEnd,
                    },
                  },
                  {
                    submittedDate: {
                      ...(base.submittedDate || {}),
                      $gte: monthStart,
                      $lte: monthEnd,
                    },
                  },
                ],
              }
            : {
                createdAt: {
                  ...(base.createdAt || {}),
                  $gte: monthStart,
                  $lte: monthEnd,
                },
              }),
        }),
      ]);

    const [byStatusAgg, byPriorityAgg, byCategoryAgg] = await Promise.all([
      Complaint.aggregate([
        { $match: monthFilter },
        {
          $group: {
            _id: { $ifNull: ["$status", "Unknown"] },
            count: { $sum: 1 },
          },
        },
      ]),
      Complaint.aggregate([
        { $match: monthFilter },
        {
          $group: {
            _id: { $ifNull: ["$priority", "Unknown"] },
            count: { $sum: 1 },
          },
        },
      ]),
      Complaint.aggregate([
        { $match: monthFilter },
        {
          $group: {
            _id: { $ifNull: ["$category", "Unknown"] },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const countsByStatus = Object.fromEntries(
      (byStatusAgg || []).map((r) => [r._id, r.count])
    );
    const countsByPriority = Object.fromEntries(
      (byPriorityAgg || []).map((r) => [r._id, r.count])
    );
    const countsByCategory = Object.fromEntries(
      (byCategoryAgg || []).map((r) => [r._id, r.count])
    );

    return res.status(200).json({
      totalThisMonth,
      overdue,
      dueToday,
      resolvedThisMonth,
      countsByStatus,
      countsByPriority,
      countsByCategory,
    });
  } catch (err) {
    console.error("getDeanCalendarSummary error:", err?.message || err);
    return res
      .status(500)
      .json({ error: "Failed to fetch dean calendar summary" });
  }
};

// HoD calendar summary: department-scoped for the logged-in HoD
export const getHodCalendarSummary = async (req, res) => {
  try {
    const user = req.user;
    if (!user || String(user.role).toLowerCase() !== "hod") {
      return res.status(403).json({ error: "Access denied" });
    }

    const status = req.query.status || null;
    const priority = req.query.priority || null;
    const categoriesParam = req.query.categories;
    const categories = Array.isArray(categoriesParam)
      ? categoriesParam
      : typeof categoriesParam === "string" && categoriesParam.length
      ? categoriesParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const viewType =
      req.query.viewType === "deadline" ? "deadline" : "submission";
    const month = parseInt(req.query.month, 10); // 0-11
    const year = parseInt(req.query.year, 10);
    const now = new Date();
    const baseMonth = isNaN(month) ? now.getMonth() : month;
    const baseYear = isNaN(year) ? now.getFullYear() : year;
    const monthStart = new Date(baseYear, baseMonth, 1, 0, 0, 0, 0);
    const monthEnd = new Date(baseYear, baseMonth + 1, 0, 23, 59, 59, 999);

    const submissionFrom = req.query.submissionFrom
      ? new Date(String(req.query.submissionFrom) + "T00:00:00.000Z")
      : null;
    const submissionTo = req.query.submissionTo
      ? new Date(String(req.query.submissionTo) + "T23:59:59.999Z")
      : null;
    const deadlineFrom = req.query.deadlineFrom
      ? new Date(String(req.query.deadlineFrom) + "T00:00:00.000Z")
      : null;
    const deadlineTo = req.query.deadlineTo
      ? new Date(String(req.query.deadlineTo) + "T23:59:59.999Z")
      : null;

    // Base filter via centralized helper
    const staffInDept = await User.find({
      role: "staff",
      department: new RegExp(
        `^${String(user.department).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        "i"
      ),
    })
      .select("_id")
      .lean();
    const staffIds = staffInDept.map((u) => u._id);
    // Base HoD scope (department-scoped)
    const base = buildHodScopeFilter(user, { staffIds });
    // Managed-only: handled by this HoD OR assigned by this HoD to staff in department
    const managedOnly = {
      ...base,
      $and: [
        ...(base.$and || []),
        {
          $or: [
            { assignedTo: user._id },
            {
              $and: [
                { assignedTo: { $in: staffIds } },
                { assignedBy: user._id },
              ],
            },
          ],
        },
      ],
    };

    if (status && status !== "all") managedOnly.status = status;
    if (priority && priority !== "all") managedOnly.priority = priority;
    if (categories && categories.length)
      managedOnly.category = { $in: categories };

    const submissionRange = {};
    if (submissionFrom) submissionRange.$gte = submissionFrom;
    if (submissionTo) submissionRange.$lte = submissionTo;
    if (Object.keys(submissionRange).length)
      managedOnly.createdAt = submissionRange;

    const deadlineRange = {};
    if (deadlineFrom) deadlineRange.$gte = deadlineFrom;
    if (deadlineTo) deadlineRange.$lte = deadlineTo;
    if (Object.keys(deadlineRange).length) managedOnly.deadline = deadlineRange;

    const monthFilter = {
      ...managedOnly,
      ...(viewType === "submission"
        ? {
            $or: [
              {
                createdAt: {
                  ...(managedOnly.createdAt || {}),
                  $gte: monthStart,
                  $lte: monthEnd,
                },
              },
              {
                submittedDate: {
                  ...(managedOnly.submittedDate || {}),
                  $gte: monthStart,
                  $lte: monthEnd,
                },
              },
            ],
          }
        : {
            deadline: {
              ...(managedOnly.deadline || {}),
              $gte: monthStart,
              $lte: monthEnd,
            },
          }),
    };

    const [totalThisMonth, overdue, dueToday, resolvedThisMonth] =
      await Promise.all([
        Complaint.countDocuments(monthFilter),
        Complaint.countDocuments({
          ...managedOnly,
          deadline: { ...(managedOnly.deadline || {}), $lt: new Date() },
          status: { $nin: ["Resolved", "Closed"] },
        }),
        (() => {
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          const end = new Date();
          end.setHours(23, 59, 59, 999);
          return Complaint.countDocuments({
            ...managedOnly,
            deadline: {
              ...(managedOnly.deadline || {}),
              $gte: start,
              $lte: end,
            },
          });
        })(),
        Complaint.countDocuments({
          ...managedOnly,
          status: "Resolved",
          ...(viewType === "submission"
            ? {
                $or: [
                  {
                    createdAt: {
                      ...(managedOnly.createdAt || {}),
                      $gte: monthStart,
                      $lte: monthEnd,
                    },
                  },
                  {
                    submittedDate: {
                      ...(managedOnly.submittedDate || {}),
                      $gte: monthStart,
                      $lte: monthEnd,
                    },
                  },
                ],
              }
            : {
                createdAt: {
                  ...(managedOnly.createdAt || {}),
                  $gte: monthStart,
                  $lte: monthEnd,
                },
              }),
        }),
      ]);

    const [byStatusAgg, byPriorityAgg, byCategoryAgg] = await Promise.all([
      Complaint.aggregate([
        { $match: monthFilter },
        {
          $group: {
            _id: { $ifNull: ["$status", "Unknown"] },
            count: { $sum: 1 },
          },
        },
      ]),
      Complaint.aggregate([
        { $match: monthFilter },
        {
          $group: {
            _id: { $ifNull: ["$priority", "Unknown"] },
            count: { $sum: 1 },
          },
        },
      ]),
      Complaint.aggregate([
        { $match: monthFilter },
        {
          $group: {
            _id: { $ifNull: ["$category", "Unknown"] },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const countsByStatus = Object.fromEntries(
      (byStatusAgg || []).map((r) => [r._id, r.count])
    );
    const countsByPriority = Object.fromEntries(
      (byPriorityAgg || []).map((r) => [r._id, r.count])
    );
    const countsByCategory = Object.fromEntries(
      (byCategoryAgg || []).map((r) => [r._id, r.count])
    );

    return res.status(200).json({
      totalThisMonth,
      overdue,
      dueToday,
      resolvedThisMonth,
      countsByStatus,
      countsByPriority,
      countsByCategory,
    });
  } catch (err) {
    console.error("getHodCalendarSummary error:", err?.message || err);
    return res
      .status(500)
      .json({ error: "Failed to fetch HOD calendar summary" });
  }
};

// HoD calendar day list: department-scoped for the logged-in HoD
export const getHodCalendarDay = async (req, res) => {
  try {
    const user = req.user;
    if (!user || String(user.role).toLowerCase() !== "hod") {
      return res.status(403).json({ error: "Access denied" });
    }

    const status = req.query.status || null;
    const priority = req.query.priority || null;
    const categoriesParam = req.query.categories;
    const categories = Array.isArray(categoriesParam)
      ? categoriesParam
      : typeof categoriesParam === "string" && categoriesParam.length
      ? categoriesParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const viewType =
      req.query.viewType === "deadline" ? "deadline" : "submission";
    const dateStr = String(req.query.date || "");
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(dateStr)) {
      return res.status(400).json({ error: "Invalid or missing date" });
    }
    const [yStr, mStr, dStr] = dateStr.split("-");
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10) - 1;
    const d = parseInt(dStr, 10);
    const dayStart = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
    const dayEnd = new Date(Date.UTC(y, m, d, 23, 59, 59, 999));

    // Base filter via centralized helper
    const staffInDept = await User.find({
      role: "staff",
      department: new RegExp(
        `^${String(user.department).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        "i"
      ),
    })
      .select("_id")
      .lean();
    const staffIds = staffInDept.map((u) => u._id);
    const base = buildHodScopeFilter(user, { staffIds });
    // Managed-only for day view as well
    const managedOnly = {
      ...base,
      $and: [
        ...(base.$and || []),
        {
          $or: [
            { assignedTo: user._id },
            {
              $and: [
                { assignedTo: { $in: staffIds } },
                { assignedBy: user._id },
              ],
            },
          ],
        },
      ],
    };
    if (status && status !== "all") managedOnly.status = status;
    if (priority && priority !== "all") managedOnly.priority = priority;
    if (categories && categories.length)
      managedOnly.category = { $in: categories };

    const dateFilter =
      viewType === "submission"
        ? {
            $or: [
              { createdAt: { $gte: dayStart, $lte: dayEnd } },
              { submittedDate: { $gte: dayStart, $lte: dayEnd } },
            ],
          }
        : { deadline: { $gte: dayStart, $lte: dayEnd } };

    const items = await Complaint.find({ $and: [managedOnly, dateFilter] })
      .select(
        "title status priority category submittedBy createdAt submittedDate updatedAt lastUpdated deadline isEscalated submittedTo department sourceRole assignedByRole assignmentPath assignedTo recipientRole recipientId"
      )
      .populate("submittedBy", "name email")
      .populate("assignedTo", "name role")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(items || []);
  } catch (err) {
    console.error("getHodCalendarDay error:", err?.message || err);
    return res
      .status(500)
      .json({ error: "Failed to fetch HOD calendar day complaints" });
  }
};

// Admin Analytics Summary (global across system)
export const getAdminAnalyticsSummary = async (req, res) => {
  try {
    const now = new Date();
    const base = {
      $or: [{ isDeleted: { $exists: false } }, { isDeleted: false }],
    };

    // Core counts
    const [
      totalComplaints,
      resolvedComplaints,
      pendingComplaints,
      inProgressComplaints,
      overdueComplaints,
      unassignedComplaints,
    ] = await Promise.all([
      Complaint.countDocuments(base),
      Complaint.countDocuments({ ...base, status: "Resolved" }),
      Complaint.countDocuments({ ...base, status: "Pending" }),
      Complaint.countDocuments({
        ...base,
        status: {
          $in: ["Accepted", "Assigned", "In Progress", "Under Review"],
        },
      }),
      Complaint.countDocuments({
        ...base,
        deadline: { $lt: now },
        status: { $nin: ["Resolved", "Closed"] },
      }),
      Complaint.countDocuments({ ...base, assignedTo: null }),
    ]);

    // Resolution rate
    const resolutionRate =
      totalComplaints > 0 ? (resolvedComplaints / totalComplaints) * 100 : 0;

    // Average resolution time (days) for resolved complaints
    const avgAgg = await Complaint.aggregate([
      { $match: { ...base, status: "Resolved" } },
      {
        $project: {
          createdAt: 1,
          resolvedAt: { $ifNull: ["$resolvedAt", "$updatedAt"] },
        },
      },
      {
        $project: {
          diffDays: {
            $cond: [
              {
                $and: [
                  { $ne: ["$createdAt", null] },
                  { $ne: ["$resolvedAt", null] },
                ],
              },
              {
                $divide: [
                  { $subtract: ["$resolvedAt", "$createdAt"] },
                  1000 * 60 * 60 * 24,
                ],
              },
              null,
            ],
          },
        },
      },
      { $match: { diffDays: { $ne: null } } },
      {
        $group: {
          _id: null,
          avgDays: { $avg: "$diffDays" },
          count: { $sum: 1 },
        },
      },
    ]);
    const avgResolutionTime =
      Array.isArray(avgAgg) && avgAgg.length
        ? Number(avgAgg[0].avgDays.toFixed(2))
        : null;

    // Satisfaction: average rating and count of reviews (if present)
    const ratingAgg = await Complaint.aggregate([
      { $match: { ...base, "feedback.rating": { $gte: 0 } } },
      {
        $group: {
          _id: null,
          avg: { $avg: "$feedback.rating" },
          reviews: { $sum: 1 },
        },
      },
    ]);
    const userSatisfaction =
      Array.isArray(ratingAgg) && ratingAgg.length
        ? Number(ratingAgg[0].avg.toFixed(1))
        : null;
    const totalReviews =
      Array.isArray(ratingAgg) && ratingAgg.length ? ratingAgg[0].reviews : 0;

    return res.status(200).json({
      totalComplaints,
      pendingComplaints,
      inProgressComplaints,
      resolvedComplaints,
      overdueComplaints,
      unassignedComplaints,
      resolutionRate: Number(resolutionRate.toFixed(1)),
      avgResolutionTime, // days
      userSatisfaction,
      totalReviews,
    });
  } catch (err) {
    console.error("getAdminAnalyticsSummary error:", err?.message || err);
    return res
      .status(500)
      .json({ error: "Failed to fetch admin analytics summary" });
  }
};

// Dean Analytics Summary (cards): global excluding admin-targeted complaints
export const getDeanAnalyticsSummary = async (_req, res) => {
  try {
    const match = buildGlobalMinusAdminMatch();
    const [total, pending, inProgress, resolved, unassigned] =
      await Promise.all([
        Complaint.countDocuments(match),
        Complaint.countDocuments({ ...match, status: "Pending" }),
        Complaint.countDocuments({
          ...match,
          status: { $in: ["Accepted", "Assigned", "In Progress"] },
        }),
        Complaint.countDocuments({ ...match, status: "Resolved" }),
        Complaint.countDocuments({ ...match, assignedTo: null }),
      ]);
    return res
      .status(200)
      .json({ total, pending, inProgress, resolved, unassigned });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to fetch dean analytics summary" });
  }
};

// University Statistics for About Page
export const getUniversityStatistics = async (req, res) => {
  try {
    const foundingYear = 1954;
    const currentYear = new Date().getFullYear();
    const yearsOfExcellence = currentYear - foundingYear;

    const [studentCount, deanCount, hodCount, staffCount] = await Promise.all([
      User.countDocuments({ role: "student", isActive: true }),
      User.countDocuments({ role: "dean", isActive: true }),
      User.countDocuments({ role: "hod", isActive: true }),
      User.countDocuments({
        role: "staff",
        isApproved: true,
        isActive: true,
        isRejected: { $ne: true },
      }),
    ]);

    const statistics = [
      {
        icon: "Users",
        value: `${studentCount.toLocaleString()}+`,
        label: "Students",
      },
      {
        icon: "GraduationCap",
        value: `${deanCount.toLocaleString()}+`,
        label: "Deans",
      },
      {
        icon: "Target",
        value: `${hodCount.toLocaleString()}+`,
        label: "HODs",
      },
      {
        icon: "BookOpen",
        value: `${staffCount.toLocaleString()}+`,
        label: "Staff",
      },
      {
        icon: "Award",
        value: `${yearsOfExcellence}+`,
        label: "Years of Excellence",
      },
    ];

    res.status(200).json({ statistics });
  } catch (err) {
    console.error("getUniversityStatistics error:", err?.message || err);
    res.status(500).json({ error: "Failed to fetch university statistics" });
  }
};

// Admin Monthly Trends (submitted, resolved, pending, avgResolutionTime over recent months)
export const getAdminMonthlyTrends = async (req, res) => {
  try {
    const user = req.user;
    if (!user || String(user.role).toLowerCase() !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }
    const monthsParam = parseInt(req.query.months, 10);
    const months = isNaN(monthsParam) || monthsParam <= 0 ? 6 : monthsParam; // default 6 months
    const now = new Date();
    const start = new Date(
      now.getFullYear(),
      now.getMonth() - (months - 1),
      1,
      0,
      0,
      0,
      0
    );

    // Aggregate submitted/resolved/pending and resolution time
    const agg = await Complaint.aggregate([
      {
        $match: {
          createdAt: { $gte: start },
          $or: [{ isDeleted: { $exists: false } }, { isDeleted: false }],
        },
      },
      {
        $project: {
          createdAt: 1,
          status: 1,
          updatedAt: 1,
          month: { $month: "$createdAt" },
          year: { $year: "$createdAt" },
          resolutionDays: {
            $cond: [
              {
                $and: [
                  { $eq: ["$status", "Resolved"] },
                  { $ne: ["$createdAt", null] },
                  { $ne: ["$updatedAt", null] },
                ],
              },
              {
                $divide: [
                  { $subtract: ["$updatedAt", "$createdAt"] },
                  1000 * 60 * 60 * 24,
                ],
              },
              0,
            ],
          },
          pendingCount: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] },
          resolvedCount: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] },
        },
      },
      {
        $group: {
          _id: { year: "$year", month: "$month" },
          submitted: { $sum: 1 },
          resolved: { $sum: "$resolvedCount" },
          pending: { $sum: "$pendingCount" },
          totalResolutionDays: { $sum: "$resolutionDays" },
          resolvedCount: { $sum: "$resolvedCount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const data = agg.map((r) => {
      const avgResolutionTime =
        r.resolvedCount > 0 ? r.totalResolutionDays / r.resolvedCount : 0;
      return {
        month: monthNames[r._id.month - 1],
        year: r._id.year,
        submitted: r.submitted,
        resolved: r.resolved,
        pending: r.pending,
        avgResolutionTime: Number(avgResolutionTime.toFixed(2)),
      };
    });

    return res.status(200).json({ months: data.length, data });
  } catch (err) {
    console.error("getAdminMonthlyTrends error:", err?.message || err);
    return res
      .status(500)
      .json({ error: "Failed to fetch admin monthly trends" });
  }
};

// Admin Priority Distribution
export const getAdminPriorityDistribution = async (req, res) => {
  try {
    const user = req.user;
    if (!user || String(user.role).toLowerCase() !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }
    const priorityAgg = await Complaint.aggregate([
      {
        $match: {
          $or: [{ isDeleted: { $exists: false } }, { isDeleted: false }],
        },
      },
      {
        $group: {
          _id: { $ifNull: ["$priority", "Unknown"] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);
    const total = priorityAgg.reduce((a, r) => a + (r.count || 0), 0);
    const priorities = priorityAgg.map((r) => ({
      priority: r._id,
      count: r.count,
      percentage: total ? Number(((r.count / total) * 100).toFixed(1)) : 0,
    }));
    return res.status(200).json({ total, priorities });
  } catch (err) {
    console.error("getAdminPriorityDistribution error:", err?.message || err);
    return res
      .status(500)
      .json({ error: "Failed to fetch admin priority distribution" });
  }
};

// Admin Status Distribution
export const getAdminStatusDistribution = async (req, res) => {
  try {
    const user = req.user;
    if (!user || String(user.role).toLowerCase() !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }
    const statusAgg = await Complaint.aggregate([
      {
        $match: {
          $or: [{ isDeleted: { $exists: false } }, { isDeleted: false }],
        },
      },
      {
        $group: {
          _id: { $ifNull: ["$status", "Unknown"] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);
    const total = statusAgg.reduce((a, r) => a + (r.count || 0), 0);
    const statuses = statusAgg.map((r) => ({
      status: r._id,
      count: r.count,
      percentage: total ? Number(((r.count / total) * 100).toFixed(1)) : 0,
    }));
    return res.status(200).json({ total, statuses });
  } catch (err) {
    console.error("getAdminStatusDistribution error:", err?.message || err);
    return res
      .status(500)
      .json({ error: "Failed to fetch admin status distribution" });
  }
};

// Dean Analytics Monthly Trends (submitted, resolved, pending + avgResolutionTime)
export const getDeanAnalyticsMonthlyTrends = async (req, res) => {
  try {
    const monthsParam = parseInt(req.query.months, 10);
    const months = isNaN(monthsParam) || monthsParam <= 0 ? 6 : monthsParam;
    const now = new Date();
    const start = new Date(
      now.getFullYear(),
      now.getMonth() - (months - 1),
      1,
      0,
      0,
      0,
      0
    );

    // Charts dataset: global complaints excluding admin-targeted items
    const chartsMatch = buildGlobalMinusAdminMatch({
      createdAt: { $gte: start },
    });

    const agg = await Complaint.aggregate([
      { $match: chartsMatch },
      {
        $project: {
          createdAt: 1,
          status: 1,
          updatedAt: 1,
          month: { $month: "$createdAt" },
          year: { $year: "$createdAt" },
          resolutionDays: {
            $cond: [
              {
                $and: [
                  { $eq: ["$status", "Resolved"] },
                  { $ne: ["$createdAt", null] },
                  { $ne: ["$updatedAt", null] },
                ],
              },
              {
                $divide: [
                  { $subtract: ["$updatedAt", "$createdAt"] },
                  1000 * 60 * 60 * 24,
                ],
              },
              0,
            ],
          },
          pendingCount: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] },
          resolvedCount: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] },
        },
      },
      {
        $group: {
          _id: { year: "$year", month: "$month" },
          submitted: { $sum: 1 },
          resolved: { $sum: "$resolvedCount" },
          pending: { $sum: "$pendingCount" },
          totalResolutionDays: { $sum: "$resolutionDays" },
          resolvedCount: { $sum: "$resolvedCount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const data = agg.map((r) => {
      const avgResolutionTime =
        r.resolvedCount > 0 ? r.totalResolutionDays / r.resolvedCount : 0;
      return {
        month: monthNames[r._id.month - 1],
        year: r._id.year,
        submitted: r.submitted,
        resolved: r.resolved,
        pending: r.pending,
        avgResolutionTime: Number(avgResolutionTime.toFixed(2)),
      };
    });

    return res.status(200).json({ months: data.length, data });
  } catch (err) {
    console.error("getDeanAnalyticsMonthlyTrends error:", err?.message || err);
    return res
      .status(500)
      .json({ error: "Failed to fetch dean monthly trends" });
  }
};

// Charts: Global dataset excluding only admin-targeted items
function buildGlobalMinusAdminMatch(extra = {}) {
  return {
    ...extra,
    $and: [
      { $or: [{ isDeleted: { $exists: false } }, { isDeleted: false }] },
      {
        $nor: [
          { recipientRole: "admin" },
          { submittedTo: { $regex: /admin/i } },
        ],
      },
    ],
  };
}

export const getDeanChartCategoryDistribution = async (_req, res) => {
  try {
    const match = buildGlobalMinusAdminMatch();
    const agg = await Complaint.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $ifNull: ["$category", "Unknown"] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);
    const total = agg.reduce((a, r) => a + (r.count || 0), 0);
    const categories = agg.map((r) => ({
      category: r._id,
      count: r.count,
      percentage: total ? Number(((r.count / total) * 100).toFixed(1)) : 0,
    }));
    return res.status(200).json({ total, categories });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to fetch dean chart categories" });
  }
};

export const getDeanChartPriorityDistribution = async (_req, res) => {
  try {
    const match = buildGlobalMinusAdminMatch();
    const agg = await Complaint.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $ifNull: ["$priority", "Unknown"] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);
    const total = agg.reduce((a, r) => a + (r.count || 0), 0);
    const priorities = agg.map((r) => ({
      priority: r._id,
      count: r.count,
      percentage: total ? Number(((r.count / total) * 100).toFixed(1)) : 0,
    }));
    return res.status(200).json({ total, priorities });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to fetch dean chart priorities" });
  }
};

export const getDeanChartStatusDistribution = async (_req, res) => {
  try {
    const match = buildGlobalMinusAdminMatch();
    const agg = await Complaint.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $ifNull: ["$status", "Unknown"] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);
    const total = agg.reduce((a, r) => a + (r.count || 0), 0);
    const statuses = agg.map((r) => ({
      status: r._id,
      count: r.count,
      percentage: total ? Number(((r.count / total) * 100).toFixed(1)) : 0,
    }));
    return res.status(200).json({ total, statuses });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to fetch dean chart statuses" });
  }
};

// Admin Department Performance: global department-level aggregation (admin-only)
export const getAdminDepartmentPerformance = async (req, res) => {
  try {
    const user = req.user;
    if (!user || String(user.role).toLowerCase() !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    // Time window: month/year OR from/to, default last 90 days
    const month =
      req.query.month !== undefined ? parseInt(req.query.month, 10) : undefined; // 0-11
    const year =
      req.query.year !== undefined ? parseInt(req.query.year, 10) : undefined;
    const fromStr = req.query.from && String(req.query.from);
    const toStr = req.query.to && String(req.query.to);
    const now = new Date();
    let start, end;
    if (!isNaN(month) && !isNaN(year)) {
      start = new Date(year, month, 1, 0, 0, 0, 0);
      end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    } else if (fromStr || toStr) {
      start = fromStr
        ? new Date(fromStr + "T00:00:00.000Z")
        : new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - 90,
            0,
            0,
            0,
            0
          );
      end = toStr ? new Date(toStr + "T23:59:59.999Z") : now;
    } else {
      start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 90,
        0,
        0,
        0,
        0
      );
      end = now;
    }

    // Optional filters
    const status = req.query.status || null;
    const priority = req.query.priority || null;
    const categoriesParam = req.query.categories;
    const categories = Array.isArray(categoriesParam)
      ? categoriesParam
      : typeof categoriesParam === "string" && categoriesParam.length
      ? categoriesParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    // Apply the SAME exclusion logic as Dean (exclude student->admin complaints) for parity
    const baseExtra = {
      createdAt: { $gte: start, $lte: end },
      ...(status && status !== "all" ? { status } : {}),
      ...(priority && priority !== "all" ? { priority } : {}),
      ...(categories.length ? { category: { $in: categories } } : {}),
    };
    const nowIso = new Date().toISOString();
    const match = buildGlobalMinusAdminMatch(baseExtra);
    const agg = await Complaint.aggregate([
      { $match: match },
      {
        $project: {
          department: { $ifNull: ["$department", "Unknown"] },
          status: { $ifNull: ["$status", "Pending"] },
          deadline: 1,
          createdAt: 1,
          resolvedAt: { $ifNull: ["$resolvedAt", "$updatedAt"] },
          resolutionDays: {
            $cond: [
              {
                $and: [
                  { $eq: ["$status", "Resolved"] },
                  { $ne: ["$createdAt", null] },
                  { $ne: ["$resolvedAt", null] },
                ],
              },
              {
                $divide: [
                  { $subtract: ["$resolvedAt", "$createdAt"] },
                  1000 * 60 * 60 * 24,
                ],
              },
              null,
            ],
          },
        },
      },
      {
        $group: {
          _id: "$department",
          totalComplaints: { $sum: 1 },
          resolvedComplaints: {
            $sum: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] },
          },
          pendingComplaints: {
            $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] },
          },
          inProgress: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$status",
                    ["Accepted", "Assigned", "In Progress", "Under Review"],
                  ],
                },
                1,
                0,
              ],
            },
          },
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$deadline", null] },
                    { $lt: ["$deadline", { $toDate: nowIso }] },
                    { $not: [{ $in: ["$status", ["Resolved", "Closed"]] }] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          totalResolutionDays: {
            $sum: {
              $cond: [{ $ne: ["$resolutionDays", null] }, "$resolutionDays", 0],
            },
          },
          resolvedCount: {
            $sum: { $cond: [{ $ne: ["$resolutionDays", null] }, 1, 0] },
          },
        },
      },
      { $sort: { totalComplaints: -1 } },
    ]);

    // Staff count per department (active, approved staff)
    const staffAgg = await User.aggregate([
      {
        $match: {
          role: "staff",
          isActive: true,
          isApproved: true,
          $or: [
            { isRejected: { $exists: false } },
            { isRejected: { $ne: true } },
          ],
        },
      },
      {
        $group: {
          _id: { $ifNull: ["$department", "Unknown"] },
          count: { $sum: 1 },
        },
      },
    ]);
    const staffCountByDept = new Map(
      (staffAgg || []).map((r) => [String(r._id), Number(r.count || 0)])
    );

    let departments = (agg || []).map((r) => {
      const total = r.totalComplaints || 0;
      const resolved = r.resolvedComplaints || 0;
      const successRate = total
        ? Number(((resolved / total) * 100).toFixed(2))
        : 0;
      const avgResolutionTime =
        r.resolvedCount > 0
          ? Number((r.totalResolutionDays / r.resolvedCount).toFixed(2))
          : 0;
      const deptName = String(r._id);
      return {
        department: deptName,
        totalComplaints: total,
        resolvedComplaints: resolved,
        pendingComplaints: r.pendingComplaints || 0,
        inProgress: r.inProgress || 0,
        overdue: r.overdue || 0,
        staffCount: Number(staffCountByDept.get(deptName) || 0),
        avgResolutionTime,
        successRate,
      };
    });

    // Ensure all departments appear, even if zero in the window
    const primaryFallback = [
      "Computer Science",
      "IT",
      "Information System",
      "Information Science",
    ];
    const distinctUsers = await User.distinct("department", {
      role: { $in: ["student", "staff", "hod", "dean"] },
    });
    const knownDepartments = Array.from(
      new Set(
        [...(distinctUsers || []), ...primaryFallback]
          .map((d) => (d ? String(d).trim() : ""))
          .filter(Boolean)
      )
    );
    const existingNames = new Set(departments.map((d) => d.department));
    for (const name of knownDepartments) {
      if (!existingNames.has(name)) {
        departments.push({
          department: name,
          totalComplaints: 0,
          resolvedComplaints: 0,
          pendingComplaints: 0,
          inProgress: 0,
          overdue: 0,
          staffCount: Number(staffCountByDept.get(name) || 0),
          avgResolutionTime: 0,
          successRate: 0,
        });
      }
    }
    // Optional: keep a consistent order by primary first, then others alphabetically
    departments.sort((a, b) => {
      const ai = primaryFallback.indexOf(a.department);
      const bi = primaryFallback.indexOf(b.department);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.department.localeCompare(b.department);
    });

    const summary = departments.reduce(
      (acc, d) => {
        acc.total += d.totalComplaints;
        acc.resolved += d.resolvedComplaints;
        acc.pending += d.pendingComplaints;
        acc.inProgress += d.inProgress || 0;
        acc.overdue += d.overdue || 0;
        return acc;
      },
      { total: 0, resolved: 0, pending: 0, inProgress: 0, overdue: 0 }
    );

    return res.status(200).json({
      range: { start, end },
      count: departments.length,
      summary,
      departments,
      rows: departments, // backward-compat
    });
  } catch (err) {
    console.error("getAdminDepartmentPerformance error:", err?.message || err);
    return res
      .status(500)
      .json({ error: "Failed to fetch admin department performance" });
  }
};

// Dean Department Complaints: paginated list filtered by department/time/status/priority/categories
export const getDeanDepartmentComplaints = async (req, res) => {
  try {
    // Time window selection (month/year or from/to, default last 90 days)
    const month =
      req.query.month !== undefined ? parseInt(req.query.month, 10) : undefined; // 0-11
    const year =
      req.query.year !== undefined ? parseInt(req.query.year, 10) : undefined;
    const fromStr = req.query.from && String(req.query.from);
    const toStr = req.query.to && String(req.query.to);
    const now = new Date();
    let start, end;
    if (!isNaN(month) && !isNaN(year)) {
      start = new Date(year, month, 1, 0, 0, 0, 0);
      end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    } else if (fromStr || toStr) {
      start = fromStr
        ? new Date(fromStr + "T00:00:00.000Z")
        : new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - 90,
            0,
            0,
            0,
            0
          );
      end = toStr ? new Date(toStr + "T23:59:59.999Z") : now;
    } else {
      start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 90,
        0,
        0,
        0,
        0
      );
      end = now;
    }

    // Filters
    const status =
      typeof req.query.status === "string" ? req.query.status : undefined;
    const priority =
      typeof req.query.priority === "string" ? req.query.priority : undefined;
    const department =
      typeof req.query.department === "string"
        ? req.query.department
        : undefined;
    const categoriesParam = req.query.categories;
    const categories = Array.isArray(categoriesParam)
      ? categoriesParam
      : typeof categoriesParam === "string" && categoriesParam.length
      ? categoriesParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    // Pagination
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const limit = Math.max(
      1,
      Math.min(100, parseInt(String(req.query.limit || "20"), 10) || 20)
    );
    const skip = (page - 1) * limit;

    // Build match with unified admin-targeted exclusion
    const extra = { createdAt: { $gte: start, $lte: end } };
    if (status && status !== "all") extra["status"] = status;
    if (priority && priority !== "all") extra["priority"] = priority;
    if (department && department !== "all") extra["department"] = department;
    if (categories.length) extra["category"] = { $in: categories };
    const match = buildGlobalMinusAdminMatch(extra);

    const [total, docs] = await Promise.all([
      Complaint.countDocuments(match),
      Complaint.find(match)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select({
          title: 1,
          status: 1,
          priority: 1,
          department: 1,
          category: 1,
          createdAt: 1,
          updatedAt: 1,
          deadline: 1,
          complaintCode: 1,
          submittedTo: 1,
          sourceRole: 1,
          recipientRole: 1,
        })
        .lean(),
    ]);

    const items = (docs || []).map((c) => ({
      id: String(c._id),
      complaintCode: c.complaintCode || null,
      title: c.title || "Untitled Complaint",
      status: c.status || "Pending",
      priority: c.priority || "Medium",
      department: c.department || "Unknown",
      category: c.category || "General",
      submittedDate: c.createdAt || null,
      lastUpdated: c.updatedAt || null,
      deadline: c.deadline || null,
      submittedTo: c.submittedTo || null,
      sourceRole: c.sourceRole || null,
      recipientRole: c.recipientRole || null,
    }));

    return res.status(200).json({ items, total, page, pageSize: limit });
  } catch (err) {
    console.error("getDeanDepartmentComplaints error:", err?.message || err);
    return res
      .status(500)
      .json({ error: "Failed to fetch dean department complaints" });
  }
};

// Dean Department Performance: global department-level aggregation
export const getDeanDepartmentPerformance = async (req, res) => {
  try {
    // Time window: prefer month/year, otherwise optional from/to (YYYY-MM-DD), default last 90 days
    const month =
      req.query.month !== undefined ? parseInt(req.query.month, 10) : undefined; // 0-11
    const year =
      req.query.year !== undefined ? parseInt(req.query.year, 10) : undefined;
    const fromStr = req.query.from && String(req.query.from);
    const toStr = req.query.to && String(req.query.to);
    const now = new Date();
    let start, end;
    if (!isNaN(month) && !isNaN(year)) {
      start = new Date(year, month, 1, 0, 0, 0, 0);
      end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    } else if (fromStr || toStr) {
      start = fromStr
        ? new Date(fromStr + "T00:00:00.000Z")
        : new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - 90,
            0,
            0,
            0,
            0
          );
      end = toStr ? new Date(toStr + "T23:59:59.999Z") : now;
    } else {
      start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 90,
        0,
        0,
        0,
        0
      );
      end = now;
    }

    // Optional filters
    const status = req.query.status || null;
    const priority = req.query.priority || null;
    const categoriesParam = req.query.categories;
    const categories = Array.isArray(categoriesParam)
      ? categoriesParam
      : typeof categoriesParam === "string" && categoriesParam.length
      ? categoriesParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    // Global dataset (same for all deans), aggregated by department
    // Exclude only complaints sent to admin by a student
    const baseExtra = {
      createdAt: { $gte: start, $lte: end },
    };
    if (status && status !== "all") baseExtra.status = status;
    if (priority && priority !== "all") baseExtra.priority = priority;
    if (categories && categories.length)
      baseExtra.category = { $in: categories };
    const nowIso = new Date().toISOString();
    const match = buildGlobalMinusAdminMatch(baseExtra);
    const agg = await Complaint.aggregate([
      { $match: match },
      {
        $project: {
          department: { $ifNull: ["$department", "Unknown"] },
          status: { $ifNull: ["$status", "Pending"] },
          deadline: 1,
        },
      },
      {
        $group: {
          _id: "$department",
          totalComplaints: { $sum: 1 },
          resolvedComplaints: {
            $sum: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] },
          },
          pendingComplaints: {
            $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] },
          },
          inProgress: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$status",
                    ["Accepted", "Assigned", "In Progress", "Under Review"],
                  ],
                },
                1,
                0,
              ],
            },
          },
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$deadline", null] },
                    { $lt: ["$deadline", { $toDate: nowIso }] },
                    { $not: [{ $in: ["$status", ["Resolved", "Closed"]] }] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { totalComplaints: -1 } },
    ]);

    // Staff count per department (approved+active staff only)
    const staffAgg = await User.aggregate([
      {
        $match: {
          role: "staff",
          isActive: true,
          isApproved: true,
          $or: [
            { isRejected: { $exists: false } },
            { isRejected: { $ne: true } },
          ],
        },
      },
      {
        $group: {
          _id: { $ifNull: ["$department", "Unknown"] },
          count: { $sum: 1 },
        },
      },
    ]);
    const staffCountByDept = new Map(
      (staffAgg || []).map((r) => [String(r._id), Number(r.count || 0)])
    );

    let departments = (agg || []).map((r) => {
      const total = r.totalComplaints || 0;
      const resolved = r.resolvedComplaints || 0;
      const successRate = total
        ? Number(((resolved / total) * 100).toFixed(2))
        : 0;
      const deptName = String(r._id);
      return {
        department: deptName,
        totalComplaints: total,
        resolvedComplaints: resolved,
        pendingComplaints: r.pendingComplaints || 0,
        inProgress: r.inProgress || 0,
        overdue: r.overdue || 0,
        resolvedHoD: 0,
        resolvedStaff: 0,
        staffCount: Number(staffCountByDept.get(deptName) || 0),
        avgResolutionTime: 0,
        successRate,
      };
    });

    // Ensure all departments appear, even if zero in the window
    const primaryFallback = [
      "Computer Science",
      "IT",
      "Information System",
      "Information Science",
    ];
    const distinctUsers = await User.distinct("department", {
      role: { $in: ["student", "staff", "hod", "dean"] },
    });
    const knownDepartments = Array.from(
      new Set(
        [...(distinctUsers || []), ...primaryFallback]
          .map((d) => (d ? String(d).trim() : ""))
          .filter(Boolean)
      )
    );
    const existingNames = new Set(departments.map((d) => d.department));
    for (const name of knownDepartments) {
      if (!existingNames.has(name)) {
        departments.push({
          department: name,
          totalComplaints: 0,
          resolvedComplaints: 0,
          pendingComplaints: 0,
          inProgress: 0,
          overdue: 0,
          resolvedHoD: 0,
          resolvedStaff: 0,
          staffCount: Number(staffCountByDept.get(name) || 0),
          avgResolutionTime: 0,
          successRate: 0,
        });
      }
    }
    departments.sort((a, b) => {
      const ai = primaryFallback.indexOf(a.department);
      const bi = primaryFallback.indexOf(b.department);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.department.localeCompare(b.department);
    });

    const summary = departments.reduce(
      (acc, d) => {
        acc.total += d.totalComplaints;
        acc.resolved += d.resolvedComplaints;
        acc.pending += d.pendingComplaints;
        acc.inProgress += d.inProgress;
        acc.overdue += d.overdue;
        return acc;
      },
      { total: 0, resolved: 0, pending: 0, inProgress: 0, overdue: 0 }
    );

    return res.status(200).json({
      range: { start, end },
      count: departments.length,
      summary,
      departments,
      rows: departments, // backward-compat
    });
  } catch (err) {
    console.error("getDeanDepartmentPerformance error:", err?.message || err);
    return res
      .status(500)
      .json({ error: "Failed to fetch dean department performance" });
  }
};

// Dean Department Overview: counts by department with status/priority breakdown
export const getDeanDepartmentOverview = async (req, res) => {
  try {
    // Time window selection
    const month =
      req.query.month !== undefined ? parseInt(req.query.month, 10) : undefined; // 0-11
    const year =
      req.query.year !== undefined ? parseInt(req.query.year, 10) : undefined;
    const fromStr = req.query.from && String(req.query.from);
    const toStr = req.query.to && String(req.query.to);
    const now = new Date();
    let start, end;
    if (!isNaN(month) && !isNaN(year)) {
      start = new Date(year, month, 1, 0, 0, 0, 0);
      end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    } else if (fromStr || toStr) {
      start = fromStr
        ? new Date(fromStr + "T00:00:00.000Z")
        : new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - 90,
            0,
            0,
            0,
            0
          );
      end = toStr ? new Date(toStr + "T23:59:59.999Z") : now;
    } else {
      start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 90,
        0,
        0,
        0,
        0
      );
      end = now;
    }

    // Use the same exclusion rule (exclude student -> admin) and time window
    const match = buildGlobalMinusAdminMatch({
      createdAt: { $gte: start, $lte: end },
    });

    const agg = await Complaint.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $ifNull: ["$department", "Unknown"] },
          total: { $sum: 1 },
          status: { $push: { $ifNull: ["$status", "Unknown"] } },
          priority: { $push: { $ifNull: ["$priority", "Unknown"] } },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const rows = (agg || []).map((r) => {
      const byStatus = new Map();
      const byPriority = new Map();
      for (const s of r.status || [])
        byStatus.set(s, (byStatus.get(s) || 0) + 1);
      for (const p of r.priority || [])
        byPriority.set(p, (byPriority.get(p) || 0) + 1);
      return {
        department: r._id,
        total: r.total || 0,
        byStatus: Object.fromEntries(byStatus.entries()),
        byPriority: Object.fromEntries(byPriority.entries()),
      };
    });

    const summary = rows.reduce(
      (acc, it) => {
        acc.total += it.total;
        return acc;
      },
      { total: 0 }
    );

    return res
      .status(200)
      .json({ range: { start, end }, count: rows.length, summary, rows });
  } catch (err) {
    console.error("getDeanDepartmentOverview error:", err?.message || err);
    return res
      .status(500)
      .json({ error: "Failed to fetch dean department overview" });
  }
};
