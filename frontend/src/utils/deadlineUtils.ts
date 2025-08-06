import { addDays, differenceInHours, isPast } from "date-fns";

export type Priority = "Low" | "Medium" | "High" | "Urgent";

// Deadline calculation based on priority
export const calculateDeadline = (
  submittedDate: Date,
  priority: Priority
): Date => {
  const deadlineHours = {
    Urgent: 24, // 1 day
    High: 72, // 3 days
    Medium: 168, // 7 days
    Low: 336, // 14 days
  };

  return addDays(submittedDate, deadlineHours[priority] / 24);
};

// Check if complaint is overdue
export const isOverdue = (deadline: Date, status: string): boolean => {
  return isPast(deadline) && status !== "Resolved" && status !== "Closed";
};

// Get deadline urgency level
export const getDeadlineUrgency = (
  deadline: Date,
  status: string
): "overdue" | "urgent" | "warning" | "normal" => {
  if (isOverdue(deadline, status)) return "overdue";

  const hoursRemaining = differenceInHours(deadline, new Date());

  if (hoursRemaining <= 24) return "urgent";
  if (hoursRemaining <= 48) return "warning";
  return "normal";
};

// Generate reminder notifications
export const generateReminders = (deadline: Date, priority: Priority) => {
  const reminderTimes = [];
  const now = new Date();

  switch (priority) {
    case "Urgent":
      // 12 hours, 6 hours, 2 hours, 1 hour before deadline
      reminderTimes.push(
        addDays(deadline, -0.5),
        addDays(deadline, -0.25),
        addDays(deadline, -0.083),
        addDays(deadline, -0.042)
      );
      break;
    case "High":
      // 2 days, 1 day, 6 hours before deadline
      reminderTimes.push(
        addDays(deadline, -2),
        addDays(deadline, -1),
        addDays(deadline, -0.25)
      );
      break;
    case "Medium":
      // 3 days, 1 day before deadline
      reminderTimes.push(addDays(deadline, -3), addDays(deadline, -1));
      break;
    case "Low":
      // 5 days, 2 days before deadline
      reminderTimes.push(addDays(deadline, -5), addDays(deadline, -2));
      break;
  }

  // Filter out past reminder times
  return reminderTimes.filter((time) => time > now);
};

// Format time remaining until deadline
export const formatTimeRemaining = (deadline: Date): string => {
  const now = new Date();
  const hoursRemaining = differenceInHours(deadline, now);

  if (hoursRemaining < 0) {
    const hoursOverdue = Math.abs(hoursRemaining);
    if (hoursOverdue < 24) {
      return `${hoursOverdue}h overdue`;
    } else {
      const daysOverdue = Math.floor(hoursOverdue / 24);
      return `${daysOverdue}d overdue`;
    }
  }

  if (hoursRemaining < 24) {
    return `${hoursRemaining}h remaining`;
  } else {
    const daysRemaining = Math.floor(hoursRemaining / 24);
    const remainingHours = hoursRemaining % 24;
    return remainingHours > 0
      ? `${daysRemaining}d ${remainingHours}h remaining`
      : `${daysRemaining}d remaining`;
  }
};

// Get color class for deadline status
export const getDeadlineColorClass = (
  urgency: "overdue" | "urgent" | "warning" | "normal"
): string => {
  switch (urgency) {
    case "overdue":
      return "text-destructive";
    case "urgent":
      return "text-red-500";
    case "warning":
      return "text-yellow-600";
    case "normal":
      return "text-muted-foreground";
    default:
      return "text-muted-foreground";
  }
};

// Check if reminder should be sent
interface Complaint {
  reminderSent: boolean;
  deadline: Date;
  status: string;
}

export const shouldSendReminder = (
  complaint: Complaint,
  reminderType: string
): boolean => {
  // This would integrate with your notification system
  // For now, return basic logic
  if (complaint.reminderSent) return false;

  const urgency = getDeadlineUrgency(complaint.deadline, complaint.status);
  return urgency === "urgent" || urgency === "overdue";
};
