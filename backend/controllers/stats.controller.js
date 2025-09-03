import Complaint from "../models/complaint.model.js";
import User from "../models/user.model.js";

// Complaints Stats //  admin
export const getComplaintStats = async (req, res) => {
  try {
    const [total, pending, inProgress, resolved, unassigned] =
      await Promise.all([
        Complaint.countDocuments(),
        Complaint.countDocuments({ status: "Pending" }),
        Complaint.countDocuments({ status: "In Progress" }),
        Complaint.countDocuments({ status: "Resolved" }),
        Complaint.countDocuments({ assignedTo: null }),
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
      Complaint.countDocuments({ assignedTo: staffId }),
      Complaint.countDocuments({ assignedTo: staffId, status: "Pending" }),
      Complaint.countDocuments({ assignedTo: staffId, status: "In Progress" }),
      Complaint.countDocuments({ assignedTo: staffId, status: "Resolved" }),
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
      Complaint.countDocuments({ submittedBy: userId }),
      Complaint.countDocuments({ submittedBy: userId, status: "Pending" }),
      Complaint.countDocuments({ submittedBy: userId, status: "In Progress" }),
      Complaint.countDocuments({ submittedBy: userId, status: "Resolved" }),
      Complaint.countDocuments({ submittedBy: userId, status: "Closed" }),
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
    const totalAll = await Complaint.countDocuments();
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
    });
    console.log("👑 Complaints sent to admin:", adminComplaints);

    // Check how many complaints are escalated
    const escalatedComplaints = await Complaint.countDocuments({
      isEscalated: true,
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

// ===================== NEW: Department Analytics (HoD) ===================== //

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
