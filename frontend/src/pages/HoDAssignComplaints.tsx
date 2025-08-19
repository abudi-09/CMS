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
import { RoleBasedComplaintModal } from "@/components/RoleBasedComplaintModal";
import { useAuth } from "@/components/auth/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useState as useReactState } from "react";
import { Complaint as ComplaintType } from "@/components/ComplaintCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Use ComplaintType for all references to Complaint

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
  const { getAllStaff, user } = useAuth();
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
      assignedStaffRole: "staff",
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
      status: "In Progress",
      submittedBy: "Edge Case",
      assignedStaff: "Support",
      assignedStaffRole: "staff",
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
      status: "In Progress",
      submittedBy: "HR Dept",
      assignedStaff: "Training Coordinator",
      assignedStaffRole: "staff",
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
      status: "Assigned",
      submittedBy: "Office Staff",
      assignedStaff: "IT Support Team",
      assignedStaffRole: "staff",
      submittedDate: new Date("2024-08-05"),
      lastUpdated: new Date("2024-08-06"),
      deadline: new Date(now.getTime() + 8 * 86400000), // not overdue
    },
    {
      id: "HOD-011",
      title: "HoD accepted: Classroom equipment audit",
      description: "Audit required for classroom equipment inventory.",
      category: "Academic",
      priority: "Medium",
      status: "In Progress",
      submittedBy: "Dean Office",
      assignedStaff: "Head of Department - IT",
      assignedStaffRole: "headOfDepartment",
      submittedDate: new Date("2024-08-08"),
      lastUpdated: new Date("2024-08-09"),
      deadline: new Date(now.getTime() + 6 * 86400000), // not overdue
    },
    {
      id: "HOD-012",
      title: "HoD accepted: Lab safety compliance",
      description: "Update lab safety compliance documentation.",
      category: "Facility",
      priority: "High",
      status: "In Progress",
      submittedBy: "Safety Committee",
      assignedStaff: "Head of Department - IT",
      assignedStaffRole: "headOfDepartment",
      submittedDate: new Date("2024-08-06"),
      lastUpdated: new Date("2024-08-07"),
      deadline: new Date(now.getTime() + 2 * 86400000), // not overdue
    },
  ];
  const [complaints, setComplaints] =
    useReactState<ComplaintType[]>(demoComplaints);
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [overdueFilter, setOverdueFilter] = useState<string>("all");
  const [selectedComplaint, setSelectedComplaint] =
    useState<ComplaintType | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [assigningStaffId, setAssigningStaffId] = useState<string>("");
  const [reassigningRow, setReassigningRow] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "Pending" | "Accepted" | "Assigned" | "Rejected"
  >("Pending");
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
  const handleStaffAssignment = (complaintId: string, staffId: string) => {
    const staff = getAllStaff().find((s) => s.id === staffId);
    setComplaints((prev) =>
      prev.map((c) =>
        c.id === complaintId
          ? {
              ...c,
              assignedStaff: staff?.fullName || staff?.name || "Unknown",
              assignedStaffRole: "staff",
              lastUpdated: new Date(),
              deadline: assigningDeadline
                ? new Date(assigningDeadline)
                : c.deadline,
              status:
                c.status === "Unassigned" || c.status === "Pending"
                  ? "In Progress"
                  : c.status,
            }
          : c
      )
    );
    toast({
      title: "Assigned",
      description: `Assigned to ${staff?.fullName || staff?.name}${
        assigningDeadline
          ? `, deadline ${new Date(assigningDeadline).toLocaleDateString()}`
          : ""
      }`,
    });
    setReassigningRow(null);
    setAssigningStaffId("");
    setAssigningDeadline("");
  };

  const handleResolve = (complaintId: string) => {
    setComplaints((prev) =>
      prev.map((c) =>
        c.id === complaintId
          ? { ...c, status: "Resolved", lastUpdated: new Date() }
          : c
      )
    );
    toast({ title: "Resolved", description: "Complaint marked as resolved." });
  };

  const handleReject = (complaintId: string) => {
    setComplaints((prev) =>
      prev.map((c) =>
        c.id === complaintId
          ? { ...c, status: "Closed", lastUpdated: new Date() }
          : c
      )
    );
    toast({ title: "Rejected", description: "Complaint rejected and closed." });
  };

  const handleReapprove = (complaintId: string) => {
    const assignee =
      (user?.fullName as string) ||
      (user?.name as string) ||
      (user?.email as string) ||
      "Head of Department";
    setComplaints((prev) =>
      prev.map((c) =>
        c.id === complaintId
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
    toast({
      title: "Re-approved",
      description: "Complaint moved back to Accepted.",
    });
  };

  const isOverdue = (complaint: ComplaintType) => {
    // Pending or Unassigned items with no assignee should not be marked overdue
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

  // Calculate summary stats
  const unassignedCount = complaints.filter((c) => !c.assignedStaff).length;
  const assignedCount = complaints.filter((c) => c.assignedStaff).length;
  const priorityColors = {
    Low: "bg-gray-200 text-gray-700 border-gray-300",
    Medium: "bg-blue-100 text-blue-800 border-blue-200",
    High: "bg-orange-100 text-orange-800 border-orange-200",
    Critical: "bg-red-100 text-red-800 border-red-200 font-bold border-2",
  };

  const matchesTab = (c: ComplaintType) => {
    if (activeTab === "Pending")
      return (
        (c.status === "Pending" || c.status === "Unassigned") &&
        !c.assignedStaffRole &&
        !c.assignedStaff
      );
    if (activeTab === "Accepted")
      return (
        c.status === "In Progress" && c.assignedStaffRole === "headOfDepartment"
      );
    if (activeTab === "Assigned")
      return (
        (c.status === "In Progress" || c.status === "Assigned") &&
        c.assignedStaffRole === "staff"
      );
    if (activeTab === "Rejected") return c.status === "Closed";
    return false;
  };

  const filteredComplaints = complaints
    .filter(matchesTab)
    .filter((c) => c.status !== "Resolved")
    .filter((c) =>
      [c.title, c.category, c.submittedBy]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    )
    .filter((c) =>
      priorityFilter === "all"
        ? true
        : (c.priority || "Medium") === priorityFilter
    )
    .filter((c) =>
      overdueFilter === "all"
        ? true
        : overdueFilter === "overdue"
        ? isOverdue(c)
        : !isOverdue(c)
    );

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
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, department, or submitter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
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
            <Select value={overdueFilter} onValueChange={setOverdueFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by overdue" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All complaints</SelectItem>
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
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle>Complaints</CardTitle>
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as typeof activeTab)}
            >
              <TabsList>
                <TabsTrigger value="Pending">Pending</TabsTrigger>
                <TabsTrigger value="Accepted">Accepted</TabsTrigger>
                <TabsTrigger value="Assigned">Assigned</TabsTrigger>
                <TabsTrigger value="Rejected">Rejected</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <CardDescription>
            {filteredComplaints.length} complaint
            {filteredComplaints.length !== 1 ? "s" : ""} found
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
                  <TableHead className="text-sm">Assignee</TableHead>
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
                          {complaint.assignedStaff}
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
                      <div className="flex gap-2 items-center flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetail(complaint)}
                          className="text-xs dark:hover:text-blue-400"
                        >
                          View Detail
                        </Button>
                        {/* HoD can accept to handle, resolve/reject, and assign to staff */}
                        {(complaint.status === "Pending" ||
                          complaint.status === "Unassigned") &&
                          !complaint.assignedStaffRole && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="text-xs"
                              onClick={() => {
                                const assignee =
                                  (user?.fullName as string) ||
                                  (user?.name as string) ||
                                  (user?.email as string) ||
                                  "Head of Department";
                                setComplaints((prev) =>
                                  prev.map((c) =>
                                    c.id === complaint.id
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
                                toast({
                                  title: "Accepted",
                                  description:
                                    "Complaint set In Progress and assigned to you.",
                                });
                              }}
                            >
                              Accept
                            </Button>
                          )}
                        {/* Resolve action removed: resolved complaints should not be managed here */}
                        {activeTab === "Rejected" ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="text-xs"
                            onClick={() => handleReapprove(complaint.id)}
                          >
                            Re-approve
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="text-xs"
                            onClick={() => handleReject(complaint.id)}
                          >
                            Reject
                          </Button>
                        )}
                        {reassigningRow === complaint.id ? (
                          <div className="flex gap-2 items-center">
                            <Select
                              value={assigningStaffId}
                              onValueChange={setAssigningStaffId}
                            >
                              <SelectTrigger className="w-40 text-xs">
                                <SelectValue placeholder="Select staff" />
                              </SelectTrigger>
                              <SelectContent>
                                {getAllStaff()
                                  .filter((s) => s.role === "staff")
                                  .filter((s) => {
                                    const deptPref = (
                                      user?.department || "IT"
                                    ).toLowerCase();
                                    return (s.department || "")
                                      .toLowerCase()
                                      .includes(deptPref);
                                  })
                                  .map((staff) => (
                                    <SelectItem key={staff.id} value={staff.id}>
                                      {staff.fullName || staff.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <Input
                              type="date"
                              className="w-36 text-xs"
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
                                setAssigningDeadline("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          (!complaint.assignedStaff ||
                            isOverdue(complaint)) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs dark:hover:text-blue-400"
                              onClick={() => handleAssignClick(complaint)}
                            >
                              {complaint.assignedStaff ? "Reassign" : "Assign"}
                            </Button>
                          )
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {/* Role-based Complaint Modal for View Detail */}
      {selectedComplaint && (
        <RoleBasedComplaintModal
          complaint={selectedComplaint}
          open={showDetailModal}
          onOpenChange={setShowDetailModal}
        />
      )}
    </div>
  );
}
