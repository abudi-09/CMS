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
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  connectMongoDB();
});
