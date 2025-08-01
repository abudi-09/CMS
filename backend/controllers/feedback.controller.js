import Feedback from "../models/Feedback.js";
import User from "../models/user.model.js";

// Get all feedbacks (admin)
export const getAllFeedback = async (req, res) => {
  try {
    const feedbacks = await Feedback.find()
      .populate({ path: "user", select: "name email department" })
      .sort({ createdAt: -1 });
    res.status(200).json(feedbacks);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
};

// Optionally: Add more endpoints for filtering, deleting, etc.
