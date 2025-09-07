import Complaint from "../models/complaint.model.js";
import Feedback from "../models/Feedback.js";
import mongoose from "mongoose";
import ActivityLog from "../models/activityLog.model.js";
import User, {
  normalizeRole as normalizeUserRole,
} from "../models/user.model.js";
import { sendComplaintUpdateEmail } from "../utils/sendComplaintUpdateEmail.js";
import Notification from "../models/notification.model.js";
import { broadcastNotification } from "../utils/notificationStream.js";
import {
  assertTransition,
  deriveStatusOnApproval,
  sanitizeIncomingStatus,
} from "../utils/complaintStatus.js";
import { complaintToDTO } from "../utils/complaintFormatter.js";

// Helper: create a notification without blocking the main flow
async function safeNotify({
  user,
  complaint,
  type,
  title,
  message,
  meta = {},
}) {
  try {
    if (!user) return;
    const doc = await Notification.create({
      user,
      complaint: complaint?._id || complaint || null,
      type,
      title,
      message,
      meta,
    });
    broadcastNotification({
      _id: doc._id,
      user: doc.user,
      type: doc.type,
      title: doc.title,
      message: doc.message,
      read: doc.read,
      meta: doc.meta,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  } catch (e) {
    console.warn("[notify] failed:", e?.message);
  }
}

// 1. User submits complaint
export const createComplaint = async (req, res) => {
  try {
    const user = req.user || null;
    const {
      title,
      description,
      category,
      priority,
      deadline,
      evidenceFile,
      submittedTo,
      department,
      recipientStaffId,
      recipientHodId,
      assignmentPath,
      assignedByRole,
      sourceRole,
    } = req.body;

    // Normalize department early to avoid downstream mismatches
    const normalizedDept =
      typeof department === "string" && department.trim()
        ? department.trim()
        : typeof user?.department === "string" && user.department.trim()
        ? user.department.trim()
        : undefined;

    const complaintData = {
      title,
      description,
      category,
      priority,
      evidenceFile,
      submittedTo,
      department: normalizedDept,
      sourceRole: sourceRole || "student",
      assignedByRole: assignedByRole || undefined,
      assignmentPath: Array.isArray(assignmentPath)
        ? assignmentPath
        : ["student"],
      submittedBy: user ? user._id : undefined,
      // recipient routing
      recipientRole: req.body?.recipientRole || null,
      recipientId: req.body?.recipientId || null,
    };

    if (deadline) {
      try {
        complaintData.deadline = new Date(deadline);
      } catch (err) {
        // ignore invalid date and leave undefined
      }
    }

    const complaint = new Complaint(complaintData);

    // If recipientStaffId provided, assign immediately to staff
    if (recipientStaffId) {
      complaint.assignedTo = recipientStaffId;
      complaint.assignedToRole = "staff";
      complaint.assignedAt = new Date();
      // use canonical enum value for status
      complaint.status = "Pending";
    }

    // If recipientHodId provided, assign immediately to HoD
    if (recipientHodId) {
      complaint.assignedTo = recipientHodId;
      complaint.assignedToRole = "hod";
      complaint.assignedAt = new Date();
      // use canonical enum value for status
      complaint.status = "Pending";
    }

    await complaint.save();

    // Note: Removed leftover merge-time debug that referenced an undefined variable (recipientHodId/recipientHoId)

    // Log creation activity (optional but useful for timeline)

    try {
      await ActivityLog.create({
        user: req.user._id,
        role: req.user.role,
        action: "Complaint Submitted",
        complaint: complaint._id,
        timestamp: new Date(),
        details: {},
      });
    } catch (_) {}

    // Notifications:
    // 1) Confirm to student
    await safeNotify({
      user: user?._id,
      complaint,
      type: "submission",
      title: `Complaint Submitted (${complaint.complaintCode})`,
      message: `Your complaint "${complaint.title}" was submitted successfully and is now ${complaint.status}.`,
      meta: {
        complaintCode: complaint.complaintCode,
        status: complaint.status,
        redirectPath: "/my-complaints",
        complaintId: String(complaint._id),
      },
    });

    // 2) Notify explicit recipients if provided
    if (recipientStaffId) {
      await Promise.all([
        safeNotify({
          user: recipientStaffId,
          complaint,
          type: "assignment",
          title: `New Assignment (${complaint.complaintCode})`,
          message: `You have been assigned a complaint: "${complaint.title}".`,
          meta: {
            role: "staff",
            deadline: complaint.deadline,
            redirectPath: "/my-assigned",
            complaintId: String(complaint._id),
          },
        }),
        safeNotify({
          user: user?._id,
          complaint,
          type: "status",
          title: `Assigned to Staff`,
          message: `Your complaint was assigned to a staff member and is now ${complaint.status}.`,
          meta: {
            redirectPath: "/my-complaints",
            complaintId: String(complaint._id),
          },
        }),
      ]);
    } else if (recipientHodId) {
      await Promise.all([
        safeNotify({
          user: recipientHodId,
          complaint,
          type: "assignment",
          title: `New Assignment (${complaint.complaintCode})`,
          message: `You have a complaint to review/accept: "${complaint.title}".`,
          meta: {
            role: "hod",
            deadline: complaint.deadline,
            redirectPath: "/hod/assign-complaints",
            complaintId: String(complaint._id),
          },
        }),
        safeNotify({
          user: user?._id,
          complaint,
          type: "status",
          title: `Sent to HoD`,
          message: `Your complaint was sent to the Head of Department and is currently ${complaint.status}.`,
          meta: {
            redirectPath: "/my-complaints",
            complaintId: String(complaint._id),
          },
        }),
      ]);
    } else if (complaint.recipientId) {
      // If the complaint was submitted to a specific recipient id (explicit routing),
      // notify only that recipient instead of broadcasting to the entire office pool.
      try {
        await safeNotify({
          user: complaint.recipientId,
          complaint,
          type: "submission",
          title: `New Complaint (${complaint.complaintCode})`,
          message: `A new complaint was submitted and routed to you: "${complaint.title}".`,
          meta: {
            audience: "recipient",
            redirectPath: "/admin-complaints",
            complaintId: String(complaint._id),
          },
        });
      } catch (e) {
        // non-fatal
      }
    } else if (complaint.submittedTo) {
      // If direct submission to an office, notify active users in that office
      const to = String(complaint.submittedTo).toLowerCase();
      if (to.includes("admin")) {
        const admins = await User.find({ role: "admin", isActive: true })
          .select("_id")
          .lean();
        await Promise.all(
          admins.map((a) =>
            safeNotify({
              user: a._id,
              complaint,
              type: "submission",
              title: `New Complaint (${complaint.complaintCode})`,
              message: `A new complaint was submitted: "${complaint.title}".`,
              meta: {
                audience: "admin",
                redirectPath: "/admin-complaints",
                complaintId: String(complaint._id),
              },
            })
          )
        );
      } else if (to.includes("dean")) {
        // If a specific dean recipient was provided, restrict notification
        if (complaint.recipientRole === "dean" && complaint.recipientId) {
          await safeNotify({
            user: complaint.recipientId,
            complaint,
            type: "submission",
            title: `New Complaint (${complaint.complaintCode})`,
            message: `A new complaint was submitted and routed to you: "${complaint.title}".`,
            meta: {
              audience: "dean",
              redirectPath: "/dean/assign-complaints",
              complaintId: String(complaint._id),
            },
          });
        } else {
          // Fallback: broadcast to all active deans (legacy behavior)
          const deans = await User.find({ role: "dean", isActive: true })
            .select("_id")
            .lean();
          await Promise.all(
            deans.map((d) =>
              safeNotify({
                user: d._id,
                complaint,
                type: "submission",
                title: `New Complaint (${complaint.complaintCode})`,
                message: `A new complaint was submitted: "${complaint.title}".`,
                meta: {
                  audience: "dean",
                  redirectPath: "/dean/assign-complaints",
                  complaintId: String(complaint._id),
                },
              })
            )
          );
        }
      } else if (to.includes("hod")) {
        // Notify active HoD in same department if known
        if (complaint.department) {
          const hod = await User.findOne({
            role: "hod",
            isActive: true,
            department: complaint.department,
          })
            .select("_id")
            .lean();
          if (hod?._id) {
            await safeNotify({
              user: hod._id,
              complaint,
              type: "submission",
              title: `New Complaint (${complaint.complaintCode})`,
              message: `A new complaint was submitted in your department: "${complaint.title}".`,
              meta: {
                audience: "hod",
                redirectPath: "/hod/assign-complaints",
                complaintId: String(complaint._id),
              },
            });
          }
        }
      }
    }

    return res.status(201).json({ message: "Complaint submitted", complaint });
  } catch (err) {
    console.error("createComplaint error:", err?.message);
    return res.status(500).json({ error: "Failed to submit complaint" });
  }
};

// Student: update recipient before acceptance (Pending only)
export const updateMyComplaintRecipient = async (req, res) => {
  try {
    const { id } = req.params;
    const { recipientRole, recipientId } = req.body || {};
    const userId = req.user?._id;
    const complaint = await Complaint.findById(id);
    if (!complaint)
      return res.status(404).json({ error: "Complaint not found" });
    if (String(complaint.submittedBy) !== String(userId))
      return res.status(403).json({ error: "Not allowed" });
    if (complaint.status !== "Pending")
      return res
        .status(400)
        .json({ error: "Recipient can be changed only while Pending" });

    const prev = { from: complaint.recipientRole || null };
    complaint.recipientRole = recipientRole || null;
    complaint.recipientId = recipientId || null;
    complaint.lastEditedAt = new Date();
    complaint.editsCount = (complaint.editsCount || 0) + 1;
    await complaint.save();

    await ActivityLog.create({
      user: req.user._id,
      role: req.user.role,
      action: "Recipient Updated",
      complaint: complaint._id,
      timestamp: new Date(),
      details: { ...prev, to: complaint.recipientRole || null },
    });

    return res.status(200).json({ message: "Recipient updated", complaint });
  } catch (err) {
    console.error("updateMyComplaintRecipient error:", err?.message);
    return res.status(500).json({ error: "Failed to update recipient" });
  }
};

// Admin/HOD: reassign complaint to a different recipient role (post-acceptance allowed)
export const reassignRecipient = async (req, res) => {
  try {
    if (!["admin", "hod", "dean"].includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }
    const { id } = req.params;
    const { recipientRole, recipientId, note } = req.body || {};
    const complaint = await Complaint.findById(id);
    if (!complaint)
      return res.status(404).json({ error: "Complaint not found" });
    const prevRole = complaint.recipientRole || null;
    complaint.recipientRole = recipientRole || null;
    complaint.recipientId = recipientId || null;
    complaint.lastEditedAt = new Date();
    await complaint.save();

    // Timeline log with human-readable message
    await ActivityLog.create({
      user: req.user._id,
      role: req.user.role,
      action: "Recipient Reassigned",
      complaint: complaint._id,
      timestamp: new Date(),
      details: {
        from: prevRole,
        to: complaint.recipientRole,
        description: note || "",
      },
    });

    return res.status(200).json({ message: "Recipient reassigned", complaint });
  } catch (err) {
    console.error("reassignRecipient error:", err?.message);
    return res.status(500).json({ error: "Failed to reassign recipient" });
  }
};

// Student: update own complaint (allowed only when Pending)
export const updateMyComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;
    const complaint = await Complaint.findById(id);
    if (!complaint)
      return res.status(404).json({ error: "Complaint not found" });
    if (String(complaint.submittedBy) !== String(userId)) {
      return res.status(403).json({ error: "Not allowed" });
    }
    if (complaint.isDeleted) {
      return res.status(400).json({ error: "Cannot edit a deleted complaint" });
    }
    if (!["Pending"].includes(complaint.status)) {
      return res
        .status(400)
        .json({ error: "Editing allowed only when status is Pending" });
    }
    // Only allow editing Title, Category, and Description
    const allowed = ["title", "description", "category"];
    for (const key of allowed) {
      if (key in req.body) complaint[key] = req.body[key];
    }
    complaint.lastEditedAt = new Date();
    complaint.editsCount = (complaint.editsCount || 0) + 1;
    await complaint.save();

    // Log activity
    await ActivityLog.create({
      user: userId,
      role: req.user.role,
      action: "Complaint Edited",
      complaint: complaint._id,
      timestamp: new Date(),
      details: {
        fields: allowed.filter((k) => k in req.body),
      },
    });

    return res.status(200).json({ message: "Complaint updated", complaint });
  } catch (err) {
    console.error("updateMyComplaint error:", err?.message);
    return res.status(500).json({ error: "Failed to update complaint" });
  }
};

