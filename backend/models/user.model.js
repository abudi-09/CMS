import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter name"],
    },
    email: {
      type: String,
      required: [true, "Please enter email"],
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Please enter password"],
    },
    // role values: student, staff, hod, dean, admin
    role: {
      type: String,
      enum: ["student", "staff", "hod", "dean", "admin"],
      default: "student",
    },
    isApproved: {
      type: Boolean,
      default: function () {
        // Only students are auto-approved. Admins should also be auto-approved.
        return this.role === "student" || this.role === "admin";
      },
    },
    isRejected: {
      type: Boolean,
      default: false,
    },
    department: {
      type: String,
      required: function () {
        // Department is required for student, staff, and hod (not dean or admin)
        return (
          this.role === "student" ||
          this.role === "staff" ||
          this.role === "hod"
        );
      },
    },
    workingPlace: {
      type: String,
      required: function () {
        // Working position is required for staff, hod, and dean (not admin or student)
        return (
          this.role === "staff" || this.role === "hod" || this.role === "dean"
        );
      },
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    // For hod two-stage approval: set true when Dean approves, then Admin gives final approval
    approvedByDean: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: function () {
        // Students and admins are active immediately; others become active upon approval
        return this.role === "student" || this.role === "admin";
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for status (Pending, Dean Approved, Active, Inactive, Rejected)
userSchema.virtual("status").get(function () {
  if (this.isRejected) return "Rejected";
  // Special intermediate state for HoD
  if (
    this.role === "hod" &&
    this.approvedByDean === true &&
    !this.isApproved &&
    this.isRejected !== true
  ) {
    return "Dean Approved";
  }
  if (!this.isActive) return "Deactivated";
  if (this.isApproved) return "Active";
  return "Pending";
});

// Virtual for registeredDate (M/D/YYYY)
userSchema.virtual("registeredDate").get(function () {
  if (!this.createdAt) return "";
  const date = new Date(this.createdAt);
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
});

const User = mongoose.model("User", userSchema);

export default User;
