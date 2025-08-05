import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserCheck,
  MessageSquare,
  TrendingUp,
  Search,
  Filter,
  Clock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SummaryCards } from "@/components/SummaryCards";
import { ComplaintTable } from "@/components/ComplaintTable";
import { RoleBasedComplaintModal } from "@/components/RoleBasedComplaintModal";
import { StatusUpdateModal } from "@/components/StatusUpdateModal";
import { AssignStaffModal } from "@/components/AssignStaffModal";
import { Complaint } from "@/components/ComplaintCard";
import { useAuth } from "@/components/auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

// Mock data for admin - showing all complaints
const mockAllComplaints: Complaint[] = [
  {
    id: "CMP-001",
    title: "Library computers are slow and outdated",
    description:
      "The computers in the main library are extremely slow and need upgrading. Students are waiting long times to access resources.",
    category: "IT & Technology",
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
    status: "Resolved",
    submittedBy: "Jane Smith",
    assignedStaff: "Food Services Manager",
    submittedDate: new Date("2024-01-10"),
    lastUpdated: new Date("2024-01-20"),
    feedback: {
      rating: 4,
      comment: "Issue was resolved quickly and effectively.",
    },
  },
  {
    id: "CMP-003",
    title: "Broken air conditioning in lecture hall",
    description:
      "The air conditioning in lecture hall B-204 has been broken for over a week. Classes are unbearable in this heat.",
    category: "Infrastructure & Facilities",
    status: "Pending",
    submittedBy: "Mike Johnson",
    assignedStaff: undefined,
    submittedDate: new Date("2024-01-22"),
    lastUpdated: new Date("2024-01-22"),
  },
  {
    id: "CMP-004",
    title: "Classroom projector not working",
    description:
      "The projector in room C-305 has been malfunctioning for the past week. Teachers are unable to present slides.",
    category: "IT & Technology",
    status: "Pending",
    submittedBy: "Sarah Johnson",
    assignedStaff: "IT Support Team",
    submittedDate: new Date("2024-01-20"),
    lastUpdated: new Date("2024-01-20"),
  },
  {
    id: "CMP-005",
    title: "Parking lot lighting issues",
    description:
      "Several lights in the main parking lot are not working, making it unsafe for students and staff during evening hours.",
    category: "Infrastructure & Facilities",
    status: "Closed",
    submittedBy: "David Wilson",
    assignedStaff: "Facilities Manager",
    submittedDate: new Date("2024-01-08"),
    lastUpdated: new Date("2024-01-18"),
    feedback: {
      rating: 5,
      comment: "Excellent work! All lights were replaced quickly.",
    },
  },
];

export function AdminDashboard() {
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null
  );
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [complaints, setComplaints] = useState<Complaint[]>(mockAllComplaints);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [prioritySort, setPrioritySort] = useState<"asc" | "desc">("desc");

  const { pendingStaff, getAllStaff } = useAuth();
  const navigate = useNavigate();

  const handleViewComplaint = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setShowDetailModal(true);
  };

  const handleStatusUpdate = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setShowStatusModal(true);
  };

  const handleStatusSubmit = (
    complaintId: string,
    newStatus: string,
    notes: string
  ) => {
    setComplaints((prev) =>
      prev.map((c) =>
        c.id === complaintId
          ? {
              ...c,
              status: newStatus as Complaint["status"],
              lastUpdated: new Date(),
            }
          : c
      )
    );
  };

  const handleAssignStaff = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setShowAssignModal(true);
  };

  const handleStaffAssignment = (
    complaintId: string,
    staffId: string,
    notes: string
  ) => {
    const staff = getAllStaff().find((s) => s.id === staffId);
    setComplaints((prev) =>
      prev.map((c) =>
        c.id === complaintId
          ? {
              ...c,
              assignedStaff: staff?.fullName || staff?.name || "Unknown",
              lastUpdated: new Date(),
            }
          : c
      )
    );
    toast({
      title: "Staff Assigned",
      description: `Complaint has been assigned to ${
        staff?.fullName || staff?.name
      }`,
    });
  };

  // Add priority filter and sort to filtering logic
  const filteredComplaints = complaints.filter((complaint) => {
    const matchesSearch =
      complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.submittedBy.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || complaint.status === statusFilter;
    const matchesCategory =
      categoryFilter === "all" || complaint.category === categoryFilter;
    const matchesPriority =
      priorityFilter === "all" || complaint.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesCategory && matchesPriority;
  });
  // Sort by priority if enabled
  const priorityOrder = { Critical: 4, High: 3, Medium: 2, Low: 1 };
  const sortedComplaints = [...filteredComplaints].sort((a, b) => {
    const aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
    const bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
    return prioritySort === "desc" ? bValue - aValue : aValue - bValue;
  });

  const categories = Array.from(new Set(complaints.map((c) => c.category)));
  const priorities = ["Critical", "High", "Medium", "Low"];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor and manage all complaints
        </p>
      </div>

      {/* Summary Cards */}
      <SummaryCards complaints={complaints} userRole="admin" />

      {/* Pending Staff Notifications */}
      {pendingStaff.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Clock className="h-5 w-5" />
              Pending Staff Approvals
            </CardTitle>
            <CardDescription className="text-orange-700">
              {pendingStaff.length} staff member
              {pendingStaff.length > 1 ? "s" : ""} waiting for approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                {pendingStaff.slice(0, 3).map((staff) => (
                  <div key={staff.id} className="text-sm text-orange-800">
                    • {staff.fullName || staff.name} ({staff.department})
                  </div>
                ))}
                {pendingStaff.length > 3 && (
                  <div className="text-sm text-orange-700">
                    +{pendingStaff.length - 3} more...
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => navigate("/staff-management")}
                className="text-orange-700 border-orange-300 hover:bg-orange-100"
              >
                Review Applications
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* ...existing quick action cards... */}
        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => navigate("/staff-management")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Staff Management
              {pendingStaff.length > 0 && (
                <Badge className="bg-orange-100 text-orange-800 ml-auto">
                  {pendingStaff.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Approve staff and manage roles</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Manage Staff
            </Button>
          </CardContent>
        </Card>

        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => navigate("/all-complaints")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              All Complaints
            </CardTitle>
            <CardDescription>Review user feedback and ratings</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              View Complaints
            </Button>
          </CardContent>
        </Card>

        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => navigate("/assign")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Assign & Reassign
            </CardTitle>
            <CardDescription>
              {complaints.filter((c) => !c.assignedStaff).length} unassigned
              complaints
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Assign Complaints
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Complaint Search and Filters */}

      <ComplaintTable
        complaints={sortedComplaints.slice(0, 3)}
        onView={handleViewComplaint}
        onStatusUpdate={handleStatusUpdate}
        userRole="admin"
        title="Recent Complaints"
        priorityFilter={priorityFilter}
        actionLabel="View Detail"
      />

      {/* Modals */}
      <RoleBasedComplaintModal
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        complaint={selectedComplaint}
      />

      <StatusUpdateModal
        complaint={selectedComplaint}
        open={showStatusModal}
        onOpenChange={setShowStatusModal}
        onUpdate={handleStatusSubmit}
        userRole="admin"
      />
    </div>
  );
}
