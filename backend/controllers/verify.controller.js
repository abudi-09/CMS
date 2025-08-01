import crypto from "crypto";
import VerificationToken from "../models/verificationToken.model.js";
import User from "../models/user.model.js";

export const verifyEmail = async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: "Token is required" });

  // Find token in DB
  const record = await VerificationToken.findOne({ token });
  if (!record)
    return res.status(400).json({ error: "Invalid or expired token" });
  if (record.expiresAt < new Date()) {
    await VerificationToken.deleteOne({ _id: record._id });
    return res
      .status(400)
      .json({
        error: "Token expired. Please request a new verification email.",
      });
  }

  // Set user as verified
  await User.updateOne({ _id: record.userId }, { $set: { isVerified: true } });
  await VerificationToken.deleteOne({ _id: record._id });
  return res
    .status(200)
    .json({ message: "Email verified successfully. You can now log in." });
};

export const resendVerification = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ error: "User not found" });
  if (user.isVerified)
    return res.status(400).json({ error: "Email already verified" });

  // Remove old tokens
  await VerificationToken.deleteMany({ userId: user._id });

  // Generate new token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
  await VerificationToken.create({ userId: user._id, token, expiresAt });

  // Send email
  const { sendVerificationEmail } = await import(
    "../utils/sendVerificationEmail.js"
  );
  await sendVerificationEmail({ to: user.email, token });
  res.status(200).json({ message: "Verification email resent." });
};
