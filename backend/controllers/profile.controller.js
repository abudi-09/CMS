import User from "../models/user.model.js";
import Complaint from "../models/complaint.model.js";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";
import cloudinary, { cloudinaryUnsignedPreset } from "../config/cloudinary.js";

// GET /api/profile
export const getProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select(
      "name email username createdAt avatarUrl"
    );
    if (!user) return res.status(404).json({ error: "User not found" });

    const [totalComplaints, resolvedComplaints, inProgressComplaints, pendingComplaints] = await Promise.all([
      Complaint.countDocuments({ submittedBy: userId }),
      Complaint.countDocuments({ submittedBy: userId, status: "Resolved" }),
      Complaint.countDocuments({ submittedBy: userId, status: "In Progress" }),
      Complaint.countDocuments({ submittedBy: userId, status: "Pending" }),
    ]);
    const successRate = totalComplaints
      ? Number(((resolvedComplaints / totalComplaints) * 100).toFixed(2))
      : 0;

    const memberSince = user.createdAt
      ? new Date(user.createdAt).toLocaleDateString("en-US")
      : "-";

    res.json({
      name: user.name,
      email: user.email,
      username: user.username,
      avatarUrl: user.avatarUrl || "",
      memberSince,
  totalComplaints,
  resolvedComplaints,
  inProgressComplaints,
  pendingComplaints,
  successRate,
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
  avatarUrl: user.avatarUrl || "",
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

// POST /api/profile/avatar (multipart/form-data: field name 'avatar')
export const uploadAvatar = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const localRelPath = `/uploads/avatars/${req.file.filename}`;
    const localAbsPath = req.file.path;

    const haveCloudCreds =
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET;

  let uploaded = null;
  let fallbackReason = "";
    if (haveCloudCreds) {
      try {
        uploaded = await cloudinary.uploader.upload(localAbsPath, {
          folder: "cms_avatars",
          overwrite: true,
          resource_type: "image",
          eager: [
            { width: 256, height: 256, crop: "fill", gravity: "auto" },
            { width: 64, height: 64, crop: "fill", gravity: "auto" },
          ],
        });
      } catch (err) {
        const msg = err?.message || err?.error?.message || "Cloud upload failed";
        console.error("[uploadAvatar] Cloudinary upload failed", msg);
        if (/stale request/i.test(msg)) {
          fallbackReason = "stale-request-clock-skew";
          if (cloudinaryUnsignedPreset) {
            try {
              console.warn("[uploadAvatar] Retrying unsigned due to stale clock");
              uploaded = await cloudinary.uploader.unsigned_upload(
                localAbsPath,
                cloudinaryUnsignedPreset,
                {
                  folder: "cms_avatars",
                  eager: [
                    { width: 256, height: 256, crop: "fill", gravity: "auto" },
                    { width: 64, height: 64, crop: "fill", gravity: "auto" },
                  ],
                }
              );
              if (uploaded) fallbackReason = "";
            } catch (uErr) {
              console.error("[uploadAvatar] Unsigned fallback failed", uErr?.message || uErr);
              // Fallback to local: keep local file
              uploaded = null;
              if (!fallbackReason) fallbackReason = "unsigned-fallback-failed";
            }
          } // else fallback to local silently
        } else if (!uploaded) {
          fallbackReason = `cloud-error:${msg}`.slice(0,120);
        } // other errors -> fallback local
      } finally {
        if (uploaded) fs.unlink(localAbsPath, () => {});
      }

      if (uploaded) {
        if (user.avatarPublicId) {
          cloudinary.uploader.destroy(user.avatarPublicId).catch(() => {});
        }
        user.avatarUrl = uploaded.secure_url;
        user.avatarPublicId = uploaded.public_id;
      } else {
        user.avatarUrl = localRelPath;
      }
    } else {
      user.avatarUrl = localRelPath;
    }

    await user.save({ validateModifiedOnly: true });
    res.json({
      message: uploaded ? "Avatar updated (cloud)" : "Avatar updated (local)",
      avatarUrl: user.avatarUrl,
      storage: uploaded ? "cloudinary" : "local",
      fallbackReason: uploaded ? undefined : fallbackReason || undefined,
    });
  } catch (err) {
    console.error("[uploadAvatar] Error", err);
    res.status(500).json({ error: "Failed to upload avatar" });
  }
};

// PATCH /api/profile/avatar/cloud  (JSON body: { avatarUrl, publicId })
// This is used when the frontend uploads directly to Cloudinary (unsigned upload) and just
// sends metadata here for persistence + cleanup of old image.
export const saveCloudAvatar = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const { avatarUrl, publicId } = req.body || {};
    if (!avatarUrl || !publicId) {
      return res
        .status(400)
        .json({ error: "avatarUrl and publicId are required" });
    }
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const oldPublicId = user.avatarPublicId;
    user.avatarUrl = avatarUrl;
    user.avatarPublicId = publicId;
    await user.save({ validateModifiedOnly: true });

    if (oldPublicId && oldPublicId !== publicId) {
      // Best-effort cleanup, ignore errors
      cloudinary.uploader.destroy(oldPublicId).catch(() => {});
    }

    res.json({ message: "Avatar updated (cloud direct)", avatarUrl });
  } catch (err) {
    console.error("[saveCloudAvatar] Error", err);
    res.status(500).json({ error: "Failed to save cloud avatar" });
  }
};

// DELETE /api/profile/avatar  (revert to default avatar)
export const resetAvatar = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const currentUrl = user.avatarUrl;
    const currentPublicId = user.avatarPublicId;

    // Delete cloud resource if exists
    if (currentPublicId) {
      cloudinary.uploader.destroy(currentPublicId).catch(() => {});
    }
    // Delete local file if path points to our uploads folder
    if (currentUrl && currentUrl.startsWith("/uploads/avatars/")) {
      const localPath = path.join(process.cwd(), "backend", currentUrl.replace(/^\/+/ , ""));
      fs.unlink(localPath, () => {});
    }

    user.avatarUrl = "";
    user.avatarPublicId = undefined;
    await user.save({ validateModifiedOnly: true });
    res.json({ message: "Avatar reset to default", avatarUrl: "" });
  } catch (err) {
    console.error("[resetAvatar] Error", err);
    res.status(500).json({ error: "Failed to reset avatar" });
  }
};
