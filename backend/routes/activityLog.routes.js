import express from "express";
import {
  getLogsForComplaint,
  createActivityLog,
  getAllLogs,
} from "../controllers/activityLog.controller.js";
const router = express.Router();

// Create a new activity log entry
router.post("/", createActivityLog);

// Get logs for a specific complaint
router.get("/complaint/:id", getLogsForComplaint);

// Get all logs (admin)
router.get("/all", getAllLogs);

export default router;
