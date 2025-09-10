import Complaint from "../models/complaint.model.js";
import mongoose from "mongoose";
import ActivityLog from "../models/activityLog.model.js";
import User, {
  normalizeRole as normalizeUserRole,
} from "../models/user.model.js";
import { sendComplaintUpdateEmail } from "../utils/sendComplaintUpdateEmail.js";
import Notification from "../models/notification.model.js";

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
    await Notification.create({
      user,
      complaint: complaint?._id || complaint || null,
      type,
      title,
      message,
      meta,
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

    const complaintData = {
      title,
      description,
      category,
      priority,
      evidenceFile,
      submittedTo,
      department: department || user?.department || "",
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
    // Pagination params (frontend expects paginated shape)
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(
      1,
      Math.min(100, parseInt(req.query.limit, 10) || 20)
    );
    const skip = (page - 1) * limit;

    // Base visibility: exclude soft-deleted
    const baseFilter = { isDeleted: { $ne: true } };
    // For deans, hide any complaint that is directed to Admin or involves Admin in routing
    if (role === "dean") {
      Object.assign(baseFilter, {
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
        ],
      });
    }

    const total = await Complaint.countDocuments(baseFilter);
    const complaints = await Complaint.find(baseFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("submittedBy", "name")
      .populate("assignedTo", "name")
      .lean();

    const items = (complaints || [])
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

    return res.status(200).json({
      items,
      total,
      page,
      pageSize: limit,
    });
  } catch (error) {
    console.error("getAllComplaints error:", error?.message, error?.stack);
    return res.status(500).json({
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

    // Move to In Progress immediately for dean accept workflow, keep Accepted for other roles if needed
    const normRole = normalizeUserRole(req.user.role);
    complaint.status = normRole === "dean" ? "In Progress" : "Accepted";
    complaint.assignedByRole = normRole;
    complaint.assignedBy = req.user._id;

    if (!complaint.assignmentPath) complaint.assignmentPath = [];
    const approverRole = normalizeUserRole(req.user.role);
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

    // Also record a status-update log for the timeline to consolidate with status grouping
    await ActivityLog.create({
      user: req.user._id,
      role: req.user.role,
      action: `Status Updated to ${complaint.status}`,
      complaint: complaint._id,
      timestamp: new Date(),
      details: { description: (note || "").trim() },
    });

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
    // Student -> Dean submissions or items in dean path that are still pending (not escalated/admin)
    const filter = {
      status: { $in: ["Pending", "Accepted", "Assigned", "Resolved"] },
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
    const complaints = await Complaint.find({
      ...filter,
      isDeleted: { $ne: true },
    })
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

// Strict dean-scoped complaints (all statuses) – only direct-to-this-dean or dean-acted
export const getDeanScopedComplaints = async (req, res) => {
  try {
    if (req.user.role !== "dean") {
      return res.status(403).json({ error: "Access denied" });
    }
    const deanId = req.user._id;
    // Strict ownership rules:
    //  Show only complaints where:
    //   - recipientRole='dean' AND recipientId=this dean, OR
    //   - assignedBy=this dean (complaints the dean forwarded/assigned)
    //  Exclude ALL complaints whose recipientRole='dean' but recipientId is another dean.
    const filter = {
      isDeleted: { $ne: true },
      $or: [
        { recipientRole: "dean", recipientId: deanId },
        { assignedBy: deanId },
      ],
    };
    const complaints = await Complaint.find(filter)
      .populate("submittedBy", "name email")
      .sort({ updatedAt: -1 })
      .limit(500)
      .lean();
    // Double safety: remove any stray cross-dean items (defense-in-depth)
    const sanitized = complaints.filter(
      (c) =>
        !c.recipientRole ||
        c.recipientRole !== "dean" ||
        (c.recipientRole === "dean" && String(c.recipientId) === String(deanId))
    );
    return res.status(200).json({
      items: sanitized.map((c) => ({
        id: c._id,
        title: c.title,
        complaintCode: c.complaintCode,
        category: c.category,
        status: c.status,
        priority: c.priority,
        submittedDate: c.createdAt,
        lastUpdated: c.updatedAt,
        assignedTo: c.assignedTo,
        assignedBy: c.assignedBy,
        assignedByRole: c.assignedByRole,
        assignmentPath: c.assignmentPath,
        deadline: c.deadline,
        recipientRole: c.recipientRole,
        recipientId: c.recipientId,
        submittedBy: c.submittedBy?.name || c.submittedBy?.email,
        department: c.department,
      })),
      total: sanitized.length,
    });
  } catch (err) {
    console.error("getDeanScopedComplaints error:", err?.message);
    return res.status(500).json({ error: "Failed to fetch dean complaints" });
  }
};

// Admin inbox: pending items targeting Admin
export const getAdminInbox = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ error: "Access denied" });
    const filter = {
      status: "Pending",
      isEscalated: { $ne: true },
      $or: [
        { submittedTo: { $regex: /admin/i } },
        { assignmentPath: { $in: ["admin"] } },
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

// Admin full workflow list (all direct-to-admin complaints across statuses)
export const getAdminWorkflowComplaints = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ error: "Access denied" });
    const adminId = req.user._id;
    // Only complaints explicitly involving THIS admin (assigned or direct recipient) OR generic admin submissions not yet claimed.
    const filter = {
      isDeleted: { $ne: true },
      $and: [
        {
          $or: [
            { assignedTo: adminId }, // assigned to this admin
            { recipientId: adminId }, // directly targeted to this admin
            // submittedTo string contains 'admin' AND not assigned to another admin
            {
              $and: [
                { submittedTo: { $regex: /admin/i } },
                {
                  $or: [
                    { assignedTo: { $exists: false } },
                    { assignedTo: null },
                    { assignedTo: adminId },
                  ],
                },
              ],
            },
          ],
        },
        // Ensure no cross-admin leakage: if assignedTo is another admin, exclude
        {
          $or: [
            { assignedTo: { $exists: false } },
            { assignedTo: null },
            { assignedTo: adminId },
            // or not an admin user (assigned to staff/hod/dean) but still in admin path; allow only if assignmentPath contains admin and unassigned to other admin
          ],
        },
      ],
    };

    const complaints = await Complaint.find(filter)
      .populate("submittedBy", "name email")
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    const mapped = complaints.map((c) => ({
      id: String(c._id),
      title: c.title,
      category: c.category,
      status: c.status,
      priority: c.priority,
      submittedDate: c.createdAt,
      lastUpdated: c.updatedAt,
      submittedBy: c.submittedBy?.name || c.submittedBy?.email,
      deadline: c.deadline,
      assignedByRole: c.assignedByRole,
      assignmentPath: c.assignmentPath || [],
      submittedTo: c.submittedTo || null,
      department: c.department || null,
    }));

    return res.status(200).json(mapped);
  } catch (err) {
    console.error("getAdminWorkflowComplaints error:", err?.message);
    return res
      .status(500)
      .json({ error: "Failed to fetch admin workflow complaints" });
  }
};

// Development helper: return complaints relevant to admin for debugging
export const getAdminComplaintsDebug = async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ error: "Not available in production" });
    }
    if (req.user.role !== "admin")
      return res.status(403).json({ error: "Access denied" });

    const { adminId } = req.params || {};
    const orClauses = [
      { assignmentPath: { $in: ["admin"] } },
      { submittedTo: { $regex: /admin/i } },
      { assignedByRole: "admin" },
    ];
    if (adminId && mongoose.Types.ObjectId.isValid(String(adminId))) {
      orClauses.push({ assignedTo: mongoose.Types.ObjectId(String(adminId)) });
    }

    const complaints = await Complaint.find({
      isDeleted: { $ne: true },
      $or: orClauses,
    })
      .populate("submittedBy", "name email")
      .populate("assignedTo", "name email role department")
      .lean()
      .limit(500);

    return res.status(200).json({ count: complaints.length, complaints });
  } catch (err) {
    console.error("getAdminComplaintsDebug error:", err?.message);
    return res
      .status(500)
      .json({ error: "Failed to fetch admin debug complaints" });
  }
};

