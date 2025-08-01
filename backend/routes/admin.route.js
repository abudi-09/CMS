import express from "express";
import {
  getPendingStaff,
  approveStaff,
  rejectStaff,
} from "../controllers/admin.controller.js";
import { protectRoute, adminOnly } from "../middleware/protectRoute.js";
import { getAllStaff } from "../controllers/admin.controller.js"; // Import the new controller function

const router = express.Router();

// Get all pending staff
router.get("/pending-staff", protectRoute, adminOnly, getPendingStaff);

// Get all staff
router.get("/all-staff", protectRoute, adminOnly, getAllStaff);

// Approve staff
router.put("/approve/:id", protectRoute, adminOnly, approveStaff);

// Reject staff
router.delete("/reject/:id", protectRoute, adminOnly, rejectStaff);

export default router;
