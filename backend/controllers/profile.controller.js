import User from "../models/user.model.js";
import Complaint from "../models/complaint.model.js";
import bcrypt from "bcryptjs";

// GET /api/profile
export const getProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select(
      "name email username createdAt"
    );
    if (!user) return res.status(404).json({ error: "User not found" });

    const totalComplaints = await Complaint.countDocuments({
      submittedBy: userId,
    });
    const resolvedComplaints = await Complaint.countDocuments({
      submittedBy: userId,
      status: "Resolved",
    });

    const memberSince = user.createdAt
      ? new Date(user.createdAt).toLocaleDateString("en-US")
      : "-";

    res.json({
      name: user.name,
      email: user.email,
      username: user.username,
      memberSince,
      totalComplaints,
      resolvedComplaints,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
};

// PUT /api/profile/password
export const changePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword)
      return res
        .status(400)
        .json({ error: "Both old and new passwords are required" });
    if (newPassword.length < 6)
      return res
        .status(400)
        .json({ error: "New password must be at least 6 characters" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch)
      return res.status(400).json({ error: "Old password is incorrect" });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update password" });
  }
};
