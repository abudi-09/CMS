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
  deanDeapproveHod,
  deanReapproveHod,
  deanGetActiveHod,
  deanGetRejectedHod,
  adminGetPendingDeans,
  adminGetActiveDeans,
  adminApproveDean,
  adminRejectDean,
  adminDeactivateDean,
  adminReactivateDean,
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
router.put("/dean/deapprove-hod/:id", protectRoute, deanOnly, deanDeapproveHod);
router.put("/dean/reapprove-hod/:id", protectRoute, deanOnly, deanReapproveHod);
router.get("/dean/active-hod", protectRoute, deanOnly, deanGetActiveHod);
router.get("/dean/rejected-hod", protectRoute, deanOnly, deanGetRejectedHod);

// Admin approval routes for Deans
router.get(
  "/admin/pending-deans",
  protectRoute,
  adminOnly,
  adminGetPendingDeans
);
router.get("/admin/active-deans", protectRoute, adminOnly, adminGetActiveDeans);
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
router.put(
  "/admin/deactivate-dean/:id",
  protectRoute,
  adminOnly,
  adminDeactivateDean
);
router.put(
  "/admin/reactivate-dean/:id",
  protectRoute,
  adminOnly,
  adminReactivateDean
);

// Admin HoD routes removed in dean-only flow

export default router;
