import Complaint from "../models/complaint.model.js";
import mongoose from "mongoose";
import ActivityLog from "../models/activityLog.model.js";
import User, {
  normalizeRole as normalizeUserRole,
} from "../models/user.model.js";
import { sendComplaintUpdateEmail } from "../utils/sendComplaintUpdateEmail.js";

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
      // Optional: when user selects a specific staff for direct complaints
      recipientStaffId,
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
      // Complaint schema defines _id as String, so we must provide one
      _id: new mongoose.Types.ObjectId().toString(),
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

    // If this is a direct-to-staff submission, set assignment immediately
    if (recipientStaffId) {
      const staff = await User.findById(recipientStaffId).select(
        "role isApproved isActive department"
      );
      if (!staff)
        return res.status(400).json({ error: "Recipient staff not found" });
      if (staff.role !== "staff" || !staff.isApproved || !staff.isActive)
        return res
          .status(400)
          .json({ error: "Recipient is not an active approved staff" });
      // Enforce same department for students
      if (
        req.user.role === "student" &&
        department &&
        staff.department &&
        staff.department !== department
      ) {
        return res
          .status(400)
          .json({ error: "Recipient must be in your department" });
      }
      complaint.assignedTo = staff._id;
      complaint.assignedAt = new Date();
      // Keep complaint status Pending until staff accepts; staff can move it to In Progress
      complaint.status = "Pending";
    }

    await complaint.save();
    try {
      console.log("[DEBUG] Complaint created:", {
        _id: complaint._id.toString(),
        complaintCode: complaint.complaintCode,
        title: complaint.title,
        category: complaint.category,
        priority: complaint.priority,
        department: complaint.department,
        submittedBy: complaint.submittedBy?.toString(),
        evidenceFile: complaint.evidenceFile || null,
      });
    } catch (_) {}
    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      role: req.user.role,
      action: "Complaint Submitted",
      complaint: complaint._id,
      timestamp: new Date(),
      details: { title, category, complaintCode: complaint.complaintCode },
    });
    const response = {
      id: complaint._id.toString(), // real database id
      complaintCode: complaint.complaintCode, // human-friendly code
      title: complaint.title,
      category: complaint.category,
      description: complaint.description,
      priority: complaint.priority,
      department: complaint.department,
      status: complaint.status,
      submittedDate: complaint.createdAt,
      lastUpdated: complaint.updatedAt,
      assignedTo: complaint.assignedTo,
    };
    res
      .status(201)
      .json({ message: "Complaint submitted", complaint: response });
  } catch (err) {
    console.error("Create complaint error:", err.message, err.stack);
    res
      .status(500)
      .json({ error: "Failed to submit complaint", details: err.message });
  }
};

// 2. User views their complaints
// 2. User views/filter/search their complaints with feedback support
export const getMyComplaints = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { status, department, search } = req.query;

    const filters = {
      submittedBy: req.user._id,
    };

    if (status) filters.status = status;
    if (department) filters.department = department;
    if (search) {
      filters.title = { $regex: search, $options: "i" };
    }

    let complaints;
    try {
      complaints = await Complaint.find(filters)
        .populate("assignedTo", "name email")
        .sort({ updatedAt: -1 });
    } catch (innerErr) {
      console.error("[getMyComplaints] Query failure:", innerErr);
      throw innerErr;
    }

    const formatted = complaints
      .map((c, idx) => {
        if (!c) {
          console.warn(`[getMyComplaints] Null complaint at index ${idx}`);
          return null;
        }
        let idString = "";
        try {
          idString = c._id ? c._id.toString() : "";
        } catch (e) {
          console.error(
            "[getMyComplaints] _id toString failed for complaint",
            c?._id,
            e
          );
        }
        return {
          id: idString,
          complaintCode: c.complaintCode || null,
          title: c.title || "Untitled Complaint",
          status: c.status || "Pending",
          department: c.department || null,
          category: c.category || null,
          submittedDate: c.createdAt || null,
          lastUpdated: c.updatedAt || null,
          assignedTo: c.assignedTo?.name || null,
          deadline: c.deadline || null,
          sourceRole: c.sourceRole || null,
          assignedByRole: c.assignedByRole || null,
          assignmentPath: Array.isArray(c.assignmentPath)
            ? c.assignmentPath
            : [],
          submittedTo: c.submittedTo || null,
          feedback: c.status === "Resolved" ? c.feedback || null : null,
          isEscalated: !!c.isEscalated,
        };
      })
      .filter(Boolean);

    res.status(200).json(formatted);
  } catch (err) {
    console.error(
      "Get my complaints error:",
      err && err.message,
      err && err.stack
    );
    res
      .status(500)
      .json({ error: "Failed to fetch complaints", details: err?.message });
  }
};

