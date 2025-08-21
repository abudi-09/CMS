// Get current user (for persistent login)
export const getMe = async (req, res) => {
  try {
    // req.user should be set by protectRoute middleware
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    // Remove sensitive info
    const {
      _id,
      fullName,
      username,
      name,
      email,
      role,
      department,
      isApproved,
    } = req.user;
    res.status(200).json({
      _id,
      fullName,
      username,
      name,
      email,
      role,
      department,
      isApproved,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import { generateTokenAndSetCookie } from "../utils/generateToken.js";
import VerificationToken from "../models/verificationToken.model.js";
import crypto from "crypto";

// Signup
export const signup = async (req, res) => {
  try {
    const { name, username, email, password, role, department, workingPlace } =
      req.body;

    const allowedRoles = ["user", "staff", "dean", "headOfDepartment"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: "Invalid role selected" });
    }
    if (
      (role === "user" || role === "headOfDepartment") &&
      (!department || !department.trim())
    ) {
      return res
        .status(400)
        .json({ error: "Department is required for this role" });
    }
    if (
      (role === "staff" || role === "headOfDepartment" || role === "dean") &&
      (!workingPlace || !workingPlace.trim())
    ) {
      return res
        .status(400)
        .json({ error: "Working position is required for this role" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: "Username is already taken" });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ error: "Email is already taken" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters long" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      username,
      email,
      password: hashedPassword,
      role,
      department:
        role === "user" || role === "headOfDepartment" ? department : undefined,
      workingPlace:
        role === "staff" || role === "headOfDepartment" || role === "dean"
          ? workingPlace
          : undefined,
      isVerified: false,
    });

    await newUser.save();

    // Generate verification token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
    await VerificationToken.create({ userId: newUser._id, token, expiresAt });

    // Send verification email (disabled for now)
    // const { sendVerificationEmail } = await import(
    //   "../utils/sendVerificationEmail.js"
    // );
    // await sendVerificationEmail({ to: newUser.email, token });

    // Don't generate token if role is not approved yet (non-student)
    if (newUser.role !== "user" && !newUser.isApproved) {
      return res.status(201).json({
        message:
          "Registration submitted. Please wait for approval and verify your email.",
      });
    }

    res.status(201).json({
      message:
        "Registration successful. Please check your email to verify your account.",
    });
  } catch (error) {
    console.log("Error in signup controller", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ error: "Invalid email" });
    }

    // Block login if not verified (disabled for now)
    // if (!user.isVerified) {
    //   return res
    //     .status(403)
    //     .json({ error: "Please verify your email before logging in." });
    // }
    // STAFF: Block login if Pending, Rejected, or Deactivated
    if (user.role === "staff") {
      if (!user.isApproved && !user.isRejected) {
        return res.status(403).json({
          error: "pending-approval",
          message: "Your account is pending approval by your Department Head.",
        });
      }
      if (user.isRejected) {
        return res.status(403).json({
          error: "rejected-account",
          message: "Your account has been rejected by your Department Head.",
        });
      }
      if (user.isApproved && !user.isActive) {
        return res.status(403).json({
          error: "inactive-account",
          message: "Your account has been deactivated by your Department Head.",
        });
      }
    }

    // Block login if HoD account is deactivated (must be approved first)
    if (user.role === "headOfDepartment" && user.isApproved && !user.isActive) {
      return res.status(403).json({
        error: "inactive-account",
        message:
          "Your account has been deactivated by the Dean. You no longer have access to the system.",
      });
    }

    // Block login if role is not approved (non-student roles require approval)
    if (user.role !== "user" && !user.isApproved) {
      // HoD-specific message (Dean approval pending)
      if (user.role === "headOfDepartment") {
        return res.status(403).json({
          error: "pending-approval",
          message:
            "Your account has not yet been approved by the Dean. You will receive an email notification once your account is approved.",
        });
      }
      // Dean-specific message (Admin approval pending)
      if (user.role === "dean") {
        return res.status(403).json({
          error: "pending-approval",
          message:
            "Your account has not yet been approved by admin . You will receive an email notification once your account is approved.",
        });
      }
      // Generic for other roles
      return res.status(403).json({
        error: "pending-approval",
        message: "Your account has not been approved yet.",
      });
    }

    // Block login if dean account is deactivated
    if (user.role === "dean" && user.isApproved && !user.isActive) {
      return res.status(403).json({
        error: "inactive-account",
        message:
          "Your account has been deactivated by the Admin. You no longer have access to the system.",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user?.password || ""
    );
    if (!isPasswordCorrect) {
      return res.status(400).json({ error: "Invalid  password" });
    }

    generateTokenAndSetCookie(user._id, res);
    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      role: user.role,
      isApproved: user.isApproved,
      department: user.department,
      workingPlace: user.workingPlace,
      status: user.status,
      registeredDate: user.registeredDate,
    });
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Logout
export const logout = async (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
