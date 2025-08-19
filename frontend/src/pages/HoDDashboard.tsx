// For demo/testing: import mockComplaint
import { mockComplaint } from "@/lib/mockComplaint";
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
import { useComplaints } from "@/context/ComplaintContext";
import { useAuth } from "@/components/auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function HoDDashboard() {
  // MOCK DATA ENABLED BY DEFAULT
  // Ensure status is cast to the correct Complaint["status"] type
  // Demo/mock complaints data for HOD dashboard
  const complaints: Complaint[] = [
    {
      id: "1",
      title: "Network Issue",
      description: "Internet is down in Block A.",
      category: "IT",
      priority: "High",
      status: "Pending",
      submittedBy: "John Doe",
      submittedDate: new Date(),
      assignedStaff: "Jane Smith",
      assignedDate: new Date(),
      feedback: { rating: 4, comment: "Resolved quickly." },

      department: "IT",
      resolutionNote: "Rebooted router.",
      lastUpdated: new Date(),
    },
    {
      id: "2",
      title: "Cleanliness",
      description: "Restrooms need cleaning.",
      category: "Facilities",
      priority: "Medium",
      status: "Assigned",
      submittedBy: "Alice Brown",
      submittedDate: new Date(),
      assignedStaff: "Bob Lee",
      assignedDate: new Date(),
      feedback: { rating: 3, comment: "Could be better." },

      department: "Facilities",
      resolutionNote: "Scheduled cleaning.",
      lastUpdated: new Date(),
    },
    {
      id: "3",
      title: "Equipment Failure",
      description: "Projector not working in Room 101.",
      category: "IT",
      priority: "Critical",
      status: "Unassigned",
      submittedBy: "David Kim",
      submittedDate: new Date(),
      assignedStaff: "",
      assignedDate: null,
      feedback: { rating: 0, comment: "" },

      department: "IT",
      resolutionNote: "Replacement requested.",
      lastUpdated: new Date(),
    },
    // Additional mock complaints to populate Recently Pending
    {
      id: "HODR-001",
      title: "Printer toner out",
      description: "Toner needs replacement on 2nd floor.",
      category: "Facilities",
      priority: "Medium",
      status: "Pending",
      submittedBy: "Samuel Tesfaye",
      submittedDate: new Date("2025-08-19"),
      // Unassigned: no assignedStaff/role
      lastUpdated: new Date("2025-08-19"),
    },
    {
      id: "HODR-002",
      title: "Email not syncing",
      description: "Staff email not syncing on mobile.",
      category: "IT",
      priority: "High",
      status: "Pending",
      submittedBy: "Meron Alemu",
      submittedDate: new Date("2025-08-18"),
      // Unassigned
      lastUpdated: new Date("2025-08-18"),
    },
    {
      id: "HODR-003",
      title: "Projector bulb replacement",
      description: "Lecture hall projector bulb burnt.",
      category: "IT",
      priority: "Low",
      status: "Unassigned",
      submittedBy: "Hailemariam Bekele",
      submittedDate: new Date("2025-08-17"),
      // Unassigned
      lastUpdated: new Date("2025-08-17"),
    },
    {
      id: "HODR-004",
      title: "Lab PCs slow",
      description: "Performance issues on lab PCs.",
      category: "IT",
      priority: "High",
      status: "In Progress",
      submittedBy: "Lab Assistant",
      submittedDate: new Date("2025-08-16"),
      assignedStaff: "Head of Department - IT",
      assignedStaffRole: "headOfDepartment",
      lastUpdated: new Date("2025-08-18"),
    },
    {
      id: "HODR-005",
      title: "Office AC maintenance",
      description: "AC needs routine maintenance.",
      category: "Facilities",
      priority: "Medium",
      status: "Closed",
      submittedBy: "Admin Office",
      submittedDate: new Date("2025-08-10"),
      assignedStaff: "Maintenance Team",
      lastUpdated: new Date("2025-08-12"),
    },
    {
      id: "HODR-006",
      title: "Network switch replacement",
      description: "Aging switch causing intermittent outages.",
      category: "IT",
      priority: "Critical",
      status: "Resolved",
      submittedBy: "IT Support",
      submittedDate: new Date("2025-08-08"),
      assignedStaff: "Network Team",
      lastUpdated: new Date("2025-08-15"),
    },
  ];
  const { updateComplaint } = useComplaints();
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null
  );
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [prioritySort, setPrioritySort] = useState<"asc" | "desc">("desc");

  const { pendingStaff, getAllStaff, user } = useAuth();
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
    updateComplaint(complaintId, {
      status: newStatus as Complaint["status"],
      lastUpdated: new Date(),
    });
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
    updateComplaint(complaintId, {
      assignedStaff: staff?.fullName || staff?.name || "Unknown",
      lastUpdated: new Date(),
    });
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

  // Overdue helper: unassigned Pending/Unassigned should not be marked overdue
  const isOverdue = (complaint: Complaint) => {
    if (
      (complaint.status === "Pending" || complaint.status === "Unassigned") &&
      !complaint.assignedStaff &&
      !complaint.assignedStaffRole
    ) {
      return false;
    }
    if (!complaint.deadline) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(complaint.deadline);
    deadline.setHours(0, 0, 0, 0);
    return (
      deadline < today &&
      complaint.status !== "Closed" &&
      complaint.status !== "Resolved"
    );
  };

  // Copy of HoD Assign page Pending mocks (unassigned & Pending/Unassigned)
  const hodAssignPendingMocks: Complaint[] = [
    {
      id: "HOD-001",
      title: "Lab equipment request overdue",
      description: "Requested equipment for lab is overdue.",
      category: "Academic",
      priority: "High",
      status: "Pending",
      submittedBy: "Dept Head",
      assignedStaff: undefined,
      submittedDate: new Date("2024-01-10"),
      lastUpdated: new Date("2024-01-15"),
      deadline: new Date(new Date().getTime() - 2 * 86400000),
    },
    {
      id: "HOD-003",
      title: "Lab safety equipment missing",
      description: "Safety goggles and gloves missing from chemistry lab.",
      category: "Facility",
      priority: "Critical",
      status: "Pending",
      submittedBy: "Lab Assistant",
      assignedStaff: undefined,
      submittedDate: new Date("2024-03-10"),
      lastUpdated: new Date("2024-03-12"),
      deadline: new Date(new Date().getTime() - 5 * 86400000),
    },
    {
      id: "HOD-005",
      title: "Unassigned complaint test",
      description: "This complaint has not yet been assigned to any staff.",
      category: "General",
      priority: "Medium",
      status: "Unassigned",
      submittedBy: "Test User",
      assignedStaff: undefined,
      submittedDate: new Date("2024-05-12"),
      lastUpdated: new Date("2024-05-12"),
      deadline: new Date(new Date().getTime() - 1 * 86400000),
    },
    {
      id: "HOD-006",
      title: "Departmental budget approval delayed",
      description: "Budget approval for new equipment is overdue.",
      category: "Finance",
      priority: "High",
      status: "Pending",
      submittedBy: "Dept Admin",
      assignedStaff: undefined,
      submittedDate: new Date("2024-06-01"),
      lastUpdated: new Date("2024-06-05"),
      deadline: new Date(new Date().getTime() - 7 * 86400000),
    },
    {
      id: "HOD-008",
      title: "Edge case: No assigned staff, no feedback",
      description: "Complaint submitted but not yet processed.",
      category: "General",
      priority: "Medium",
      status: "Pending",
      submittedBy: "Edge Case 2",
      assignedStaff: undefined,
      submittedDate: new Date("2024-07-19"),
      lastUpdated: new Date("2024-07-19"),
      deadline: new Date(new Date().getTime() + 3 * 86400000),
    },
  ];

  // Recently Pending: top 3 by submittedDate desc from the HoD Assign mocks
  const recentPendingComplaints = [...hodAssignPendingMocks]
    .sort(
      (a, b) =>
        new Date(b.submittedDate).getTime() -
        new Date(a.submittedDate).getTime()
    )
    .slice(0, 3);

  // Local state pool for recent pending actions so UI updates immediately
  const [recentPool, setRecentPool] = useState<Complaint[]>(
    hodAssignPendingMocks
  );
  const visibleRecentPending = [...recentPool]
    .filter(
      (c) =>
        (c.status === "Pending" || c.status === "Unassigned") &&
        !c.assignedStaff &&
        !c.assignedStaffRole
    )
    .sort(
      (a, b) =>
        new Date(b.submittedDate).getTime() -
        new Date(a.submittedDate).getTime()
    )
    .slice(0, 3);

  const handleAccept = (id: string) => {
    const assignee =
      (user?.fullName as string) ||
      (user?.name as string) ||
      (user?.email as string) ||
      "Head of Department";
    setRecentPool((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status: "In Progress",
              assignedStaff: assignee,
              assignedStaffRole: "headOfDepartment",
              lastUpdated: new Date(),
            }
          : c
      )
    );
  };

  const handleReject = (id: string) => {
    setRecentPool((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "Closed" } : c))
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold"> Head Department Dashboard</h1>
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
              Pending staff Approvals
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
                onClick={() => navigate("/hod/staff-management")}
                className="text-orange-700 border-orange-300 hover:bg-orange-100"
              >
                Review Applications
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* ...existing quick action cards... */}
        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => navigate("/hod/staff-management")}
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
          onClick={() => navigate("/hod/assign-complaints")}
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

      {/* Recently Pending (like HoD Pending tab) */}
      <Card>
        <CardHeader>
          <CardTitle>Recently Pending Complaints</CardTitle>
          <CardDescription>Top 3 unassigned pending complaints</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mobile: stacked cards */}
          <div className="space-y-3 md:hidden">
            {visibleRecentPending.map((complaint) => (
              <Card key={complaint.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="text-xs text-muted-foreground">#{complaint.id}</div>
                    <div className="font-medium text-sm">{complaint.title}</div>
                    <div className="text-xs text-muted-foreground">Category: {complaint.category}</div>
                    {complaint.deadline && (
                      <div className="text-xs text-muted-foreground">
                        Deadline: {new Date(complaint.deadline).toLocaleDateString()}
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <Badge className="text-xs bg-yellow-100 text-yellow-800">
                        {complaint.status === "Unassigned" ? "Pending" : complaint.status}
                      </Badge>
                      <Badge
                        className={
                          (complaint.priority === "Low" &&
                            "text-xs bg-gray-200 text-gray-700 border-gray-300") ||
                          (complaint.priority === "Medium" &&
                            "text-xs bg-blue-100 text-blue-800 border-blue-200") ||
                          (complaint.priority === "High" &&
                            "text-xs bg-orange-100 text-orange-800 border-orange-200") ||
                          (complaint.priority === "Critical" &&
                            "text-xs bg-red-100 text-red-800 border-red-200 font-bold border-2") ||
                          "text-xs bg-blue-100 text-blue-800 border-blue-200"
                        }
                      >
                        {complaint.priority || "Medium"}
                      </Badge>
                      {isOverdue(complaint) ? (
                        <Badge className="text-xs bg-red-100 text-red-800 border-red-200" variant="outline">
                          Overdue
                        </Badge>
                      ) : (
                        <Badge className="text-xs bg-green-100 text-green-800 border-green-200" variant="outline">
                          On Time
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Assignee: <span className="font-medium">Not Yet Assigned</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button size="sm" variant="outline" className="col-span-2" onClick={() => handleViewComplaint(complaint)}>
                    View Detail
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => handleAccept(complaint.id)} className="w-full">
                    Accept
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleReject(complaint.id)} className="w-full">
                    Reject
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleAssignStaff(complaint)} className="col-span-2 w-full">
                    Assign
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop: table with horizontal scroll */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-sm">Title</TableHead>
                  <TableHead className="text-sm">Category</TableHead>
                  <TableHead className="text-sm">Priority</TableHead>
                  <TableHead className="text-sm">Status</TableHead>
                  <TableHead className="text-sm">Assignee</TableHead>
                  <TableHead className="text-sm">Overdue</TableHead>
                  <TableHead className="text-sm">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRecentPending.map((complaint) => (
                  <TableRow key={complaint.id}>
                    <TableCell className="font-medium text-sm">
                      <div>
                        <div className="font-semibold flex items-center gap-2">{complaint.title}</div>
                        <div className="text-xs text-muted-foreground">Submitted by {complaint.submittedBy}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{complaint.category}</TableCell>
                    <TableCell className="text-sm">
                      <Badge
                        className={
                          (complaint.priority === "Low" &&
                            "bg-gray-200 text-gray-700 border-gray-300") ||
                          (complaint.priority === "Medium" &&
                            "bg-blue-100 text-blue-800 border-blue-200") ||
                          (complaint.priority === "High" &&
                            "bg-orange-100 text-orange-800 border-orange-200") ||
                          (complaint.priority === "Critical" &&
                            "bg-red-100 text-red-800 border-red-200 font-bold border-2") ||
                          "bg-blue-100 text-blue-800 border-blue-200"
                        }
                      >
                        {complaint.priority || "Medium"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {complaint.status !== "Unassigned" && (
                        <Badge className="bg-yellow-100 text-yellow-800 text-xs">{complaint.status}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs font-medium">
                        Not Yet Assigned
                      </span>
                    </TableCell>
                    <TableCell>
                      {isOverdue(complaint) ? (
                        <Badge className="bg-red-100 text-red-800 border-red-200 text-xs" variant="outline">Overdue</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800 border-green-200 text-xs" variant="outline">Not Overdue</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 items-center flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => handleViewComplaint(complaint)} className="text-xs">
                          View Detail
                        </Button>
                        <Button size="sm" variant="secondary" className="text-xs" onClick={() => handleAccept(complaint.id)}>
                          Accept
                        </Button>
                        <Button size="sm" variant="destructive" className="text-xs" onClick={() => handleReject(complaint.id)}>
                          Reject
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => handleAssignStaff(complaint)}>
                          Assign
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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
      <AssignStaffModal
        complaint={selectedComplaint}
        open={showAssignModal}
        onOpenChange={setShowAssignModal}
        onAssign={(complaintId, staffId, notes) => {
          // Update global context (optional) and local recent pool
          handleStaffAssignment(complaintId, staffId, notes);
          setRecentPool((prev) =>
            prev.map((c) =>
              c.id === complaintId
                ? {
                    ...c,
                    assignedStaff:
                      getAllStaff().find((s) => s.id === staffId)?.fullName ||
                      getAllStaff().find((s) => s.id === staffId)?.name ||
                      "Unknown",
                    assignedStaffRole: "staff",
                    status: "In Progress",
                    lastUpdated: new Date(),
                  }
                : c
            )
          );
        }}
      />
    </div>
  );
}
