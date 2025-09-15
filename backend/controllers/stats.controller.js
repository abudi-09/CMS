import mongoose from "mongoose";
import Complaint from "../models/complaint.model.js";
import User from "../models/user.model.js";
// Added missing ActivityLog import (was causing ReferenceError -> 500 responses for dean calendar endpoints)
import ActivityLog from "../models/activityLog.model.js";

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

    // Prefer the department on the authenticated user's profile, fall back to query param
    const deptFromUser = user.department && String(user.department).trim();
    const deptFromQuery =
      typeof req.query.department === "string" && req.query.department.trim()
        ? req.query.department.trim()
        : null;
    const dept = deptFromUser || deptFromQuery || null;

    if (!dept) {
      return res
        .status(400)
        .json({ error: "Department is required for HoD stats" });
    }

    // Only count complaints assigned to the current HOD
    const assignedToHodFilter = {
      assignedTo: user._id,
      isDeleted: { $ne: true },
    };

    const [total, pending, inProgress, resolved, unassigned] =
      await Promise.all([
        Complaint.countDocuments({ ...assignedToHodFilter }),
        Complaint.countDocuments({ ...assignedToHodFilter, status: "Pending" }),
        Complaint.countDocuments({
          ...assignedToHodFilter,
          status: "In Progress",
        }),
        Complaint.countDocuments({
          ...assignedToHodFilter,
          status: "Resolved",
        }),
        Complaint.countDocuments({ ...assignedToHodFilter, assignedTo: null }), // This will always be 0, but kept for structure
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
                  { submittedDate: { $gte: monthStart, $lte: monthEnd } },
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

    const breakdownMatch = monthFilter;
    const [byStatusAgg, byPriorityAgg, byCategoryAgg] = await Promise.all([
      Complaint.aggregate([
        { $match: breakdownMatch },
        {
          $group: {
            _id: { $ifNull: ["$status", "Unknown"] },
            count: { $sum: 1 },
          },
        },
      ]),
      Complaint.aggregate([
        { $match: breakdownMatch },
        {
          $group: {
            _id: { $ifNull: ["$priority", "Unknown"] },
            count: { $sum: 1 },
          },
        },
      ]),
      Complaint.aggregate([
        { $match: breakdownMatch },
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

// Dean calendar day list: complaints sent to dean by students (include those assigned to HOD)
export const getDeanCalendarDay = async (req, res) => {
  try {
    const user = req.user;
    if (!user || String(user.role).toLowerCase() !== "dean") {
      return res.status(403).json({ error: "Access denied" });
    }

    // Optional: when provided, restrict to a specific assignee; otherwise include all
    const assignedTo =
      req.query.assignedTo &&
      typeof req.query.assignedTo === "string" &&
      req.query.assignedTo.match(/^[0-9a-fA-F]{24}$/)
        ? new mongoose.Types.ObjectId(req.query.assignedTo)
        : null;

    const status = req.query.status || null; // optional exact match
    const priority = req.query.priority || null; // optional exact match
    const categoriesParam = req.query.categories; // csv or array
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
    const dateStr = String(req.query.date || ""); // yyyy-mm-dd
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(dateStr)) {
      return res.status(400).json({ error: "Invalid or missing date" });
    }

    const [yStr, mStr, dStr] = dateStr.split("-");
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10) - 1;
    const d = parseInt(dStr, 10);

    const dayStart = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
    const dayEnd = new Date(Date.UTC(y, m, d, 23, 59, 59, 999));

    // Per-dean private scope for the day list (same as summary): direct-to-this-dean or assigned by this dean
    const deanAssignedLogs = await ActivityLog.aggregate([
      {
        $match: { role: "dean", user: user._id, action: { $regex: /assign/i } },
      },
      { $group: { _id: "$complaint", latest: { $max: "$timestamp" } } },
    ]);
    const deanAssignedIds = deanAssignedLogs.map((r) => r._id);
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
    if (process.env.NODE_ENV !== "production") {
      console.log(
        "[DeanCalendarDay] user=",
        String(user._id),
        "date=",
        dateStr
      );
      console.log(
        "[DeanCalendarDay] assignedIds=",
        deanAssignedIds.map(String)
      );
      console.log("[DeanCalendarDay] baseFilter=", JSON.stringify(base));
    }
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

    const items = await Complaint.find({ ...base, ...dateFilter })
      .select(
        "title status priority category submittedBy createdAt submittedDate updatedAt lastUpdated deadline isEscalated submittedTo department sourceRole assignedByRole assignmentPath assignedTo"
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

// HoD calendar summary: per-HoD isolation including
// - Direct to this department HoD (submittedTo contains 'hod' and same department)
// - Items assigned to this HoD (assignedTo = hodId)
// - Items assigned to staff by this HoD (latest HOD assignment log user = this hod)
export const getHodCalendarSummary = async (req, res) => {
  try {
    const user = req.user;
    if (!user || String(user.role).toLowerCase() !== "hod") {
      return res.status(403).json({ error: "Access denied" });
    }

  const hodId = new mongoose.Types.ObjectId(String(user._id));
    const department = user.department || null;

    const status = req.query.status || null; // exact match
    const priority = req.query.priority || null; // exact match
    const categoriesParam = req.query.categories; // array or csv
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

    // Discover complaints managed by this HOD via latest HOD assignment logs
    const latestHodAssignments = await ActivityLog.aggregate([
      {
        $match: {
          role: { $regex: /^hod$/i },
          action: { $in: ["Assigned by HOD", "Reassigned by HOD"] },
        },
      },
      { $sort: { complaint: 1, timestamp: -1 } },
      {
        $group: {
          _id: "$complaint",
          latestUser: { $first: "$user" },
          latestTs: { $first: "$timestamp" },
        },
      },
      { $match: { latestUser: hodId } },
      { $project: { _id: 0, complaint: "$_id" } },
    ]);
    const managedByThisHodIds = new Set(
      (latestHodAssignments || []).map((r) => String(r.complaint))
    );

    // Build base OR filter for HOD scope
    const baseOr = [
      { assignedTo: hodId },
      {
        _id: {
          $in: Array.from(managedByThisHodIds).map((id) =>
            mongoose.Types.ObjectId(id)
          ),
        },
      },
    ];

    const base = {
      isDeleted: { $ne: true },
      $or: baseOr,
    };
    if (department) base.department = department;
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

    // Optional breakdowns for the selected month scope
    const breakdownMatch = monthFilter;
    const [byStatusAgg, byPriorityAgg, byCategoryAgg] = await Promise.all([
      Complaint.aggregate([
        { $match: breakdownMatch },
        {
          $group: {
            _id: { $ifNull: ["$status", "Unknown"] },
            count: { $sum: 1 },
          },
        },
      ]),
      Complaint.aggregate([
        { $match: breakdownMatch },
        {
          $group: {
            _id: { $ifNull: ["$priority", "Unknown"] },
            count: { $sum: 1 },
          },
        },
      ]),
      Complaint.aggregate([
        { $match: breakdownMatch },
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

// Staff calendar summary: counts for the logged-in staff
// Includes:
// - Items assigned to this staff (assignedTo = staffId)
// - Items sent directly from a student to this staff (recipientRole = 'staff' AND recipientId = staffId)
export const getStaffCalendarSummary = async (req, res) => {
  try {
    const user = req.user;
    if (!user || String(user.role).toLowerCase() !== "staff") {
      return res.status(403).json({ error: "Access denied" });
    }

  const staffId = new mongoose.Types.ObjectId(String(user._id));

    const status = req.query.status || null; // exact match
    const priority = req.query.priority || null; // exact match
    const categoriesParam = req.query.categories; // array or csv
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

    const baseOr = [
      { assignedTo: staffId },
      {
        recipientRole: { $regex: /^staff$/i },
        recipientId: staffId,
        sourceRole: { $regex: /^student$/i },
      },
    ];

    const base = {
      isDeleted: { $ne: true },
      $or: baseOr,
    };
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

    const breakdownMatch = monthFilter;
    const [byStatusAgg, byPriorityAgg, byCategoryAgg] = await Promise.all([
      Complaint.aggregate([
        { $match: breakdownMatch },
        {
          $group: {
            _id: { $ifNull: ["$status", "Unknown"] },
            count: { $sum: 1 },
          },
        },
      ]),
      Complaint.aggregate([
        { $match: breakdownMatch },
        {
          $group: {
            _id: { $ifNull: ["$priority", "Unknown"] },
            count: { $sum: 1 },
          },
        },
      ]),
      Complaint.aggregate([
        { $match: breakdownMatch },
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
    console.error("getStaffCalendarSummary error:", err?.message || err);
    return res
      .status(500)
      .json({ error: "Failed to fetch staff calendar summary" });
  }
};

// Staff calendar day list: complaints relevant to this staff on a specific date
export const getStaffCalendarDay = async (req, res) => {
  try {
    const user = req.user;
    if (!user || String(user.role).toLowerCase() !== "staff") {
      return res.status(403).json({ error: "Access denied" });
    }

  const staffId = new mongoose.Types.ObjectId(String(user._id));
    const status = req.query.status || null; // optional exact match
    const priority = req.query.priority || null; // optional exact match
    const categoriesParam = req.query.categories; // csv or array
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
    const dateStr = String(req.query.date || ""); // yyyy-mm-dd
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(dateStr)) {
      return res.status(400).json({ error: "Invalid or missing date" });
    }

    const [yStr, mStr, dStr] = dateStr.split("-");
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10) - 1;
    const d = parseInt(dStr, 10);

    const dayStart = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
    const dayEnd = new Date(Date.UTC(y, m, d, 23, 59, 59, 999));

    const baseOr = [
      { assignedTo: staffId },
      {
        recipientRole: { $regex: /^staff$/i },
        recipientId: staffId,
        sourceRole: { $regex: /^student$/i },
      },
    ];

    const base = {
      isDeleted: { $ne: true },
      $or: baseOr,
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

    const items = await Complaint.find({ ...base, ...dateFilter })
      .select(
        "title status priority category submittedBy createdAt submittedDate updatedAt lastUpdated deadline isEscalated submittedTo department sourceRole assignedByRole assignmentPath assignedTo recipientRole recipientId"
      )
      .populate("submittedBy", "name email")
      .populate("assignedTo", "name role")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(items || []);
  } catch (err) {
    console.error("getStaffCalendarDay error:", err?.message || err);
    return res
      .status(500)
      .json({ error: "Failed to fetch staff calendar day complaints" });
  }
};

// HoD calendar day list: complaints in scope for this HOD for a specific date
export const getHodCalendarDay = async (req, res) => {
  try {
    const user = req.user;
    if (!user || String(user.role).toLowerCase() !== "hod") {
      return res.status(403).json({ error: "Access denied" });
    }

  const hodId = new mongoose.Types.ObjectId(String(user._id));
    const department = user.department || null;

    const status = req.query.status || null; // optional exact match
    const priority = req.query.priority || null; // optional exact match
    const categoriesParam = req.query.categories; // csv or array
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
    const dateStr = String(req.query.date || ""); // yyyy-mm-dd
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(dateStr)) {
      return res.status(400).json({ error: "Invalid or missing date" });
    }

    const [yStr, mStr, dStr] = dateStr.split("-");
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10) - 1;
    const d = parseInt(dStr, 10);

    const dayStart = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
    const dayEnd = new Date(Date.UTC(y, m, d, 23, 59, 59, 999));

    // Latest HOD assignment ownership
    const latestHodAssignments = await ActivityLog.aggregate([
      {
        $match: {
          role: { $regex: /^hod$/i },
          action: { $in: ["Assigned by HOD", "Reassigned by HOD"] },
        },
      },
      { $sort: { complaint: 1, timestamp: -1 } },
      {
        $group: {
          _id: "$complaint",
          latestUser: { $first: "$user" },
          latestTs: { $first: "$timestamp" },
        },
      },
      { $match: { latestUser: hodId } },
      { $project: { _id: 0, complaint: "$_id" } },
    ]);
    const managedByThisHodIds = new Set(
      (latestHodAssignments || []).map((r) => String(r.complaint))
    );

    const baseOr = [
      { assignedTo: hodId },
      {
        _id: {
          $in: Array.from(managedByThisHodIds).map((id) =>
            mongoose.Types.ObjectId(id)
          ),
        },
      },
    ];

    const base = {
      isDeleted: { $ne: true },
      $or: baseOr,
    };
    if (department) base.department = department;
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

    const items = await Complaint.find({ ...base, ...dateFilter })
      .select(
        "title status priority category submittedBy createdAt submittedDate updatedAt lastUpdated deadline isEscalated submittedTo department sourceRole assignedByRole assignmentPath assignedTo"
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

// ===================== NEW: Comprehensive Analytics APIs =====================

// Admin Analytics Summary
export const getAdminAnalyticsSummary = async (req, res) => {
  try {
    const user = req.user;
    if (!user || String(user.role).toLowerCase() !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get basic stats
    const [
      totalComplaints,
      resolvedComplaints,
      pendingComplaints,
      overdueComplaints,
    ] = await Promise.all([
      Complaint.countDocuments({ isDeleted: { $ne: true } }),
      Complaint.countDocuments({
        status: "Resolved",
        isDeleted: { $ne: true },
      }),
      Complaint.countDocuments({ status: "Pending", isDeleted: { $ne: true } }),
      Complaint.countDocuments({
        status: { $nin: ["Resolved", "Closed"] },
        deadline: { $lt: new Date() },
        isDeleted: { $ne: true },
      }),
    ]);

    // Calculate resolution rate
    const resolutionRate =
      totalComplaints > 0 ? (resolvedComplaints / totalComplaints) * 100 : 0;

    // Get average resolution time (in days)
    const resolvedComplaintsWithTimes = await Complaint.find({
      status: "Resolved",
      createdAt: { $exists: true },
      updatedAt: { $exists: true },
      isDeleted: { $ne: true },
    }).select("createdAt updatedAt");

    let totalResolutionTime = 0;
    let resolvedCount = 0;

    resolvedComplaintsWithTimes.forEach((complaint) => {
      if (complaint.createdAt && complaint.updatedAt) {
        const resolutionTime = complaint.updatedAt - complaint.createdAt;
        totalResolutionTime += resolutionTime;
        resolvedCount++;
      }
    });

    const avgResolutionTime =
      resolvedCount > 0
        ? totalResolutionTime / resolvedCount / (1000 * 60 * 60 * 24)
        : 0;

    // Get user satisfaction data
    const complaintsWithFeedback = await Complaint.find({
      "feedback.rating": { $exists: true },
      isDeleted: { $ne: true },
    }).select("feedback.rating");

    let totalRating = 0;
    let totalReviews = 0;

    complaintsWithFeedback.forEach((complaint) => {
      if (complaint.feedback && typeof complaint.feedback.rating === "number") {
        totalRating += complaint.feedback.rating;
        totalReviews++;
      }
    });

    const userSatisfaction = totalReviews > 0 ? totalRating / totalReviews : 0;

    res.status(200).json({
      totalComplaints,
      resolvedComplaints,
      pendingComplaints,
      avgResolutionTime: Math.round(avgResolutionTime * 10) / 10, // Round to 1 decimal
      resolutionRate: Math.round(resolutionRate * 10) / 10,
      userSatisfaction: Math.round(userSatisfaction * 10) / 10,
      totalReviews,
      overdueComplaints,
    });
  } catch (err) {
    console.error("getAdminAnalyticsSummary error:", err?.message || err);
    res.status(500).json({ error: "Failed to fetch admin analytics summary" });
  }
};

// Admin Priority Distribution
export const getAdminPriorityDistribution = async (req, res) => {
  try {
    const user = req.user;
    if (!user || String(user.role).toLowerCase() !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    const priorityResults = await Complaint.aggregate([
      {
        $match: {
          $or: [{ isDeleted: { $exists: false } }, { isDeleted: false }],
        },
      },
      {
        $group: {
          _id: {
            $cond: [{ $ifNull: ["$priority", false] }, "$priority", "Unknown"],
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const total = priorityResults.reduce((acc, r) => acc + (r.count || 0), 0);

    const priorities = priorityResults.map((result) => ({
      priority: result._id,
      count: result.count,
      percentage:
        total > 0 ? Math.round((result.count / total) * 100 * 10) / 10 : 0,
      color: getPriorityColor(result._id),
    }));

    res.status(200).json({ priorities });
  } catch (err) {
    console.error("getAdminPriorityDistribution error:", err?.message || err);
    res.status(500).json({ error: "Failed to fetch priority distribution" });
  }
};

// Admin Status Distribution
export const getAdminStatusDistribution = async (req, res) => {
  try {
    const user = req.user;
    if (!user || String(user.role).toLowerCase() !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    const statusResults = await Complaint.aggregate([
      {
        $match: {
          $or: [{ isDeleted: { $exists: false } }, { isDeleted: false }],
        },
      },
      {
        $group: {
          _id: {
            $cond: [{ $ifNull: ["$status", false] }, "$status", "Unknown"],
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const total = statusResults.reduce((acc, r) => acc + (r.count || 0), 0);

    const statuses = statusResults.map((result) => ({
      status: result._id,
      count: result.count,
      percentage:
        total > 0 ? Math.round((result.count / total) * 100 * 10) / 10 : 0,
      color: getStatusColor(result._id),
    }));

    res.status(200).json({ statuses });
  } catch (err) {
    console.error("getAdminStatusDistribution error:", err?.message || err);
    res.status(500).json({ error: "Failed to fetch status distribution" });
  }
};

// Admin Monthly Trends
export const getAdminMonthlyTrends = async (req, res) => {
  try {
    const user = req.user;
    if (!user || String(user.role).toLowerCase() !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    const months = parseInt(req.query.months) || 6;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const startDate = new Date(year, new Date().getMonth() - months + 1, 1);
    const endDate = new Date(
      year,
      new Date().getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    const monthlyData = await Complaint.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          $or: [{ isDeleted: { $exists: false } }, { isDeleted: false }],
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          submitted: { $sum: 1 },
          resolved: {
            $sum: {
              $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0],
            },
          },
          pending: {
            $sum: {
              $cond: [{ $eq: ["$status", "Pending"] }, 1, 0],
            },
          },
          totalResolutionTime: {
            $sum: {
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
                    1000 * 60 * 60 * 24, // Convert to days
                  ],
                },
                0,
              ],
            },
          },
          resolvedCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          month: {
            $switch: {
              branches: [
                { case: { $eq: ["$_id.month", 1] }, then: "Jan" },
                { case: { $eq: ["$_id.month", 2] }, then: "Feb" },
                { case: { $eq: ["$_id.month", 3] }, then: "Mar" },
                { case: { $eq: ["$_id.month", 4] }, then: "Apr" },
                { case: { $eq: ["$_id.month", 5] }, then: "May" },
                { case: { $eq: ["$_id.month", 6] }, then: "Jun" },
                { case: { $eq: ["$_id.month", 7] }, then: "Jul" },
                { case: { $eq: ["$_id.month", 8] }, then: "Aug" },
                { case: { $eq: ["$_id.month", 9] }, then: "Sep" },
                { case: { $eq: ["$_id.month", 10] }, then: "Oct" },
                { case: { $eq: ["$_id.month", 11] }, then: "Nov" },
                { case: { $eq: ["$_id.month", 12] }, then: "Dec" },
              ],
              default: "Unknown",
            },
          },
          year: "$_id.year",
          submitted: 1,
          resolved: 1,
          pending: 1,
          avgResolutionTime: {
            $cond: [
              { $gt: ["$resolvedCount", 0] },
              { $divide: ["$totalResolutionTime", "$resolvedCount"] },
              0,
            ],
          },
        },
      },
      { $sort: { year: 1, "_id.month": 1 } },
    ]);

    res.status(200).json({ data: monthlyData });
  } catch (err) {
    console.error("getAdminMonthlyTrends error:", err?.message || err);
    res.status(500).json({ error: "Failed to fetch monthly trends" });
  }
};

// Admin Department Performance
export const getAdminDepartmentPerformance = async (req, res) => {
  try {
    const user = req.user;
    if (!user || String(user.role).toLowerCase() !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    const departmentData = await Complaint.aggregate([
      {
        $match: {
          $or: [{ isDeleted: { $exists: false } }, { isDeleted: false }],
        },
      },
      {
        $group: {
          _id: {
            $cond: [
              { $ifNull: ["$department", false] },
              "$department",
              "Unknown",
            ],
          },
          totalComplaints: { $sum: 1 },
          resolvedComplaints: {
            $sum: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] },
          },
          pendingComplaints: {
            $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] },
          },
          totalResolutionTime: {
            $sum: {
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
          },
          resolvedCount: {
            $sum: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          department: "$_id",
          totalComplaints: 1,
          resolvedComplaints: 1,
          pendingComplaints: 1,
          avgResolutionTime: {
            $cond: [
              { $gt: ["$resolvedCount", 0] },
              { $divide: ["$totalResolutionTime", "$resolvedCount"] },
              0,
            ],
          },
          successRate: {
            $cond: [
              { $gt: ["$totalComplaints", 0] },
              {
                $multiply: [
                  { $divide: ["$resolvedComplaints", "$totalComplaints"] },
                  100,
                ],
              },
              0,
            ],
          },
        },
      },
      { $sort: { totalComplaints: -1 } },
    ]);

    // Get staff count per department
    const staffCounts = await User.aggregate([
      {
        $match: {
          role: "staff",
          isActive: true,
        },
      },
      {
        $group: {
          _id: "$department",
          staffCount: { $sum: 1 },
        },
      },
    ]);

    const staffCountMap = {};
    staffCounts.forEach((item) => {
      staffCountMap[item._id] = item.staffCount;
    });

    const departments = departmentData.map((dept) => ({
      ...dept,
      staffCount: staffCountMap[dept.department] || 0,
      avgResolutionTime: Math.round(dept.avgResolutionTime * 10) / 10,
      successRate: Math.round(dept.successRate * 10) / 10,
    }));

    res.status(200).json({ departments });
  } catch (err) {
    console.error("getAdminDepartmentPerformance error:", err?.message || err);
    res.status(500).json({ error: "Failed to fetch department performance" });
  }
};

// Admin Staff Performance
export const getAdminStaffPerformance = async (req, res) => {
  try {
    const user = req.user;
    if (!user || String(user.role).toLowerCase() !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    // Fetch all staff across all departments
    const staff = await User.find({ role: "staff", isActive: true })
      .select("_id name email department")
      .lean();

    if (!staff.length) return res.status(200).json({ staff: [] });

    const staffIds = staff.map((s) => s._id);

    const agg = await Complaint.aggregate([
      {
        $match: {
          assignedTo: { $in: staffIds },
          $or: [{ isDeleted: { $exists: false } }, { isDeleted: false }],
        },
      },
      {
        $group: {
          _id: "$assignedTo",
          totalAssigned: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] },
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ["$status", "In Progress"] }, 1, 0] },
          },
          resolved: {
            $sum: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] },
          },
          sumResolutionMs: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "Resolved"] },
                    { $ne: ["$updatedAt", null] },
                    { $ne: ["$createdAt", null] },
                  ],
                },
                { $subtract: ["$updatedAt", "$createdAt"] },
                0,
              ],
            },
          },
          resolvedCount: {
            $sum: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] },
          },
          ratingSum: {
            $sum: {
              $cond: [
                { $ifNull: ["$feedback.rating", false] },
                "$feedback.rating",
                0,
              ],
            },
          },
          ratingCount: {
            $sum: {
              $cond: [{ $ifNull: ["$feedback.rating", false] }, 1, 0],
            },
          },
        },
      },
    ]);

    const perfMap = new Map();
    agg.forEach((r) => perfMap.set(String(r._id), r));

    const results = staff.map((s) => {
      const stats = perfMap.get(String(s._id)) || {};
      const totalAssigned = stats.totalAssigned || 0;
      const resolved = stats.resolved || 0;
      const successRate = totalAssigned
        ? Number(((resolved / totalAssigned) * 100).toFixed(2))
        : 0;
      const avgResolutionHours = stats.resolvedCount
        ? Number(
            (stats.sumResolutionMs / stats.resolvedCount / 3600000).toFixed(2)
          )
        : 0;
      const avgRating = stats.ratingCount
        ? Number((stats.ratingSum / stats.ratingCount).toFixed(2))
        : 0;
      return {
        staffId: s._id,
        name: s.name || s.email,
        email: s.email,
        department: s.department,
        totalAssigned,
        pending: stats.pending || 0,
        inProgress: stats.inProgress || 0,
        resolved,
        successRate,
        avgResolutionHours,
        avgRating,
      };
    });

    res.status(200).json({ staff: results });
  } catch (err) {
    console.error("getAdminStaffPerformance error:", err?.message || err);
    res.status(500).json({ error: "Failed to fetch staff performance" });
  }
};

// Dean Analytics Summary
export const getDeanAnalyticsSummary = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !["admin", "dean"].includes(String(user.role).toLowerCase())) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get complaints not submitted directly to admin (dean-visible)
    const [
      totalComplaints,
      resolvedComplaints,
      pendingComplaints,
      overdueComplaints,
    ] = await Promise.all([
      Complaint.countDocuments({
        submittedTo: { $ne: "admin" },
        isDeleted: { $ne: true },
      }),
      Complaint.countDocuments({
        status: "Resolved",
        submittedTo: { $ne: "admin" },
        isDeleted: { $ne: true },
      }),
      Complaint.countDocuments({
        status: "Pending",
        submittedTo: { $ne: "admin" },
        isDeleted: { $ne: true },
      }),
      Complaint.countDocuments({
        status: { $nin: ["Resolved", "Closed"] },
        deadline: { $lt: new Date() },
        submittedTo: { $ne: "admin" },
        isDeleted: { $ne: true },
      }),
    ]);

    const resolutionRate =
      totalComplaints > 0 ? (resolvedComplaints / totalComplaints) * 100 : 0;

    // Get average resolution time
    const resolvedComplaintsWithTimes = await Complaint.find({
      status: "Resolved",
      submittedTo: { $ne: "admin" },
      createdAt: { $exists: true },
      updatedAt: { $exists: true },
      isDeleted: { $ne: true },
    }).select("createdAt updatedAt");

    let totalResolutionTime = 0;
    let resolvedCount = 0;

    resolvedComplaintsWithTimes.forEach((complaint) => {
      if (complaint.createdAt && complaint.updatedAt) {
        const resolutionTime = complaint.updatedAt - complaint.createdAt;
        totalResolutionTime += resolutionTime;
        resolvedCount++;
      }
    });

    const avgResolutionTime =
      resolvedCount > 0
        ? totalResolutionTime / resolvedCount / (1000 * 60 * 60 * 24)
        : 0;

    // Get user satisfaction
    const complaintsWithFeedback = await Complaint.find({
      "feedback.rating": { $exists: true },
      submittedTo: { $ne: "admin" },
      isDeleted: { $ne: true },
    }).select("feedback.rating");

    let totalRating = 0;
    let totalReviews = 0;

    complaintsWithFeedback.forEach((complaint) => {
      if (complaint.feedback && typeof complaint.feedback.rating === "number") {
        totalRating += complaint.feedback.rating;
        totalReviews++;
      }
    });

    const userSatisfaction = totalReviews > 0 ? totalRating / totalReviews : 0;

    // Get departments managed (HoDs under this dean)
    const departmentsManaged = await User.countDocuments({
      role: "hod",
      isActive: true,
    });

    res.status(200).json({
      totalComplaints,
      resolvedComplaints,
      pendingComplaints,
      avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
      resolutionRate: Math.round(resolutionRate * 10) / 10,
      userSatisfaction: Math.round(userSatisfaction * 10) / 10,
      totalReviews,
      overdueComplaints,
      departmentsManaged,
    });
  } catch (err) {
    console.error("getDeanAnalyticsSummary error:", err?.message || err);
    res.status(500).json({ error: "Failed to fetch dean analytics summary" });
  }
};

// Dean Department Overview
export const getDeanDepartmentOverview = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !["admin", "dean"].includes(String(user.role).toLowerCase())) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get HoDs and their departments
    const hods = await User.find({
      role: "hod",
      isActive: true,
    }).select("name department");

    const departments = [];

    for (const hod of hods) {
      const deptStats = await Complaint.aggregate([
        {
          $match: {
            department: hod.department,
            submittedTo: { $ne: "admin" },
            $or: [{ isDeleted: { $exists: false } }, { isDeleted: false }],
          },
        },
        {
          $group: {
            _id: null,
            totalComplaints: { $sum: 1 },
            resolvedComplaints: {
              $sum: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] },
            },
            pendingComplaints: {
              $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] },
            },
            totalResolutionTime: {
              $sum: {
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
            },
            resolvedCount: {
              $sum: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] },
            },
          },
        },
      ]);

      const staffCount = await User.countDocuments({
        role: "staff",
        department: hod.department,
        isActive: true,
      });

      const stats = deptStats[0] || {
        totalComplaints: 0,
        resolvedComplaints: 0,
        pendingComplaints: 0,
        totalResolutionTime: 0,
        resolvedCount: 0,
      };

      departments.push({
        department: hod.department,
        hodName: hod.name || "Unknown",
        totalComplaints: stats.totalComplaints,
        resolvedComplaints: stats.resolvedComplaints,
        pendingComplaints: stats.pendingComplaints,
        staffCount,
        avgResolutionTime:
          stats.resolvedCount > 0
            ? Math.round(
                (stats.totalResolutionTime / stats.resolvedCount) * 10
              ) / 10
            : 0,
      });
    }

    res.status(200).json({ departments });
  } catch (err) {
    console.error("getDeanDepartmentOverview error:", err?.message || err);
    res.status(500).json({ error: "Failed to fetch department overview" });
  }
};

