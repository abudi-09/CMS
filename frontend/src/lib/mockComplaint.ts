import { Complaint } from "@/components/ComplaintCard";

// MOCK DATA FOR DEVELOPMENT/TESTING ONLY
// Import in pages that need demo data. Remove before production.
export const mockComplaint: Complaint = {
  id: "mock123",
  title: "WiFi not working in hostel",
  description: "The WiFi in hostel block B has been down for 3 days.",
  category: "Infrastructure",
  priority: "High",
  status: "Pending",
  submittedBy: "John Doe",
  submittedDate: new Date(),
  assignedStaff: "Jane Staff",
  assignedDate: new Date(Date.now() - 86400000), // 1 day ago
  lastUpdated: new Date(),
  deadline: new Date(Date.now() + 3 * 86400000), // 3 days from now
  evidenceFile: null,
  resolutionNote: "Checked the router, awaiting replacement part.",
  feedback: { rating: 4, comment: "Staff responded quickly." },
};
