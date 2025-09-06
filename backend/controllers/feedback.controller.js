import Feedback from "../models/Feedback.js";
import Complaint from "../models/complaint.model.js";
import User from "../models/user.model.js";

// Admin only: list all feedback (existing behavior retained)
export const getAllFeedback = async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ archived: false })
      .populate({ path: "user", select: "name email department" })
      .populate({ path: "targetAdmin", select: "name email" })
      .sort({ createdAt: -1 });
    res.status(200).json(feedbacks);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
};

// Get feedback for a specific complaint (role protected)
export const getFeedbackForComplaint = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const complaint = await Complaint.findById(complaintId).select({
      submittedBy: 1,
    });
    if (!complaint)
      return res.status(404).json({ error: "Complaint not found" });

    // Authorization: submitter or staff/admin/dean/hod assigned viewers
    const role = req.user.role;
    const allowedViewer =
      complaint.submittedBy.equals(req.user._id) ||
      ["admin", "dean", "hod", "staff"].includes(role);
    if (!allowedViewer) return res.status(403).json({ error: "Forbidden" });

    // For non-admin viewers hide admin-only private feedback directed to another admin
    const baseFilter = { complaintId, archived: false };
    let filter = baseFilter;
    if (role === "admin") {
      // Admin sees only feedback either not admin-specific or targeted to them
      filter = {
        ...baseFilter,
        $or: [{ isAdminFeedback: false }, { targetAdmin: req.user._id }],
      };
    } else {
      filter = { ...baseFilter, $or: [{ isAdminFeedback: false }] };
    }
    const items = await Feedback.find(filter)
      .populate({ path: "user", select: "name email" })
      .populate({ path: "targetAdmin", select: "name email" })
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({ items });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
};

// Student submit feedback (support multiple entries)
export const addFeedbackToComplaint = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { rating, comment, adminTarget } = req.body;
    const complaint = await Complaint.findById(complaintId).select({
      submittedBy: 1,
      status: 1,
      title: 1,
      assignedTo: 1,
      complaintCode: 1,
    });
    if (!complaint)
      return res.status(404).json({ error: "Complaint not found" });
    if (!complaint.submittedBy.equals(req.user._id)) {
      return res.status(403).json({ error: "Not authorized" });
    }
    if (complaint.status !== "Resolved") {
      return res
        .status(400)
        .json({ error: "Feedback allowed only after resolution" });
    }
    let targetAdminUser = null;
    if (adminTarget) {
      targetAdminUser = await User.findOne({
        _id: adminTarget,
        role: "admin",
      }).select({ _id: 1 });
      if (!targetAdminUser) {
        return res.status(400).json({ error: "Invalid target admin" });
      }
    }
    const doc = await Feedback.create({
      complaintId,
      user: req.user._id,
      rating,
      comments: comment,
      isAdminFeedback: !!targetAdminUser,
      targetAdmin: targetAdminUser?._id || null,
    });
    res.status(201).json({ message: "Feedback added", feedback: doc });
  } catch (e) {
    res.status(500).json({ error: "Failed to add feedback" });
  }
};

// Student update their specific feedback entry
export const updateFeedback = async (req, res) => {
  try {
    const { id } = req.params; // feedback id
    const { rating, comment } = req.body || {};
    const feedback = await Feedback.findById(id);
    if (!feedback) return res.status(404).json({ error: "Not found" });

    // Author can edit (not delete) while not reviewed
    if (feedback.user.equals(req.user._id)) {
      if (feedback.reviewStatus === "Reviewed") {
        return res
          .status(400)
          .json({ error: "Reviewed feedback is read-only" });
      }
      let changed = false;
      if (typeof rating === "number") {
        feedback.rating = rating;
        changed = true;
      }
      if (typeof comment === "string") {
        feedback.comments = comment;
        changed = true;
      }
      if (!changed) return res.status(400).json({ error: "No changes" });
      await feedback.save();
      return res.status(200).json({ message: "Feedback updated", feedback });
    }

    // Admin who is target can archive after review
    if (
      req.user.role === "admin" &&
      feedback.targetAdmin &&
      feedback.targetAdmin.equals(req.user._id) &&
      feedback.reviewStatus === "Reviewed"
    ) {
      feedback.archived = true;
      await feedback.save();
      return res.status(200).json({ message: "Feedback archived" });
    }
    return res.status(403).json({ error: "Not authorized" });
  } catch (e) {
    res.status(500).json({ error: "Failed to update feedback" });
  }
};

