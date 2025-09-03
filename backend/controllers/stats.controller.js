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