// Dean Monthly Trends
export const getDeanAnalyticsMonthlyTrends = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !["admin", "dean"].includes(String(user.role).toLowerCase())) {
      return res.status(403).json({ error: "Access denied" });
    }

    const months = parseInt(req.query.months) || 6;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const startDate = new Date(year, new Date().getMonth() - months + 1, 1);
    const endDate = new Date(
      year,
      new Date().getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    const monthlyData = await Complaint.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          submittedTo: { $ne: "admin" },
          $or: [{ isDeleted: { $exists: false } }, { isDeleted: false }],
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          submitted: { $sum: 1 },
          resolved: {
            $sum: {
              $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0],
            },
          },
          pending: {
            $sum: {
              $cond: [{ $eq: ["$status", "Pending"] }, 1, 0],
            },
          },
          totalResolutionTime: {
            $sum: {
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
          },
          resolvedCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          month: {
            $switch: {
              branches: [
                { case: { $eq: ["$_id.month", 1] }, then: "Jan" },
                { case: { $eq: ["$_id.month", 2] }, then: "Feb" },
                { case: { $eq: ["$_id.month", 3] }, then: "Mar" },
                { case: { $eq: ["$_id.month", 4] }, then: "Apr" },
                { case: { $eq: ["$_id.month", 5] }, then: "May" },
                { case: { $eq: ["$_id.month", 6] }, then: "Jun" },
                { case: { $eq: ["$_id.month", 7] }, then: "Jul" },
                { case: { $eq: ["$_id.month", 8] }, then: "Aug" },
                { case: { $eq: ["$_id.month", 9] }, then: "Sep" },
                { case: { $eq: ["$_id.month", 10] }, then: "Oct" },
                { case: { $eq: ["$_id.month", 11] }, then: "Nov" },
                { case: { $eq: ["$_id.month", 12] }, then: "Dec" },
              ],
              default: "Unknown",
            },
          },
          year: "$_id.year",
          submitted: 1,
          resolved: 1,
          pending: 1,
          avgResolutionTime: {
            $cond: [
              { $gt: ["$resolvedCount", 0] },
              { $divide: ["$totalResolutionTime", "$resolvedCount"] },
              0,
            ],
          },
        },
      },
      { $sort: { year: 1, "_id.month": 1 } },
    ]);

    res.status(200).json({ data: monthlyData });
  } catch (err) {
    console.error("getDeanAnalyticsMonthlyTrends error:", err?.message || err);
    res.status(500).json({ error: "Failed to fetch dean monthly trends" });
  }
};

