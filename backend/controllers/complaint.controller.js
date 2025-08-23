import Complaint from "../models/complaint.model.js";
import ActivityLog from "../models/activityLog.model.js";
import User, {
  normalizeRole as normalizeUserRole,
} from "../models/user.model.js";

// 1. User submits complaint
export const createComplaint = async (req, res) => {
  try {
    const {
      title,
      category,
      description,
      priority,
      department,
      deadline,
      evidenceFile,
      submittedTo,
      sourceRole,
      assignedByRole,
      assignmentPath,
    } = req.body;

    // Normalize any role-like strings to canonical roles to satisfy Complaint schema enums
    const normalizedSourceRole = normalizeUserRole(sourceRole || "student");
    const normalizedAssignedByRole = assignedByRole
      ? normalizeUserRole(assignedByRole)
      : null;
    const normalizedAssignmentPath = Array.isArray(assignmentPath)
      ? assignmentPath.map((r) => normalizeUserRole(r))
      : undefined;
    const complaint = new Complaint({
      title,
      category,
      description,
      priority: priority || "Medium",
      department,
      deadline: deadline ? new Date(deadline) : null,
      evidenceFile: evidenceFile || null,
      submittedTo: submittedTo || null,
      sourceRole: normalizedSourceRole,
      assignedByRole: normalizedAssignedByRole,
      assignmentPath: normalizedAssignmentPath,
      submittedBy: req.user._id,
    });

    await complaint.save();
    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      role: req.user.role,
      action: "Complaint Submitted",
      complaint: complaint._id,
      timestamp: new Date(),
      details: { title, category },
    });
    res.status(201).json({ message: "Complaint submitted", complaint });
  } catch (err) {
    res.status(500).json({ error: "Failed to submit complaint" });
  }
};

// 2. User views their complaints
// 2. User views/filter/search their complaints with feedback support
export const getMyComplaints = async (req, res) => {
  try {
    const { status, department, search } = req.query;

    const filters = {
      submittedBy: req.user._id,
    };

    if (status) filters.status = status;
    if (department) filters.department = department;
    if (search) {
      filters.title = { $regex: search, $options: "i" };
    }

    const complaints = await Complaint.find(filters)
      .populate("assignedTo", "name email")
      .sort({ updatedAt: -1 });

    const formatted = complaints.map((c) => ({
      id: c._id,
      title: c.title,
      status: c.status,
      department: c.department,
      category: c.category,
      submittedDate: c.createdAt,
      lastUpdated: c.updatedAt,
      assignedTo: c.assignedTo?.name || null,
      deadline: c.deadline || null,
      sourceRole: c.sourceRole,
      assignedByRole: c.assignedByRole,
      assignmentPath: c.assignmentPath || [],
      submittedTo: c.submittedTo || null,
      feedback: c.status === "Resolved" ? c.feedback || null : null,
      isEscalated: c.isEscalated || false,
    }));

    res.status(200).json(formatted);
  } catch (err) {
    console.error("Get my complaints error:", err.message);
    res.status(500).json({ error: "Failed to fetch complaints" });
  }
};

// 3. Admin views all complaints
export const getAllComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate("submittedBy", "name")
      .populate("assignedTo", "name");
    const formatted = complaints.map((c) => ({
      id: c._id,
      title: c.title,
      status: c.status,
      department: c.department,
      category: c.category,
      submittedDate: c.createdAt,
      lastUpdated: c.updatedAt,
      assignedTo: c.assignedTo?.name || null,
      submittedBy: c.submittedBy?.name || null,
      deadline: c.deadline || null,
      sourceRole: c.sourceRole,
      assignedByRole: c.assignedByRole,
      assignmentPath: c.assignmentPath || [],
      submittedTo: c.submittedTo || null,
      feedback: c.status === "Resolved" ? c.feedback || null : null,
      isEscalated: c.isEscalated || false,
    }));
    res.status(200).json(formatted);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch all complaints" });
  }
};

