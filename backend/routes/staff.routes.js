import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import { listActiveStaffForUserDepartment } from "../controllers/staff.controller.js";

const router = express.Router();

// Authenticated users can fetch eligible staff in their own department
router.get("/department/active", protectRoute, listActiveStaffForUserDepartment);

export default router;
