import express from "express";
import { protectRoute, adminOnly } from "../middleware/protectRoute.js";
import {
  getPendingStaff,
  approveStaff,
  rejectStaff,
  deactivateStaff,
  activateStaff,
  getAllStaff,
  getAllUsers,
} from "../controllers/admin.controller.js";

const router = express.Router();
// Deactivate staff
router.put("/deactivate/:id", protectRoute, adminOnly, deactivateStaff);

// Activate staff
router.put("/activate/:id", protectRoute, adminOnly, activateStaff);

// Get all pending staff
router.get("/pending-staff", protectRoute, adminOnly, getPendingStaff);

// Get all staff
router.get("/all-staff", protectRoute, adminOnly, getAllStaff);

// Get all users (optional query: ?role=user|staff|headOfDepartment|dean|admin&department=DeptName)
router.get("/users", protectRoute, adminOnly, getAllUsers);

// Approve staff
router.put("/approve/:id", protectRoute, adminOnly, approveStaff);

// Reject staff
router.delete("/reject/:id", protectRoute, adminOnly, rejectStaff);

export default router;
