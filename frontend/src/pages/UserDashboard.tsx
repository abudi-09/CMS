import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle, FileText, MessageSquare, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SummaryCards } from "@/components/SummaryCards";
import { ComplaintTable } from "@/components/ComplaintTable";
import { ComplaintDetailModal } from "@/components/ComplaintDetailModal";
import { FeedbackModal } from "@/components/FeedbackModal";
import { Complaint } from "@/components/ComplaintCard";

// Mock data for demonstration
const mockComplaints: Complaint[] = [
  {
    id: "CMP-001",
    title: "Library computers are slow and outdated",
    description:
      "The computers in the main library are extremely slow and need upgrading. Students are waiting long times to access resources.",
    category: "IT & Technology",
    priority: "High",
    status: "In Progress",
    submittedBy: "John Doe",
    assignedStaff: "IT Support Team",
    submittedDate: new Date("2024-01-15"),
    lastUpdated: new Date("2024-01-18"),
  },
  {
    id: "CMP-002",
    title: "Cafeteria food quality concerns",
    description:
      "The food quality in the main cafeteria has declined significantly. Many students are getting sick after eating there.",
    category: "Student Services",
    priority: "Critical",
    status: "Resolved",
    submittedBy: "John Doe",
    assignedStaff: "Food Services Manager",
    submittedDate: new Date("2024-01-10"),
    lastUpdated: new Date("2024-01-20"),
  },
  {
    id: "CMP-003",
    title: "Broken air conditioning in lecture hall",
    description:
      "The air conditioning in lecture hall B-204 has been broken for over a week. Classes are unbearable in this heat.",
    category: "Infrastructure & Facilities",
    priority: "Medium",
    status: "Pending",
    submittedBy: "John Doe",
    assignedStaff: undefined,
    submittedDate: new Date("2024-01-22"),
    lastUpdated: new Date("2024-01-22"),
  },
];

export function UserDashboard() {
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null
  );
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [complaints, setComplaints] = useState<Complaint[]>(mockComplaints);
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [prioritySort, setPrioritySort] = useState<"asc" | "desc">("desc");
  const navigate = useNavigate();

  const handleViewComplaint = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setShowDetailModal(true);
  };

  const handleFeedback = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setShowFeedbackModal(true);
  };

  const handleFeedbackSubmit = (
    complaintId: string,
    feedback: { rating: number; comment: string }
  ) => {
    setComplaints((prev) =>
      prev.map((c) => (c.id === complaintId ? { ...c, feedback } : c))
    );
  };

  // Show only the 3 most recent complaints (after filtering/sorting in table)
  const recentComplaints = complaints.slice(0, 3);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">My Dashboard</h1>
        <p className="text-muted-foreground">
          Track and manage your complaints
        </p>
      </div>

      {/* Summary Cards */}
      <SummaryCards complaints={complaints} userRole="user" />

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <PlusCircle className="h-5 w-5" />
              Submit Complaint
            </CardTitle>
            <CardDescription>
              Report an issue or concern quickly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full hover:bg-primary/90 dark:hover:bg-hover-blue"
              onClick={() => navigate("/submit-complaint")}
            >
              Submit New Complaint
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              View Complaints
            </CardTitle>
            <CardDescription>
              Track status of all your complaints
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full hover:bg-muted dark:hover:bg-hover-blue/10"
              onClick={() => navigate("/my-complaints")}
            >
              My Complaints
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Complaints */}
      <div>
        <h2 className="text-xl md:text-2xl font-semibold mb-6">
          Recent Complaints
        </h2>
        <ComplaintTable
          complaints={complaints}
          onView={handleViewComplaint}
          onFeedback={handleFeedback}
          userRole="user"
          title="My Recent Complaints"
          showPriorityFilter
          priorityFilter={priorityFilter}
          onPriorityFilterChange={setPriorityFilter}
          showPrioritySort
          prioritySort={prioritySort}
          onPrioritySortChange={() =>
            setPrioritySort(prioritySort === "desc" ? "asc" : "desc")
          }
          onViewAll={() => navigate("/my-complaints")}
        />
      </div>

      {/* Modals */}
      <ComplaintDetailModal
        complaint={selectedComplaint}
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
      />

      <FeedbackModal
        complaint={selectedComplaint}
        open={showFeedbackModal}
        onOpenChange={setShowFeedbackModal}
        onSubmit={handleFeedbackSubmit}
      />
    </div>
  );
}