// Dean Department Performance (per-department aggregates, dean-visible only)
export const getDeanDepartmentPerformance = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !["admin", "dean"].includes(String(user.role).toLowerCase())) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Optional date filters (createdAt range)
    const from = req.query.from
      ? new Date(String(req.query.from) + "T00:00:00.000Z")
      : null;
    const to = req.query.to
      ? new Date(String(req.query.to) + "T23:59:59.999Z")
      : null;
    const createdRange = {};
    if (from) createdRange.$gte = from;
    if (to) createdRange.$lte = to;

    // Base dean-visible filter: exclude anything associated with Admin (directed to, assigned by, recipient role, or in assignment path), and exclude soft-deleted
    const deanBase = {
      $and: [
        {
          $or: [
            { submittedTo: { $exists: false } },
            { submittedTo: null },
            { submittedTo: { $not: /admin/i } },
          ],
        },
        {
          $or: [
            { assignedByRole: { $exists: false } },
            { assignedByRole: null },
            { assignedByRole: { $not: /admin/i } },
          ],
        },
        {
          $or: [
            { recipientRole: { $exists: false } },
            { recipientRole: null },
            { recipientRole: { $not: /admin/i } },
          ],
        },
        { assignmentPath: { $not: { $elemMatch: { $regex: /admin/i } } } },
        { $or: [{ isDeleted: { $exists: false } }, { isDeleted: false }] },
      ],
      ...(Object.keys(createdRange).length ? { createdAt: createdRange } : {}),
    };

    // Canonical department list (enforced)
    const CANONICAL_DEPTS = [
      "Information Technology",
      "Information Science",
      "Computer Science",
      "Information System",
    ];

    // Aggregate per department core counts (normalized department)
    const departmentAgg = await Complaint.aggregate([
      { $match: deanBase },
      {
        $addFields: {
          deptNorm: {
            $switch: {
              branches: [
                {
                  case: {
                    $regexMatch: {
                      input: { $ifNull: ["$department", ""] },
                      regex: /information\s*technology/i,
                    },
                  },
                  then: "Information Technology",
                },
                {
                  case: {
                    $regexMatch: {
                      input: { $ifNull: ["$department", ""] },
                      regex: /information\s*science/i,
                    },
                  },
                  then: "Information Science",
                },
                {
                  case: {
                    $regexMatch: {
                      input: { $ifNull: ["$department", ""] },
                      regex: /computer\s*science/i,
                    },
                  },
                  then: "Computer Science",
                },
                {
                  case: {
                    $regexMatch: {
                      input: { $ifNull: ["$department", ""] },
                      regex: /information\s*system/i,
                    },
                  },
                  then: "Information System",
                },
              ],
              default: "Unknown",
            },
          },
        },
      },
      {
        $group: {
          _id: "$deptNorm",
          totalComplaints: { $sum: 1 },
          resolvedComplaints: {
            $sum: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] },
          },
          pendingCount: {
            $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] },
          },
          inProgressCount: {
            $sum: { $cond: [{ $eq: ["$status", "In Progress"] }, 1, 0] },
          },
          // Overdue: deadline passed and not Resolved/Closed
          overdueCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ifNull: ["$deadline", false] },
                    { $lt: ["$deadline", new Date()] },
                    { $not: [{ $in: ["$status", ["Resolved", "Closed"]] }] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          sumResolutionDays: {
            $sum: {
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
          },
          resolvedCountForAvg: {
            $sum: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] },
          },
        },
      },
    ]);

    // Staff count per department (normalized)
    const staffCounts = await User.aggregate([
      { $match: { role: "staff", isActive: true } },
      {
        $addFields: {
          deptNorm: {
            $switch: {
              branches: [
                {
                  case: {
                    $regexMatch: {
                      input: { $ifNull: ["$department", ""] },
                      regex: /information\s*technology/i,
                    },
                  },
                  then: "Information Technology",
                },
                {
                  case: {
                    $regexMatch: {
                      input: { $ifNull: ["$department", ""] },
                      regex: /information\s*science/i,
                    },
                  },
                  then: "Information Science",
                },
                {
                  case: {
                    $regexMatch: {
                      input: { $ifNull: ["$department", ""] },
                      regex: /computer\s*science/i,
                    },
                  },
                  then: "Computer Science",
                },
                {
                  case: {
                    $regexMatch: {
                      input: { $ifNull: ["$department", ""] },
                      regex: /information\s*system/i,
                    },
                  },
                  then: "Information System",
                },
              ],
              default: "Unknown",
            },
          },
        },
      },
      { $group: { _id: "$deptNorm", staffCount: { $sum: 1 } } },
    ]);
    const staffCountMap = new Map();
    staffCounts.forEach((s) => staffCountMap.set(String(s._id), s.staffCount));

    // Resolve-by role using ActivityLog for resolved complaints (latest resolved log per complaint)
    // First, get resolved complaints ids per department for deanBase
    const resolvedComplaints = await Complaint.find({
      ...deanBase,
      status: "Resolved",
    })
      .select("_id department")
      .lean();
    const resolvedIds = resolvedComplaints.map((c) => c._id);
    let resolvedRoleAgg = [];
    if (resolvedIds.length) {
      resolvedRoleAgg = await (
        await mongoose.connection.db
      )
        .collection("activitylogs")
        .aggregate([
          {
            $match: {
              complaint: { $in: resolvedIds },
              action: "Status Updated to Resolved",
            },
          },
          { $sort: { timestamp: -1 } },
          { $group: { _id: "$complaint", role: { $first: "$role" } } },
        ])
        .toArray();
    }
    const roleByComplaint = new Map();
    resolvedRoleAgg.forEach((r) => roleByComplaint.set(String(r._id), r.role));
    const deptResolvedBy = new Map(); // dept -> {hod, staff}
    resolvedComplaints.forEach((c) => {
      const name = c.department || "";
      const dept = /information\s*technology/i.test(name)
        ? "Information Technology"
        : /information\s*science/i.test(name)
        ? "Information Science"
        : /computer\s*science/i.test(name)
        ? "Computer Science"
        : /information\s*system/i.test(name)
        ? "Information System"
        : "Unknown";
      const role = roleByComplaint.get(String(c._id));
      const cur = deptResolvedBy.get(dept) || { hod: 0, staff: 0 };
      if (role === "hod") cur.hod += 1;
      else if (role === "staff") cur.staff += 1;
      else {
        // count others (dean/admin) towards hod bucket for presentation if needed
        // but we'll keep only hod/staff in our response
      }
      deptResolvedBy.set(dept, cur);
    });

    // Restrict to canonical depts only and map rows
    const departments = departmentAgg
      .filter((row) => CANONICAL_DEPTS.includes(String(row._id)))
      .map((row) => {
        const department = String(row._id);
        const totalComplaints = row.totalComplaints || 0;
        const resolvedComplaints = row.resolvedComplaints || 0;
        const pending = row.pendingCount || 0;
        const inProgress = (row.inProgressCount || 0) + 0; // kept separate
        const overdue = row.overdueCount || 0;
        const staffCount = Number(staffCountMap.get(department) || 0);
        const avgResolutionTime = row.resolvedCountForAvg
          ? Math.round((row.sumResolutionDays / row.resolvedCountForAvg) * 10) /
            10
          : 0;
        const successRate = totalComplaints
          ? Math.round((resolvedComplaints / totalComplaints) * 100 * 10) / 10
          : 0;
        const rb = deptResolvedBy.get(department) || { hod: 0, staff: 0 };
        return {
          department,
          totalComplaints,
          resolvedComplaints,
          pendingComplaints: pending,
          inProgress,
          overdue,
          resolvedHoD: rb.hod || 0,
          resolvedStaff: rb.staff || 0,
          staffCount,
          avgResolutionTime,
          successRate,
        };
      });

    // Ensure fixed order and include missing canonical depts with zeros
    const mapByDept = new Map(departments.map((d) => [d.department, d]));
    const ordered = CANONICAL_DEPTS.map(
      (name) =>
        mapByDept.get(name) || {
          department: name,
          totalComplaints: 0,
          resolvedComplaints: 0,
          pendingComplaints: 0,
          inProgress: 0,
          overdue: 0,
          resolvedHoD: 0,
          resolvedStaff: 0,
          staffCount: Number(staffCountMap.get(name) || 0),
          avgResolutionTime: 0,
          successRate: 0,
        }
    );

    res.status(200).json({ departments: ordered });
  } catch (err) {
    console.error("getDeanDepartmentPerformance error:", err?.message || err);
    res
      .status(500)
      .json({ error: "Failed to fetch dean department performance" });
  }
};

