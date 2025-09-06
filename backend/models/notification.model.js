import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    complaint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complaint",
      default: null,
    },
    type: {
      type: String,
      enum: [
        "submission",
        "assignment",
        "accept",
        "reject",
        "status",
        "feedback",
        "user-signup",
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    meta: { type: Object, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

// Optimize per-user sorted queries
notificationSchema.index({ user: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
