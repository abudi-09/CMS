import nodemailer from "nodemailer";

// Sends an email to the student about a complaint status/action update
// action examples: "accepted", "rejected", "resolved", "updated"
export async function sendComplaintUpdateEmail({
  to,
  studentName,
  complaintCode,
  title,
  action,
  byRole,
  note,
}) {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return; // skip if not configured
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    const subject = `Complaint ${complaintCode ? `#${complaintCode} ` : ""}${
      title || ""
    } ${action}`.trim();
    const niceRole = byRole || "Team";
    const html = `
      <p>Dear ${studentName || "Student"},</p>
      <p>Your complaint ${
        complaintCode ? `#<strong>${complaintCode}</strong>` : ""
      } <strong>${
      title || ""
    }</strong> has been <strong>${action}</strong> by ${niceRole}.</p>
      ${note ? `<p>Note: ${String(note)}</p>` : ""}
      <p>You can sign in to the portal to view more details and next steps.</p>
    `;
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html,
    });
  } catch (err) {
    // Do not throw; email failure shouldn't block API response
    console.error("sendComplaintUpdateEmail error:", err?.message);
  }
}
