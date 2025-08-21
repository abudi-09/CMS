import nodemailer from "nodemailer";

export async function sendDecisionEmail({ to, decision, name, role }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return; // skip if not configured
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  const subject = `${role} Registration ${
    decision === "approved" ? "Approved" : "Rejected"
  }`;
  const html = `
    <p>Dear ${name || "User"},</p>
    <p>Your ${role} registration has been <strong>${decision}</strong>.</p>
    ${
      decision === "approved"
        ? "<p>You can now log in to the system.</p>"
        : "<p>Please contact support for more information.</p>"
    }
  `;
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    html,
  });
}
