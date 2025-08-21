import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema(
  {
    _id: { type: String },
    title: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    department: {
      type: String,
    },
    description: {
      type: String,
      maxlength: 10000,
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Resolved"],
      default: "Pending",
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Provenance fields for routing/assignment transparency
    sourceRole: {
      type: String,
      enum: ["student", "staff", "dean", "hod", "admin"],
      default: "student",
    },
    assignedByRole: {
      type: String,
      enum: ["student", "hod", "dean", "admin"],
      default: null,
    },
    assignmentPath: [
      {
        type: String,
        enum: ["student", "hod", "dean", "admin", "staff"],
      },
    ],
    submittedTo: {
      type: String,
      default: null,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    feedback: {
      rating: { type: Number },
      comment: { type: String },
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },
    deadline: {
      type: Date,
      default: null,
    },
    isEscalated: {
      type: Boolean,
      default: false,
    },
    escalatedOn: {
      type: Date,
      default: null,
    },
    assignedAt: {
      type: Date,
      default: null,
    },
    evidenceFile: {
      type: String,
      default: null,
    },
    resolutionNote: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

const Complaint = mongoose.model("Complaint", complaintSchema);
export default Complaint;
