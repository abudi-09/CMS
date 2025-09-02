import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  listMyNotifications,
  markNotificationRead,
  markAllRead,
} from "../controllers/notification.controller.js";

const router = express.Router();

router.use(protectRoute);
router.get("/my", listMyNotifications);
router.put("/read/:id", markNotificationRead);
router.put("/read-all", markAllRead);

export default router;
