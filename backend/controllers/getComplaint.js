// Add a controller to get a single complaint by ID
import Complaint from "../models/complaint.model.js";
import mongoose from "mongoose";

export const getComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate("submittedBy", "name email role")
      .populate("assignedTo", "name email role");
    if (!complaint) {
      console.error(`[getComplaint] Not found: id=${req.params.id}`);
      return res.status(404).json({ error: "Complaint not found" });
    }
    // Role-scoped protection for dean access: only owner dean or dean who assigned it
    if (req.user && String(req.user.role).toLowerCase() === "dean") {
      const deanId = new mongoose.Types.ObjectId(req.user._id);
      const isOwner =
        complaint.recipientRole === "dean" &&
        String(complaint.recipientId) === String(deanId);
      const isAssigner = String(complaint.assignedBy) === String(deanId);
      if (!isOwner && !isAssigner) {
        return res.status(403).json({ error: "Access denied (dean scope)" });
      }
    }
    // Compute staff action permission when a staff is viewing
    try {
      const viewerIsStaff =
        req.user && String(req.user.role).toLowerCase() === "staff";
      const viewerId =
        req.user?._id?.toString?.() || req.user?.id?.toString?.() || null;
      const assignedToId = complaint.assignedTo
        ? complaint.assignedTo._id?.toString?.() || String(complaint.assignedTo)
        : null;
      const status = String(complaint.status || "");
      const canStaffAct =
        !!viewerIsStaff &&
        !!viewerId &&
        !!assignedToId &&
        viewerId === assignedToId &&
        ["Accepted", "In Progress"].includes(status);

      const payload = complaint.toObject ? complaint.toObject() : complaint;
      payload.canStaffAct = canStaffAct;
      payload.isAnonymous = !!complaint.isAnonymous;
      if (payload.isAnonymous) {
        payload.submittedBy = "Anonymous";
      }
      return res.status(200).json({ complaint: payload });
    } catch (_) {
      // Fallback to existing behavior if anything goes wrong
      const fallbackPayload = complaint.toObject
        ? complaint.toObject()
        : complaint;
      fallbackPayload.isAnonymous = !!complaint.isAnonymous;
      if (fallbackPayload.isAnonymous) {
        fallbackPayload.submittedBy = "Anonymous";
      }
      return res.status(200).json({ complaint: fallbackPayload });
    }
  } catch (err) {
    console.error(`[getComplaint] Error for id=${req.params.id}:`, err);
    res
      .status(500)
      .json({ error: "Failed to fetch complaint", details: err.message });
  }
};
