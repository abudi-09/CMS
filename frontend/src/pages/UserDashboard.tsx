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
import { RoleBasedComplaintModal } from "@/components/RoleBasedComplaintModal";
import { Complaint } from "@/components/ComplaintCard";
import { useEffect } from "react";
import { getMyComplaintsApi } from "@/lib/api";

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
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [prioritySort, setPrioritySort] = useState<"asc" | "desc">("desc");
  const navigate = useNavigate();

  useEffect(() => {
    getMyComplaintsApi()
      .then((data) => setComplaints(data))
      .catch((err) => console.error("Failed to fetch complaints", err));
  }, []);

  const handleViewComplaint = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setShowDetailModal(true);
  };

  const handleUpdate = (complaintId: string, updates: Partial<Complaint>) => {
    setComplaints((prev) =>
      prev.map((c) => (c.id === complaintId ? { ...c, ...updates } : c))
    );
  };

  // Filter and sort complaints
  const filteredComplaints = complaints.filter((complaint) => {
    return priorityFilter === "all" || complaint.priority === priorityFilter;
  });

  const sortedComplaints = [...filteredComplaints].sort((a, b) => {
    const priorityOrder = { Critical: 4, High: 3, Medium: 2, Low: 1 };
    const aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
    const bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
    return prioritySort === "desc" ? bValue - aValue : aValue - bValue;
  });

  const recentComplaints = sortedComplaints.slice(0, 3);

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl md:text-2xl font-semibold">
            Recent Complaints
          </h2>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/my-complaints")}
            >
              View All
            </Button>
          </div>
        </div>

        <ComplaintTable
          complaints={recentComplaints}
          onView={handleViewComplaint}
          userRole="user"
          title="My Recent Complaints"
          actionLabel="View"
        />
      </div>

      {/* Modal */}
      <RoleBasedComplaintModal
        complaint={selectedComplaint}
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
