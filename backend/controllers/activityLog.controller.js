import ActivityLog from "../models/activityLog.model.js";
import User from "../models/user.model.js";

// Get all logs for a complaint
export const getLogsForComplaint = async (req, res) => {
  try {
    const complaintId = req.params.id;
    const logs = await ActivityLog.find({ complaint: complaintId })
      .populate("user", "name email")
      .sort({ timestamp: -1 });
    res.status(200).json(logs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch activity logs" });
  }
};

// Get all logs (admin dashboard)
export const getAllLogs = async (req, res) => {
  try {
    const logs = await ActivityLog.find()
      .populate("user", "name email")
      .sort({ timestamp: -1 });
    res.status(200).json(logs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch activity logs" });
  }
};
