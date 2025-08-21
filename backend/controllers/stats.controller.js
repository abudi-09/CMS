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
