import ActivityLog from "../models/activityLog.model.js";
import User from "../models/user.model.js";

export const getLogsForComplaint = async (req, res) => {
  if (req.query.example === "true") {
    return res.status(200).json([
      {
        _id: "log1",
        action: "Complaint Submitted",
        user: { name: "John Doe", email: "john@example.com" },
        role: "student",
        timestamp: new Date().toISOString(),
        details: { complaintId: req.params.id },
      },
      {
        _id: "log2",
        action: "Status Updated to In Progress",
        user: { name: "IT Support Team", email: "it@example.com" },
        role: "staff",
        timestamp: new Date().toISOString(),
        details: { status: "In Progress" },
      },
      {
        _id: "log3",
        action: "Feedback Given",
        user: { name: "Sarah Johnson", email: "sarah@example.com" },
        role: "student",
        timestamp: new Date().toISOString(),
        details: { rating: 5, comment: "Great job!" },
      },
    ]);
  }
  try {
    const complaintId = req.params.id;
    const logs = await ActivityLog.find({ complaint: complaintId })
      .populate("user", "name email")
      .sort({ timestamp: 1 }); // Sort ascending (oldest first)
    res.status(200).json(logs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch activity logs" });
  }
};

// Create a new activity log entry
export const createActivityLog = async (req, res) => {
  try {
    const { complaintId, action, description, performedBy, role } = req.body;

    console.log("Creating activity log:", {
      complaintId,
      action,
      description,
      performedBy,
      role,
    });

    if (!complaintId || !action || !description) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const activityLog = new ActivityLog({
      complaint: complaintId,
      action,
      user: performedBy,
      role: role || "unknown",
      timestamp: new Date(),
      details: {
        description: description,
      },
    });

    await activityLog.save();
    console.log("Activity log saved successfully");

    // Populate user data for response
    await activityLog.populate("user", "name email");

    res.status(201).json(activityLog);
  } catch (err) {
    console.error("Error creating activity log:", err);
    res.status(500).json({ error: "Failed to create activity log" });
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
