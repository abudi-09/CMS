import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  listMyNotifications, // legacy
  markNotificationRead, // legacy
  markAllRead, // legacy
  getNotifications,
  patchNotificationRead,
  patchAllNotificationsRead,
  notificationsStream,
} from "../controllers/notification.controller.js";

const router = express.Router();

router.use(protectRoute);
// Legacy endpoints (will be deprecated)
router.get("/my", listMyNotifications);
router.put("/read/:id", markNotificationRead);
router.put("/read-all", markAllRead);

// New endpoints
router.get("/", getNotifications);
router.patch("/:id/read", patchNotificationRead);
router.patch("/read-all", patchAllNotificationsRead);
router.get("/stream", notificationsStream);

export default router;
