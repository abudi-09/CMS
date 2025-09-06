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
