// For demo/testing: import mockComplaint
import { mockComplaint as baseMockComplaint } from "@/lib/mockComplaint";
import { useState } from "react";
import { useComplaints } from "@/context/ComplaintContext";
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
// Note: API hooks available but not used in this mock-driven demo

export function UserDashboard() {
  // MOCK DATA ENABLED BY DEFAULT
  // Overdue: complaints 1, 3, 6; Not overdue: 2, 4, 5
  const now = new Date();
  const demoComplaints = [
    {
      ...baseMockComplaint,
      id: "user-mock1",
      title: "WiFi not working in hostel",
      description: "The WiFi in hostel block B has been down for 3 days.",
      priority: "High",
      status: "Pending",
      assignedStaff: "Jane Staff",
      submittedBy: "Current User",
      submittedDate: new Date(now.getTime() - 2 * 86400000),
      assignedDate: new Date(now.getTime() - 2 * 86400000),
      lastUpdated: new Date(now.getTime() - 1 * 43200000),
      deadline: new Date(now.getTime() - 1 * 86400000), // overdue
    },
    {
      ...baseMockComplaint,
      id: "user-mock2",
      title: "Broken AC in Lecture Hall",
      description: "The air conditioning in Hall A-101 is broken.",
      priority: "Critical",
      status: "In Progress",
      assignedStaff: "Mike Tech",
      submittedBy: "Current User",
      submittedDate: new Date(now.getTime() - 3 * 86400000),
      assignedDate: new Date(now.getTime() - 3 * 86400000),
      lastUpdated: new Date(now.getTime() - 2 * 43200000),
      deadline: new Date(now.getTime() + 2 * 86400000), // not overdue
    },
    {
      ...baseMockComplaint,
      id: "user-mock3",
      title: "Projector not working",
      description: "Projector in Room 204 is not turning on.",
      priority: "Medium",
      status: "Resolved",
      assignedStaff: "Sarah Fixit",
      submittedBy: "Current User",
      submittedDate: new Date(now.getTime() - 4 * 86400000),
      assignedDate: new Date(now.getTime() - 4 * 86400000),
      lastUpdated: new Date(now.getTime() - 3 * 43200000),
      deadline: new Date(now.getTime() - 2 * 86400000), // overdue
    },
    {
      ...baseMockComplaint,
      id: "user-mock4",
      title: "Cafeteria food quality",
      description: "Food quality in cafeteria has declined.",
      priority: "High",
      status: "Pending",
      assignedStaff: "Chef Tony",
      submittedBy: "Current User",
      submittedDate: new Date(now.getTime() - 1 * 86400000),
      assignedDate: new Date(now.getTime() - 1 * 86400000),
      lastUpdated: new Date(now.getTime() - 1 * 43200000),
      deadline: new Date(now.getTime() + 3 * 86400000), // not overdue
    },
    {
      ...baseMockComplaint,
      id: "user-mock5",
      title: "Library computers slow",
      description: "Library computers are extremely slow.",
      priority: "Low",
      status: "Closed",
      assignedStaff: "Libby Tech",
      submittedBy: "Current User",
      submittedDate: new Date(now.getTime() - 5 * 86400000),
      assignedDate: new Date(now.getTime() - 5 * 86400000),
      lastUpdated: new Date(now.getTime() - 4 * 43200000),
      deadline: new Date(now.getTime() + 1 * 86400000), // not overdue
    },
    {
      ...baseMockComplaint,
      id: "user-mock6",
      title: "Leaking roof in dorm",
      description: "There is a leak in the roof of Dorm 3.",
      priority: "Medium",
      status: "Pending",
      assignedStaff: "Maintenance Bob",
      submittedBy: "Current User",
      submittedDate: new Date(now.getTime() - 6 * 86400000),
      assignedDate: new Date(now.getTime() - 6 * 86400000),
      lastUpdated: new Date(now.getTime() - 5 * 43200000),
      deadline: new Date(now.getTime() - 3 * 86400000), // overdue
    },
  ];
  const complaints = demoComplaints;
  const { updateComplaint } = useComplaints();
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null
  );
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [overdueFilter, setOverdueFilter] = useState<
    "all" | "overdue" | "notOverdue"
  >("all");
  const [prioritySort, setPrioritySort] = useState<"asc" | "desc">("desc");
  const navigate = useNavigate();

  const handleViewComplaint = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setShowDetailModal(true);
  };

  const handleUpdate = (complaintId: string, updates: Partial<Complaint>) => {
    updateComplaint(complaintId, updates);
  };

  const myComplaints = complaints
    .filter((c) => c.submittedBy === "Current User")
    .map((c) => ({
      ...c,
      status: c.status as
        | "Unassigned"
        | "Assigned"
        | "In Progress"
        | "Resolved"
        | "Closed"
        | "Overdue"
        | "Pending",
      priority: c.priority as "High" | "Critical" | "Medium" | "Low",
    }));
  function isOverdue(complaint: Complaint) {
    if (!complaint.deadline) return false;
    return (
      new Date(complaint.deadline) < now &&
      complaint.status !== "Resolved" &&
      complaint.status !== "Closed"
    );
  }
  const filteredComplaints = myComplaints.filter((complaint) => {
    const matchesPriority =
      priorityFilter === "all" || complaint.priority === priorityFilter;
    const matchesOverdue =
      overdueFilter === "all" ||
      (overdueFilter === "overdue" && isOverdue(complaint)) ||
      (overdueFilter === "notOverdue" && !isOverdue(complaint));
    return matchesPriority && matchesOverdue;
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
      <SummaryCards complaints={myComplaints} userRole="user" />

      {/* Quick Actions */}
      <div className="w-full pb-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <Card className="hover:shadow-md transition-shadow min-w-[260px] flex-1">
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
                className="w-full min-h-11 hover:bg-primary/90 dark:hover:bg-hover-blue"
                onClick={() => navigate("/submit-complaint")}
              >
                Submit New Complaint
              </Button>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow min-w-[260px] flex-1">
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
                className="w-full min-h-11 hover:bg-muted dark:hover:bg-hover-blue/10"
                onClick={() => navigate("/my-complaints")}
              >
                My Complaints
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Complaints */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl md:text-2xl font-semibold">
            Recent Complaints
          </h2>
          <div className="flex flex-wrap gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/my-complaints")}
              aria-label="View all complaints"
              className="w-full sm:w-auto min-h-11"
            >
              View All
            </Button>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={overdueFilter}
              onValueChange={(v) =>
                setOverdueFilter(v as "all" | "overdue" | "notOverdue")
              }
            >
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Overdue" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="notOverdue">Not Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="w-full overflow-x-auto">
          <div className="block w-full max-w-full">
            <ComplaintTable
              complaints={recentComplaints}
              onView={handleViewComplaint}
              userRole="user"
              title="My Recent Complaints"
              actionLabel="View"
              showOverdueColumn
              isOverdueFn={isOverdue}
            />
          </div>
        </div>
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
