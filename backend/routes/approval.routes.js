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
  hodDeactivateStaff,
  hodReactivateStaff,
  hodGetActiveStaff,
  hodGetDeactivatedStaff,
  hodGetRejectedStaff,
  deanGetPendingHod,
  deanApproveHod,
  deanRejectHod,
  deanGetAllHod,
  deanDebugHodCounts,
  deanDeapproveHod,
  deanReapproveHod,
  deanDeactivateHod,
  deanReactivateHod,
  deanGetActiveHod,
  deanGetRejectedHod,
  deanGetPendingStaff,
  deanApproveStaff,
  deanRejectStaff,
  deanDeactivateStaff,
  deanReactivateStaff,
  deanGetActiveStaff,
  deanGetDeactivatedStaff,
  deanGetRejectedStaff,
  deanGetUsers,
  deanActivateUser,
  deanDeactivateUser,
  deanPromoteUser,
  adminGetPendingDeans,
  adminGetActiveDeans,
  adminApproveDean,
  adminRejectDean,
  adminDeactivateDean,
  adminReactivateDean,
} from "../controllers/approval.controller.js";
import {
  publicGetActiveDeans,
  publicGetActiveAdmins,
} from "../controllers/approval.controller.js";

const router = express.Router();

// HoD approval routes
import {
  hodGetUsers,
  hodActivateUser,
  hodDeactivateUser,
  hodPromoteUser,
} from "../controllers/approval.controller.js";

// ...existing code...
// HoD user management routes
router.get("/hod/users", protectRoute, hodOnly, hodGetUsers);
router.put("/hod/activate-user/:id", protectRoute, hodOnly, hodActivateUser);
router.put(
  "/hod/deactivate-user/:id",
  protectRoute,
  hodOnly,
  hodDeactivateUser
);
router.put("/hod/promote-user/:id", protectRoute, hodOnly, hodPromoteUser);
router.get("/hod/pending-staff", protectRoute, hodOnly, hodGetPendingStaff);
router.put("/hod/approve-staff/:id", protectRoute, hodOnly, hodApproveStaff);
router.delete("/hod/reject-staff/:id", protectRoute, hodOnly, hodRejectStaff);
router.put(
  "/hod/deactivate-staff/:id",
  protectRoute,
  hodOnly,
  hodDeactivateStaff
);
router.put(
  "/hod/reactivate-staff/:id",
  protectRoute,
  hodOnly,
  hodReactivateStaff
);
router.get("/hod/active-staff", protectRoute, hodOnly, hodGetActiveStaff);
router.get(
  "/hod/deactivated-staff",
  protectRoute,
  hodOnly,
  hodGetDeactivatedStaff
);
router.get("/hod/rejected-staff", protectRoute, hodOnly, hodGetRejectedStaff);

// Dean approval routes
router.get("/dean/pending-hod", protectRoute, deanOnly, deanGetPendingHod);
router.put("/dean/approve-hod/:id", protectRoute, deanOnly, deanApproveHod);
router.delete("/dean/reject-hod/:id", protectRoute, deanOnly, deanRejectHod);
router.put("/dean/deapprove-hod/:id", protectRoute, deanOnly, deanDeapproveHod);
router.put("/dean/reapprove-hod/:id", protectRoute, deanOnly, deanReapproveHod);
router.put(
  "/dean/deactivate-hod/:id",
  protectRoute,
  deanOnly,
  deanDeactivateHod
);
router.put(
  "/dean/reactivate-hod/:id",
  protectRoute,
  deanOnly,
  deanReactivateHod
);
router.get("/dean/active-hod", protectRoute, deanOnly, deanGetActiveHod);
router.get("/dean/rejected-hod", protectRoute, deanOnly, deanGetRejectedHod);
// Dean staff management (same department)
router.get("/dean/pending-staff", protectRoute, deanOnly, deanGetPendingStaff);
router.put("/dean/approve-staff/:id", protectRoute, deanOnly, deanApproveStaff);
router.delete("/dean/reject-staff/:id", protectRoute, deanOnly, deanRejectStaff);
router.put(
  "/dean/deactivate-staff/:id",
  protectRoute,
  deanOnly,
  deanDeactivateStaff
);
router.put(
  "/dean/reactivate-staff/:id",
  protectRoute,
  deanOnly,
  deanReactivateStaff
);
router.get("/dean/active-staff", protectRoute, deanOnly, deanGetActiveStaff);
router.get(
  "/dean/deactivated-staff",
  protectRoute,
  deanOnly,
  deanGetDeactivatedStaff
);
router.get("/dean/rejected-staff", protectRoute, deanOnly, deanGetRejectedStaff);
router.get("/dean/users", protectRoute, deanOnly, deanGetUsers);
router.put("/dean/activate-user/:id", protectRoute, deanOnly, deanActivateUser);
router.put(
  "/dean/deactivate-user/:id",
  protectRoute,
  deanOnly,
  deanDeactivateUser
);
router.put("/dean/promote-user/:id", protectRoute, deanOnly, deanPromoteUser);
// new: get all hods grouped
router.get("/dean/all-hod", protectRoute, deanOnly, deanGetAllHod);
// Development-only debug endpoint
router.get(
  "/dean/debug/hod-counts",
  protectRoute,
  deanOnly,
  deanDebugHodCounts
);

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

// Public (authenticated): list approved & active recipients
router.get("/public/active-deans", protectRoute, publicGetActiveDeans);
router.get("/public/active-admins", protectRoute, publicGetActiveAdmins);

export default router;
