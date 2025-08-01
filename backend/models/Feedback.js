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
  },
  { timestamps: true }
);
const Feedback = mongoose.model("Feedback", feedbackSchema);
export default Feedback;