// Admin marks targeted feedback reviewed
export const markFeedbackReviewed = async (req, res) => {
  try {
    const { id } = req.params; // feedback id
    const feedback = await Feedback.findById(id);
    if (!feedback) return res.status(404).json({ error: "Not found" });
    if (
      req.user.role !== "admin" ||
      !feedback.targetAdmin ||
      !feedback.targetAdmin.equals(req.user._id)
    ) {
      return res.status(403).json({ error: "Not authorized" });
    }
    if (feedback.reviewStatus === "Reviewed") {
      return res.status(200).json({ message: "Already reviewed", feedback });
    }
    feedback.reviewStatus = "Reviewed";
    feedback.reviewedAt = new Date();
    feedback.reviewedBy = req.user._id;
    await feedback.save();
    res.status(200).json({ message: "Marked reviewed", feedback });
  } catch (e) {
    res.status(500).json({ error: "Failed to mark reviewed" });
  }
};

// Student delete their feedback entry
export const deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params; // feedback id
    const feedback = await Feedback.findById(id);
    if (!feedback) return res.status(404).json({ error: "Not found" });
    if (!feedback.user.equals(req.user._id)) {
      return res.status(403).json({ error: "Not authorized" });
    }
    await feedback.deleteOne();
    res.status(200).json({ message: "Feedback deleted" });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete feedback" });
  }
};

// Admin: get my targeted feedback (newly added)
export const getMyTargetedAdminFeedback = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }
    const adminId = req.user._id;
    // Only feedback explicitly targeted to this admin, not archived
    const docs = await Feedback.find({
      targetAdmin: adminId,
      archived: false,
    })
      .populate({ path: "user", select: "name email" })
      .sort({ createdAt: -1 })
      .lean();

    const items = docs.map((f) => ({
      id: f._id,
      student:
        f.user && typeof f.user === "object"
          ? f.user.name || f.user.email || "Anonymous"
          : "Anonymous",
      comment: f.comments || "",
      rating: f.rating,
      createdAt: f.createdAt,
      reviewStatus: f.reviewStatus,
    }));
    res.status(200).json({ items });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch admin feedback" });
  }
};

// Unified: list feedback for complaints resolved by the logged-in user (any role)
// Supports optional query param status=reviewed|unreviewed to filter multi-entry targeted docs and embedded feedback
export const listMyResolvedFeedback = async (req, res) => {
  try {
    const role = String(req.user.role || "").toLowerCase();
    if (!["admin", "dean", "hod", "staff"].includes(role)) {
      return res.status(403).json({ error: "Access denied" });
    }
    const userId = req.user._id;
    const filterStatus = (req.query.status || "").toString().toLowerCase();

    // 1. Embedded legacy feedback path (complaint.feedback)
    const embeddedComplaints = await Complaint.find({
      status: "Resolved",
      assignedTo: userId,
      "feedback.rating": { $exists: true },
    })
      .select(
        "title complaintCode category department resolvedAt updatedAt createdAt status assignedTo submittedBy feedback"
      )
      .populate("submittedBy", "name email")
      .lean();

    const embeddedEntries = embeddedComplaints
      .map((c) => {
        const fb = c.feedback || {};
        const reviewed = !!fb.reviewed;
        if (filterStatus === "reviewed" && !reviewed) return null;
        if (filterStatus === "unreviewed" && reviewed) return null;
        return {
          kind: "embedded",
          complaintId: c._id,
          feedbackEntryId: null,
          title: c.title,
          complaintCode: c.complaintCode,
          category: c.category,
          department: c.department,
          submittedBy: c.submittedBy,
          rating: fb.rating,
          comment: fb.comment,
          createdAt: fb.submittedAt || c.createdAt,
          resolvedAt: c.resolvedAt || c.updatedAt,
          reviewed,
          reviewStatus: reviewed ? "Reviewed" : "Not Reviewed",
          reviewable: !reviewed,
        };
      })
      .filter(Boolean);

    // 2. Multi-entry targeted feedback (Feedback docs referencing complaints this user resolved)
    const targetedDocs = await Feedback.find({
      archived: false,
      // Not restricting targetAdmin here: any student feedback that was directed to an admin specifically
      // is already handled separately; for generic resolver-based access we only include those targeted to this user
      $or: [{ targetAdmin: userId }, { targetAdmin: { $exists: false } }],
    })
      .populate({
        path: "complaintId",
        select:
          "title complaintCode category department resolvedAt updatedAt createdAt status assignedTo submittedBy",
        populate: [
          { path: "submittedBy", select: "name email" },
          { path: "assignedTo", select: "_id" },
        ],
      })
      .populate({ path: "user", select: "name email" })
      .sort({ createdAt: -1 })
      .lean();

    const multiEntries = targetedDocs
      .filter((f) => {
        const c = f.complaintId;
        if (!c) return false;
        if (c.status !== "Resolved") return false;
        // Must have been resolved (assigned) by this user
        if (!c.assignedTo) return false;
        if (String(c.assignedTo._id || c.assignedTo) !== String(userId))
          return false;
        const reviewed = f.reviewStatus === "Reviewed";
        if (filterStatus === "reviewed" && !reviewed) return false;
        if (filterStatus === "unreviewed" && reviewed) return false;
        return true;
      })
      .map((f) => {
        const c = f.complaintId || {};
        const reviewed = f.reviewStatus === "Reviewed";
        return {
          kind: "targeted",
          complaintId: c._id,
          feedbackEntryId: f._id,
          title: c.title,
          complaintCode: c.complaintCode,
          category: c.category,
          department: c.department,
          submittedBy: c.submittedBy,
          rating: f.rating,
          comment: f.comments,
          createdAt: f.createdAt,
          resolvedAt: c.resolvedAt || c.updatedAt,
          reviewed,
          reviewStatus: reviewed ? "Reviewed" : "Not Reviewed",
          reviewable:
            !reviewed &&
            role === "admin" &&
            f.targetAdmin &&
            String(f.targetAdmin) === String(userId),
        };
      });

    // Merge & sort by createdAt desc
    const merged = [...embeddedEntries, ...multiEntries].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return res.status(200).json({ items: merged });
  } catch (e) {
    console.error("listMyResolvedFeedback error", e?.message || e);
    return res.status(500).json({ error: "Failed to list feedback" });
  }
};

