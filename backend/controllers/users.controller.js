import User from "../models/user.model.js";

export const activateUser = async (req, res) => {
  try {
    const { userId } = req.body || {};
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    user.isActive = true;
    await user.save();
    return res.status(200).json({ message: "User activated successfully" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to activate user" });
  }
};

export const deactivateUser = async (req, res) => {
  try {
    const { userId } = req.body || {};
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    user.isActive = false;
    await user.save();
    return res.status(200).json({ message: "User deactivated successfully" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to deactivate user" });
  }
};
