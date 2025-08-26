import mongoose from "mongoose";

// Canonical roles used across the system
export const CANONICAL_ROLES = ["student", "staff", "hod", "dean", "admin"];

// Normalize incoming role values to canonical roles
export function normalizeRole(value) {
  if (!value) return value;
  const raw = String(value).trim();
  const lower = raw.toLowerCase();
  if (lower === "user" || lower === "student") return "student";
  if (
    lower === "hod" ||
    lower === "head of department" ||
    lower === "headofdepartment" ||
    lower === "head_of_department" ||
    lower === "head-of-department" ||
    lower === "headofdept"
  )
    return "hod";
  if (lower === "dean") return "dean";
  if (lower === "staff") return "staff";
  if (lower === "admin" || lower === "administrator") return "admin";
  return lower; // fall back to lowercased string
}

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
      enum: CANONICAL_ROLES,
      default: "student",
      set: normalizeRole,
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
    phone: {
      type: String,
      required: false,
      trim: true,
    },
    address: {
      type: String,
      required: false,
      trim: true,
    },
    bio: {
      type: String,
      required: false,
      trim: true,
      maxlength: 500,
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
    avatarUrl: {
      type: String,
      required: false,
      trim: true,
    },
    avatarPublicId: {
      type: String,
      required: false,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Ensure role is normalized before validation to avoid enum errors on any update
userSchema.pre("validate", function (next) {
  if (this.isModified("role") || typeof this.role === "string") {
    this.role = normalizeRole(this.role);
  }
  next();
});

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
