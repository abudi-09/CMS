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
    role: {
      type: String,
      enum: ["user", "admin", "staff", "dean", "headOfDepartment"],
      default: "user",
    },
    isApproved: {
      type: Boolean,
      default: function () {
        // Only students (user role) are auto-approved. Others require approval.
        return this.role === "user";
      },
    },
    isRejected: {
      type: Boolean,
      default: false,
    },
    department: {
      type: String,
      required: function () {
        // Department is required for user, staff, and headOfDepartment (not dean)
        return (
          this.role === "user" ||
          this.role === "staff" ||
          this.role === "headOfDepartment"
        );
      },
    },
    workingPlace: {
      type: String,
      required: function () {
        // Working position is required for staff, headOfDepartment, and dean
        return (
          this.role === "staff" ||
          this.role === "headOfDepartment" ||
          this.role === "dean"
        );
      },
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    // For HoD two-stage approval: set true when Dean approves, then Admin gives final approval
    approvedByDean: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: function () {
        // Students are active immediately; others become active upon approval
        return this.role === "user";
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
    this.role === "headOfDepartment" &&
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
