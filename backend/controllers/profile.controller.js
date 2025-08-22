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

// PUT /api/profile (update basic profile fields like name)
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const { name, phone, address, bio } = req.body;

    if (name && (!name.trim() || name.length < 2)) {
      return res
        .status(400)
        .json({ error: "Name must be at least 2 characters long" });
    }
    if (bio && bio.length > 500) {
      return res
        .status(400)
        .json({ error: "Bio must be 500 characters or less" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;
    if (bio !== undefined) user.bio = bio;

    await user.save({ validateModifiedOnly: true });
    return res.json({
      message: "Profile updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone || "",
        address: user.address || "",
        bio: user.bio || "",
      },
    });
  } catch (err) {
    console.error("[updateProfile] Error:", err);
    return res.status(500).json({ error: "Failed to update profile" });
  }
};

// PUT /api/profile/password
export const changePassword = async (req, res) => {
  try {
    console.log("[changePassword] req.user:", req.user);
    const userId = req.user?._id;
    const { oldPassword, newPassword } = req.body;
    console.log(
      "[changePassword] userId:",
      userId,
      "oldPassword:",
      oldPassword,
      "newPassword:",
      newPassword
    );
    if (!oldPassword || !newPassword) {
      console.log("[changePassword] Missing old or new password");
      return res
        .status(400)
        .json({ error: "Both old and new passwords are required" });
    }
    if (newPassword.length < 6) {
      console.log("[changePassword] New password too short");
      return res
        .status(400)
        .json({ error: "New password must be at least 6 characters" });
    }

    const user = await User.findById(userId);
    console.log("[changePassword] user from DB:", user);
    if (!user) {
      console.log("[changePassword] User not found");
      return res.status(404).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    console.log("[changePassword] isMatch:", isMatch);
    if (!isMatch) {
      console.log("[changePassword] Old password is incorrect");
      return res.status(400).json({ error: "Old password is incorrect" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save({ validateModifiedOnly: true });
    console.log("[changePassword] Password updated successfully");
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("[changePassword] Error:", err);
    res.status(500).json({ error: "Failed to update password" });
  }
};
