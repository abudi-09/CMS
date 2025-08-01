import nodemailer from "nodemailer";

export async function sendVerificationEmail({ to, token }) {
  const transporter = nodemailer.createTransport({
    service: "Gmail", // Or your email provider
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const verificationUrl = `${
    process.env.FRONTEND_URL || "http://localhost:8080"
  }/verify-email?token=${token}`;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: "Verify Your Email to Activate Your Account",
    html: `<p>Thank you for registering! Please verify your email by clicking the link below:</p>
      <a href="${verificationUrl}">${verificationUrl}</a>
      <p>This link will expire in 1 hour.</p>`,
  });
}
