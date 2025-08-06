import express from "express";
import {
  getLogsForComplaint,
  getAllLogs,
} from "../controllers/activityLog.controller.js";
const router = express.Router();

// Get logs for a specific complaint
router.get("/complaint/:id", getLogsForComplaint);

// Get all logs (admin)
router.get("/all", getAllLogs);

export default router;
