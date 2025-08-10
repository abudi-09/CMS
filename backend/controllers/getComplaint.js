// Add a controller to get a single complaint by ID
import Complaint from "../models/complaint.model.js";

export const getComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate("submittedBy", "name email role")
      .populate("assignedTo", "name email role");
    if (!complaint) {
      console.error(`[getComplaint] Not found: id=${req.params.id}`);
      return res.status(404).json({ error: "Complaint not found" });
    }
    res.status(200).json({ complaint });
  } catch (err) {
    console.error(`[getComplaint] Error for id=${req.params.id}:`, err);
    res
      .status(500)
      .json({ error: "Failed to fetch complaint", details: err.message });
  }
};