// 4. Admin assigns or reassigns complaint to staff
export const assignComplaint = async (req, res) => {
  try {
    const complaintId = req.params.id;
    const { staffId, deadline, assignedByRole, assignmentPath } = req.body;

    const staff = await User.findById(staffId);
    if (!staff || staff.role !== "staff" || !staff.isApproved) {
      return res.status(400).json({ error: "Invalid staff member" });
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    const wasPreviouslyAssigned = !!complaint.assignedTo;

    complaint.assignedTo = staffId;
    complaint.status = "In Progress";
    complaint.assignedAt = new Date();
    if (deadline) complaint.deadline = new Date(deadline);
    if (assignedByRole)
      complaint.assignedByRole = normalizeUserRole(assignedByRole);
    if (Array.isArray(assignmentPath))
      complaint.assignmentPath = assignmentPath.map((r) =>
        normalizeUserRole(r)
      );

    // Optional: Add reassignment history here if needed
    await complaint.save();

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      role: req.user.role,
      action: wasPreviouslyAssigned
        ? "Complaint Reassigned"
        : "Complaint Assigned",
      complaint: complaint._id,
      timestamp: new Date(),
      details: { staffId },
    });

    const message = wasPreviouslyAssigned
      ? "Complaint reassigned successfully"
      : "Complaint assigned successfully";

    res.status(200).json({ message, complaint });
  } catch (err) {
    res.status(500).json({ error: "Failed to (re)assign complaint" });
  }
};

// 5. Staff updates complaint status
export const updateComplaintStatus = async (req, res) => {
  try {
    const complaintId = req.params.id;
    const { status, description } = req.body;

    if (!["Pending", "In Progress", "Resolved"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const complaint = await Complaint.findById(complaintId);

    if (!complaint)
      return res.status(404).json({ error: "Complaint not found" });

    if (
      !complaint.assignedTo?.equals(req.user._id) &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ error: "Not authorized to update this complaint" });
    }

    complaint.status = status;
    await complaint.save();

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      role: req.user.role,
      action: `Status Updated to ${status}`,
      complaint: complaint._id,
      timestamp: new Date(),
      details: { description },
    });

    res.status(200).json({ message: "Status updated", complaint });
  } catch (err) {
    res.status(500).json({ error: "Failed to update status" });
  }
};

// Get all complaints assigned to the logged-in staff
export const getAssignedComplaints = async (req, res) => {
  try {
    const staffId = req.user._id; // Ensure the user is staff
    if (req.user.role !== "staff" || !req.user.isApproved) {
      return res.status(403).json({ error: "Access denied: Staff only" });
    }

    const complaints = await Complaint.find({ assignedTo: staffId })
      .populate("submittedBy", "name email") // Populate user details
      .sort({ updatedAt: -1 }); // Most recently updated first

    const formatted = complaints.map((c) => ({
      id: c._id,
      title: c.title,
      category: c.category,
      status: c.status,
      submittedDate: c.createdAt,
      lastUpdated: c.updatedAt,
      submittedBy: {
        name: c.submittedBy.name,
        email: c.submittedBy.email,
      },
      shortDescription: c.shortDescription,
      fullDescription: c.description,
      isEscalated: c.isEscalated || false,
      deadline: c.deadline || null,
      sourceRole: c.sourceRole,
      assignedByRole: c.assignedByRole,
      assignmentPath: c.assignmentPath || [],
    }));

    res.status(200).json(formatted);
  } catch (error) {
    console.error("Error fetching assigned complaints:", error.message);
    res.status(500).json({ error: "Failed to fetch assigned complaints" });
  }
};

// 6. User submits feedback after resolution
export const giveFeedback = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint)
      return res.status(404).json({ error: "Complaint not found" });
    if (!complaint.submittedBy.equals(req.user._id)) {
      return res.status(403).json({ error: "Not authorized to give feedback" });
    }

    if (complaint.status !== "Resolved") {
      return res
        .status(400)
        .json({ error: "You can only give feedback on resolved complaints" });
    }

    const { rating, comment } = req.body;

    complaint.feedback = { rating, comment };
    await complaint.save();

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      role: req.user.role,
      action: "Feedback Given",
      complaint: complaint._id,
      timestamp: new Date(),
      details: { rating, comment },
    });

    res.status(200).json({ message: "Feedback submitted", complaint });
  } catch (err) {
    res.status(500).json({ error: "Failed to submit feedback" });
  }
};

export const getAllFeedback = async (req, res) => {
  try {
    const complaints = await Complaint.find({
      status: "Resolved",
      "feedback.comment": { $exists: true },
    })
      .populate("submittedBy", "name email")
      .populate("assignedTo", "name email");

    const feedbackList = complaints.map((c) => ({
      complaintId: c._id,
      title: c.title,
      submittedBy: c.submittedBy,
      assignedTo: c.assignedTo,
      feedback: c.feedback,
      resolvedAt: c.updatedAt,
    }));

    res.status(200).json(feedbackList);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
};
