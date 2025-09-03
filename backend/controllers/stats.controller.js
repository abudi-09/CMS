import Complaint from "../models/complaint.model.js";
import User from "../models/user.model.js";

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
    const dept = req.user?.department;
    if (!dept) {
      return res
        .status(400)
        .json({ error: "Department is required for HoD stats" });
    }

    const [total, pending, inProgress, resolved, unassigned] =
      await Promise.all([
        Complaint.countDocuments({ department: dept }),
        Complaint.countDocuments({ department: dept, status: "Pending" }),
        Complaint.countDocuments({
          department: dept,
          status: "In Progress",
        }),
        Complaint.countDocuments({ department: dept, status: "Resolved" }),
        Complaint.countDocuments({ department: dept, assignedTo: null }),
      ]);

    res.status(200).json({ total, pending, inProgress, resolved, unassigned });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch department stats" });
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
    console.log("🔍 Dean stats request received");
    console.log("👤 User role:", req.user?.role);
    console.log("👤 User ID:", req.user?._id);

    // First, let's get the total count without any filter to see if there are complaints
    const totalAll = await Complaint.countDocuments({
      isDeleted: { $ne: true },
    });
    console.log("📊 Total complaints in DB:", totalAll);

    if (totalAll === 0) {
      console.log("⚠️ No complaints found in database");
      return res.status(200).json({
        total: 0,
        pending: 0,
        inProgress: 0,
        resolved: 0,
        unassigned: 0,
      });
    }

    // Check how many complaints are sent to admin
    const adminComplaints = await Complaint.countDocuments({
      submittedTo: { $regex: /admin/i },
      isDeleted: { $ne: true },
    });
    console.log("👑 Complaints sent to admin:", adminComplaints);

    // Check how many complaints are escalated
    const escalatedComplaints = await Complaint.countDocuments({
      isEscalated: true,
      isDeleted: { $ne: true },
    });
    console.log("🚨 Escalated complaints:", escalatedComplaints);

    // Filter: exclude complaints sent to Admin OR escalated complaints
    const deanFilter = {
      $and: [
        // Exclude admin complaints
        {
          $or: [
            { submittedTo: { $exists: false } },
            { submittedTo: null },
            { submittedTo: { $not: /admin/i } },
          ],
        },
        // Exclude escalated complaints
        { isEscalated: { $ne: true } },
        // Exclude deleted complaints
        { $or: [{ isDeleted: { $exists: false } }, { isDeleted: false }] },
      ],
    };

    console.log(
      "🎯 Dean stats filter (excluding admin and escalated):",
      JSON.stringify(deanFilter, null, 2)
    );

    const [total, pending, inProgress, resolved, unassigned] =
      await Promise.all([
        Complaint.countDocuments(deanFilter),
        Complaint.countDocuments({ ...deanFilter, status: "Pending" }),
        Complaint.countDocuments({ ...deanFilter, status: "In Progress" }),
        Complaint.countDocuments({ ...deanFilter, status: "Resolved" }),
        Complaint.countDocuments({ ...deanFilter, assignedTo: null }),
      ]);

    console.log("✅ Dean stats counts:", {
      total,
      pending,
      inProgress,
      resolved,
      unassigned,
    });

    res.status(200).json({ total, pending, inProgress, resolved, unassigned });
  } catch (err) {
    console.error("❌ Dean stats error:", err?.message, err?.stack);
    res.status(500).json({
      error: "Failed to fetch dean-visible stats",
      details: err?.message,
    });
  }
};

// Admin calendar summary: counts for the logged-in admin, direct-to-admin-by-student complaints only
export const getAdminCalendarSummary = async (req, res) => {
  try {
    const user = req.user;
    if (!user || String(user.role).toLowerCase() !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    // Query params
    const assignedTo = req.query.assignedTo || String(user._id);
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
      ? new Date(String(req.query.submissionFrom))
      : null;
    const submissionTo = req.query.submissionTo
      ? new Date(String(req.query.submissionTo))
      : null;
    const deadlineFrom = req.query.deadlineFrom
      ? new Date(String(req.query.deadlineFrom))
      : null;
    const deadlineTo = req.query.deadlineTo
      ? new Date(String(req.query.deadlineTo))
      : null;

    // Base filter: assigned to this admin, submitted directly to admin, from student, not deleted
    const base = {
      isDeleted: { $ne: true },
      assignedTo: assignedTo,
      submittedTo: { $regex: /admin/i },
      sourceRole: { $regex: /^student$/i },
    };
    if (status && status !== "all") base.status = status;
    if (priority && priority !== "all") base.priority = priority;
    if (categories && categories.length) base.category = { $in: categories };
    // Attach optional submission/deadline range filters
    const submissionRange = {};
    if (submissionFrom) submissionRange.$gte = submissionFrom;
    if (submissionTo)
      submissionRange.$lte = new Date(
        new Date(submissionTo).setHours(23, 59, 59, 999)
      );
    if (Object.keys(submissionRange).length) base.createdAt = submissionRange;

    const deadlineRange = {};
    if (deadlineFrom) deadlineRange.$gte = deadlineFrom;
    if (deadlineTo)
      deadlineRange.$lte = new Date(
        new Date(deadlineTo).setHours(23, 59, 59, 999)
      );
    if (Object.keys(deadlineRange).length) base.deadline = deadlineRange;

    // Total for selected month based on viewType
    const monthFilter = {
      ...base,
      ...(viewType === "submission"
        ? {
            createdAt: {
              ...(base.createdAt || {}),
              $gte: monthStart,
              $lte: monthEnd,
            },
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
          createdAt: {
            ...(base.createdAt || {}),
            $gte: monthStart,
            $lte: monthEnd,
          },
        }),
      ]);

    // Breakdown aggregations for the selected month scope
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
    console.error("getAdminCalendarSummary error:", err?.message || err);
    return res
      .status(500)
      .json({ error: "Failed to fetch admin calendar summary" });
  }
};

// Admin calendar day list: complaints assigned to admin, direct-to-admin-by-student, for a specific date
export const getAdminCalendarDay = async (req, res) => {
  try {
    const user = req.user;
    if (!user || String(user.role).toLowerCase() !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    const assignedTo = req.query.assignedTo || String(user._id);
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
    const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
    const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);

    const base = {
      isDeleted: { $ne: true },
      assignedTo: assignedTo,
      submittedTo: { $regex: /admin/i },
      sourceRole: { $regex: /^student$/i },
    };
    if (status && status !== "all") base.status = status;
    if (priority && priority !== "all") base.priority = priority;
    if (categories && categories.length) base.category = { $in: categories };

    const dateFilter =
      viewType === "submission"
        ? { createdAt: { $gte: dayStart, $lte: dayEnd } }
        : { deadline: { $gte: dayStart, $lte: dayEnd } };

    const items = await Complaint.find({ ...base, ...dateFilter })
      .select(
        "title status priority category submittedBy createdAt submittedDate updatedAt lastUpdated deadline isEscalated submittedTo department sourceRole assignedByRole assignmentPath"
      )
      .populate("submittedBy", "name email")
      .lean();

    return res.status(200).json(items || []);
  } catch (err) {
    console.error("getAdminCalendarDay error:", err?.message || err);
    return res
      .status(500)
      .json({ error: "Failed to fetch admin calendar day complaints" });
  }
};