// Dean Department Complaints (detail list for a department)
export const getDeanDepartmentComplaints = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !["admin", "dean"].includes(String(user.role).toLowerCase())) {
      return res.status(403).json({ error: "Access denied" });
    }

    const rawDept = String(req.query.department || "").trim();
    if (!rawDept)
      return res.status(400).json({ error: "department is required" });
    // Normalize to canonical name
    const canonical = /information\s*technology/i.test(rawDept)
      ? "Information Technology"
      : /information\s*science/i.test(rawDept)
      ? "Information Science"
      : /computer\s*science/i.test(rawDept)
      ? "Computer Science"
      : /information\s*system/i.test(rawDept)
      ? "Information System"
      : null;
    if (!canonical)
      return res.status(400).json({ error: "Unsupported department" });

    const from = req.query.from
      ? new Date(String(req.query.from) + "T00:00:00.000Z")
      : null;
    const to = req.query.to
      ? new Date(String(req.query.to) + "T23:59:59.999Z")
      : null;
    const createdRange = {};
    if (from) createdRange.$gte = from;
    if (to) createdRange.$lte = to;

    const deanBase = {
      $and: [
        {
          $or: [
            { submittedTo: { $exists: false } },
            { submittedTo: null },
            { submittedTo: { $not: /admin/i } },
          ],
        },
        {
          $or: [
            { assignedByRole: { $exists: false } },
            { assignedByRole: null },
            { assignedByRole: { $not: /admin/i } },
          ],
        },
        {
          $or: [
            { recipientRole: { $exists: false } },
            { recipientRole: null },
            { recipientRole: { $not: /admin/i } },
          ],
        },
        { assignmentPath: { $not: { $elemMatch: { $regex: /admin/i } } } },
        { $or: [{ isDeleted: { $exists: false } }, { isDeleted: false }] },
        // Match any variant of the canonical department via regex
        { department: new RegExp(canonical.replace(/\s+/g, "\\s*"), "i") },
      ],
      ...(Object.keys(createdRange).length ? { createdAt: createdRange } : {}),
    };

    const items = await Complaint.find(deanBase)
      .select(
        "complaintCode title status assignedTo deadline createdAt updatedAt resolvedAt"
      )
      .populate({ path: "assignedTo", select: "name role" })
      .sort({ createdAt: -1 })
      .lean();

    // Lookup latest resolved-by role per complaint
    const ids = items.map((c) => c._id);
    let roleByComplaint = new Map();
    if (ids.length) {
      const logs = await (
        await mongoose.connection.db
      )
        .collection("activitylogs")
        .aggregate([
          {
            $match: {
              complaint: { $in: ids },
              action: "Status Updated to Resolved",
            },
          },
          { $sort: { timestamp: -1 } },
          {
            $group: {
              _id: "$complaint",
              role: { $first: "$role" },
              ts: { $first: "$timestamp" },
            },
          },
        ])
        .toArray();
      roleByComplaint = new Map(
        logs.map((l) => [String(l._id), { role: l.role, ts: l.ts }])
      );
    }

    const complaints = items.map((c) => ({
      id: String(c._id),
      code: c.complaintCode,
      title: c.title,
      status: c.status,
      assignedTo: c.assignedTo
        ? { name: c.assignedTo.name, role: c.assignedTo.role }
        : null,
      createdAt: c.createdAt,
      deadline: c.deadline || null,
      resolvedAt: c.resolvedAt || null,
      resolvedBy: (() => {
        const entry = roleByComplaint.get(String(c._id));
        return entry ? entry.role : null;
      })(),
    }));

    res.status(200).json({ complaints });
  } catch (err) {
    console.error("getDeanDepartmentComplaints error:", err?.message || err);
    res.status(500).json({ error: "Failed to fetch department complaints" });
  }
};
// HoD Analytics Summary
export const getHodAnalyticsSummary = async (req, res) => {
  try {
    const user = req.user;
    if (!user || String(user.role).toLowerCase() !== "hod") {
      return res.status(403).json({ error: "Access denied" });
    }

    const dept = user.department;
    if (!dept) {
      return res
        .status(400)
        .json({ error: "Department is required for HoD analytics" });
    }

    const [
      totalComplaints,
      resolvedComplaints,
      pendingComplaints,
      overdueComplaints,
    ] = await Promise.all([
      Complaint.countDocuments({
        department: dept,
        isDeleted: { $ne: true },
      }),
      Complaint.countDocuments({
        department: dept,
        status: "Resolved",
        isDeleted: { $ne: true },
      }),
      Complaint.countDocuments({
        department: dept,
        status: "Pending",
        isDeleted: { $ne: true },
      }),
      Complaint.countDocuments({
        department: dept,
        status: { $nin: ["Resolved", "Closed"] },
        deadline: { $lt: new Date() },
        isDeleted: { $ne: true },
      }),
    ]);

    const resolutionRate =
      totalComplaints > 0 ? (resolvedComplaints / totalComplaints) * 100 : 0;

    // Get average resolution time
    const resolvedComplaintsWithTimes = await Complaint.find({
      department: dept,
      status: "Resolved",
      createdAt: { $exists: true },
      updatedAt: { $exists: true },
      isDeleted: { $ne: true },
    }).select("createdAt updatedAt");

    let totalResolutionTime = 0;
    let resolvedCount = 0;

    resolvedComplaintsWithTimes.forEach((complaint) => {
      if (complaint.createdAt && complaint.updatedAt) {
        const resolutionTime = complaint.updatedAt - complaint.createdAt;
        totalResolutionTime += resolutionTime;
        resolvedCount++;
      }
    });

    const avgResolutionTime =
      resolvedCount > 0
        ? totalResolutionTime / resolvedCount / (1000 * 60 * 60 * 24)
        : 0;

    // Get user satisfaction
    const complaintsWithFeedback = await Complaint.find({
      department: dept,
      "feedback.rating": { $exists: true },
      isDeleted: { $ne: true },
    }).select("feedback.rating");

    let totalRating = 0;
    let totalReviews = 0;

    complaintsWithFeedback.forEach((complaint) => {
      if (complaint.feedback && typeof complaint.feedback.rating === "number") {
        totalRating += complaint.feedback.rating;
        totalReviews++;
      }
    });

    const userSatisfaction = totalReviews > 0 ? totalRating / totalReviews : 0;

    // Get staff managed
    const staffManaged = await User.countDocuments({
      role: "staff",
      department: dept,
      isActive: true,
    });

    res.status(200).json({
      totalComplaints,
      resolvedComplaints,
      pendingComplaints,
      avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
      resolutionRate: Math.round(resolutionRate * 10) / 10,
      userSatisfaction: Math.round(userSatisfaction * 10) / 10,
      totalReviews,
      overdueComplaints,
      staffManaged,
    });
  } catch (err) {
    console.error("getHodAnalyticsSummary error:", err?.message || err);
    res.status(500).json({ error: "Failed to fetch HoD analytics summary" });
  }
};

