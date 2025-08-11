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

// ...existing code...
// ...existing code...

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
  const { updateComplaint } = useComplaints();
  const [complaints, setComplaints] = useReactState<Complaint[]>([]);
  // Fetch all complaints from backend for admin
  const fetchAllComplaints = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/complaints/all`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      let data: Complaint[] = await res.json();
      if (!res.ok) {
        const errorMsg =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof (data as { error?: string }).error === "string"
            ? (data as { error: string }).error
            : "Failed to fetch complaints";
        throw new Error(errorMsg);
      }
      // Map backend 'assignedTo' to frontend 'assignedStaff' for UI consistency
      data = data.map((c: Complaint) => ({
        ...c,
        assignedStaff: (c as { assignedTo?: string }).assignedTo,
      }));
      setComplaints(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load complaints from server.",
        variant: "destructive",
      });
    }
  }, [setComplaints]);
  // Polling control
  const [pollingPaused, setPollingPaused] = useState(false);
  useEffect(() => {
    if (pollingPaused) return;
    fetchAllComplaints();
    const interval = setInterval(fetchAllComplaints, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [fetchAllComplaints, pollingPaused]);
  // Only show real complaints (not mock)
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
      updateComplaint(complaintId, {
        assignedStaff: staff?.fullName || staff?.name || "Unknown",
        lastUpdated: new Date(),
        deadline: assigningDeadline ? new Date(assigningDeadline) : undefined,
        status: updatedComplaint.status || "Assigned",
      });
      // Refresh complaints list after assignment (sync with backend)
      // Pause polling for 3 seconds to allow backend to update
      setPollingPaused(true);
      await fetchAllComplaints();
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
                  <TableHead className="text-sm">Category</TableHead>
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
                      {complaint.assignedStaff &&
                      complaint.assignedStaff !== "Not Yet Assigned" ? (
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
                            {complaint.assignedStaff &&
                            complaint.assignedStaff !== "Not Yet Assigned"
                              ? "Re-Assign"
                              : "Assign"}
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
