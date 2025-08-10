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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, UserPlus } from "lucide-react";

import { Dialog } from "@/components/ui/dialog";
import { RoleBasedComplaintModal } from "@/components/RoleBasedComplaintModal";
import { Label } from "@/components/ui/label";
import { Complaint as BaseComplaint } from "@/context/ComplaintContext";
import { useAuth } from "@/components/auth/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useComplaints } from "@/context/ComplaintContext";

type Complaint = BaseComplaint & {
  evidence?: string;
  deadline?: Date;
  priority?: "Low" | "Medium" | "High" | "Critical";
};

// Mock complaints data
// Mock complaints for easy understanding (clearly marked as mock/test)
const mockComplaints: Complaint[] = [
  {
    id: "MOCK-001",
    title: "[MOCK] Urgent: Water Leakage in Main Hall",
    description:
      "This is a mock complaint for testing assignment and deadline features.",
    category: "Infrastructure & Facilities",
    status: "Pending",
    submittedBy: "Test User 1",
    assignedStaff: "Test Staff A",
    submittedDate: new Date("2024-08-01"),
    lastUpdated: new Date("2024-08-02"),
    evidence: "https://via.placeholder.com/80.png",
    deadline: new Date("2024-08-10"),
    priority: "Critical",
  },
  {
    id: "MOCK-002",
    title: "[MOCK] IT: Printer Not Working in Admin Office",
    description:
      "This is a mock complaint for testing staff assignment and overdue logic.",
    category: "IT & Technology",
    status: "In Progress",
    submittedBy: "Test User 2",
    assignedStaff: "Test Staff B",
    submittedDate: new Date("2024-07-25"),
    lastUpdated: new Date("2024-07-26"),
    evidence: "https://via.placeholder.com/90.png",
    deadline: new Date("2024-07-30"),
    priority: "High",
  },
  {
    id: "MOCK-003",
    title: "[MOCK] Cafeteria: Food Quality Issue",
    description:
      "This is a mock complaint for testing filtering and UI display.",
    category: "Cafeteria",
    status: "Resolved",
    submittedBy: "Test User 3",
    assignedStaff: "Test Staff C",
    submittedDate: new Date("2024-07-10"),
    lastUpdated: new Date("2024-07-12"),
    evidence: "https://via.placeholder.com/100.png",
    deadline: new Date("2024-07-15"),
    priority: "Medium",
  },
  {
    id: "CMP-001",
    title: "Library computers are slow and outdated",
    description:
      "The computers in the main library are extremely slow and need upgrading.",
    category: "IT & Technology",
    priority: "Medium",
    status: "In Progress",
    submittedBy: "John Doe",
    assignedStaff: "IT Support Team",
    submittedDate: new Date("2024-01-15"),
    lastUpdated: new Date("2024-01-18"),
    evidence: "https://via.placeholder.com/150.jpg",
  },
  {
    id: "CMP-002",
    title: "Wi-Fi not working in dormitory",
    description:
      "The Wi-Fi in Dorm A has been down for three days, affecting all students.",
    category: "IT & Technology",
    priority: "Medium",
    status: "Resolved",
    submittedBy: "Alice Smith",
    assignedStaff: "Network Team",
    submittedDate: new Date("2024-01-10"),
    lastUpdated: new Date("2024-01-12"),
    evidence: "https://via.placeholder.com/120.jpg",
  },
  {
    id: "CMP-003",
    title: "Broken air conditioning in lecture hall",
    description:
      "The air conditioning in lecture hall B-204 has been broken for over a week.",
    category: "Infrastructure & Facilities",
    priority: "Medium",
    status: "Pending",
    submittedBy: "Mike Johnson",
    assignedStaff: undefined,
    submittedDate: new Date("2024-01-22"),
    lastUpdated: new Date("2024-01-22"),
    evidence:
      "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  },
  {
    id: "CMP-004",
    title: "Classroom projector not working",
    description:
      "The projector in room C-305 has been malfunctioning for the past week.",
    category: "IT & Technology",
    priority: "Medium",
    status: "Pending",
    submittedBy: "Sarah Johnson",
    assignedStaff: undefined,
    submittedDate: new Date("2024-01-20"),
    lastUpdated: new Date("2024-01-20"),
    evidence: "https://via.placeholder.com/100.png",
  },
  {
    id: "CMP-005",
    title: "Cafeteria food quality issue",
    description:
      "The food served in the cafeteria is often cold and lacks variety.",
    category: "Cafeteria",
    priority: "Medium",
    status: "In Progress",
    submittedBy: "Emily Brown",
    assignedStaff: undefined,
    submittedDate: new Date("2024-01-18"),
    lastUpdated: new Date("2024-01-19"),
    evidence: "https://via.placeholder.com/140.jpg",
  },
  {
    id: "CMP-006",
    title: "Elevator not working in dorm B",
    description:
      "The elevator in Dorm B has been out of service for two weeks.",
    category: "Infrastructure & Facilities",
    priority: "Medium",
    status: "In Progress",
    submittedBy: "David Lee",
    assignedStaff: "Maintenance Team",
    submittedDate: new Date("2024-01-05"),
    lastUpdated: new Date("2024-01-10"),
    evidence: "https://via.placeholder.com/160.jpg",
  },
];

const statusColors = {
  Pending: "bg-yellow-100 text-yellow-800",
  "In Progress": "bg-blue-100 text-blue-800",
  Resolved: "bg-green-100 text-green-800",
  Closed: "bg-gray-100 text-gray-800",
  Delayed: "bg-red-100 text-red-800",
};

export function AssignComplaints() {
  // State for deadline during assignment
  const [assigningDeadline, setAssigningDeadline] = useState<string>("");
  // Remove local mock/test complaints from main display; only show real/global complaints
  const { complaints: globalComplaints, updateComplaint } = useComplaints();
  const [complaints, setComplaints] = useState<Complaint[]>(mockComplaints);
  // Only show global (user-submitted) complaints for assignment
  const allComplaints = globalComplaints;
  // Remove priority sort
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [assignmentFilter, setAssignmentFilter] = useState<string>("all"); // 'all' | 'assigned' | 'unassigned'
  const [overdueFilter, setOverdueFilter] = useState<string>("all"); // 'all' | 'overdue' | 'notOverdue'
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null
  );
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [assigningStaffId, setAssigningStaffId] = useState<string>("");
  const [reassigningRow, setReassigningRow] = useState<string | null>(null);

  const { getAllStaff } = useAuth();

  // Inline assign/re-assign button click
  const handleAssignClick = (complaint: Complaint) => {
    setReassigningRow(complaint.id);
    setAssigningStaffId("");
  };

  const handleViewDetail = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setShowDetailModal(true);
    setAssigningStaffId("");
    setReassigningRow(null);
  };

  // Assign staff and deadline to a complaint
  // This function updates the complaint with the selected staff and deadline
  const handleStaffAssignment = (complaintId: string, staffId: string) => {
    const staff = getAllStaff().find((s) => s.id === staffId);
    // If the complaint is in local mock data, update local state; otherwise, update global
    if (complaints.some((c) => c.id === complaintId)) {
      setComplaints((prev) =>
        prev.map((c) =>
          c.id === complaintId
            ? {
                ...c,
                assignedStaff: staff?.fullName || staff?.name || "Unknown",
                lastUpdated: new Date(),
                deadline: assigningDeadline
                  ? new Date(assigningDeadline)
                  : undefined,
                status: "In Progress",
              }
            : c
        )
      );
    } else {
      updateComplaint(complaintId, {
        assignedStaff: staff?.fullName || staff?.name || "Unknown",
        lastUpdated: new Date(),
        deadline: assigningDeadline ? new Date(assigningDeadline) : undefined,
        status: "Assigned",
      });
    }
    toast({
      title: "Staff Assigned",
      description: `Complaint has been assigned to ${
        staff?.fullName || staff?.name
      }${
        assigningDeadline
          ? ` with deadline ${new Date(assigningDeadline).toLocaleDateString()}`
          : ""
      }`,
    });
    setReassigningRow(null);
    setAssigningStaffId("");
    setAssigningDeadline("");
  };
  // Filter complaints
  const filteredComplaints = allComplaints.filter((complaint) => {
    const matchesSearch =
      complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.submittedBy.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || complaint.status === statusFilter;
    const matchesAssignment =
      assignmentFilter === "all"
        ? true
        : assignmentFilter === "assigned"
        ? !!complaint.assignedStaff
        : !complaint.assignedStaff;
    const matchesPriority =
      priorityFilter === "all" ||
      (complaint.priority || "Medium") === priorityFilter;
    const now = new Date();
    const isOverdue =
      complaint.deadline &&
      complaint.status !== "Resolved" &&
      complaint.status !== "Closed" &&
      now > complaint.deadline;
    const matchesOverdue =
      overdueFilter === "all"
        ? true
        : overdueFilter === "overdue"
        ? isOverdue
        : !isOverdue;
    return (
      matchesSearch &&
      matchesStatus &&
      matchesPriority &&
      matchesAssignment &&
      matchesOverdue
    );
  });

  // Move these inside the AssignComplaints function, after complaints state is declared
  // Move these inside the AssignComplaints function, after complaints state is declared
  const unassignedCount = allComplaints.filter((c) => !c.assignedStaff).length;
  const assignedCount = allComplaints.filter((c) => c.assignedStaff).length;
  const categories = Array.from(new Set(allComplaints.map((c) => c.category)));
  const priorityColors = {
    Low: "bg-gray-200 text-gray-700 border-gray-300",
    Medium: "bg-blue-100 text-blue-800 border-blue-200",
    High: "bg-orange-100 text-orange-800 border-orange-200",
    Critical: "bg-red-100 text-red-800 border-red-200 font-bold border-2",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Assign & Reassign Complaints</h1>
        <p className="text-muted-foreground">
          Manage staff assignments for complaints
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Complaints
            </CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allComplaints.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
            <div className="h-4 w-4 rounded-full bg-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {unassignedCount}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned</CardTitle>
            <div className="h-4 w-4 rounded-full bg-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {assignedCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 sm:gap-4 w-full">
            {/* Search input */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, department, or submitter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            {/* Status dropdown */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Resolved">Resolved</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            {/* Priority dropdown */}
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            {/* Assignment Status Filter */}
            <Select
              value={assignmentFilter}
              onValueChange={setAssignmentFilter}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by Assignment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Complaints</SelectItem>
                <SelectItem value="assigned">Assigned Complaints</SelectItem>
                <SelectItem value="unassigned">
                  Unassigned Complaints
                </SelectItem>
              </SelectContent>
            </Select>
            {/* Overdue filter dropdown */}
            <Select value={overdueFilter} onValueChange={setOverdueFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by overdue" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Delay complaints</SelectItem>
                <SelectItem value="overdue">Overdue Only</SelectItem>
                <SelectItem value="notOverdue">Not Overdue Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Complaints Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Complaints</CardTitle>
          <CardDescription>
            {filteredComplaints.length} complaint
            {filteredComplaints.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-sm">Title</TableHead>
                  <TableHead className="text-sm">Department</TableHead>
                  <TableHead className="text-sm">Priority</TableHead>
                  <TableHead className="text-sm">Status</TableHead>
                  <TableHead className="text-sm">Assigned Staff</TableHead>
                  <TableHead className="text-sm">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredComplaints.map((complaint) => (
                  <TableRow
                    key={complaint.id}
                    className={`dark:hover:bg-accent/10 ${
                      complaint.id.startsWith("MOCK-")
                        ? "bg-yellow-50 border-l-4 border-yellow-400"
                        : ""
                    }`}
                  >
                    <TableCell className="font-medium text-sm">
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          {complaint.title}
                          {complaint.id.startsWith("MOCK-") && (
                            <Badge className="bg-yellow-400 text-white text-xs">
                              Mock/Test
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Submitted by {complaint.submittedBy}
                        </div>
                        {complaint.id.startsWith("MOCK-") && (
                          <div className="text-xs text-yellow-700 mt-1">
                            This is a mock/test complaint for UI and feature
                            demonstration.
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {complaint.category}
                    </TableCell>
                    <TableCell className="text-sm">
                      <Badge
                        className={
                          priorityColors[complaint.priority || "Medium"]
                        }
                      >
                        {complaint.priority || "Medium"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`text-xs ${
                          statusColors[
                            complaint.status as keyof typeof statusColors
                          ]
                        }`}
                      >
                        {complaint.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {complaint.assignedStaff ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-medium">
                          Assigned to: {complaint.assignedStaff}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs font-medium">
                          Not Yet Assigned
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 items-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetail(complaint)}
                          className="text-xs dark:hover:text-blue-400"
                        >
                          View Detail
                        </Button>
                        {reassigningRow === complaint.id ? (
                          <>
                            <Select
                              value={assigningStaffId}
                              onValueChange={setAssigningStaffId}
                            >
                              <SelectTrigger className="w-32 text-xs">
                                <SelectValue placeholder="Select staff" />
                              </SelectTrigger>
                              <SelectContent>
                                {getAllStaff().map((staff) => (
                                  <SelectItem key={staff.id} value={staff.id}>
                                    {staff.fullName || staff.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {/* Deadline Picker */}
                            <Input
                              type="date"
                              className="w-32 text-xs"
                              value={assigningDeadline}
                              onChange={(e) =>
                                setAssigningDeadline(e.target.value)
                              }
                              required
                            />
                            <Button
                              size="sm"
                              variant="default"
                              className="text-xs"
                              disabled={!assigningStaffId || !assigningDeadline}
                              onClick={() =>
                                handleStaffAssignment(
                                  complaint.id,
                                  assigningStaffId
                                )
                              }
                            >
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs"
                              onClick={() => {
                                setReassigningRow(null);
                                setAssigningStaffId("");
                              }}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs dark:hover:text-blue-400"
                            onClick={() => handleAssignClick(complaint)}
                          >
                            {complaint.assignedStaff ? "Re-Assign" : "Assign"}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {filteredComplaints.map((complaint) => (
              <Card
                key={complaint.id}
                className={`p-4 ${
                  complaint.id.startsWith("MOCK-")
                    ? "bg-yellow-50 border-l-4 border-yellow-400"
                    : ""
                }`}
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm leading-tight flex items-center gap-2">
                        {complaint.title}
                        {complaint.id.startsWith("MOCK-") && (
                          <Badge className="bg-yellow-400 text-white text-xs">
                            Mock/Test
                          </Badge>
                        )}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Submitted by {complaint.submittedBy}
                      </p>
                      {complaint.id.startsWith("MOCK-") && (
                        <div className="text-xs text-yellow-700 mt-1">
                          This is a mock/test complaint for UI and feature
                          demonstration.
                        </div>
                      )}
                    </div>
                    <Badge
                      className={`ml-2 text-xs ${
                        statusColors[
                          complaint.status as keyof typeof statusColors
                        ]
                      }`}
                    >
                      {complaint.status}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Category:</span>
                      <span className="font-medium ml-2">
                        {complaint.category}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Priority:</span>
                      <Badge
                        className={
                          priorityColors[complaint.priority || "Medium"]
                        }
                      >
                        {complaint.priority || "Medium"}
                      </Badge>
                    </div>
                    <div>
                      {complaint.assignedStaff ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-medium">
                          Assigned to: {complaint.assignedStaff}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs font-medium">
                          Not Yet Assigned
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewDetail(complaint)}
                      className="w-full text-xs dark:hover:text-blue-400"
                    >
                      View Detail
                    </Button>
                    {reassigningRow === complaint.id ? (
                      <>
                        <Select
                          value={assigningStaffId}
                          onValueChange={setAssigningStaffId}
                        >
                          <SelectTrigger className="w-full text-xs">
                            <SelectValue placeholder="Select staff" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAllStaff().map((staff) => (
                              <SelectItem key={staff.id} value={staff.id}>
                                {staff.fullName || staff.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="default"
                          className="w-full text-xs mt-1"
                          disabled={!assigningStaffId}
                          onClick={() =>
                            handleStaffAssignment(
                              complaint.id,
                              assigningStaffId
                            )
                          }
                        >
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full text-xs mt-1"
                          onClick={() => {
                            setReassigningRow(null);
                            setAssigningStaffId("");
                            setAssigningDeadline("");
                          }}
                        >
                          Cancel
                        </Button>
                        If the deadline passes and the complaint is not
                        resolved, mark it as "Overdue" in red.
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs dark:hover:text-blue-400"
                        onClick={() => handleAssignClick(complaint)}
                      >
                        {complaint.assignedStaff ? "Re-Assign" : "Assign"}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Assign Staff Modal removed; assignment is now inline in the table */}

      {/* Role-based Complaint Modal for View Detail */}
      {selectedComplaint && (
        <RoleBasedComplaintModal
          complaint={selectedComplaint}
          open={showDetailModal}
          onOpenChange={setShowDetailModal}
          // Pass deadline to modal as prop
        />
      )}
      {/* No action buttons below modal; all assignment actions are now side by side with View Detail in the table */}
    </div>
  );
}