// HoD Staff Overview
export const getHodStaffOverview = async (req, res) => {
  try {
    const user = req.user;
    if (!user || String(user.role).toLowerCase() !== "hod") {
      return res.status(403).json({ error: "Access denied" });
    }

    const dept = user.department;
    if (!dept) {
      return res
        .status(400)
        .json({ error: "Department is required for HoD staff overview" });
    }

    // Get staff in the same department
    const staffMembers = await User.find({
      role: "staff",
      department: dept,
      isActive: true,
    }).select("_id name email");

    const staff = [];

    for (const staffMember of staffMembers) {
      const staffStats = await Complaint.aggregate([
        {
          $match: {
            assignedTo: staffMember._id,
            department: dept,
            $or: [{ isDeleted: { $exists: false } }, { isDeleted: false }],
          },
        },
        {
          $group: {
            _id: null,
            totalAssigned: { $sum: 1 },
            resolved: {
              $sum: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] },
            },
            pending: {
              $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] },
            },
            inProgress: {
              $sum: { $cond: [{ $eq: ["$status", "In Progress"] }, 1, 0] },
            },
            totalResolutionTime: {
              $sum: {
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
            },
            resolvedCount: {
              $sum: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] },
            },
            totalRating: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$status", "Resolved"] },
                      { $ne: ["$feedback.rating", null] },
                    ],
                  },
                  "$feedback.rating",
                  0,
                ],
              },
            },
            ratingCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$status", "Resolved"] },
                      { $ne: ["$feedback.rating", null] },
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

      const stats = staffStats[0] || {
        totalAssigned: 0,
        resolved: 0,
        pending: 0,
        inProgress: 0,
        totalResolutionTime: 0,
        resolvedCount: 0,
        totalRating: 0,
        ratingCount: 0,
      };

      staff.push({
        staffId: staffMember._id,
        name: staffMember.name || "Unknown",
        email: staffMember.email,
        totalAssigned: stats.totalAssigned,
        resolved: stats.resolved,
        pending: stats.pending,
        inProgress: stats.inProgress,
        successRate:
          stats.totalAssigned > 0
            ? Math.round((stats.resolved / stats.totalAssigned) * 100 * 10) / 10
            : 0,
        avgResolutionTime:
          stats.resolvedCount > 0
            ? Math.round(
                (stats.totalResolutionTime / stats.resolvedCount) * 10
              ) / 10
            : 0,
        avgRating:
          stats.ratingCount > 0
            ? Math.round((stats.totalRating / stats.ratingCount) * 10) / 10
            : 0,
      });
    }

    res.status(200).json({ staff });
  } catch (err) {
    console.error("getHodStaffOverview error:", err?.message || err);
    res.status(500).json({ error: "Failed to fetch HoD staff overview" });
  }
};

