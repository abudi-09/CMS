import Complaint from "../models/complaint.model.js";
import { sendAdminNotification } from "./sendAdminNotification.js"; // You need to implement this utility

const THRESHOLD_DAYS = 2;

export const checkEscalations = async () => {
  const now = new Date();
  const complaints = await Complaint.find({
    status: { $nin: ["Resolved", "Closed"] },
    isEscalated: false,
    assignedAt: { $ne: null },
  });

  for (const complaint of complaints) {
    const assignedDate = complaint.assignedAt;
    if (
      assignedDate &&
      now - assignedDate > THRESHOLD_DAYS * 24 * 60 * 60 * 1000
    ) {
      complaint.isEscalated = true;
      complaint.escalatedOn = now;
      await complaint.save();
      await sendAdminNotification(complaint);
    }
  }
};
