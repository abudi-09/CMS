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
import { ensureDefaultCategories } from "./models/category.model.js";
import { checkEscalations } from "./utils/escalation.js";
import { Category } from "./models/category.model.js";
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
app.use("/api/categories", categoryRoutes);
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  await connectMongoDB();
  // Seed default categories only if explicitly enabled
  if (process.env.SEED_CATEGORIES === "true") {
    await ensureDefaultCategories();
  }
  try {
    const cats = await Category.find({}).sort({ name: 1 });
    console.log(
      `Category Summary -> Total: ${cats.length} | Active: ${
        cats.filter((c) => c.status !== "inactive").length
      } | Inactive: ${cats.filter((c) => c.status === "inactive").length}`
    );
    cats.forEach((c) =>
      console.log(
        ` - ${c.name} [${c.status}] roles=${
          c.roles?.length ? c.roles.join(",") : "all"
        }`
      )
    );
  } catch (e) {
    console.log("Failed to print category summary", e.message);
  }
  // Run escalation check every hour
  setInterval(() => {
    checkEscalations();
  }, 60 * 60 * 1000);
});
