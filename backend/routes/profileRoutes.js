import express from "express";
import {
  getProfile,
  updateProfile,
  changePassword,
  uploadAvatar,
  saveCloudAvatar,
  resetAvatar,
  getUserPublicProfile,
} from "../controllers/profile.controller.js";
import { protectRoute } from "../middleware/protectRoute.js";
import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure upload directory exists
const avatarDir = path.join(process.cwd(), "backend", "uploads", "avatars");
fs.mkdirSync(avatarDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, avatarDir);
  },
  filename: function (_req, file, cb) {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || "";
    cb(null, unique + ext.toLowerCase());
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Invalid file type"));
};

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter,
});

const router = express.Router();

router.get("/profile", protectRoute, getProfile);
router.put("/profile", protectRoute, updateProfile);
router.put("/profile/password", protectRoute, changePassword);
router.post(
  "/profile/avatar",
  protectRoute,
  upload.single("avatar"),
  uploadAvatar
);
router.patch("/profile/avatar/cloud", protectRoute, saveCloudAvatar);
router.delete("/profile/avatar", protectRoute, resetAvatar);
// Public profile (authenticated) for management views
router.get("/profile/user/:id", protectRoute, getUserPublicProfile);

export default router;
