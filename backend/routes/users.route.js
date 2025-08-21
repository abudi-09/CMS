import express from "express";
import { protectRoute, adminOnly } from "../middleware/protectRoute.js";
import {
  activateUser,
  deactivateUser,
} from "../controllers/users.controller.js";

const router = express.Router();

// Matches requirement: POST /api/users/activate { userId }
router.post("/activate", protectRoute, adminOnly, activateUser);

// Matches requirement: POST /api/users/deactivate { userId }
router.post("/deactivate", protectRoute, adminOnly, deactivateUser);

export default router;
