import { useEffect, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
// Use ComplaintType for all references to Complaint

const statusColors = {
  Pending: "bg-yellow-100 text-yellow-800",
  "In Progress": "bg-blue-100 text-blue-800",
  Resolved: "bg-green-100 text-green-800",
  Closed: "bg-gray-100 text-gray-800",
  Delayed: "bg-red-100 text-red-800",
};

export function DeanAssignComplaints() {
  // State for deadline during assignment
  const [assigningDeadline, setAssigningDeadline] = useState<string>("");
  const { getAllStaff, user } = useAuth();
  const role = user?.role;
  // Pagination state
  const [page, setPage] = useState(1);
  const pageSize = 5;
  // Diverse mock complaints for demo/testing
  // At least half of complaints are overdue (deadline in the past)
  const now = new Date();
  const demoComplaints: ComplaintType[] = [
    {
      id: "DEAN-001",
      title: "Departmental equipment request overdue",
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
      id: "DEAN-002",
      title: "Faculty leave request delayed",
      description: "Leave request for faculty not processed in time.",
      category: "HR",
      priority: "Medium",
      // Accepted by Dean: shows under Accepted tab
      status: "In Progress",
      submittedBy: "Faculty Member",
      assignedStaff: "Dean",
      assignedStaffRole: "dean",
      submittedDate: new Date("2024-02-01"),
      lastUpdated: new Date("2024-02-05"),
      deadline: new Date(now.getTime() + 3 * 86400000), // not overdue
    },
    {
      id: "DEAN-003",
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
      id: "DEAN-004",
      title: "Student feedback on course content",
      description: "Students report outdated syllabus in core course.",
      category: "Academic",
      priority: "Low",
      // Rejected: shows under Rejected tab
      status: "Closed",
      submittedBy: "Student Council",
      assignedStaff: "Course Coordinator",
      submittedDate: new Date("2024-04-01"),
      lastUpdated: new Date("2024-04-10"),
      deadline: new Date(now.getTime() + 10 * 86400000), // not overdue
    },
    {
      id: "DEAN-005",
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
      id: "DEAN-006",
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
      id: "DEAN-007",
      title: "Edge case: No description",
      description: "",
      category: "Other",
      priority: "Low",
      // Assigned to HoD: shows under Assigned tab
      status: "In Progress",
      submittedBy: "Edge Case",
      assignedStaff: "HoD Support",
      assignedStaffRole: "headOfDepartment",
      submittedDate: new Date("2024-07-18"),
      lastUpdated: new Date("2024-07-18"),
      deadline: new Date(now.getTime() + 10 * 86400000), // not overdue
    },
    {
      id: "DEAN-008",
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
      id: "DEAN-009",
      title: "Faculty training session overdue",
      description: "Mandatory training session for faculty not scheduled.",
      category: "HR",
      priority: "High",
      // Assigned to HoD and overdue
      status: "In Progress",
      submittedBy: "HR Dept",
      assignedStaff: "Training Coordinator",
      assignedStaffRole: "headOfDepartment",
      submittedDate: new Date("2024-08-01"),
      lastUpdated: new Date("2024-08-03"),
      deadline: new Date(now.getTime() - 4 * 86400000), // overdue
    },
    {
      id: "DEAN-010",
      title: "Printer out of service",
      description: "Printer in Dean's office is out of service.",
      category: "IT & Technology",
      priority: "Low",
      // Assigned to HoD (not overdue)
      status: "Assigned",
      submittedBy: "Office Staff",
      assignedStaff: "IT Support Team",
      assignedStaffRole: "headOfDepartment",
      submittedDate: new Date("2024-08-05"),
      lastUpdated: new Date("2024-08-06"),
      deadline: new Date(now.getTime() + 8 * 86400000), // not overdue
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
  // Reset page when filters/tab change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, priorityFilter, overdueFilter, activeTab]);
  // Accept flow state
  const [acceptTarget, setAcceptTarget] = useState<ComplaintType | null>(null);
  const [acceptNote, setAcceptNote] = useState("");
  const [accepting, setAccepting] = useState(false);
  // Bulk accept state
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkNote, setBulkNote] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
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
              assignedStaffRole: "headOfDepartment",
              assignedByRole: "dean",
              assignmentPath: Array.isArray(c.assignmentPath)
                ? Array.from(
                    new Set([
                      ...(c.assignmentPath || []),
                      "dean",
                      "headOfDepartment",
                    ])
                  )
                : ["dean", "headOfDepartment"],
              lastUpdated: new Date(),
              deadline: assigningDeadline
                ? new Date(assigningDeadline)
                : c.deadline,
              // Dean "accepts" -> use "In Progress" to stay within ComplaintType
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
    // Deprecated on this page: resolved items should not be managed here
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
      "Dean";
    setComplaints((prev) =>
      prev.map((c) =>
        c.id === complaintId
          ? {
              ...c,
              status: "In Progress",
              assignedStaff: assignee,
              assignedStaffRole: "dean",
              lastUpdated: new Date(),
            }
          : c
      )
    );
    toast({ title: "Re-approved", description: "Moved back to Accepted." });
  };

  const handleModalUpdate = (
    complaintId: string,
    updates: Partial<ComplaintType>
  ) => {
    setComplaints((prev) =>
      prev.map((c) => (c.id === complaintId ? { ...c, ...updates } : c))
    );
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

  const matchesTab = (c: ComplaintType) => {
    if (activeTab === "Pending")
      return (
        (c.status === "Pending" || c.status === "Unassigned") &&
        !c.assignedStaffRole
      );
    if (activeTab === "Accepted")
      return c.status === "In Progress" && c.assignedStaffRole === "dean";
    if (activeTab === "Assigned")
      return (
        (c.status === "In Progress" || c.status === "Assigned") &&
        c.assignedStaffRole === "headOfDepartment"
      );
    if (activeTab === "Rejected") return c.status === "Closed";
    return false; // exclude other statuses like Resolved entirely
  };
  const filteredComplaints = complaints
    .filter(matchesTab)
    // ensure resolved never shows regardless of tab/filter
    .filter((c) => c.status !== "Resolved")
    .filter((complaint) => {
      const matchesSearch =
        complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.submittedBy.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPriority =
        priorityFilter === "all" ||
        (complaint.priority || "Medium") === priorityFilter;
      const matchesOverdue =
        overdueFilter === "all"
          ? true
          : overdueFilter === "overdue"
          ? isOverdue(complaint)
          : !isOverdue(complaint);
      return matchesSearch && matchesPriority && matchesOverdue;
    });

  // Pagination calculations
  const totalPages = Math.max(
    1,
    Math.ceil(filteredComplaints.length / pageSize)
  );
  const startIndex = (page - 1) * pageSize;
  const paginatedComplaints = filteredComplaints.slice(
    startIndex,
    startIndex + pageSize
  );

  // Clamp page if filtered size shrinks
  useEffect(() => {
    const newTotal = Math.max(
      1,
      Math.ceil(filteredComplaints.length / pageSize)
    );
    if (page > newTotal) setPage(newTotal);
  }, [filteredComplaints.length, page]);

  const getPageNumbers = (tp: number, current: number): (number | "...")[] => {
    if (tp <= 7) return Array.from({ length: tp }, (_, i) => i + 1);
    const pages: (number | "...")[] = [1];
    const left = Math.max(2, current - 1);
    const right = Math.min(tp - 1, current + 1);
    if (left > 2) pages.push("...");
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < tp - 1) pages.push("...");
    pages.push(tp);
    return pages;
  };

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
      <div>
        <h1 className="text-3xl font-bold">
          Assign & Reassign Complaints (Dean)
        </h1>
        <p className="text-muted-foreground">
          Manage staff assignments for complaints in your department
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
          {/* Desktop Table */}
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
                  <TableHead className="text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span>Actions</span>
                      {activeTab === "Pending" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setBulkOpen(true)}
                        >
                          Accept All
                        </Button>
                      )}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedComplaints.map((complaint) => (
                  <TableRow key={complaint.id}>
                    <TableCell className="font-medium text-sm">
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          {complaint.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Submitted by {complaint.submittedBy}
                        </div>
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
                        {/* Dean can accept to solve, resolve, reject, and assign to HoD */}
                        {!complaint.assignedStaff &&
                          (complaint.status === "Pending" ||
                            complaint.status === "Unassigned") && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="text-xs"
                              onClick={() => {
                                setAcceptTarget(complaint);
                                setAcceptNote("");
                              }}
                            >
                              Accept
                            </Button>
                          )}
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
                          <>
                            <Select
                              value={assigningStaffId}
                              onValueChange={setAssigningStaffId}
                            >
                              <SelectTrigger className="w-40 text-xs">
                                <SelectValue placeholder="Select assignee" />
                              </SelectTrigger>
                              <SelectContent>
                                {getAllStaff()
                                  .filter((s) => s.role === "headOfDepartment")
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
                          </>
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
          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {paginatedComplaints.map((complaint) => (
              <Card key={complaint.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm leading-tight flex items-center gap-2">
                        {complaint.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Submitted by {complaint.submittedBy}
                      </p>
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
                    {/* Dean actions on mobile */}
                    {!complaint.assignedStaff &&
                      (complaint.status === "Pending" ||
                        complaint.status === "Unassigned") && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="w-full text-xs"
                          onClick={() => {
                            setAcceptTarget(complaint);
                            setAcceptNote("");
                          }}
                        >
                          Accept
                        </Button>
                      )}
                    {activeTab === "Rejected" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full text-xs"
                        onClick={() => handleReapprove(complaint.id)}
                      >
                        Re-approve
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="w-full text-xs"
                        onClick={() => handleReject(complaint.id)}
                      >
                        Reject
                      </Button>
                    )}
                    {reassigningRow === complaint.id ? (
                      <>
                        <Select
                          value={assigningStaffId}
                          onValueChange={setAssigningStaffId}
                        >
                          <SelectTrigger className="w-full text-xs">
                            <SelectValue placeholder="Select assignee" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAllStaff()
                              .filter((s) => s.role === "headOfDepartment")
                              .map((staff) => (
                                <SelectItem key={staff.id} value={staff.id}>
                                  {staff.fullName || staff.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="date"
                          className="w-full text-xs mt-1"
                          value={assigningDeadline}
                          onChange={(e) => setAssigningDeadline(e.target.value)}
                          required
                        />
                        <Button
                          size="sm"
                          variant="default"
                          className="w-full text-xs mt-1"
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
                          className="w-full text-xs mt-1"
                          onClick={() => {
                            setReassigningRow(null);
                            setAssigningStaffId("");
                            setAssigningDeadline("");
                          }}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      (!complaint.assignedStaff || isOverdue(complaint)) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs dark:hover:text-blue-400"
                          onClick={() => handleAssignClick(complaint)}
                        >
                          {complaint.assignedStaff ? "Reassign" : "Assign"}
                        </Button>
                      )
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
        {/* Pagination controls */}
        <div className="flex items-center justify-between px-6 pb-4 pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <div className="hidden sm:flex items-center gap-1">
            {getPageNumbers(totalPages, page).map((p, idx) =>
              p === "..." ? (
                <span key={idx} className="px-2 text-sm text-muted-foreground">
                  ...
                </span>
              ) : (
                <Button
                  key={p as number}
                  size="sm"
                  variant={p === page ? "default" : "outline"}
                  onClick={() => setPage(p as number)}
                >
                  {p}
                </Button>
              )
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || filteredComplaints.length === 0}
          >
            Next
          </Button>
        </div>
      </Card>
      {/* Role-based Complaint Modal for View Detail */}
      {selectedComplaint && (
        <RoleBasedComplaintModal
          complaint={selectedComplaint}
          open={showDetailModal}
          onOpenChange={setShowDetailModal}
          onUpdate={handleModalUpdate}
          fetchLatest={false}
        />
      )}

      {/* Accept modal: dean accepts to solve with optional note */}
      <Dialog
        open={!!acceptTarget}
        onOpenChange={(open) => {
          if (!open) {
            setAcceptTarget(null);
            setAcceptNote("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept complaint to solve</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              You are accepting this complaint. Status will change to "In
              Progress" and it will be assigned to you.
            </p>
            <Textarea
              placeholder="Optional note visible to the user..."
              value={acceptNote}
              onChange={(e) => setAcceptNote(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setAcceptTarget(null);
                setAcceptNote("");
              }}
              disabled={accepting}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!acceptTarget) return;
                setAccepting(true);
                const assignee =
                  (user?.fullName as string) ||
                  (user?.name as string) ||
                  (user?.email as string) ||
                  "Dean";
                setComplaints((prev) =>
                  prev.map((c) =>
                    c.id === acceptTarget.id
                      ? {
                          ...c,
                          status: "In Progress",
                          assignedStaff: assignee,
                          assignedStaffRole: "dean",
                          resolutionNote: acceptNote || c.resolutionNote,
                          lastUpdated: new Date(),
                        }
                      : c
                  )
                );
                toast({
                  title: "Accepted",
                  description: "Complaint assigned to you and set In Progress.",
                });
                setAccepting(false);
                setAcceptTarget(null);
                setAcceptNote("");
              }}
              disabled={accepting}
            >
              Confirm Accept
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Accept modal */}
      <Dialog
        open={bulkOpen}
        onOpenChange={(open) => {
          if (!open) {
            setBulkOpen(false);
            setBulkNote("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept all visible pending complaints</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              All currently visible Pending/Unassigned complaints will be set to
              "In Progress" and assigned to you.
            </p>
            <Textarea
              placeholder="Optional note applied to all..."
              value={bulkNote}
              onChange={(e) => setBulkNote(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setBulkOpen(false);
                setBulkNote("");
              }}
              disabled={bulkLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setBulkLoading(true);
                const assignee =
                  (user?.fullName as string) ||
                  (user?.name as string) ||
                  (user?.email as string) ||
                  "Dean";
                // Limit bulk accept to items visible on the current page
                const start = (page - 1) * pageSize;
                const idsOnPage = filteredComplaints
                  .slice(start, start + pageSize)
                  .map((c) => c.id);
                setComplaints((prev) => {
                  const passesSearch = (c: ComplaintType) =>
                    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    c.category
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase()) ||
                    c.submittedBy
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase());
                  const passesPriority = (c: ComplaintType) =>
                    priorityFilter === "all" ||
                    (c.priority || "Medium") === priorityFilter;
                  const passesOverdue = (c: ComplaintType) =>
                    overdueFilter === "all"
                      ? true
                      : overdueFilter === "overdue"
                      ? isOverdue(c)
                      : !isOverdue(c);
                  return prev.map((c) => {
                    const isPendingUnassigned =
                      (c.status === "Pending" || c.status === "Unassigned") &&
                      !c.assignedStaff;
                    const isVisible =
                      activeTab === "Pending" &&
                      isPendingUnassigned &&
                      passesSearch(c) &&
                      passesPriority(c) &&
                      passesOverdue(c) &&
                      idsOnPage.includes(c.id);
                    if (!isVisible) return c;
                    return {
                      ...c,
                      status: "In Progress",
                      assignedStaff: assignee,
                      resolutionNote: bulkNote || c.resolutionNote,
                      lastUpdated: new Date(),
                    };
                  });
                });
                setBulkLoading(false);
                setBulkOpen(false);
                setBulkNote("");
                toast({
                  title: "Accepted",
                  description: "All visible pending complaints accepted.",
                });
              }}
              disabled={bulkLoading}
            >
              Confirm Accept All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
