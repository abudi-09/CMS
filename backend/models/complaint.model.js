import mongoose from "mongoose";

function generateComplaintCode() {
  return `CMP-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

const complaintSchema = new mongoose.Schema(
  {
    complaintCode: {
      type: String,
      unique: true,
      default: generateComplaintCode,
      index: true,
    },
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
      enum: [
        "Pending",
        "Assigned",
        "Accepted",
        "In Progress",
        "Under Review",
        "Resolved",
        "Closed",
      ],
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
    // Direct user id who performed the last assignment / acceptance action
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
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
      submittedAt: { type: Date, default: null },
      reviewed: { type: Boolean, default: false },
      reviewedAt: { type: Date, default: null },
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
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
    resolvedAt: {
      type: Date,
      default: null,
    },
    // Soft delete support
    // Soft delete + edit tracking
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    lastEditedAt: { type: Date, default: null },
    editsCount: { type: Number, default: 0 },
    // Routing target chosen by student
    recipientRole: {
      type: String,
      enum: ["staff", "hod", "dean", "admin", null],
      default: null,
      index: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// Schema guard: If submitting to dean, must have recipientRole='dean' and recipientId present
complaintSchema.pre("validate", function (next) {
  try {
    const to = (this.submittedTo || "").toString().toLowerCase();
    if (to.includes("dean")) {
      if (this.recipientRole !== "dean" || !this.recipientId) {
        this.invalidate(
          "recipientId",
          "Dean submissions require a specific dean recipientId"
        );
      }
    }
  } catch (_) {}
  next();
});

const Complaint = mongoose.model("Complaint", complaintSchema);
export default Complaint;