// Generic mark-as-reviewed route supporting both embedded feedback and targeted Feedback docs
export const reviewAnyFeedback = async (req, res) => {
  try {
    const role = String(req.user.role || "").toLowerCase();
    if (!["admin", "dean", "hod", "staff"].includes(role)) {
      return res.status(403).json({ error: "Access denied" });
    }
    const { complaintId, entryId } = req.body || {};
    if (!complaintId && !entryId) {
      return res
        .status(400)
        .json({
          error: "Provide complaintId (embedded) or entryId (targeted)",
        });
    }
    if (entryId) {
      // Targeted feedback document path
      const doc = await Feedback.findById(entryId).populate({
        path: "complaintId",
        select: "assignedTo status",
      });
      if (!doc) return res.status(404).json({ error: "Feedback not found" });
      if (!doc.complaintId || doc.complaintId.status !== "Resolved") {
        return res.status(400).json({ error: "Complaint not resolved" });
      }
      // Only resolver (assignedTo) or targetAdmin (if admin) can review
      const assignedTo = doc.complaintId.assignedTo;
      const isResolver =
        assignedTo && String(assignedTo) === String(req.user._id);
      const isTargetAdmin =
        doc.targetAdmin && String(doc.targetAdmin) === String(req.user._id);
      if (!isResolver && !isTargetAdmin) {
        return res.status(403).json({ error: "Not authorized to review" });
      }
      if (doc.reviewStatus === "Reviewed") {
        return res.status(200).json({ message: "Already reviewed" });
      }
      doc.reviewStatus = "Reviewed";
      doc.reviewedAt = new Date();
      doc.reviewedBy = req.user._id;
      await doc.save();
      return res.status(200).json({ message: "Reviewed", entryId });
    }
    // Embedded path
    const complaint = await Complaint.findById(complaintId);
    if (!complaint)
      return res.status(404).json({ error: "Complaint not found" });
    if (!complaint.feedback || typeof complaint.feedback.rating !== "number") {
      return res.status(400).json({ error: "No embedded feedback" });
    }
    if (
      !complaint.assignedTo ||
      String(complaint.assignedTo) !== String(req.user._id)
    ) {
      return res.status(403).json({ error: "Not authorized" });
    }
    if (complaint.feedback.reviewed) {
      return res.status(200).json({ message: "Already reviewed" });
    }
    complaint.feedback.reviewed = true;
    complaint.feedback.reviewedAt = new Date();
    complaint.feedback.reviewedBy = req.user._id;
    await complaint.save();
    return res.status(200).json({ message: "Reviewed", complaintId });
  } catch (e) {
    console.error("reviewAnyFeedback error", e?.message || e);
    return res.status(500).json({ error: "Failed to mark reviewed" });
  }
};