// Student: soft delete own complaint (allowed only when Pending)
export const softDeleteMyComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;
    const complaint = await Complaint.findById(id);
    if (!complaint)
      return res.status(404).json({ error: "Complaint not found" });
    if (String(complaint.submittedBy) !== String(userId)) {
      return res.status(403).json({ error: "Not allowed" });
    }
    if (complaint.isDeleted) {
      return res.status(400).json({ error: "Already deleted" });
    }
    if (!["Pending"].includes(complaint.status)) {
      return res
        .status(400)
        .json({ error: "Delete allowed only when status is Pending" });
    }
    complaint.isDeleted = true;
    complaint.deletedAt = new Date();
    complaint.deletedBy = userId;
    await complaint.save();

    await ActivityLog.create({
      user: userId,
      role: req.user.role,
      action: "Complaint Deleted",
      complaint: complaint._id,
      timestamp: new Date(),
      details: { softDelete: true },
    });

    return res.status(200).json({ message: "Complaint deleted" });
  } catch (err) {
    console.error("softDeleteMyComplaint error:", err?.message);
    return res.status(500).json({ error: "Failed to delete complaint" });
  }
};

// 2. User views their own complaints
export const getMyComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({
      submittedBy: req.user._id,
      isDeleted: { $ne: true },
    })
      .populate("submittedBy", "name email")
      .populate("assignedTo", "name email")
      .sort({ updatedAt: -1 })
      .lean();

    const formatted = (complaints || []).map((c) => ({
      id: String(c._id),
      complaintCode: c?.complaintCode ?? null,
      title: c?.title ?? "Untitled Complaint",
      status: c?.status ?? "Pending",
      priority: c?.priority || "Medium",
      department: c?.department ?? null,
      category: c?.category ?? null,
      submittedDate: c?.createdAt ?? null,
      lastUpdated: c?.updatedAt ?? null,
      resolvedAt: c?.resolvedAt ?? null,
      assignedTo:
        c?.assignedTo && typeof c.assignedTo === "object"
          ? c.assignedTo.name || c.assignedTo.email
          : null,
      submittedBy:
        c?.submittedBy && typeof c.submittedBy === "object"
          ? c.submittedBy.name || c.submittedBy.email
          : null,
      deadline: c?.deadline ?? null,
      sourceRole: c?.sourceRole ?? null,
      assignedByRole: c?.assignedByRole ?? null,
      assignmentPath: Array.isArray(c?.assignmentPath) ? c.assignmentPath : [],
      submittedTo: c?.submittedTo ?? null,
      feedback: c?.status === "Resolved" ? c?.feedback || null : null,
      isEscalated: !!c?.isEscalated,
      isDeleted: !!c?.isDeleted,
      recipientRole: c?.recipientRole ?? null,
      recipientId: c?.recipientId ?? null,
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    console.error("getMyComplaints error:", error?.message);
    return res.status(500).json({ error: "Failed to fetch my complaints" });
  }
};

// 3. Admin views all complaints
export const getAllComplaints = async (req, res) => {
  try {
    const role = String(req.user?.role || "").toLowerCase();
    // Base visibility: exclude soft-deleted
    const baseFilter = { isDeleted: { $ne: true } };
    // Dean strict isolation: only complaints directly targeted to this dean OR assigned to this dean.
    if (role === "dean") {
      Object.assign(baseFilter, {
        $and: [
          {
            $or: [
              // Student (or other) explicitly targeted this dean
              { recipientRole: "dean", recipientId: req.user._id },
              // Dean currently assigned (working or previously accepted)
              { assignedTo: req.user._id },
            ],
          },
        ],
      });
    }

    // --- Pagination & filtering support (query params)
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const limit = Math.max(
      1,
      parseInt(String(req.query.limit || "25"), 10) || 25
    );
    const skip = (page - 1) * limit;

    // Optional server-side filters from query string (used by frontend)
    const { status, priority, category, search, submittedTo } = req.query || {};
    if (status) baseFilter.status = String(status);
    if (priority) baseFilter.priority = String(priority);
    if (category) baseFilter.category = String(category);
    if (submittedTo)
      baseFilter.submittedTo = { $regex: new RegExp(String(submittedTo), "i") };
    if (search) {
      const s = String(search);
      baseFilter.$or = [
        { title: { $regex: new RegExp(s, "i") } },
        { complaintCode: { $regex: new RegExp(s, "i") } },
        { department: { $regex: new RegExp(s, "i") } },
      ];
    }

    const total = await Complaint.countDocuments(baseFilter);
    const complaints = await Complaint.find(baseFilter)
      .populate("submittedBy", "name")
      .populate("assignedTo", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
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
    res.status(200).json({ items: formatted, total, page, pageSize: limit });
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
    const { note, assignToSelf, assignedTo } = req.body || {};
    // Note is optional for all roles on initial approval (Admin/HOD/Dean)
    const actorRole = String(req.user.role || "").toLowerCase();

    const complaint = await Complaint.findById(complaintId);
    if (!complaint)
      return res.status(404).json({ error: "Complaint not found" });
    // Allow approval from Pending or Rejected (Closed)
    const isPending = complaint.status === "Pending";
    const isRejected = complaint.status === "Closed";
    if (!isPending && !isRejected) {
      return res.status(400).json({
        error:
          "Only complaints with Pending or Rejected status can be approved",
      });
    }

    const approverRole = normalizeUserRole(req.user.role);
    try {
      const target = deriveStatusOnApproval(complaint.status, approverRole);
      complaint.status = target;
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
    complaint.assignedByRole = approverRole;
    if (!complaint.assignmentPath) complaint.assignmentPath = [];
    if (!complaint.assignmentPath.includes(approverRole)) {
      complaint.assignmentPath.push(approverRole);
    }
    // Assignment handling: prefer explicit assignedTo, else assignToSelf
    if (assignedTo && mongoose.Types.ObjectId.isValid(String(assignedTo))) {
      complaint.assignedTo = assignedTo;
      complaint.assignedAt = new Date();
    } else if (assignToSelf === true) {
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

    // Notify student when HoD/Dean accepts
    try {
      if (
        (complaint.status === "Accepted" ||
          complaint.status === "In Progress") &&
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

    // Activity logs (generic)
    await ActivityLog.create({
      user: req.user._id,
      role: req.user.role,
      action: isRejected ? "Complaint Re-Approved" : "Complaint Approved",
      complaint: complaint._id,
      timestamp: new Date(),
      details: {
        status: complaint.status,
        assignToSelf: !!assignToSelf,
        assignedTo: assignedTo || (assignToSelf ? String(req.user._id) : null),
        description: (note || "").trim(),
      },
    });

    // Explicit human-readable entry for re-approval timeline visibility
    if (isRejected) {
      await ActivityLog.create({
        user: req.user._id,
        role: req.user.role,
        action: `Complaint re-approved by ${normalizeUserRole(req.user.role)}`,
        complaint: complaint._id,
        timestamp: new Date(),
        details: {
          description: (note || "").trim(),
        },
      });
    }

    // Human-readable acceptance entry for timeline
    const actorName = req.user?.name || req.user?.email || undefined;
    await ActivityLog.create({
      user: req.user._id,
      role: req.user.role,
      action: `Accepted by ${normalizeUserRole(req.user.role)}`,
      complaint: complaint._id,
      timestamp: new Date(),
      details: {
        description: actorName
          ? `Complaint accepted by ${normalizeUserRole(
              req.user.role
            )} ${actorName}`
          : `Complaint accepted by ${normalizeUserRole(req.user.role)}`,
      },
    });

    // Also record a status-update log for the timeline for non-HoD approvers only
    if (approverRole !== "hod") {
      await ActivityLog.create({
        user: req.user._id,
        role: req.user.role,
        action: `Status Updated to ${complaint.status}`,
        complaint: complaint._id,
        timestamp: new Date(),
        details: { description: (note || "").trim() },
      });
    }

    // Notify student of acceptance / re-approval
    if (isRejected) {
      await safeNotify({
        user: complaint.submittedBy,
        complaint,
        type: "accept",
        title: `Complaint Re-Approved (${complaint.complaintCode})`,
        message:
          "Your complaint has been re-approved and assigned for further review.",
        meta: {
          byRole: normalizeUserRole(req.user.role),
          status: "Accepted",
          redirectPath: "/my-complaints",
          complaintId: String(complaint._id),
        },
      });
    } else {
      await safeNotify({
        user: complaint.submittedBy,
        complaint,
        type: "accept",
        title: `Complaint Accepted (${complaint.complaintCode})`,
        message: `Your complaint was accepted by ${normalizeUserRole(
          req.user.role
        )} and is now Accepted.`,
        meta: {
          byRole: normalizeUserRole(req.user.role),
          status: "Accepted",
          redirectPath: "/my-complaints",
          complaintId: String(complaint._id),
        },
      });
    }
    return res.status(200).json({
      message: isRejected
        ? "Complaint re-approved successfully"
        : "Complaint approved",
      complaint,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to approve complaint" });
  }
};

// Dean reassigns a complaint to HoD with deadline (remains Pending for HoD to accept)

// Role-scoped inboxes for dean/hod: show relevant Pending items
export const getDeanInbox = async (req, res) => {
  try {
    if (req.user.role !== "dean")
      return res.status(403).json({ error: "Access denied" });
    // Private per-Dean: only items sent directly to this dean (student -> specific dean)
    // or currently assigned to this dean. Exclude escalated/deleted.
    const filter = {
      status: { $in: ["Pending", "Assigned"] },
      isEscalated: { $ne: true },
      isDeleted: { $ne: true },
      $or: [
        // Directly routed to this specific dean
        { recipientRole: "dean", recipientId: req.user._id },
        // General dean-targeted (no specific dean chosen yet)
        { recipientRole: "dean", recipientId: null },
        // Already assigned to this dean (work in progress)
        { assignedTo: req.user._id },
        // NEW: General submissions addressed to "dean" (pool) and still unassigned
        {
          $and: [
            { submittedTo: { $regex: /dean/i } },
            { assignedTo: null },
            // ensure not explicitly routed to another dean via recipientId
            {
              $or: [{ recipientRole: { $ne: "dean" } }, { recipientId: null }],
            },
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

// Admin inbox: pending items targeting Admin
export const getAdminInbox = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ error: "Access denied" });
    // Admin inbox logic:
    // - Include complaints explicitly assigned to or addressed to this admin
    // - Also include unassigned complaints that were submitted to the "admin" role
    //   (these are pending admin-level items any admin can pick up)
    // In short: show (assignedTo === me) OR (recipientId === me) OR (submittedTo/admin AND not assigned)
    const filter = {
      // Return complaints across common lifecycle states so admin UI can show
      // Pending, Accepted (assigned to admin), In Progress, Resolved, and Closed
      status: {
        $in: ["Pending", "Accepted", "In Progress", "Resolved", "Closed"],
      },
      isEscalated: { $ne: true },
      $or: [
        // specifically assigned or routed to this admin
        { assignedTo: req.user._id },
        { recipientId: req.user._id },
        // unassigned admin-level submissions
        {
          $and: [
            {
              $or: [
                { submittedTo: { $regex: /admin/i } },
                { assignmentPath: { $in: ["admin"] } },
              ],
            },
            { $or: [{ assignedTo: { $exists: false } }, { assignedTo: null }] },
            // Exclude complaints that were explicitly addressed to a specific admin
            {
              $or: [{ recipientId: { $exists: false } }, { recipientId: null }],
            },
          ],
        },
      ],
    };
    const complaints = await Complaint.find({
      ...filter,
      isDeleted: { $ne: true },
    })
      .populate("submittedBy", "name email")
      .sort({ createdAt: -1 })
      .limit(100);
    return res.status(200).json(
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
        submittedTo: c.submittedTo || null,
      }))
    );
  } catch (err) {
    console.error("getAdminInbox error:", err?.message);
    return res.status(500).json({ error: "Failed to fetch Admin inbox" });
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
    // Set assignment details for HoD acceptance (intermediate Assigned state)
    complaint.assignedTo = hod._id;
    complaint.assignedAt = new Date();
    complaint.status = "Assigned"; // Intermediate state until HoD accepts/rejects
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
      details: {
        hodId,
        hodName: (await User.findById(hodId).select("name email").lean())?.name,
        deadline: complaint.deadline,
        description: `Assigned to HOD by Dean`,
      },
    });

    // Notifications: to HoD and to student
    await Promise.all([
      safeNotify({
        user: hod._id,
        complaint,
        type: "assignment",
        title: `New Assignment (${complaint.complaintCode})`,
        message: `A complaint requires your acceptance: "${complaint.title}".`,
        meta: {
          role: "hod",
          deadline: complaint.deadline,
          redirectPath: "/hod/assign-complaints",
          complaintId: String(complaint._id),
        },
      }),
      safeNotify({
        user: complaint.submittedBy,
        complaint,
        type: "status",
        title: `Assigned to HoD`,
        message: `Your complaint was assigned to the Head of Department and is awaiting acceptance.`,
        meta: {
          redirectPath: "/my-complaints",
          complaintId: String(complaint._id),
        },
      }),
    ]);

    res.status(200).json({
      message: "Complaint assigned to HoD (pending acceptance)",
      complaint,
    });
  } catch (err) {
    console.error("deanAssignToHod error:", err?.message);
    res.status(500).json({ error: "Failed to assign to HoD" });
  }
};

// Dean accepts a complaint (Pending -> In Progress)
export const deanAcceptComplaint = async (req, res) => {
  try {
    if (req.user.role !== "dean") {
      return res.status(403).json({ error: "Only deans can accept" });
    }
    const { id } = req.params;
    const { note } = req.body || {};
    const complaint = await Complaint.findById(id);
    if (!complaint)
      return res.status(404).json({ error: "Complaint not found" });
    // Visibility enforcement: only targeted dean (recipient) or assignedTo dean
    const isTargeted =
      complaint.recipientRole === "dean" &&
      complaint.recipientId &&
      String(complaint.recipientId) === String(req.user._id);
    const isAssigned =
      complaint.assignedTo &&
      String(complaint.assignedTo) === String(req.user._id);
    if (!isTargeted && !isAssigned) {
      return res.status(403).json({ error: "Not authorized" });
    }
    if (complaint.status !== "Pending" && complaint.status !== "Accepted") {
      return res.status(400).json({ error: "Cannot accept in current state" });
    }
    try {
      assertTransition(complaint.status, "In Progress");
      complaint.status = "In Progress";
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
    complaint.assignedTo = req.user._id; // ensure dean is recorded as handler
    complaint.assignedAt = complaint.assignedAt || new Date();
    if (!Array.isArray(complaint.assignmentPath))
      complaint.assignmentPath = ["student"];
    if (!complaint.assignmentPath.includes("dean"))
      complaint.assignmentPath.push("dean");
    await complaint.save();

    await ActivityLog.create({
      user: req.user._id,
      role: req.user.role,
      action: "Dean Accepted",
      complaint: complaint._id,
      timestamp: new Date(),
      details: { note: (note || "").trim() || undefined },
    });

    await safeNotify({
      user: complaint.submittedBy,
      complaint,
      type: "status",
      title: `Complaint Accepted (${complaint.complaintCode})`,
      message: `Your complaint is now In Progress with the Dean.
${note ? "Note: " + note : ""}`.trim(),
      meta: {
        status: complaint.status,
        redirectPath: "/my-complaints",
        complaintId: String(complaint._id),
      },
    });

    return res.status(200).json({ message: "Complaint accepted", complaint });
  } catch (err) {
    console.error("deanAcceptComplaint error", err?.message);
    return res.status(500).json({ error: "Failed to accept complaint" });
  }
};

// Dean rejects a complaint (Pending -> Closed)
export const deanRejectComplaint = async (req, res) => {
  try {
    if (req.user.role !== "dean") {
      return res.status(403).json({ error: "Only deans can reject" });
    }
    const { id } = req.params;
    const { note } = req.body || {};
    const complaint = await Complaint.findById(id);
    if (!complaint)
      return res.status(404).json({ error: "Complaint not found" });
    const isTargeted =
      complaint.recipientRole === "dean" &&
      complaint.recipientId &&
      String(complaint.recipientId) === String(req.user._id);
    const isAssigned =
      complaint.assignedTo &&
      String(complaint.assignedTo) === String(req.user._id);
    if (!isTargeted && !isAssigned) {
      return res.status(403).json({ error: "Not authorized" });
    }
    if (complaint.status !== "Pending" && complaint.status !== "Accepted") {
      return res.status(400).json({ error: "Cannot reject in current state" });
    }
    try {
      assertTransition(complaint.status, "Closed");
      complaint.status = "Closed";
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
    complaint.resolutionNote = note || complaint.resolutionNote;
    complaint.resolvedAt = new Date();
    await complaint.save();

    await ActivityLog.create({
      user: req.user._id,
      role: req.user.role,
      action: "Dean Rejected",
      complaint: complaint._id,
      timestamp: new Date(),
      details: { note: (note || "").trim() || undefined },
    });

    await safeNotify({
      user: complaint.submittedBy,
      complaint,
      type: "status",
      title: `Complaint Closed (${complaint.complaintCode})`,
      message: `Your complaint was closed by the Dean.${
        note ? " Reason: " + note : ""
      }`,
      meta: {
        status: complaint.status,
        redirectPath: "/my-complaints",
        complaintId: String(complaint._id),
      },
    });

    return res.status(200).json({ message: "Complaint rejected", complaint });
  } catch (err) {
    console.error("deanRejectComplaint error", err?.message);
    return res.status(500).json({ error: "Failed to reject complaint" });
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
      "role isApproved isActive department name fullName email"
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

    const actorName = req.user?.name || req.user?.email || "";
    const staffName =
      staff.fullName || staff.name || staff.email || String(staff._id);
    const actionText = wasPreviouslyAssigned
      ? "Reassigned by HOD"
      : "Assigned by HOD";
    const nowTs = new Date();
    const deadlineLabel = complaint.deadline
      ? ` – Deadline: ${
          new Date(complaint.deadline).toISOString().split("T")[0]
        }`
      : "";

    // Primary human-readable assignment log for timeline
    await ActivityLog.create({
      user: req.user._id,
      role: req.user.role,
      action: actionText,
      complaint: complaint._id,
      timestamp: nowTs,
      details: {
        description: `${actionText} ${actorName} to Staff ${staffName}${deadlineLabel}`,
        staffId: staff._id,
        staffName,
        assignedByRole: "hod",
        deadline: complaint.deadline || null,
      },
    });

    // Notifications: to Staff and to Student
    await Promise.all([
      safeNotify({
        user: staff._id,
        complaint,
        type: "assignment",
        title: `New Assignment (${complaint.complaintCode})`,
        message: `You have been assigned a complaint: "${complaint.title}".`,
        meta: {
          role: "staff",
          deadline: complaint.deadline,
          redirectPath: "/my-assigned",
          complaintId: String(complaint._id),
        },
      }),
      safeNotify({
        user: complaint.submittedBy,
        complaint,
        type: "status",
        title: `Assigned to Staff`,
        message: `Your complaint was assigned to staff and is now In Progress.`,
        meta: {
          redirectPath: "/my-complaints",
          complaintId: String(complaint._id),
        },
      }),
    ]);

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
    // Staff in same department
    const staffInDept = await User.find({ role: "staff", department: dept })
      .select("_id")
      .lean();
    const staffIds = staffInDept.map((s) => s._id);

    // Primary scope: items accepted by HoD or assigned to staff in same department
    const managedFilter = {
      $or: [{ assignedTo: req.user._id }, { assignedTo: { $in: staffIds } }],
    };

    // Secondary scope: department-wide terminal items (Resolved/Closed), even if unassigned
    const extraFilters = dept
      ? [{ department: dept, status: { $in: ["Resolved", "Closed"] } }]
      : [];

    const [managedDocs, terminalDocs] = await Promise.all([
      Complaint.find(managedFilter)
        .populate("submittedBy", "name email")
        .populate("assignedTo", "name fullName email role")
        .sort({ updatedAt: -1 })
        .limit(500)
        .lean(),
      extraFilters.length
        ? Complaint.find(extraFilters[0])
            .populate("submittedBy", "name email")
            .populate("assignedTo", "name fullName email role")
            .sort({ updatedAt: -1 })
            .limit(500)
            .lean()
        : Promise.resolve([]),
    ]);

    // De-duplicate by _id with preference for managedDocs ordering
    const seen = new Set();
    const merged = [...managedDocs, ...terminalDocs].filter((c) => {
      const id = String(c._id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    const formatted = merged.map((c) => ({
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
      status: { $in: ["Pending", "Assigned"] },
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

// Development-only: fetch complaints related to a given admin id (assignedTo or recipientId)
export const getAdminComplaintsDebug = async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ error: "Not allowed in production" });
    }
    const { adminId } = req.params;
    if (!adminId || !mongoose.Types.ObjectId.isValid(String(adminId))) {
      return res.status(400).json({ error: "Invalid admin id" });
    }
    const id = new mongoose.Types.ObjectId(String(adminId));
    const complaints = await Complaint.find({
      isDeleted: { $ne: true },
      $or: [{ assignedTo: id }, { recipientId: id }],
    })
      .populate("submittedBy", "name email")
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(complaints || []);
  } catch (err) {
    console.error("getAdminComplaintsDebug error:", err?.message || err);
    return res.status(500).json({ error: "Failed to fetch debug complaints" });
  }
};

// HoD: accept assignment (assign to self and move to In Progress)
export const hodAcceptAssignment = async (req, res) => {
  try {
    if (req.user.role !== "hod")
      return res.status(403).json({ error: "Access denied" });
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint)
      return res.status(404).json({ error: "Complaint not found" });
    // Must be assigned to this HoD and in Assigned/Pending
    if (
      !complaint.assignedTo ||
      String(complaint.assignedTo) !== String(req.user._id) ||
      !["Assigned", "Pending"].includes(String(complaint.status))
    ) {
      return res
        .status(400)
        .json({ error: "No pending HoD assignment to accept" });
    }
    complaint.status = "In Progress";
    complaint.assignedByRole = "hod";
    complaint.assignedAt = new Date();
    if (!Array.isArray(complaint.assignmentPath)) complaint.assignmentPath = [];
    if (!complaint.assignmentPath.includes("hod"))
      complaint.assignmentPath.push("hod");
    await complaint.save();

    // Create only one acceptance log entry
    const existingAcceptance = await ActivityLog.findOne({
      complaint: complaint._id,
      action: "Complaint accepted by HOD",
    }).lean();
    if (!existingAcceptance) {
      await ActivityLog.create({
        user: req.user._id,
        role: req.user.role,
        action: "Complaint accepted by HOD",
        complaint: complaint._id,
        timestamp: new Date(),
        details: {
          description: `Complaint accepted by HOD ${
            req.user.name || req.user.email
          }`,
        },
      });
    }

    // Notify student and dean
    await Promise.all([
      safeNotify({
        user: complaint.submittedBy,
        complaint,
        type: "status",
        title: `Accepted by HoD (${complaint.complaintCode})`,
        message: `Your complaint was accepted by the Head of Department and is now In Progress.`,
        meta: { status: "In Progress" },
      }),
      (async () => {
        const dean = await User.findOne({ role: "dean", isActive: true })
          .select("_id")
          .lean();
        if (dean?._id) {
          await safeNotify({
            user: dean._id,
            complaint,
            type: "status",
            title: `HoD Accepted (${complaint.complaintCode})`,
            message: `HoD accepted the assignment: ${complaint.title}.`,
            meta: { byRole: "hod" },
          });
        }
      })(),
    ]);

    // Send email to student on HoD acceptance
    try {
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
          byRole: "HOD",
          note: null, // No note on acceptance
        });
      }
    } catch (e) {
      console.warn("[hodAcceptAssignment] email notify failed:", e?.message);
    }

    return res.status(200).json({ message: "Assignment accepted", complaint });
  } catch (err) {
    console.error("hodAcceptAssignment error:", err?.message);
    return res.status(500).json({ error: "Failed to accept assignment" });
  }
};

// HoD: reject assignment (return to Dean for reassignment)
export const hodRejectAssignment = async (req, res) => {
  try {
    if (req.user.role !== "hod")
      return res.status(403).json({ error: "Access denied" });
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint)
      return res.status(404).json({ error: "Complaint not found" });
    if (
      !complaint.assignedTo ||
      String(complaint.assignedTo) !== String(req.user._id) ||
      !["Assigned", "Pending"].includes(String(complaint.status))
    ) {
      return res
        .status(400)
        .json({ error: "No pending HoD assignment to reject" });
    }

    // Clear HoD assignment and return to Dean pending queue
    complaint.assignedTo = null;
    complaint.assignedAt = null;
    complaint.status = "Pending";
    if (!Array.isArray(complaint.assignmentPath)) complaint.assignmentPath = [];
    if (!complaint.assignmentPath.includes("dean"))
      complaint.assignmentPath.push("dean");
    await complaint.save();

    await ActivityLog.create({
      user: req.user._id,
      role: req.user.role,
      action: "Rejected by HOD",
      complaint: complaint._id,
      timestamp: new Date(),
      details: {
        description: `Rejected by HOD: ${req.user.name || req.user.email}`,
      },
    });

    // Notify Dean and Student
    const dean = await User.findOne({ role: "dean", isActive: true })
      .select("_id")
      .lean();
    await Promise.all([
      dean?._id
        ? safeNotify({
            user: dean._id,
            complaint,
            type: "reject",
            title: `HoD Rejected (${complaint.complaintCode})`,
            message: `HoD rejected the assignment: ${complaint.title}.`,
            meta: { byRole: "hod" },
          })
        : Promise.resolve(),
      safeNotify({
        user: complaint.submittedBy,
        complaint,
        type: "status",
        title: `Assignment Rejected by HoD`,
        message: `Your complaint is back to Dean for reassignment.`,
        meta: { status: "Pending" },
      }),
    ]);

    return res
      .status(200)
      .json({ message: "Assignment rejected and returned to Dean", complaint });
  } catch (err) {
    console.error("hodRejectAssignment error:", err?.message);
    return res.status(500).json({ error: "Failed to reject assignment" });
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
    const { status, description } = req.body || {};

    console.log("Update complaint status request:", {
      complaintId,
      status,
      description,
      userRole: req.user?.role,
      userId: req.user?.id,
    });

    if (
      !["Pending", "Accepted", "In Progress", "Resolved", "Closed"].includes(
        status
      )
    ) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // Note/description is optional for all roles per updated requirements

    const complaint = await Complaint.findById(complaintId);
    if (!complaint)
      return res.status(404).json({ error: "Complaint not found" });

    // Authorization (relaxed): make dean, hod, and staff act like admin for status updates
    // This grants broad permission to update status regardless of assignment/department.
    const privilegedRoles = new Set(["admin", "dean", "hod", "staff"]);
    if (!privilegedRoles.has(req.user.role)) {
      return res
        .status(403)
        .json({ error: "Not authorized to update this complaint" });
    }

    // Prevent non-terminal updates after complaint is resolved (allow close or re-resolve)
    if (
      complaint.status === "Resolved" &&
      status !== "Closed" &&
      status !== "Resolved"
    ) {
      return res.status(400).json({
        error:
          "Cannot update status after complaint is resolved. Only closing is allowed.",
      });
    }

    complaint.status = status;
    console.log(
      "Processing description:",
      description,
      "Type:",
      typeof description
    );
    if (description && String(description).trim()) {
      console.log("Description is valid, updating resolutionNote");
      const ts = new Date().toISOString();
      const prefix = `[${ts}]`;
      complaint.resolutionNote = complaint.resolutionNote
        ? `${complaint.resolutionNote}\n${prefix} ${description}`
        : `${prefix} ${description}`;
      console.log("Updated resolutionNote:", complaint.resolutionNote);
    } else {
      console.log("Description is empty or invalid");
    }
    if (status === "Resolved") {
      complaint.resolvedAt = new Date();
    }
    await complaint.save();

    // Optional email on status updates by leadership roles
    try {
      const actorRole = req.user.role;
      if (["hod", "dean", "staff"].includes(actorRole)) {
        const submitter = await User.findById(complaint.submittedBy).select(
          "name email"
        );
        if (submitter?.email) {
          const action =
            status === "Closed"
              ? "rejected/closed"
              : status === "Resolved"
              ? "resolved"
              : "updated";
          await sendComplaintUpdateEmail({
            to: submitter.email,
            studentName: submitter.name,
            complaintCode: complaint.complaintCode,
            title: complaint.title,
            action,
            byRole: actorRole?.toUpperCase?.() || actorRole,
            note: description,
          });
        }
      } else if (status === "Closed") {
        // For staff/admin, only on close
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
    } catch (e) {
      console.warn("[updateComplaintStatus] email notify failed:", e?.message);
    }

    // Activity logs: For HoD/Dean/Admin always append a new, rich entry.
    // For Staff, maintain previous merge behavior for same status.
    const nowTs = new Date();
    if (
      req.user.role === "hod" ||
      req.user.role === "dean" ||
      req.user.role === "admin"
    ) {
      const actorName = req.user?.name || req.user?.email || "";
      const prettyRole = req.user.role.toUpperCase();
      let action = `Status Updated to ${status}`;
      let descriptionText = "";
      if (req.user.role === "hod") {
        // Richer, unique HOD timeline descriptions
        if (status === "Resolved") {
          action = "Complaint resolved by HOD";
          descriptionText = `Complaint resolved by HOD ${actorName}${
            description ? `: ${description}` : ""
          }`;
        } else if (status === "Closed") {
          const isExplicitReject =
            typeof description === "string" &&
            /^\s*Rejected:/i.test(description);
          action = isExplicitReject
            ? "Complaint rejected by HOD"
            : "Complaint closed by HOD";
          descriptionText = `${action.replace("Complaint ", "")} ${actorName}${
            description ? `: ${description}` : ""
          }`;
        } else if (status === "Accepted") {
          action = "Complaint accepted by HOD";
          descriptionText = `Complaint accepted by HOD ${actorName}${
            description ? `: ${description}` : ""
          }`;
        } else if (status === "In Progress" || status === "Pending") {
          // Special-case: Reopen should produce a distinct entry per requirements
          const isReopen =
            status === "Pending" &&
            typeof description === "string" &&
            /^\s*Reopened:/i.test(description || "");
          if (isReopen) {
            action = "Complaint reopened by HOD";
            descriptionText = `Complaint reopened by HOD ${actorName}${
              description ? `: ${description}` : ""
            }`;
          } else {
            action = `HOD update: Status changed to ${status}`;
            descriptionText = `HOD update by ${actorName}${
              description ? `: ${description}` : ""
            }`;
          }
        }
      } else {
        // Dean/Admin rich entry
        descriptionText = `${prettyRole} Update${
          actorName ? ` by ${actorName}` : ""
        }${description ? `: ${description}` : ""}`;
      }
      await ActivityLog.create({
        user: req.user._id,
        role: req.user.role,
        action,
        complaint: complaint._id,
        timestamp: nowTs,
        details: { description: descriptionText, status },
      });
    } else {
      const lastSameStatusLog = await ActivityLog.findOne({
        complaint: complaint._id,
        action: `Status Updated to ${status}`,
      }).sort({ timestamp: -1 });
      if (lastSameStatusLog) {
        const updatedDetails = { ...(lastSameStatusLog.details || {}) };
        if (description && String(description).trim()) {
          updatedDetails.description = updatedDetails.description
            ? `${
                updatedDetails.description
              }\n[${nowTs.toISOString()}] ${description}`
            : String(description);
        }
        await ActivityLog.findByIdAndUpdate(
          lastSameStatusLog._id,
          { timestamp: nowTs, details: updatedDetails },
          { new: true }
        );
      } else {
        await ActivityLog.create({
          user: req.user._id,
          role: req.user.role,
          action: `Status Updated to ${status}`,
          complaint: complaint._id,
          timestamp: nowTs,
          details: { description: (description || "").trim(), status },
        });
      }
    }

    // Remove duplicate extra entries: handled by rich log creation above.

    // Notifications: to Student (and HoD if staff acted)
    if (status === "Closed") {
      await safeNotify({
        user: complaint.submittedBy,
        complaint,
        type: "reject",
        title: `Complaint Closed (${complaint.complaintCode})`,
        message: `Your complaint was closed by ${normalizeUserRole(
          req.user.role
        )}${description ? `: ${description}` : "."}`,
        meta: {
          byRole: normalizeUserRole(req.user.role),
          status: "Closed",
          complaintCode: complaint.complaintCode,
          redirectPath: "/my-complaints",
          complaintId: String(complaint._id),
          closedAt: new Date().toISOString(),
        },
      });
    } else if (status === "Resolved") {
      // Enriched resolution notification for students
      await safeNotify({
        user: complaint.submittedBy,
        complaint,
        type: "status",
        title: `Complaint Resolved (${complaint.complaintCode})`,
        message: `Your complaint "${
          complaint.title
        }" was marked Resolved by ${normalizeUserRole(req.user.role)}${
          description ? `: ${description}` : "."
        }`,
        meta: {
          byRole: normalizeUserRole(req.user.role),
          status: "Resolved",
          complaintCode: complaint.complaintCode,
          redirectPath: "/my-complaints",
          complaintId: String(complaint._id),
          resolvedAt: (complaint.resolvedAt || new Date()).toISOString(),
        },
      });
    } else {
      await safeNotify({
        user: complaint.submittedBy,
        complaint,
        type: "status",
        title: `Status Updated to ${status}`,
        message: `Your complaint status changed to ${status}${
          description ? `: ${description}` : ""
        }.`,
        meta: {
          byRole: normalizeUserRole(req.user.role),
          status,
          complaintCode: complaint.complaintCode,
          redirectPath: "/my-complaints",
          complaintId: String(complaint._id),
        },
      });
    }

    // If staff updated, notify HoD in same department about the change
    if (req.user.role === "staff" && complaint.department) {
      const hod = await User.findOne({
        role: "hod",
        isActive: true,
        department: complaint.department,
      })
        .select("_id")
        .lean();
      if (hod?._id) {
        await safeNotify({
          user: hod._id,
          complaint,
          type: "status",
          title: `Staff Updated Complaint (${complaint.complaintCode})`,
          message: `Status changed to ${status}${
            description ? `: ${description}` : ""
          } by staff.`,
          meta: { byRole: "staff" },
        });
      }
    }

    return res.status(200).json({ message: "Status updated", complaint });
  } catch (error) {
    console.error("updateComplaintStatus error:", error?.message);
    return res.status(500).json({ error: "Failed to update status" });
  }
};

// 5b. Staff: list complaints assigned to the logged-in staff
export const getAssignedComplaints = async (req, res) => {
  try {
    if (req.user.role !== "staff") {
      return res.status(403).json({ error: "Access denied: Staff only" });
    }
    const complaints = await Complaint.find({ assignedTo: req.user._id })
      .populate("submittedBy", "name email")
      .sort({ updatedAt: -1 });

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
        name: c.submittedBy?.name,
        email: c.submittedBy?.email,
      },
      shortDescription: c.shortDescription,
      fullDescription: c.description,
      isEscalated: c.isEscalated || false,
      deadline: c.deadline || null,
      sourceRole: c.sourceRole,
      assignedByRole: c.assignedByRole,
      assignmentPath: c.assignmentPath || [],
      submittedTo: c.submittedTo || null,
      department: c.department || null,
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    console.error("getAssignedComplaints error:", error?.message);
    return res
      .status(500)
      .json({ error: "Failed to fetch assigned complaints" });
  }
};

// Staff inbox: direct-to-staff complaints sent by students to this staff member
export const getStaffInbox = async (req, res) => {
  try {
    if (req.user.role !== "staff") {
      return res.status(403).json({ error: "Access denied: Staff only" });
    }
    const staffId = req.user._id;
    const items = await Complaint.find({
      isDeleted: { $ne: true },
      recipientRole: { $regex: /^staff$/i },
      recipientId: staffId,
      sourceRole: { $regex: /^student$/i },
    })
      .populate("submittedBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    const formatted = items.map((c) => ({
      id: c._id.toString(),
      title: c.title,
      category: c.category,
      status: c.status,
      priority: c.priority || "Medium",
      submittedDate: c.createdAt,
      lastUpdated: c.updatedAt,
      assignedAt: c.assignedAt || null,
      submittedBy: {
        name: c.submittedBy?.name,
        email: c.submittedBy?.email,
      },
      shortDescription: c.shortDescription,
      fullDescription: c.description,
      isEscalated: c.isEscalated || false,
      deadline: c.deadline || null,
      sourceRole: c.sourceRole,
      assignedByRole: c.assignedByRole,
      assignmentPath: c.assignmentPath || [],
      submittedTo: c.submittedTo || null,
      department: c.department || null,
      recipientRole: c.recipientRole || null,
      recipientId: c.recipientId || null,
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    console.error("getStaffInbox error:", error?.message);
    return res.status(500).json({ error: "Failed to fetch staff inbox" });
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

    // Notify assignee about feedback
    if (complaint.assignedTo) {
      await safeNotify({
        user: complaint.assignedTo,
        complaint,
        type: "feedback",
        title: `Feedback Received (${complaint.complaintCode})`,
        message: `The student left feedback on "${complaint.title}"${
          comment ? `: ${comment}` : "."
        }`,
        meta: { rating },
      });
    }

    res.status(200).json({ message: "Feedback submitted", complaint });
  } catch (err) {
    res.status(500).json({ error: "Failed to submit feedback" });
  }
};

export const getAllFeedback = async (req, res) => {
  try {
    // For security, if an admin is requesting, return only feedback relevant to that admin
    let query = {};
    if (req.user && req.user.role === "admin") {
      query = {
        $or: [{ assignedTo: req.user._id }, { recipientId: req.user._id }],
      };
    }
    const complaints = await Complaint.find(query)
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
    let idIn = null;

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
    } else if (role === "dean") {
      // Dean: all resolved with feedback (dean sees dean-visible items)
      // no extra filter here (controller-level dean visibility is broad)
    } else if (role === "admin") {
      // Admin: ONLY feedback for complaints this admin resolved.
      // Two possible data sources:
      //  1. Legacy single embedded complaint.feedback
      //  2. Multi-entry targeted Feedback documents (where targetAdmin = admin)
      // We restrict to complaints whose resolution was performed by this admin: either
      // complaint.assignedTo == adminId at the time of resolution OR (future) a resolvedBy field.
      const adminId = req.user._id;

      // Fetch complaints resolved by this admin that have an embedded feedback
      const resolvedComplaints = await Complaint.find({
        status: "Resolved",
        assignedTo: adminId,
        "feedback.rating": { $exists: true },
      })
        .populate("submittedBy", "name email")
        .populate("assignedTo", "name email role department")
        .lean();

      const embeddedEntries = resolvedComplaints.map((c) => ({
        complaintId: c._id,
        title: c.title,
        complaintCode: c.complaintCode,
        submittedBy: c.submittedBy,
        assignedTo: c.assignedTo,
        feedback: c.feedback
          ? { rating: c.feedback.rating, comment: c.feedback.comment }
          : null,
        resolvedAt: c.resolvedAt || c.updatedAt,
        submittedAt: c.createdAt,
        avgResolutionMs:
          c.resolvedAt && c.createdAt
            ? new Date(c.resolvedAt).getTime() - new Date(c.createdAt).getTime()
            : undefined,
        category: c.category,
        department: c.department,
        submittedTo: c.submittedTo || null,
        reviewed: true, // legacy embedded feedback treated as reviewed
        feedbackEntryId: null,
        createdAt: c.createdAt,
      }));

      // Multi-entry targeted feedback docs for this admin; ensure the complaint was resolved and assigned to this admin
      const targetedDocs = await Feedback.find({
        targetAdmin: adminId,
        archived: false,
      })
        .populate({ path: "user", select: "name email" })
        .populate({
          path: "complaintId",
          select:
            "title complaintCode category department resolvedAt updatedAt createdAt status assignedTo submittedBy submittedTo feedback",
          populate: [
            { path: "assignedTo", select: "name email role department" },
            { path: "submittedBy", select: "name email" },
          ],
        })
        .sort({ createdAt: -1 })
        .lean();

      const targetedEntries = targetedDocs
        .filter(
          (f) =>
            f.complaintId &&
            f.complaintId.status === "Resolved" &&
            f.complaintId.assignedTo &&
            String(f.complaintId.assignedTo._id || f.complaintId.assignedTo) ===
              String(adminId)
        )
        .map((f) => {
          const c = f.complaintId || {};
          return {
            complaintId: c._id,
            title: c.title,
            complaintCode: c.complaintCode,
            submittedBy: c.submittedBy,
            assignedTo: c.assignedTo,
            feedback: { rating: f.rating, comment: f.comments },
            resolvedAt: c.resolvedAt || c.updatedAt,
            submittedAt: c.createdAt,
            avgResolutionMs:
              c.resolvedAt && c.createdAt
                ? new Date(c.resolvedAt).getTime() -
                  new Date(c.createdAt).getTime()
                : undefined,
            category: c.category,
            department: c.department,
            submittedTo: c.submittedTo || null,
            reviewed: f.reviewStatus === "Reviewed",
            feedbackEntryId: f._id,
            createdAt: f.createdAt,
          };
        });

      // Merge & sort (newest first by resolvedAt / createdAt fallback)
      const merged = [...embeddedEntries, ...targetedEntries].sort((a, b) => {
        const aTime = new Date(a.resolvedAt || a.createdAt).getTime();
        const bTime = new Date(b.resolvedAt || b.createdAt).getTime();
        return bTime - aTime;
      });
      return res.status(200).json(merged);
    } else if (role === "dean") {
      // Dean protected feedback view: only complaints resolved by this dean OR within dean's department (resolved & assigned under that dept)
      const deanDept = req.user.department || null;
      const base = {
        status: "Resolved",
        $or: [{ assignedTo: req.user._id }, { department: deanDept }],
        "feedback.rating": { $exists: true },
      };
      const complaints = await Complaint.find(base)
        .populate("submittedBy", "name email")
        .populate("assignedTo", "name email role department")
        .lean();
      const list = complaints.map((c) => ({
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
        submittedTo: c.submittedTo || null,
      }));
      return res.status(200).json(list);
    } else {
      return res.status(403).json({ error: "Access denied" });
    }

    const baseQuery = assignedToIn
      ? { ...filters, assignedTo: { $in: assignedToIn } }
      : idIn
      ? { ...filters, _id: { $in: idIn } }
      : filters;

    const query = Complaint.find(baseQuery)
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
      submittedTo: c.submittedTo || null,
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
    // Admins may mark feedback reviewed only for complaints addressed to them
    if (req.user.role === "admin") {
      const isAssignedToAdmin =
        complaint.assignedTo && complaint.assignedTo.equals(req.user._id);
      const isRecipientAdmin =
        complaint.recipientId && complaint.recipientId.equals(req.user._id);
      if (!isAssignedToAdmin && !isRecipientAdmin) {
        return res.status(403).json({
          error:
            "Admins may mark reviewed only for feedback on complaints addressed to them",
        });
      }
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

// Query complaints with optional filters and role-based visibility
export const queryComplaints = async (req, res) => {
  try {
    const user = req.user || null;

    const { assignedTo, department, status, submittedTo, sourceRole } =
      req.query || {};

    // Build query
    const q = {};
    if (assignedTo) q.assignedTo = assignedTo;
    if (department) q.department = department;
    if (status) q.status = status;
    if (submittedTo) q.submittedTo = { $regex: new RegExp(submittedTo, "i") };
    if (sourceRole)
      q.sourceRole = { $regex: new RegExp(`^${sourceRole}$`, "i") };

    // If no explicit filter provided, apply role-based defaults
    if (!assignedTo && !department && !status && !submittedTo && !sourceRole) {
      const role = String(user?.role || "").toLowerCase();
      if (role === "staff") {
        // Staff: defaults to items assigned to them
        q.assignedTo = user._id;
      } else if (role === "hod") {
        // HoD: by default, show only items assigned to the HoD themself
        q.assignedTo = user._id;
      } else if (role === "admin") {
        // Admin: by default, scope to complaints relevant to this admin only
        // - assignedTo === me
        // - recipientId === me
        // - OR unassigned admin-level submissions (submittedTo/admin or assignmentPath includes 'admin')
        // Build list of complaint ids that were notified to this admin (fallback)
        const notifiedComplaintIds = await Notification.find({
          user: user._id,
          complaint: { $ne: null },
          type: { $in: ["submission", "assignment"] },
        }).distinct("complaint");

        q.$or = [
          { assignedTo: user._id },
          { recipientId: user._id },
          ...(Array.isArray(notifiedComplaintIds) && notifiedComplaintIds.length
            ? [{ _id: { $in: notifiedComplaintIds } }]
            : []),
          {
            $and: [
              {
                $or: [
                  { submittedTo: { $regex: /admin/i } },
                  { assignmentPath: { $in: ["admin"] } },
                ],
              },
              {
                $or: [{ assignedTo: { $exists: false } }, { assignedTo: null }],
              },
              {
                $or: [
                  { recipientId: { $exists: false } },
                  { recipientId: null },
                ],
              },
            ],
          },
        ];
      } else if (role === "dean") {
        // Dean: see all unless filters are provided (handled below by dean guards)
        // no-op
      } else if (role === "student") {
        // Student: restrict to their own submissions
        q.submittedBy = user._id;
      } else {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    // Always exclude soft-deleted
    const filter = { ...q, isDeleted: { $ne: true } };
    // Dean visibility guard: hide admin-directed/associated complaints universally
    const role = String(user?.role || "").toLowerCase();

    // Staff/HOD department guard: ensure department filters (when present) match user's own department
    if ((role === "staff" || role === "hod") && filter.department) {
      try {
        const userDept = user?.department ? String(user.department) : null;
        if (!userDept) {
          return res
            .status(400)
            .json({ error: "Department information missing for user" });
        }
        // Force department to the user's department regardless of requested value
        filter.department = userDept;
      } catch {
        return res
          .status(400)
          .json({ error: "Invalid department filter for this role" });
      }
    }
    if (role === "dean") {
      const deanExclusion = [
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
      ];
      if (Array.isArray(filter.$and)) {
        filter.$and = [...filter.$and, ...deanExclusion];
      } else {
        filter.$and = deanExclusion;
      }
    }

    const complaints = await Complaint.find(filter)
      .populate("submittedBy", "name email")
      .populate("assignedTo", "name role")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(complaints || []);
  } catch (err) {
    console.error("queryComplaints error:", err?.message || err);

    res.status(500).json({ error: "Failed to fetch complaints" });
  }
};
