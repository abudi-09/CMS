import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complaint",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // If feedback is explicitly addressed to an admin (private), store target admin
    targetAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // Flag identifying this entry as admin-directed (student -> admin channel)
    isAdminFeedback: { type: Boolean, default: false },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    comments: {
      type: String,
      maxlength: 1000,
    },
    // Review workflow (admin marks reviewed)
    reviewStatus: {
      type: String,
      enum: ["Not Reviewed", "Reviewed"],
      default: "Not Reviewed",
    },
    reviewedAt: { type: Date, default: null },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true }
);
const Feedback = mongoose.model("Feedback", feedbackSchema);
export default Feedback;
