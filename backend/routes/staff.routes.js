import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  listActiveHods,
  listActiveStaffForUserDepartment,
} from "../controllers/staff.controller.js";

const router = express.Router();

// Endpoint to list and log all active HODs
router.get("/hod/active", protectRoute, listActiveHods);

// Authenticated users can fetch eligible staff in their own department
router.get(
  "/department/active",
  protectRoute,
  listActiveStaffForUserDepartment
);

export default router;
