import express from "express";
import {
  protectRoute,
  adminOnly,
  deanOnly,
  hodOnly,
} from "../middleware/protectRoute.js";
import {
  hodGetPendingStaff,
  hodApproveStaff,
  hodRejectStaff,
  deanGetPendingHod,
  deanApproveHod,
  deanRejectHod,
  adminGetPendingDeans,
  adminApproveDean,
  adminRejectDean,
} from "../controllers/approval.controller.js";

const router = express.Router();

// HoD approval routes
router.get("/hod/pending-staff", protectRoute, hodOnly, hodGetPendingStaff);
router.put("/hod/approve-staff/:id", protectRoute, hodOnly, hodApproveStaff);
router.delete("/hod/reject-staff/:id", protectRoute, hodOnly, hodRejectStaff);

// Dean approval routes
router.get("/dean/pending-hod", protectRoute, deanOnly, deanGetPendingHod);
router.put("/dean/approve-hod/:id", protectRoute, deanOnly, deanApproveHod);
router.delete("/dean/reject-hod/:id", protectRoute, deanOnly, deanRejectHod);

// Admin approval routes for Deans
router.get(
  "/admin/pending-deans",
  protectRoute,
  adminOnly,
  adminGetPendingDeans
);
router.put(
  "/admin/approve-dean/:id",
  protectRoute,
  adminOnly,
  adminApproveDean
);
router.delete(
  "/admin/reject-dean/:id",
  protectRoute,
  adminOnly,
  adminRejectDean
);

export default router;
