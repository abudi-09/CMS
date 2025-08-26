import express from "express";
import dotenv from "dotenv";
dotenv.config();
import connectMongoDB from "./config/db.js"; // ✅ CORRECT
import mongoose from "mongoose";
import cookieParser from "cookie-parser"; // Ensure cookieParser is imported
import corsMiddleware from "./middleware/cors.js";
import authRoutes from "./routes/authRoutes.js"; // Adjust the path as necessary
import adminRoutes from "./routes/admin.route.js"; //
import complaintRoutes from "./routes/complaint.routes.js";
import statsRoutes from "./routes/stats.routes.js";
import verifyRoutes from "./routes/verifyRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import feedbackRoutes from "./routes/feedback.routes.js";
import activityLogRoutes from "./routes/activityLog.routes.js";
import approvalRoutes from "./routes/approval.routes.js";
import usersRoutes from "./routes/users.route.js";
import categoryRoutes from "./routes/category.routes.js";
import { checkEscalations } from "./utils/escalation.js";
import path from "path";
import fs from "fs";
const app = express();
app.use(corsMiddleware);
app.use(express.json());
app.use(cookieParser()); // Ensure cookieParser is imported
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api", verifyRoutes);
app.use("/api", profileRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/activity-logs", activityLogRoutes);
app.use("/api/approvals", approvalRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/categories", categoryRoutes); // category management (admin guarded in route file)
// Static serving for uploaded avatars
const uploadsPath = path.join(process.cwd(), "backend", "uploads");
fs.mkdirSync(uploadsPath, { recursive: true });
app.use("/uploads", express.static(uploadsPath));
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  connectMongoDB();
  // Run escalation check every hour
  setInterval(() => {
    checkEscalations();
  }, 60 * 60 * 1000);
});
