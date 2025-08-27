import express from "express";
import { protectRoute, adminOnly } from "../middleware/protectRoute.js";
import {
  activateUser,
  deactivateUser,
  promoteUser,
  getActiveHodForMyDepartment,
} from "../controllers/users.controller.js";

const router = express.Router();

// Matches requirement: POST /api/users/activate { userId }
router.post("/activate", protectRoute, adminOnly, activateUser);

// Matches requirement: POST /api/users/deactivate { userId }
router.post("/deactivate", protectRoute, adminOnly, deactivateUser);

// New: PATCH /api/users/:id/activate
//   Example: PATCH /api/users/64f.../activate
router.patch("/:id/activate", protectRoute, adminOnly, activateUser);
// New: PATCH /api/users/:id/deactivate
//   Example: PATCH /api/users/64f.../deactivate
router.patch("/:id/deactivate", protectRoute, adminOnly, deactivateUser);
// New: PATCH /api/users/:id/promote?role=staff|admin|... or body { role }
//   Example: PATCH /api/users/64f.../promote?role=hod
router.patch("/:id/promote", protectRoute, adminOnly, promoteUser);

// NEW ROUTE: Get active HoD for the logged-in user's department
// This matches the path used in the frontend's listMyDepartmentHodApi function.
router.get(
  "/department/hod/active",
  protectRoute,
  getActiveHodForMyDepartment
);

export default router;