// Staff inbox: complaints directly submitted to this staff member (or assignedTo them)
export const getStaffInbox = async (req, res) => {
  try {
    if (req.user.role !== "staff")
      return res.status(403).json({ error: "Access denied: Staff only" });

    const filter = {
      isDeleted: { $ne: true },
      status: { $in: ["Pending", "Assigned"] },
      $or: [
        { assignedTo: req.user._id },
        { submittedTo: { $regex: new RegExp(req.user.email || "", "i") } },
      ],
    };

    const complaints = await Complaint.find(filter)
      .populate("submittedBy", "name email")
      .sort({ createdAt: -1 })
      .limit(200);

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
        submittedTo: c.submittedTo || null,
        department: c.department || null,
      }))
    );
  } catch (err) {
    console.error("getStaffInbox error:", err?.message);
    return res.status(500).json({ error: "Failed to fetch staff inbox" });
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
    complaint.assignedBy = req.user._id;
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

// Dean: accept a complaint (delegates to approveComplaint)
export const deanAcceptComplaint = async (req, res) => {
  try {
    return await approveComplaint(req, res);
  } catch (err) {
    console.error("deanAcceptComplaint error:", err?.message);
    return res.status(500).json({ error: "Failed to accept complaint" });
  }
};

// Dean: reject a complaint (mark Closed with optional note)
export const deanRejectComplaint = async (req, res) => {
  try {
    if (req.user.role !== "dean")
      return res.status(403).json({ error: "Access denied" });
    const complaintId = req.params.id;
    const { note } = req.body || {};
    const complaint = await Complaint.findById(complaintId);
    if (!complaint)
      return res.status(404).json({ error: "Complaint not found" });

    complaint.status = "Closed";
    if (note && String(note).trim()) {
      const ts = new Date().toISOString();
      const prefix = `[${ts}]`;
      complaint.resolutionNote = complaint.resolutionNote
        ? `${complaint.resolutionNote}\n${prefix} ${note}`
        : `${prefix} ${note}`;
    }
    complaint.assignedByRole = "dean";

    await complaint.save();

    await ActivityLog.create({
      user: req.user._id,
      role: req.user.role,
      action: "Complaint rejected by Dean",
      complaint: complaint._id,
      timestamp: new Date(),
      details: { description: (note || "").trim() },
    });

    try {
      await safeNotify({
        user: complaint.submittedBy,
        complaint,
        type: "reject",
        title: `Complaint Rejected (${complaint.complaintCode})`,
        message: `Your complaint was rejected by the Dean${
          note ? `: ${note}` : "."
        }`,
        meta: {
          byRole: "dean",
          status: "Closed",
          complaintId: String(complaint._id),
        },
      });
    } catch (e) {
      console.warn("[deanRejectComplaint] notify failed:", e?.message);
    }

    return res.status(200).json({ message: "Complaint rejected", complaint });
  } catch (err) {
    console.error("deanRejectComplaint error:", err?.message);
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
      .populate("assignedTo", "name fullName email role")
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

    // Debug: log all complaints assigned to staff (grouped by staff and by department)
    try {
      const staffAssigned = (complaints || []).filter(
        (c) =>
          c.assignedTo &&
          typeof c.assignedTo === "object" &&
          String(c.assignedTo.role || "").toLowerCase() === "staff"
      );

      const groupedByStaff = staffAssigned.reduce((acc, c) => {
        const sid = String(c.assignedTo._id || c.assignedTo);
        const name = c.assignedTo.name || c.assignedTo.fullName || sid;
        if (!acc[sid]) acc[sid] = { name, complaints: [] };
        acc[sid].complaints.push({
          id: String(c._id),
          title: c.title,
          status: c.status,
          department: c.department,
        });
        return acc;
      }, {});

      const groupedByDept = staffAssigned.reduce((acc, c) => {
        const dept = c.department || "<unknown>";
        if (!acc[dept]) acc[dept] = [];
        acc[dept].push({
          id: String(c._id),
          title: c.title,
          assignedTo:
            c.assignedTo.name ||
            c.assignedTo.email ||
            String(c.assignedTo._id || c.assignedTo),
          status: c.status,
        });
        return acc;
      }, {});

      // development debug logs removed
    } catch (e) {
      console.warn("[debug] failed to log staff complaints:", e?.message);
    }

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

    // Normalize department string (trim) to avoid mismatches due to spacing
    const dept = String(req.user.department || "").trim();
    // escape regex helper for safe case-insensitive match
    const escapeRegex = (s) =>
      String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const deptRegex = dept ? new RegExp(`^${escapeRegex(dept)}$`, "i") : null;
    // Find staff in same department (use regex to be case-insensitive)
    const staffInDept = dept
      ? await User.find({ role: "staff", department: deptRegex })
          .select("_id name email")
          .lean()
      : [];
    const staffIds = staffInDept.map((s) => s._id);
    // Also find HoDs in same department so HoD-direct complaints are shared
    const hodInDept = dept
      ? await User.find({ role: "hod", department: deptRegex })
          .select("_id name email")
          .lean()
      : [];
    const hodIds = hodInDept.map((h) => h._id);
    console.log(
      "[getHodAll] user=",
      String(req.user._id),
      "dept=",
      dept,
      "staffCount=",
      staffIds.length
    );

    // Pending (Inbox for HoD)
    // Inbox: only include complaints that are explicitly for this HoD
    // (either assignedTo this HoD or explicitly addressed to this HoD via recipientId).
    // Do NOT include generic "submittedTo: hod" items here — those are department-level
    // and belong on the shared All Complaints view, not an individual HoD's inbox/dashboard.
    const inboxFilter = {
      status: "Pending",
      isEscalated: { $ne: true },
      ...(deptRegex ? { department: deptRegex } : {}),
      $or: [
        // explicitly assigned to this HoD
        { assignedTo: req.user._id },
        // explicitly routed to this HoD as recipient
        { $and: [{ recipientRole: "hod" }, { recipientId: req.user._id }] },
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
      // restrict to items in this department (so other-department HoDs don't see them)
      ...(deptRegex ? { department: deptRegex } : {}),
      $or: [
        { assignedTo: req.user._id },
        { assignedTo: { $in: staffIds } },
        // include complaints assigned to any HoD in this department
        { assignedTo: { $in: hodIds } },
        // include complaints explicitly routed to a HoD (recipientRole/recipientId)
        { $and: [{ recipientRole: "hod" }, { recipientId: { $in: hodIds } }] },
      ],
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

    const isAssignedToAnyHod = (c) =>
      c.assignedTo &&
      hodIds.some(
        (id) => String(id) === String(c.assignedTo?._id || c.assignedTo)
      );

    const isRecipientHoD = (c) =>
      c.recipientRole === "hod" &&
      c.recipientId &&
      hodIds.some((id) => String(id) === String(c.recipientId));

    const pending = inbox.map(mapItem).filter((c) => !c.assignedTo);

    const accepted = managed
      .filter((c) =>
        ["In Progress", "Assigned", "Pending"].includes(String(c.status || ""))
      )
      // include complaints assigned to any HoD in the department or explicitly routed to a HoD in the dept
      .filter((c) => isAssignedToAnyHod(c) || isRecipientHoD(c))
      .map(mapItem);

    // assigned: only include complaints assigned to staff in the department
    // (HoD-assigned items are intentionally excluded from this list)

    // Resolved in department scope (self or staff)
    const resolved = managed
      .filter((c) => String(c.status) === "Resolved")
      .map(mapItem);

    // Final assigned computation (staff-only)
    const assigned = managed
      .filter((c) =>
        ["In Progress", "Assigned", "Pending"].includes(String(c.status || ""))
      )
      // Only include complaints assigned to staff in the department (exclude HoDs)
      .filter((c) => {
        if (!c.assignedTo) return false;
        const assignedId = String(c.assignedTo?._id || c.assignedTo);
        const isStaff = staffIds.some((id) => String(id) === assignedId);
        const isHodAssigned = hodIds.some((id) => String(id) === assignedId);
        return isStaff && !isHodAssigned;
      })
      .map(mapItem);

    // Rejected/Closed in department scope
    const rejected = managed
      .filter((c) => String(c.status) === "Closed")
      .map(mapItem);

    const result = {
      pending,
      accepted,
      assigned,
      resolved,
      rejected,
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

    // request metadata logging removed (use error logs only)

    if (
      ![
        "Pending",
        "Accepted",
        "In Progress",
        "Under Review",
        "Resolved",
        "Closed",
      ].includes(status)
    ) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // Note/description is optional for all roles per updated requirements

    const complaint = await Complaint.findById(complaintId);
    if (!complaint)
      return res.status(404).json({ error: "Complaint not found" });

    // Authorization
    const assignedToId = complaint.assignedTo
      ? String(complaint.assignedTo._id || complaint.assignedTo)
      : null;
    const userId = String(req.user._id);
    const isAssignedToSelf = !!assignedToId && assignedToId === userId;
    const isAdmin = req.user.role === "admin";
    const isStaff = req.user.role === "staff";
    const isHoDOrDean = ["hod", "dean"].includes(req.user.role);
    const complaintDept = complaint.department
      ? String(complaint.department)
      : null;
    const userDept = req.user.department ? String(req.user.department) : null;
    const allowedForHoD =
      isHoDOrDean && complaintDept && userDept && complaintDept === userDept;
    const canCloseAsLeader = status === "Closed" && isHoDOrDean;
    // Allow Deans to update complaints in their department (for status changes like Resolved)
    const canUpdateAsDean =
      req.user.role === "dean" &&
      complaintDept &&
      userDept &&
      complaintDept === userDept;
    // Allow Deans to update complaints they have ownership of (accepted/assigned by dean or in dean path)
    const deanHasOwnership =
      req.user.role === "dean" &&
      ((Array.isArray(complaint.assignmentPath) &&
        complaint.assignmentPath.includes("dean")) ||
        complaint.assignedByRole === "dean");
    // Allow Deans to update Accepted complaints (for their action section) OR any complaint they have ownership of
    const canUpdateAcceptedAsDean =
      req.user.role === "dean" &&
      (complaint.status === "Accepted" || deanHasOwnership);
    // Only Deans and Admins can mark complaints as Resolved (final authority)
    const canResolveAsLeader =
      status === "Resolved" &&
      (req.user.role === "dean" || req.user.role === "admin") &&
      (req.user.role === "admin" ||
        (complaintDept && userDept && complaintDept === userDept));

    if (
      !isAdmin &&
      !(isStaff && isAssignedToSelf) &&
      !isAssignedToSelf &&
      !allowedForHoD &&
      !canCloseAsLeader &&
      !canUpdateAsDean &&
      !canUpdateAcceptedAsDean &&
      !canResolveAsLeader
    ) {
      return res
        .status(403)
        .json({ error: "Not authorized to update this complaint" });
    }

    // Prevent status updates after complaint is resolved (lock mechanism)
    if (complaint.status === "Resolved" && status !== "Closed") {
      return res.status(400).json({
        error:
          "Cannot update status after complaint is resolved. Only closing is allowed.",
      });
    }

    complaint.status = status;
    // Admin workflow rule: when marked Resolved, also consider complaint closed logically
    if (status === "Resolved") {
      complaint.status = "Resolved"; // keep status value
      // downstream logic already sets resolvedAt and student sees closure
    }
    if (description && String(description).trim()) {
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

    // Optional email on close
    try {
      if (status === "Closed") {
        const actorRole = req.user.role;
        if (["hod", "dean", "staff", "admin"].includes(actorRole)) {
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
          action = `HOD update: Status changed to ${status}`;
          descriptionText = `HOD update by ${actorName}${
            description ? `: ${description}` : ""
          }`;
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
    // Admin can only mark reviewed when the feedback was directed to Admin route (complaint submittedTo admin or assignedByRole admin)
    if (req.user.role === "admin") {
      const submittedToAdmin =
        (complaint.submittedTo || "").toLowerCase() === "admin";
      const adminInPath =
        (complaint.assignedByRole || "").toLowerCase() === "admin" ||
        (Array.isArray(complaint.assignmentPath) &&
          complaint.assignmentPath.some(
            (r) => String(r).toLowerCase() === "admin"
          ));
      if (!submittedToAdmin && !adminInPath) {
        return res.status(403).json({
          error:
            "Admins may mark reviewed only for feedback on complaints directed to Admin",
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
    const role = String(user?.role || "").toLowerCase();
    const scope = String(req.query?.scope || "").toLowerCase();
    if (assignedTo) q.assignedTo = assignedTo;
    if (department) q.department = department;
    if (status) q.status = status;
    if (submittedTo) q.submittedTo = { $regex: new RegExp(submittedTo, "i") };
    if (sourceRole)
      q.sourceRole = { $regex: new RegExp(`^${sourceRole}$`, "i") };

    // If caller requested department-scope explicitly, honor it for staff
    // e.g. GET /api/complaints?scope=department
    if (scope === "department" && role === "staff") {
      const dept = user.department || null;
      if (dept) {
        q.department = dept;
      } else {
        q.assignedTo = user._id; // fallback
      }
      // Only include complaints directed to staff mailbox (server-side guard)
      q.submittedTo = { $regex: /staff/i };
    } else if (
      !assignedTo &&
      !department &&
      !status &&
      !submittedTo &&
      !sourceRole
    ) {
      // Apply role-based defaults when no explicit filters/scope provided
      if (role === "staff") {
        // Staff: show all complaints for the staff member's department (assigned or not)
        const dept = user.department || null;
        if (dept) {
          q.department = dept;
        } else {
          // Fallback: only their own assigned items when department unknown
          q.assignedTo = user._id;
        }
      } else if (role === "hod") {
        // HoD: by default, show only items assigned to the HoD themself
        q.assignedTo = user._id;
      } else if (role === "admin" || role === "dean") {
        // Admin/Dean: see all unless filters are provided
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
    // (role already computed above)
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
