import express from "express";
import {
  getProfile,
  changePassword,
} from "../controllers/profile.controller.js";
import { protectRoute } from "../middleware/protectRoute.js";

const router = express.Router();

router.get("/profile", protectRoute, getProfile);
router.put("/profile/password", protectRoute, changePassword);

export default router;
