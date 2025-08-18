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
import { RoleBasedComplaintModal } from "@/components/RoleBasedComplaintModal";
import { useAuth } from "@/components/auth/AuthContext";
import { toast } from "@/hooks/use-toast";
import { assignComplaintApi } from "@/lib/api";
import { useState as useReactState } from "react";
import { Complaint as ComplaintType } from "@/components/ComplaintCard";
// Use ComplaintType for all references to Complaint

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

const statusColors = {
  Pending: "bg-yellow-100 text-yellow-800",
  "In Progress": "bg-blue-100 text-blue-800",
  Resolved: "bg-green-100 text-green-800",
  Closed: "bg-gray-100 text-gray-800",
  Delayed: "bg-red-100 text-red-800",
};

export function HoDAssignComplaints() {
  // State for deadline during assignment
  const [assigningDeadline, setAssigningDeadline] = useState<string>("");
  // Diverse mock complaints for demo/testing
  // At least half of complaints are overdue (deadline in the past)
  const now = new Date();
  const demoComplaints: ComplaintType[] = [
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
      deadline: new Date(now.getTime() - 2 * 86400000), // overdue
    },
    {
      id: "HOD-002",
      title: "Faculty leave request delayed",
      description: "Leave request for faculty not processed in time.",
      category: "HR",
      priority: "Medium",
      status: "In Progress",
      submittedBy: "Faculty Member",
      assignedStaff: "HR Manager",
      submittedDate: new Date("2024-02-01"),
      lastUpdated: new Date("2024-02-05"),
      deadline: new Date(now.getTime() + 3 * 86400000), // not overdue
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
      deadline: new Date(now.getTime() - 5 * 86400000), // overdue
    },
    {
      id: "HOD-004",
      title: "Student feedback on course content",
      description: "Students report outdated syllabus in core course.",
      category: "Academic",
      priority: "Low",
      status: "Closed",
      submittedBy: "Student Council",
      assignedStaff: "Course Coordinator",
      submittedDate: new Date("2024-04-01"),
      lastUpdated: new Date("2024-04-10"),
      deadline: new Date(now.getTime() + 10 * 86400000), // not overdue
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
      deadline: new Date(now.getTime() - 1 * 86400000), // overdue
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
      deadline: new Date(now.getTime() - 7 * 86400000), // overdue
    },
    {
      id: "HOD-007",
      title: "Edge case: No description",
      description: "",
      category: "Other",
      priority: "Low",
      status: "Pending",
      submittedBy: "Edge Case",
      assignedStaff: "Support",
      submittedDate: new Date("2024-07-18"),
      lastUpdated: new Date("2024-07-18"),
      deadline: new Date(now.getTime() + 10 * 86400000), // not overdue
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
      deadline: new Date(now.getTime() + 3 * 86400000), // not overdue
    },
    {
      id: "HOD-009",
      title: "Faculty training session overdue",
      description: "Mandatory training session for faculty not scheduled.",
      category: "HR",
      priority: "High",
      status: "Pending",
      submittedBy: "HR Dept",
      assignedStaff: "Training Coordinator",
      submittedDate: new Date("2024-08-01"),
      lastUpdated: new Date("2024-08-03"),
      deadline: new Date(now.getTime() - 4 * 86400000), // overdue
    },
    {
      id: "HOD-010",
      title: "Printer out of service",
      description: "Printer in HOD's office is out of service.",
      category: "IT & Technology",
      priority: "Low",
      status: "Pending",
      submittedBy: "Office Staff",
      assignedStaff: "IT Support Team",
      submittedDate: new Date("2024-08-05"),
      lastUpdated: new Date("2024-08-06"),
      deadline: new Date(now.getTime() + 8 * 86400000), // not overdue
    },
  ];
  const [complaints, setComplaints] =
    useReactState<ComplaintType[]>(demoComplaints);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [assignmentFilter, setAssignmentFilter] = useState<string>("all");
  const [overdueFilter, setOverdueFilter] = useState<string>("all");
  const [selectedComplaint, setSelectedComplaint] =
    useState<ComplaintType | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [assigningStaffId, setAssigningStaffId] = useState<string>("");
  const [reassigningRow, setReassigningRow] = useState<string | null>(null);
  const auth = useAuth();
  const getAllStaff = auth.getAllStaff;
  const handleAssignClick = (complaint: ComplaintType) => {
    setReassigningRow(complaint.id);
    setAssigningStaffId("");
  };

  const handleViewDetail = (complaint: ComplaintType) => {
    setSelectedComplaint(complaint);
    setShowDetailModal(true);
    setAssigningStaffId("");
    setReassigningRow(null);
  };
  const handleStaffAssignment = async (
    complaintId: string,
    staffId: string
  ) => {
    const staff = getAllStaff().find((s) => s.id === staffId);
    try {
      const updatedComplaint = await assignComplaintApi(
        complaintId,
        staffId,
        assigningDeadline || undefined
      );
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

  const isOverdue = (complaint: ComplaintType) => {
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

  // Calculate summary stats
  const unassignedCount = complaints.filter((c) => !c.assignedStaff).length;
  const assignedCount = complaints.filter((c) => c.assignedStaff).length;
  const priorityColors = {
    Low: "bg-gray-200 text-gray-700 border-gray-300",
    Medium: "bg-blue-100 text-blue-800 border-blue-200",
    High: "bg-orange-100 text-orange-800 border-orange-200",
    Critical: "bg-red-100 text-red-800 border-red-200 font-bold border-2",
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Assign & Reassign Complaints (HOD)</h1>
      <p className="text-muted-foreground">
        Manage staff assignments for complaints in your department
      </p>
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
            <div className="text-2xl font-bold">{complaints.length}</div>
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
      {/* Complaints Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Complaints</CardTitle>
          <CardDescription>
            {complaints.length} complaint{complaints.length !== 1 ? "s" : ""}{" "}
            found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
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
                {complaints.map((complaint) => (
                  <TableRow key={complaint.id}>
                    <TableCell className="font-medium text-sm">
                      {complaint.title}
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
                      {reassigningRow === complaint.id ? (
                        <div className="flex flex-col gap-1 min-w-[180px]">
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
                          <Input
                            type="date"
                            className="w-full text-xs"
                            value={assigningDeadline}
                            onChange={(e) =>
                              setAssigningDeadline(e.target.value)
                            }
                            placeholder="Deadline (optional)"
                          />
                          <div className="flex gap-1 mt-1">
                            <Button
                              size="sm"
                              variant="default"
                              className="w-full text-xs"
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
                              className="w-full text-xs"
                              onClick={() => {
                                setReassigningRow(null);
                                setAssigningStaffId("");
                                setAssigningDeadline("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs dark:hover:text-blue-400"
                          onClick={() => handleAssignClick(complaint)}
                        >
                          {complaint.assignedStaff ? "Reassign" : "Assign"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