// HoD Monthly Trends
export const getHodAnalyticsMonthlyTrends = async (req, res) => {
  try {
    const user = req.user;
    if (!user || String(user.role).toLowerCase() !== "hod") {
      return res.status(403).json({ error: "Access denied" });
    }

    const dept = user.department;
    if (!dept) {
      return res
        .status(400)
        .json({ error: "Department is required for HoD monthly trends" });
    }

    const months = parseInt(req.query.months) || 6;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const startDate = new Date(year, new Date().getMonth() - months + 1, 1);
    const endDate = new Date(
      year,
      new Date().getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    const monthlyData = await Complaint.aggregate([
      {
        $match: {
          department: dept,
          createdAt: { $gte: startDate, $lte: endDate },
          $or: [{ isDeleted: { $exists: false } }, { isDeleted: false }],
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          submitted: { $sum: 1 },
          resolved: {
            $sum: {
              $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0],
            },
          },
          pending: {
            $sum: {
              $cond: [{ $eq: ["$status", "Pending"] }, 1, 0],
            },
          },
          totalResolutionTime: {
            $sum: {
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
          },
          resolvedCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          month: {
            $switch: {
              branches: [
                { case: { $eq: ["$_id.month", 1] }, then: "Jan" },
                { case: { $eq: ["$_id.month", 2] }, then: "Feb" },
                { case: { $eq: ["$_id.month", 3] }, then: "Mar" },
                { case: { $eq: ["$_id.month", 4] }, then: "Apr" },
                { case: { $eq: ["$_id.month", 5] }, then: "May" },
                { case: { $eq: ["$_id.month", 6] }, then: "Jun" },
                { case: { $eq: ["$_id.month", 7] }, then: "Jul" },
                { case: { $eq: ["$_id.month", 8] }, then: "Aug" },
                { case: { $eq: ["$_id.month", 9] }, then: "Sep" },
                { case: { $eq: ["$_id.month", 10] }, then: "Oct" },
                { case: { $eq: ["$_id.month", 11] }, then: "Nov" },
                { case: { $eq: ["$_id.month", 12] }, then: "Dec" },
              ],
              default: "Unknown",
            },
          },
          year: "$_id.year",
          submitted: 1,
          resolved: 1,
          pending: 1,
          avgResolutionTime: {
            $cond: [
              { $gt: ["$resolvedCount", 0] },
              { $divide: ["$totalResolutionTime", "$resolvedCount"] },
              0,
            ],
          },
        },
      },
      { $sort: { year: 1, "_id.month": 1 } },
    ]);

    res.status(200).json({ data: monthlyData });
  } catch (err) {
    console.error("getHodAnalyticsMonthlyTrends error:", err?.message || err);
    res.status(500).json({ error: "Failed to fetch HoD monthly trends" });
  }
}; //

// Department priority distribution
export const getDepartmentPriorityDistribution = async (req, res) => {
  try {
    const dept = req.user?.department;
    if (!dept) {
      return res
        .status(400)
        .json({ error: "Department is required for priority distribution" });
    }
    const pipeline = [
      { $match: { department: dept } },
      {
        $group: {
          _id: { $ifNull: ["$priority", "Unknown"] },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ];
    const results = await Complaint.aggregate(pipeline);
    const total = results.reduce((a, r) => a + (r.count || 0), 0);
    res.status(200).json({
      total,
      priorities: results.map((r) => ({ priority: r._id, count: r.count })),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch priority distribution" });
  }
};

// Department status distribution
export const getDepartmentStatusDistribution = async (req, res) => {
  try {
    const dept = req.user?.department;
    if (!dept) {
      return res
        .status(400)
        .json({ error: "Department is required for status distribution" });
    }
    const pipeline = [
      { $match: { department: dept } },
      {
        $group: {
          _id: { $ifNull: ["$status", "Unknown"] },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ];
    const results = await Complaint.aggregate(pipeline);
    const total = results.reduce((a, r) => a + (r.count || 0), 0);
    res.status(200).json({
      total,
      statuses: results.map((r) => ({ status: r._id, count: r.count })),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch status distribution" });
  }
};

// Department category distribution (distinct from global category counts)
export const getDepartmentCategoryCounts = async (req, res) => {
  try {
    const dept = req.user?.department;
    if (!dept) {
      return res
        .status(400)
        .json({ error: "Department is required for category distribution" });
    }
    const pipeline = [
      { $match: { department: dept } },
      {
        $group: {
          _id: { $ifNull: ["$category", "Unknown"] },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ];
    const results = await Complaint.aggregate(pipeline);
    const total = results.reduce((a, r) => a + (r.count || 0), 0);
    res.status(200).json({
      total,
      categories: results.map((r) => ({ category: r._id, count: r.count })),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch department categories" });
  }
};

// Monthly trend (submitted vs resolved) for department
export const getDepartmentMonthlyTrends = async (req, res) => {
  try {
    const dept = req.user?.department;
    if (!dept) {
      return res
        .status(400)
        .json({ error: "Department is required for monthly trends" });
    }
    const monthsParam = parseInt(req.query.months, 10);
    const months = isNaN(monthsParam) || monthsParam <= 0 ? 6 : monthsParam; // default last 6 months
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

    // Build a map for submitted counts
    const submitted = await Complaint.aggregate([
      { $match: { department: dept, createdAt: { $gte: start } } },
      {
        $group: {
          _id: {
            y: { $year: "$createdAt" },
            m: { $month: "$createdAt" },
          },
          submitted: { $sum: 1 },
        },
      },
    ]);
    // Build a map for resolved counts
    const resolved = await Complaint.aggregate([
      {
        $match: {
          department: dept,
          resolvedAt: { $ne: null, $gte: start },
          status: "Resolved",
        },
      },
      {
        $group: {
          _id: { y: { $year: "$resolvedAt" }, m: { $month: "$resolvedAt" } },
          resolved: { $sum: 1 },
        },
      },
    ]);

    const submittedMap = new Map();
    submitted.forEach((r) => {
      const key = `${r._id.y}-${r._id.m}`;
      submittedMap.set(key, r.submitted);
    });
    const resolvedMap = new Map();
    resolved.forEach((r) => {
      const key = `${r._id.y}-${r._id.m}`;
      resolvedMap.set(key, r.resolved);
    });

    // Build ordered month labels
    const data = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const monthLabel = d.toLocaleString("default", { month: "short" });
      data.push({
        month: monthLabel,
        year: d.getFullYear(),
        submitted: submittedMap.get(key) || 0,
        resolved: resolvedMap.get(key) || 0,
      });
    }
    res.status(200).json({ months: data.length, data });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch monthly trends" });
  }
};

// Staff performance aggregation for department
export const getDepartmentStaffPerformance = async (req, res) => {
  try {
    const dept = req.user?.department;
    if (!dept) {
      return res
        .status(400)
        .json({ error: "Department is required for staff performance" });
    }
    // Fetch staff in department first
    const staff = await User.find({ role: "staff", department: dept })
      .select("_id name email department")
      .lean();
    if (!staff.length) return res.status(200).json({ staff: [] });
    const staffIds = staff.map((s) => s._id);

    const agg = await Complaint.aggregate([
      { $match: { department: dept, assignedTo: { $in: staffIds } } },
      {
        $group: {
          _id: "$assignedTo",
          totalAssigned: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] },
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ["$status", "In Progress"] }, 1, 0] },
          },
          resolved: {
            $sum: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] },
          },
          sumResolutionMs: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "Resolved"] },
                    { $ifNull: ["$resolvedAt", false] },
                  ],
                },
                { $subtract: ["$resolvedAt", "$createdAt"] },
                0,
              ],
            },
          },
          resolvedCount: {
            $sum: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] },
          },
          ratingSum: {
            $sum: {
              $cond: [
                { $ifNull: ["$feedback.rating", false] },
                "$feedback.rating",
                0,
              ],
            },
          },
          ratingCount: {
            $sum: {
              $cond: [{ $ifNull: ["$feedback.rating", false] }, 1, 0],
            },
          },
        },
      },
    ]);

    const perfMap = new Map();
    agg.forEach((r) => perfMap.set(String(r._id), r));
    const results = staff.map((s) => {
      const stats = perfMap.get(String(s._id)) || {};
      const totalAssigned = stats.totalAssigned || 0;
      const resolved = stats.resolved || 0;
      const successRate = totalAssigned
        ? Number(((resolved / totalAssigned) * 100).toFixed(2))
        : 0;
      const avgResolutionHours = stats.resolvedCount
        ? Number(
            (stats.sumResolutionMs / stats.resolvedCount / 3600000).toFixed(2)
          )
        : 0;
      const avgRating = stats.ratingCount
        ? Number((stats.ratingSum / stats.ratingCount).toFixed(2))
        : 0;
      return {
        staffId: s._id,
        name: s.name || s.email,
        email: s.email,
        department: s.department,
        totalAssigned,
        pending: stats.pending || 0,
        inProgress: stats.inProgress || 0,
        resolved,
        successRate,
        avgResolutionHours,
        avgRating,
      };
    });
    res.status(200).json({ staff: results });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch staff performance" });
  }
};
// NOTE: end of getDepartmentStaffPerformance. Any stray code below was removed.
//