// 3. Admin views all complaints
export const getAllComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate("submittedBy", "name")
      .populate("assignedTo", "name")
      .lean();

    const formatted = (complaints || [])
      .map((c, idx) => {
        try {
          const id = c && c._id ? String(c._id) : "";
          const assignedToName =
            c?.assignedTo && typeof c.assignedTo === "object"
              ? c.assignedTo.name || null
              : null;
          const submittedByName =
            c?.submittedBy && typeof c.submittedBy === "object"
              ? c.submittedBy.name || null
              : null;
          return {
            id,
            complaintCode: c?.complaintCode ?? null,
            title: c?.title ?? "Untitled Complaint",
            status: c?.status ?? "Pending",
            priority: c?.priority || "Medium",
            department: c?.department ?? null,
            category: c?.category ?? null,
            submittedDate: c?.createdAt ?? null,
            lastUpdated: c?.updatedAt ?? null,
            resolvedAt: c?.resolvedAt ?? null,
            assignedTo: assignedToName,
            submittedBy: submittedByName,
            deadline: c?.deadline ?? null,
            sourceRole: c?.sourceRole ?? null,
            assignedByRole: c?.assignedByRole ?? null,
            assignmentPath: Array.isArray(c?.assignmentPath)
              ? c.assignmentPath
              : [],
            submittedTo: c?.submittedTo ?? null,
            feedback: c?.status === "Resolved" ? c?.feedback || null : null,
            isEscalated: !!c?.isEscalated,
          };
        } catch (e) {
          console.error("[getAllComplaints] Format error at index", idx, e);
          return null;
        }
      })
      .filter(Boolean);
    res.status(200).json(formatted);
  } catch (error) {
    console.error("getAllComplaints error:", error?.message, error?.stack);
    res.status(500).json({
      error: "Failed to fetch all complaints",
      details: error?.message,
    });
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

    // If dean is assigning, enforce same-department assignment
    if (req.user.role === "dean") {
      // Dean can only assign staff within their own department
      if (!req.user.department || !staff.department) {
        return res
          .status(400)
          .json({ error: "Department information missing for assignment" });
      }
      if (String(staff.department) !== String(req.user.department)) {
        return res
          .status(403)
          .json({ error: "Can only assign staff in your department" });
      }
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
    // Ensure dean is recorded in assignment path when dean assigns
    if (req.user.role === "dean") {
      if (!Array.isArray(complaint.assignmentPath))
        complaint.assignmentPath = [];
      if (!complaint.assignmentPath.includes("dean"))
        complaint.assignmentPath.push("dean");
    }

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

// 4b. Admin approves a pending complaint (without assigning yet)
export const approveComplaint = async (req, res) => {
  try {
    const complaintId = req.params.id;
    const { note, assignToSelf } = req.body || {};
    const complaint = await Complaint.findById(complaintId);
    if (!complaint)
      return res.status(404).json({ error: "Complaint not found" });
    if (complaint.status !== "Pending") {
      return res
        .status(400)
        .json({ error: "Only pending complaints can be approved" });
    }
    // Mark as in progress to signal it's been accepted for handling
    complaint.status = "In Progress";
    complaint.assignedByRole = normalizeUserRole(req.user.role);
    if (!complaint.assignmentPath) complaint.assignmentPath = [];
    if (!complaint.assignmentPath.includes(req.user.role)) {
      complaint.assignmentPath.push(normalizeUserRole(req.user.role));
    }
    // If approver wants to take ownership
    if (assignToSelf === true) {
      complaint.assignedTo = req.user._id;
      complaint.assignedAt = new Date();
    }
    if (note && String(note).trim()) {
      const ts = new Date().toISOString();
      const prefix = `[${ts}]`;
      complaint.resolutionNote = complaint.resolutionNote
        ? `${complaint.resolutionNote}\n${prefix} ${note}`
        : `${prefix} ${note}`;
    }
    await complaint.save();

    // Notify student when HoD accepts (moves to In Progress). Dean accept may also notify.
    try {
      if (
        complaint.status === "In Progress" &&
        (req.user.role === "hod" || req.user.role === "dean")
      ) {
        const submitter = await User.findById(complaint.submittedBy).select(
          "name email"
        );
        if (submitter?.email) {
          await sendComplaintUpdateEmail({
            to: submitter.email,
            studentName: submitter.name,
            complaintCode: complaint.complaintCode,
            title: complaint.title,
            action: "accepted",
            byRole: req.user.role?.toUpperCase?.() || req.user.role,
            note,
          });
        }
      }
    } catch (e) {
      console.warn("[approveComplaint] email notify failed:", e?.message);
    }

    await ActivityLog.create({
      user: req.user._id,
      role: req.user.role,
      action: "Complaint Approved",
      complaint: complaint._id,
      timestamp: new Date(),
      details: { status: complaint.status, assignToSelf: !!assignToSelf },
    });

    res.status(200).json({ message: "Complaint approved", complaint });
  } catch (err) {
    res.status(500).json({ error: "Failed to approve complaint" });
  }
};

// Dean reassigns a complaint to HoD with deadline (remains Pending for HoD to accept)

// Role-scoped inboxes for dean/hod: show relevant Pending items
export const getDeanInbox = async (req, res) => {
  try {
    if (req.user.role !== "dean")
      return res.status(403).json({ error: "Access denied" });
    // Student -> Dean submissions or items in dean path that are still pending (not escalated/admin)
    const filter = {
      status: "Pending",
      isEscalated: { $ne: true },
      $and: [
        {
          $or: [
            { submittedTo: { $regex: /dean/i } },
            { assignmentPath: { $in: ["dean"] } },
          ],
        },
        {
          $or: [
            { submittedTo: { $exists: false } },
            { submittedTo: null },
            { submittedTo: { $not: /admin/i } },
          ],
        },
      ],
    };
    const complaints = await Complaint.find(filter)
      .populate("submittedBy", "name email")
      .sort({ createdAt: -1 })
      .limit(100);
    res.status(200).json(
      complaints.map((c) => ({
        id: c._id,
        title: c.title,
        category: c.category,
        status: c.status,
        priority: c.priority,
        submittedDate: c.createdAt,
        lastUpdated: c.updatedAt,
        assignedTo: c.assignedTo,
        submittedBy: c.submittedBy?.name || c.submittedBy?.email,
        deadline: c.deadline,
        assignedByRole: c.assignedByRole,
        assignmentPath: c.assignmentPath || [],
        submittedTo: c.submittedTo,
        sourceRole: c.sourceRole,
        department: c.department,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch dean inbox" });
  }
};

// Dean reassigns a complaint to HoD with deadline (remains Pending for HoD to accept)
export const deanAssignToHod = async (req, res) => {
  try {
    if (req.user.role !== "dean") {
      return res.status(403).json({ error: "Only deans can assign to HoD" });
    }
    const complaintId = req.params.id;
    const { hodId, deadline } = req.body || {};
    const hod = await User.findById(hodId).select("role isApproved isActive");
    if (!hod || hod.role !== "hod" || !hod.isApproved || !hod.isActive) {
      return res.status(400).json({ error: "Invalid HOD recipient" });
    }
    const complaint = await Complaint.findById(complaintId);
    if (!complaint)
      return res.status(404).json({ error: "Complaint not found" });
    // Set assignment details for HoD acceptance
    complaint.assignedTo = hod._id;
    complaint.assignedAt = new Date();
    complaint.status = "Pending"; // Pending until HoD accepts
    if (deadline) complaint.deadline = new Date(deadline);
    complaint.assignedByRole = "dean";
    if (!Array.isArray(complaint.assignmentPath)) complaint.assignmentPath = [];
    // Ensure path shows dean -> hod
    if (!complaint.assignmentPath.includes("dean"))
      complaint.assignmentPath.push("dean");
    if (!complaint.assignmentPath.includes("hod"))
      complaint.assignmentPath.push("hod");
    await complaint.save();

    await ActivityLog.create({
      user: req.user._id,
      role: req.user.role,
      action: "Assigned To HoD",
      complaint: complaint._id,
      timestamp: new Date(),
      details: { hodId, deadline: complaint.deadline },
    });

    res.status(200).json({
      message: "Complaint assigned to HoD (pending acceptance)",
      complaint,
    });
  } catch (err) {
    console.error("deanAssignToHod error:", err?.message);
    res.status(500).json({ error: "Failed to assign to HoD" });
  }
};

// Role-scoped inboxes for hod: show relevant Pending items

// HoD: assign or reassign a complaint to a staff member in the same department
export const hodAssignToStaff = async (req, res) => {
  try {
    if (req.user.role !== "hod") {
      return res.status(403).json({ error: "Access denied: HoD only" });
    }
    const complaintId = req.params.id;
    const { staffId, deadline } = req.body || {};

    const staff = await User.findById(staffId).select(
      "role isApproved isActive department"
    );
    if (
      !staff ||
      staff.role !== "staff" ||
      !staff.isApproved ||
      !staff.isActive
    ) {
      return res.status(400).json({ error: "Invalid staff member" });
    }
    // Enforce same department
    if (!req.user.department || !staff.department) {
      return res
        .status(400)
        .json({ error: "Department information missing for assignment" });
    }
    if (String(staff.department) !== String(req.user.department)) {
      return res
        .status(403)
        .json({ error: "Can only assign staff in your department" });
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint)
      return res.status(404).json({ error: "Complaint not found" });

    const wasPreviouslyAssigned = !!complaint.assignedTo;

    complaint.assignedTo = staff._id;
    complaint.assignedAt = new Date();
    complaint.status = "In Progress";
    if (deadline) complaint.deadline = new Date(deadline);
    complaint.assignedByRole = "hod";
    if (!Array.isArray(complaint.assignmentPath)) complaint.assignmentPath = [];
    if (!complaint.assignmentPath.includes("hod"))
      complaint.assignmentPath.push("hod");
    if (!complaint.assignmentPath.includes("staff"))
      complaint.assignmentPath.push("staff");

    await complaint.save();

    await ActivityLog.create({
      user: req.user._id,
      role: req.user.role,
      action: wasPreviouslyAssigned
        ? "Complaint Reassigned"
        : "Complaint Assigned",
      complaint: complaint._id,
      timestamp: new Date(),
      details: {
        staffId: staff._id,
        assignedByRole: "hod",
        deadline: complaint.deadline,
      },
    });

    res.status(200).json({ message: "Complaint assigned to staff", complaint });
  } catch (err) {
    console.error("hodAssignToStaff error:", err?.message);
    res.status(500).json({ error: "Failed to assign complaint" });
  }
};

// HoD: list complaints the HoD manages (self-accepted, or assigned to staff in same department)
export const getHodManagedComplaints = async (req, res) => {
  try {
    if (req.user.role !== "hod")
      return res.status(403).json({ error: "Access denied" });
    const dept = req.user.department;
    // Find staff in same department
    const staffInDept = await User.find({ role: "staff", department: dept })
      .select("_id")
      .lean();
    const staffIds = staffInDept.map((s) => s._id);

    const filter = {
      $or: [
        // Items accepted by HoD (assigned to self)
        { assignedTo: req.user._id },
        // Items assigned to staff in same department
        { assignedTo: { $in: staffIds } },
      ],
    };

    const complaints = await Complaint.find(filter)
      .populate("submittedBy", "name email")
      .populate("assignedTo", "name email role")
      .sort({ updatedAt: -1 })
      .limit(500)
      .lean();

    const formatted = complaints.map((c) => ({
      id: String(c._id),
      title: c.title,
      category: c.category,
      status: c.status,
      priority: c.priority,
      submittedDate: c.createdAt,
      lastUpdated: c.updatedAt,
      assignedTo:
        c.assignedTo && typeof c.assignedTo === "object"
          ? c.assignedTo.name || c.assignedTo.email
          : null,
      submittedBy:
        c.submittedBy && typeof c.submittedBy === "object"
          ? c.submittedBy.name || c.submittedBy.email
          : null,
      deadline: c.deadline,
      assignedByRole: c.assignedByRole,
      assignmentPath: Array.isArray(c.assignmentPath) ? c.assignmentPath : [],
      submittedTo: c.submittedTo,
      sourceRole: c.sourceRole,
      department: c.department,
    }));

    res.status(200).json(formatted);
  } catch (err) {
    console.error("getHodManagedComplaints error:", err?.message);
    res.status(500).json({ error: "Failed to fetch HoD managed complaints" });
  }
};
export const getHodInbox = async (req, res) => {
  try {
    if (req.user.role !== "hod")
      return res.status(403).json({ error: "Access denied" });
    const filter = {
      status: "Pending",
      isEscalated: { $ne: true },
      $or: [
        { submittedTo: { $regex: /hod/i } },
        { assignedTo: req.user._id },
        { assignmentPath: { $in: ["hod", "headOfDepartment"] } },
      ],
    };
    const complaints = await Complaint.find(filter)
      .populate("submittedBy", "name email")
      .sort({ createdAt: -1 })
      .limit(100);
    res.status(200).json(
      complaints.map((c) => ({
        id: c._id,
        title: c.title,
        category: c.category,
        status: c.status,
        priority: c.priority,
        submittedDate: c.createdAt,
        lastUpdated: c.updatedAt,
        assignedTo: c.assignedTo,
        submittedBy: c.submittedBy?.name || c.submittedBy?.email,
        deadline: c.deadline,
        assignedByRole: c.assignedByRole,
        assignmentPath: c.assignmentPath || [],
        submittedTo: c.submittedTo,
        sourceRole: c.sourceRole,
        department: c.department,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch HOD inbox" });
  }
};

// HoD: Fetch all relevant data grouped by movement tabs
export const getHodAll = async (req, res) => {
  try {
    if (req.user.role !== "hod")
      return res.status(403).json({ error: "Access denied" });

    const dept = req.user.department;
    // Find staff in same department
    const staffInDept = await User.find({ role: "staff", department: dept })
      .select("_id name email")
      .lean();
    const staffIds = staffInDept.map((s) => s._id);

    // Pending (Inbox for HoD)
    const inboxFilter = {
      status: "Pending",
      isEscalated: { $ne: true },
      $or: [
        { submittedTo: { $regex: /hod/i } },
        { assignedTo: req.user._id },
        { assignmentPath: { $in: ["hod", "headOfDepartment"] } },
      ],
    };
    const inbox = await Complaint.find(inboxFilter)
      .populate("submittedBy", "name email")
      .populate("assignedTo", "name email role")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    // Managed (self or staff in dept)
    const managedFilter = {
      $or: [{ assignedTo: req.user._id }, { assignedTo: { $in: staffIds } }],
    };
    const managed = await Complaint.find(managedFilter)
      .populate("submittedBy", "name email")
      .populate("assignedTo", "name email role")
      .sort({ updatedAt: -1 })
      .limit(1000)
      .lean();

    const mapItem = (c) => ({
      id: String(c._id),
      title: c.title,
      category: c.category,
      status: c.status,
      priority: c.priority,
      submittedDate: c.createdAt,
      lastUpdated: c.updatedAt,
      assignedTo:
        c.assignedTo && typeof c.assignedTo === "object"
          ? c.assignedTo.name || c.assignedTo.email
          : null,
      submittedBy:
        c.submittedBy && typeof c.submittedBy === "object"
          ? c.submittedBy.name || c.submittedBy.email
          : null,
      deadline: c.deadline,
      assignedByRole: c.assignedByRole,
      assignmentPath: Array.isArray(c.assignmentPath) ? c.assignmentPath : [],
      submittedTo: c.submittedTo,
      sourceRole: c.sourceRole,
      department: c.department,
    });

    // Helper to check if assigned to current HoD
    const isSelf = (c) =>
      c.assignedTo &&
      typeof c.assignedTo === "object" &&
      String(c.assignedTo._id || c.assignedTo) === String(req.user._id);

    const pending = inbox.map(mapItem).filter((c) => !c.assignedTo);

    const accepted = managed
      .filter((c) =>
        ["In Progress", "Assigned", "Pending"].includes(String(c.status || ""))
      )
      .filter(
        (c) =>
          String(c.assignedTo?._id || c.assignedTo) === String(req.user._id)
      )
      .map(mapItem);

    const assigned = managed
      .filter((c) =>
        ["In Progress", "Assigned", "Pending"].includes(String(c.status || ""))
      )
      .filter(
        (c) =>
          c.assignedTo &&
          staffIds.some(
            (id) => String(id) === String(c.assignedTo?._id || c.assignedTo)
          )
      )
      .map(mapItem);

    // Resolved in department scope (self or staff)
    const resolved = managed
      .filter((c) => String(c.status) === "Resolved")
      .map(mapItem);

    const rejected = managed
      .filter((c) => String(c.status) === "Closed")
      .map(mapItem)
      .map((c) => ({ ...c, assignedTo: "Rejected" }));

    const result = {
      pending,
      accepted,
      assigned,
      resolved,
      rejected,
      counts: {
        pending: pending.length,
        accepted: accepted.length,
        assigned: assigned.length,
        resolved: resolved.length,
        rejected: rejected.length,
      },
      lastUpdated: new Date().toISOString(),
    };

    res.status(200).json(result);
  } catch (err) {
    console.error("getHodAll error:", err?.message);
    res.status(500).json({ error: "Failed to fetch HoD data" });
  }
};

// 5. Staff updates complaint status
export const updateComplaintStatus = async (req, res) => {
  try {
    const complaintId = req.params.id;
    const { status, description } = req.body;

    if (!["Pending", "In Progress", "Resolved", "Closed"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const complaint = await Complaint.findById(complaintId);

    if (!complaint)
      return res.status(404).json({ error: "Complaint not found" });

    const isAssignedToSelf =
      complaint.assignedTo && complaint.assignedTo.equals(req.user._id);
    const canCloseAsLeader =
      status === "Closed" && ["hod", "dean"].includes(req.user.role);
    if (!isAssignedToSelf && req.user.role !== "admin" && !canCloseAsLeader) {
      return res
        .status(403)
        .json({ error: "Not authorized to update this complaint" });
    }

    complaint.status = status;
    if (description) {
      const ts = new Date().toISOString();
      const prefix = `[${ts}]`;
      complaint.resolutionNote = complaint.resolutionNote
        ? `${complaint.resolutionNote}\n${prefix} ${description}`
        : `${prefix} ${description}`;
    }
    if (status === "Resolved") {
      complaint.resolvedAt = new Date();
    }
    await complaint.save();

    // If HoD closes as rejection, notify the student
    try {
      if (status === "Closed") {
        const actorRole = req.user.role;
        if (
          actorRole === "hod" ||
          actorRole === "dean" ||
          actorRole === "staff"
        ) {
          const submitter = await User.findById(complaint.submittedBy).select(
            "name email"
          );
          if (submitter?.email) {
            await sendComplaintUpdateEmail({
              to: submitter.email,
              studentName: submitter.name,
              complaintCode: complaint.complaintCode,
              title: complaint.title,
              action: "rejected/closed",
              byRole: actorRole?.toUpperCase?.() || actorRole,
              note: description,
            });
          }
        }
      }
    } catch (e) {
      console.warn("[updateComplaintStatus] email notify failed:", e?.message);
    }

    // Find the most recent activity log for this complaint with the same status action (any user)
    const lastSameStatusLog = await ActivityLog.findOne({
      complaint: complaint._id,
      action: `Status Updated to ${status}`,
    }).sort({ timestamp: -1 });

    if (lastSameStatusLog) {
      // Update existing log: bump timestamp and append note if provided
      const updatedDetails = { ...(lastSameStatusLog.details || {}) };
      if (description && description.trim()) {
        updatedDetails.description = updatedDetails.description
          ? `${
              updatedDetails.description
            }\n[${new Date().toISOString()}] ${description}`
          : description;
      }
      await ActivityLog.findByIdAndUpdate(
        lastSameStatusLog._id,
        { timestamp: new Date(), details: updatedDetails },
        { new: true }
      );
    } else {
      // Create a single entry for this status change
      await ActivityLog.create({
        user: req.user._id,
        role: req.user.role,
        action: `Status Updated to ${status}`,
        complaint: complaint._id,
        timestamp: new Date(),
        details: { description: description || "" },
      });
    }

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
      id: c._id.toString(),
      title: c.title,
      category: c.category,
      status: c.status,
      priority: c.priority || "Medium",
      submittedDate: c.createdAt,
      lastUpdated: c.updatedAt,
      assignedAt: c.assignedAt || null,
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

    complaint.feedback = { rating, comment, submittedAt: new Date() };
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
    const complaints = await Complaint.find()
      .populate("submittedBy", "name")
      .populate("assignedTo", "name")
      .lean({ virtuals: false });

    const formatted = complaints
      .map((c, idx) => {
        try {
          const id = c && c._id ? String(c._id) : "";
          return {
            id,
            complaintCode: c?.complaintCode ?? null,
            title: c?.title ?? "Untitled Complaint",
            status: c?.status ?? "Pending",
            department: c?.department ?? null,
            category: c?.category ?? null,
            submittedDate: c?.createdAt ?? null,
            lastUpdated: c?.updatedAt ?? null,
            assignedTo:
              c?.assignedTo && typeof c.assignedTo === "object"
                ? c.assignedTo.name || null
                : null,
            submittedBy:
              c?.submittedBy && typeof c.submittedBy === "object"
                ? c.submittedBy.name || null
                : null,
            deadline: c?.deadline ?? null,
            sourceRole: c?.sourceRole ?? null,
            assignedByRole: c?.assignedByRole ?? null,
            assignmentPath: Array.isArray(c?.assignmentPath)
              ? c.assignmentPath
              : [],
            submittedTo: c?.submittedTo ?? null,
            feedback: c?.status === "Resolved" ? c?.feedback || null : null,
            isEscalated: !!c?.isEscalated,
          };
        } catch (e) {
          console.error(
            "getAllComplaints: failed to format complaint at index",
            idx,
            e
          );
          return null;
        }
      })
      .filter(Boolean);
    return res.status(200).json(formatted);
  } catch (err) {
    console.error("getAllFeedback error:", err?.message);
    return res.status(500).json({ error: "Failed to fetch feedback" });
  }
};

// Hierarchical access: staff/hod/dean/admin
export const getFeedbackByRole = async (req, res) => {
  try {
    const role = req.user?.role;
    if (!role) return res.status(401).json({ error: "Unauthorized" });

    let filters = { status: "Resolved", "feedback.rating": { $exists: true } };
    let assignedToIn = null;

    if (role === "staff") {
      // Only their own assigned complaints
      filters = { ...filters, assignedTo: req.user._id };
    } else if (role === "hod") {
      // Own + all staff in same department
      const dept = req.user.department;
      const staffInDept = await User.find({
        role: "staff",
        department: dept,
      }).select("_id");
      const ids = [req.user._id, ...staffInDept.map((u) => u._id)];
      assignedToIn = ids;
    } else if (role === "dean" || role === "admin") {
      // All resolved with feedback
      // no extra filter
    } else {
      return res.status(403).json({ error: "Access denied" });
    }

    const query = Complaint.find(
      assignedToIn ? { ...filters, assignedTo: { $in: assignedToIn } } : filters
    )
      .populate("submittedBy", "name email")
      .populate("assignedTo", "name email role department");

    const complaints = await query.sort({ resolvedAt: -1, updatedAt: -1 });

    const feedbackList = complaints.map((c) => ({
      complaintId: c._id,
      title: c.title,
      complaintCode: c.complaintCode,
      submittedBy: c.submittedBy,
      assignedTo: c.assignedTo,
      feedback: c.feedback,
      resolvedAt: c.resolvedAt || c.updatedAt,
      submittedAt: c.createdAt,
      avgResolutionMs:
        c.resolvedAt && c.createdAt
          ? new Date(c.resolvedAt).getTime() - new Date(c.createdAt).getTime()
          : undefined,
      category: c.category,
      department: c.department,
    }));

    res.status(200).json(feedbackList);
  } catch (err) {
    console.error("getFeedbackByRole error:", err?.message);
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
};

// Staff: get feedback for complaints assigned to the logged-in staff
export const getMyFeedback = async (req, res) => {
  try {
    if (req.user.role !== "staff") {
      return res.status(403).json({ error: "Access denied: Staff only" });
    }
    const complaints = await Complaint.find({
      assignedTo: req.user._id,
      status: "Resolved",
      "feedback.rating": { $exists: true },
    })
      .populate("submittedBy", "name email")
      .populate("assignedTo", "name email");

    const feedbackList = complaints.map((c) => ({
      complaintId: c._id,
      title: c.title,
      complaintCode: c.complaintCode,
      submittedBy: c.submittedBy,
      assignedTo: c.assignedTo,
      feedback: c.feedback,
      resolvedAt: c.resolvedAt || c.updatedAt,
      submittedAt: c.createdAt,
      avgResolutionMs:
        c.resolvedAt && c.createdAt
          ? new Date(c.resolvedAt).getTime() - new Date(c.createdAt).getTime()
          : undefined,
      category: c.category,
      department: c.department,
    }));

    res.status(200).json(feedbackList);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch staff feedback" });
  }
};

// Staff: mark a feedback as reviewed
export const markFeedbackReviewed = async (req, res) => {
  try {
    if (!["staff", "hod", "dean", "admin"].includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }
    const { id } = req.params; // complaint id
    const complaint = await Complaint.findById(id);
    if (!complaint)
      return res.status(404).json({ error: "Complaint not found" });
    if (!complaint.feedback || typeof complaint.feedback.rating !== "number") {
      return res.status(400).json({ error: "No feedback on this complaint" });
    }
    // Staff can only review feedback for complaints they resolved (assignedTo themselves)
    if (
      req.user.role === "staff" &&
      complaint.assignedTo &&
      !complaint.assignedTo.equals(req.user._id)
    ) {
      return res
        .status(403)
        .json({ error: "Access denied: Not resolver of this complaint" });
    }
    // Dean can only review if they personally resolved it
    if (
      req.user.role === "dean" &&
      complaint.assignedTo &&
      !complaint.assignedTo.equals(req.user._id)
    ) {
      return res.status(403).json({
        error:
          "Access denied: Dean can only mark reviewed for complaints they resolved",
      });
    }
    complaint.feedback.reviewed = true;
    complaint.feedback.reviewedAt = new Date();
    complaint.feedback.reviewedBy = req.user._id;
    await complaint.save();
    return res
      .status(200)
      .json({ message: "Feedback marked as reviewed", complaint });
  } catch (err) {
    return res.status(500).json({ error: "Failed to mark reviewed" });
  }
};
