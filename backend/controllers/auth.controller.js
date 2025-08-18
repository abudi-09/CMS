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
      (role === "user" || role === "dean" || role === "headOfDepartment") &&
      (!department || !department.trim())
    ) {
      return res
        .status(400)
        .json({ error: "Department is required for this role" });
    }
    if (role === "staff" && (!workingPlace || !workingPlace.trim())) {
      return res
        .status(400)
        .json({ error: "Working place is required for staff" });
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
        role === "user" || role === "dean" || role === "headOfDepartment"
          ? department
          : undefined,
      workingPlace: role === "staff" ? workingPlace : undefined,
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

    // Don't generate token if staff is not approved yet
    if (newUser.role === "staff" && !newUser.isApproved) {
      return res.status(201).json({
        message:
          "Staff registration successful. Please wait for admin approval. Please verify your email.",
      });
    }

    res.status(201).json({
      message:
        role === "dean"
          ? "Dean registration successful. Please check your email to verify your account."
          : "Registration successful. Please check your email to verify your account.",
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
    // Block login if staff is not approved
    if (user.role === "staff" && !user.isApproved) {
      return res.status(403).json({
        error: "pending-approval",
        message:
          "Please wait, your account has not been approved by the admin yet.",
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
