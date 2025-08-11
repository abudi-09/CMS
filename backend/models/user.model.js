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
      enum: ["user", "admin", "staff", "dean"],
      default: "user",
    },
    isApproved: {
      type: Boolean,
      default: function () {
        return this.role === "staff" ? false : true;
      },
    },
    isRejected: {
      type: Boolean,
      default: false,
    },
    department: {
      type: String,
      required: function () {
        // Department is required for user, staff, and dean
        return (
          this.role === "user" || this.role === "staff" || this.role === "dean"
        );
      },
    },
    workingPlace: {
      type: String,
      required: function () {
        return this.role === "staff";
      },
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for status (Pending, Approved, Rejected)
userSchema.virtual("status").get(function () {
  if (this.isRejected) return "Rejected";
  if (this.isApproved) return "Approved";
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
