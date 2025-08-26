import mongoose from "mongoose";
import User, { normalizeRole } from "../models/user.model.js";

const getId = (req) => req.params?.id || req.body?.userId;

export const activateUser = async (req, res) => {
  try {
    const id = getId(req);
    if (!id) return res.status(400).json({ error: "userId is required" });
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user id" });
    }
    const current = await User.findById(id).select("-password");
    if (!current) return res.status(404).json({ error: "User not found" });
    if (current.isActive) {
      return res
        .status(200)
        .json({ message: "User already active", user: current });
    }
    const updated = await User.findByIdAndUpdate(
      id,
      { $set: { isActive: true } },
      { new: true, runValidators: false, fields: { password: 0 } }
    );
    const safe = updated;
    return res
      .status(200)
      .json({ message: "User activated successfully", user: safe });
  } catch (err) {
    const msg =
      err && typeof err === "object" && "message" in err
        ? err.message
        : "Failed to activate user";
    return res.status(500).json({ error: msg });
  }
};

export const deactivateUser = async (req, res) => {
  try {
    const id = getId(req);
    if (!id) return res.status(400).json({ error: "userId is required" });
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user id" });
    }
    const current = await User.findById(id).select("-password");
    if (!current) return res.status(404).json({ error: "User not found" });
    if (!current.isActive) {
      return res
        .status(200)
        .json({ message: "User already deactivated", user: current });
    }
    const updated = await User.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true, runValidators: false, fields: { password: 0 } }
    );
    const safe = updated;
    return res
      .status(200)
      .json({ message: "User deactivated successfully", user: safe });
  } catch (err) {
    const msg =
      err && typeof err === "object" && "message" in err
        ? err.message
        : "Failed to deactivate user";
    return res.status(500).json({ error: msg });
  }
};

export const promoteUser = async (req, res) => {
  try {
    const id = getId(req);
    const roleInput = req.query?.role || req.body?.role;
    if (!id) return res.status(400).json({ error: "userId is required" });
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user id" });
    }
    if (!roleInput) return res.status(400).json({ error: "role is required" });
    const role = normalizeRole(roleInput);
    const allowed = ["student", "staff", "hod", "dean", "admin"];
    if (!allowed.includes(String(role))) {
      return res.status(400).json({ error: "Invalid role" });
    }
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.role === role) {
      const safe = await User.findById(id).select("-password");
      return res
        .status(200)
        .json({ message: `User already has role ${role}`, user: safe });
    }

    if (role === "admin") {
      // Promote to admin: allowed only if current role is not admin
      if (user.role === "admin") {
        const safe = await User.findById(id).select("-password");
        return res
          .status(200)
          .json({ message: `User already has role ${role}`, user: safe });
      }
      user.previousRole = user.role;
      // snapshot fields required for non-admin roles for safe reversion
      user.previousDepartment = user.department || user.previousDepartment;
      user.previousWorkingPlace =
        user.workingPlace || user.previousWorkingPlace;
      user.role = "admin";
      user.isApproved = true;
      user.isActive = true;
    } else {
      // Revert path: only allowed when current role is admin and role equals previousRole
      if (user.role !== "admin") {
        return res.status(400).json({
          error: "Only promotion to admin is allowed for non-admin users",
        });
      }
      if (!user.previousRole) {
        return res
          .status(400)
          .json({ error: "No previous role stored; cannot revert" });
      }
      if (role !== user.previousRole) {
        return res.status(400).json({
          error: "Can only revert admin to their previous role",
          previousRole: user.previousRole,
        });
      }
      const newRole = user.previousRole;
      user.role = newRole;
      if (newRole === "student") {
        user.isApproved = true;
        user.isActive = true;
        user.department =
          user.previousDepartment || user.department || "General";
        user.workingPlace = undefined;
      } else {
        // staff/hod/dean
        user.isApproved = false;
        user.isActive = false;
        user.department =
          user.previousDepartment || user.department || "General";
        user.workingPlace =
          user.previousWorkingPlace || user.workingPlace || "Main Campus";
      }
      // Clear previousRole after successful revert
      user.previousRole = undefined;
    }

    await user.save();
    const safe = await User.findById(id).select("-password");
    return res
      .status(200)
      .json({
        message: `User role updated to ${role} successfully`,
        user: safe,
      });
  } catch (err) {
    const msg =
      err && typeof err === "object" && "message" in err
        ? err.message
        : "Failed to promote user";
    return res.status(500).json({ error: msg });
  }
};
