// For demo/testing: import mockComplaint
import { mockComplaint } from "@/components/RoleBasedComplaintModal";
import { useState, useCallback } from "react";
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
import { assignComplaintApi } from "@/lib/api";
import { useEffect } from "react";
import { useState as useReactState } from "react";
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

type Complaint = BaseComplaint & {
  evidence?: string;
  deadline?: Date;
  priority?: "Low" | "Medium" | "High" | "Critical";
};

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
  // Diverse mock complaints for demo/testing
  // At least half of complaints are overdue (deadline in the past)
  const now = new Date();
  const demoComplaints: Complaint[] = [
    {
      id: "ADM-001",
      title: "Library computers are slow and outdated",
      description:
        "The computers in the main library are extremely slow and need upgrading.",
      category: "Academic",
      priority: "High",
      status: "In Progress",
      submittedBy: "John Doe",
      assignedStaff: "IT Support Team",
      submittedDate: new Date("2024-01-15"),
      lastUpdated: new Date("2024-01-18"),
      evidence: "library_computer_issues.pdf",
      resolutionNote: "Working on upgrading the hardware.",
      deadline: new Date(now.getTime() - 3 * 86400000), // overdue
    },
    {
      id: "ADM-002",
      title: "Cafeteria food quality concerns",
      description:
        "The food quality in the main cafeteria has declined significantly.",
      category: "Cafeteria",
      priority: "Critical",
      status: "Resolved",
      submittedBy: "Jane Smith",
      assignedStaff: "Food Services Manager",
      submittedDate: new Date("2024-01-10"),
      lastUpdated: new Date("2024-01-20"),
      feedback: {
        rating: 4,
        comment: "Issue was resolved quickly and effectively.",
      },
      resolutionNote:
        "Improved food handling procedures and conducted staff training.",
      deadline: new Date(now.getTime() + 5 * 86400000), // not overdue
    },
    {
      id: "ADM-003",
      title: "Broken air conditioning in lecture hall",
      description:
        "The air conditioning in lecture hall B-204 has been broken for over a week.",
      category: "Facility",
      priority: "Medium",
      status: "Pending",
      submittedBy: "Mike Johnson",
      assignedStaff: "Facilities Team",
      submittedDate: new Date("2024-01-22"),
      lastUpdated: new Date("2024-01-22"),
      deadline: new Date(now.getTime() - 1 * 86400000), // overdue
    },
    {
      id: "ADM-004",
      title: "Parking lot lighting issues",
      description:
        "Several lights in the main parking lot are not working, making it unsafe.",
      category: "Facility",
      priority: "Medium",
      status: "Closed",
      submittedBy: "David Wilson",
      assignedStaff: "Facilities Manager",
      submittedDate: new Date("2024-01-08"),
      lastUpdated: new Date("2024-01-18"),
      feedback: {
        rating: 5,
        comment: "Excellent work! All lights were replaced quickly.",
      },
      resolutionNote:
        "All parking lot lights have been replaced with LED fixtures.",
      deadline: new Date(now.getTime() + 7 * 86400000), // not overdue
    },
    {
      id: "ADM-005",
      title: "Exam schedule not published",
      description:
        "The final exam schedule for 2nd year students is overdue and not yet published.",
      category: "Academic",
      priority: "Critical",
      status: "Pending",
      submittedBy: "Paul Green",
      assignedStaff: "Academic Office",
      submittedDate: new Date("2024-01-01"),
      lastUpdated: new Date("2024-01-20"),
      resolutionNote: "Awaiting department response.",
      deadline: new Date(now.getTime() - 5 * 86400000), // overdue
    },
    {
      id: "ADM-006",
      title: "Unassigned complaint test",
      description: "This complaint has not yet been assigned to any staff.",
      category: "General",
      priority: "Medium",
      status: "Unassigned",
      submittedBy: "Test User",
      assignedStaff: undefined,
      submittedDate: new Date("2024-01-12"),
      lastUpdated: new Date("2024-01-12"),
      deadline: new Date(now.getTime() - 2 * 86400000), // overdue
    },
    {
      id: "ADM-007",
      title: "Edge case: No description",
      description: "",
      category: "Other",
      priority: "Low",
      status: "Pending",
      submittedBy: "Edge Case",
      assignedStaff: "Support",
      submittedDate: new Date("2024-01-18"),
      lastUpdated: new Date("2024-01-18"),
      deadline: new Date(now.getTime() + 10 * 86400000), // not overdue
    },
    {
      id: "ADM-008",
      title: "Edge case: No assigned staff, no feedback",
      description: "Complaint submitted but not yet processed.",
      category: "General",
      priority: "Medium",
      status: "Pending",
      submittedBy: "Edge Case 2",
      assignedStaff: undefined,
      submittedDate: new Date("2024-01-19"),
      lastUpdated: new Date("2024-01-19"),
      deadline: new Date(now.getTime() + 3 * 86400000), // not overdue
    },
    {
      id: "ADM-009",
      title: "Elevator malfunction",
      description: "Elevator in Admin Block is stuck on 2nd floor.",
      category: "Facilities",
      priority: "High",
      status: "Pending",
      submittedBy: "Linda Green",
      assignedStaff: "Facilities Team",
      submittedDate: new Date("2024-01-22"),
      lastUpdated: new Date("2024-01-23"),
      deadline: new Date(now.getTime() - 4 * 86400000), // overdue
    },
    {
      id: "ADM-010",
      title: "Printer out of service",
      description: "Printer in Lab 5 is out of service.",
      category: "IT & Technology",
      priority: "Low",
      status: "Pending",
      submittedBy: "Tom Hardy",
      assignedStaff: "IT Support Team",
      submittedDate: new Date("2024-01-25"),
      lastUpdated: new Date("2024-01-26"),
      deadline: new Date(now.getTime() + 8 * 86400000), // not overdue
    },
  ];
  const [complaints, setComplaints] =
    useReactState<Complaint[]>(demoComplaints);
  // Backend fetch and polling removed for demo/testing. Only mock data is shown.

  const allComplaints = complaints;
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
  const handleStaffAssignment = async (
    complaintId: string,
    staffId: string
  ) => {
    const staff = getAllStaff().find((s) => s.id === staffId);
    try {
      // Call backend API to assign complaint
      const updatedComplaint = await assignComplaintApi(
        complaintId,
        staffId,
        assigningDeadline || undefined
      );
      // Update local complaints state for instant UI feedback
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
                status: updatedComplaint.status || "Assigned",
              }
            : c
        )
      );
      // Update global state if needed
      updatedComplaint(complaintId, {
        assignedStaff: staff?.fullName || staff?.name || "Unknown",
        lastUpdated: new Date(),
        deadline: assigningDeadline ? new Date(assigningDeadline) : undefined,
        status: updatedComplaint.status || "Assigned",
      });
      // Refresh complaints list after assignment (sync with backend)
      // Pause polling for 3 seconds to allow backend to update
      setPollingPaused(true);
      setTimeout(() => setPollingPaused(false), 3000);
      toast({
        title: "Staff Assigned",
        description: `Complaint has been assigned to ${
          staff?.fullName || staff?.name
        }${
          assigningDeadline
            ? ` with deadline ${new Date(
                assigningDeadline
              ).toLocaleDateString()}`
            : ""
        }`,
      });
    } catch (error) {
      toast({
        title: "Assignment Failed",
        description: "Could not assign staff. Please try again.",
        variant: "destructive",
      });
    } finally {
      setReassigningRow(null);
      setAssigningStaffId("");
      setAssigningDeadline("");
    }
  };
  // Filter complaints
  // Helper: check if complaint is overdue
  const isOverdue = (complaint: Complaint) => {
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

  const filteredComplaints = allComplaints.filter((complaint) => {
    // Exclude resolved complaints
    if (complaint.status === "Resolved") return false;
    const matchesSearch =
      complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.submittedBy.toLowerCase().includes(searchTerm.toLowerCase());
    // Remove 'Unassigned' from status filter logic
    const matchesStatus =
      statusFilter === "all" ||
      (complaint.status === statusFilter && complaint.status !== "Unassigned");
    const matchesAssignment =
      assignmentFilter === "all"
        ? true
        : assignmentFilter === "assigned"
        ? !!complaint.assignedStaff
        : !complaint.assignedStaff;
    const matchesPriority =
      priorityFilter === "all" ||
      (complaint.priority || "Medium") === priorityFilter;
    const matchesOverdue =
      overdueFilter === "all"
        ? true
        : overdueFilter === "overdue"
        ? isOverdue(complaint)
        : !isOverdue(complaint);
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
                  <TableHead className="text-sm">Category</TableHead>
                  <TableHead className="text-sm">Department</TableHead>
                  <TableHead className="text-sm">Priority</TableHead>
                  <TableHead className="text-sm">Status</TableHead>
                  <TableHead className="text-sm">Assigned Dean</TableHead>
                  <TableHead className="text-sm">Overdue</TableHead>
                  <TableHead className="text-sm">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredComplaints.map((complaint) => (
                  <TableRow key={complaint.id}>
                    <TableCell className="font-medium text-sm">
                      {complaint.title}
                    </TableCell>
                    <TableCell className="text-sm">
                      {complaint.category}
                    </TableCell>
                    <TableCell className="text-sm">
                      {complaint.department || "-"}
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
                      {complaint.status !== "Unassigned" && (
                        <Badge
                          className={`text-xs ${
                            statusColors[
                              complaint.status as keyof typeof statusColors
                            ]
                          }`}
                        >
                          {complaint.status}
                        </Badge>
                      )}
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
                      {isOverdue(complaint) ? (
                        <Badge
                          className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 text-xs"
                          variant="outline"
                        >
                          Overdue
                        </Badge>
                      ) : (
                        <Badge
                          className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 text-xs"
                          variant="outline"
                        >
                          Not Overdue
                        </Badge>
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
                        {!complaint.assignedStaff && (
                          <>
                            <Select
                              value={assigningStaffId}
                              onValueChange={setAssigningStaffId}
                            >
                              <SelectTrigger className="w-32 text-xs">
                                <SelectValue placeholder="Select dean" />
                              </SelectTrigger>
                              <SelectContent>
                                {getAllStaff().map((staff) => (
                                  <SelectItem key={staff.id} value={staff.id}>
                                    {staff.fullName || staff.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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
                              Assign
                            </Button>
                          </>
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
                    {complaint.status !== "Unassigned" && (
                      <Badge
                        className={`ml-2 text-xs ${
                          statusColors[
                            complaint.status as keyof typeof statusColors
                          ]
                        }`}
                      >
                        {complaint.status}
                      </Badge>
                    )}
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
                    <div>
                      <span className="text-muted-foreground">Overdue:</span>
                      {isOverdue(complaint) ? (
                        <Badge
                          className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 text-xs ml-2"
                          variant="outline"
                        >
                          Overdue
                        </Badge>
                      ) : (
                        <Badge
                          className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 text-xs ml-2"
                          variant="outline"
                        >
                          Not Overdue
                        </Badge>
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
                        {complaint.assignedStaff &&
                        complaint.assignedStaff !== "Not Yet Assigned"
                          ? "Re-Assign"
                          : "Assign"}
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
function setPollingPaused(arg0: boolean) {
  throw new Error("Function not implemented.");
}
