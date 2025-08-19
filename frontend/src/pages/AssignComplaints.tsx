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
import type { Complaint as ModalComplaint } from "@/components/ComplaintCard";
import { useAuth } from "@/components/auth/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useState as useReactState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Complaint = {
  id: string;
  title: string;
  description: string;
  category: string;
  department?: string;
  status:
    | "Unassigned"
    | "Assigned"
    | "In Progress"
    | "Resolved"
    | "Closed"
    | "Overdue"
    | "Pending"
    | "Accepted"
    | "Rejected";
  submittedBy: string;
  assignedStaff?: string;
  assignedDate?: Date;
  submittedDate: Date;
  deadline?: Date;
  lastUpdated: Date;
  priority?: "Low" | "Medium" | "High" | "Critical";
  evidence?: string;
  resolutionNote?: string;
  feedback?: {
    rating: number;
    comment: string;
  };
};

const statusColors = {
  Pending: "bg-yellow-100 text-yellow-800",
  Accepted: "bg-blue-100 text-blue-800",
  "In Progress": "bg-blue-100 text-blue-800",
  Resolved: "bg-green-100 text-green-800",
  Closed: "bg-gray-100 text-gray-800",
  Rejected: "bg-red-100 text-red-800",
  Overdue: "bg-red-100 text-red-800",
};

export function AssignComplaints() {
  // State for deadline during assignment
  const [assigningDeadline, setAssigningDeadline] = useState<string>("");
  const { getAllStaff, user } = useAuth();
  const userName = user?.fullName || user?.name || "";
  const role = user?.role;
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
      department: "IT",
      priority: "High",
      status: "Pending",
      submittedBy: "John Doe",
      assignedStaff: undefined,
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
      assignedStaff: undefined,
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
      assignedStaff: undefined,
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
      assignedStaff: undefined,
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
      assignedStaff: undefined,
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
      assignedStaff: undefined,
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
      assignedStaff: undefined,
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
      assignedStaff: undefined,
      submittedDate: new Date("2024-01-25"),
      lastUpdated: new Date("2024-01-26"),
      deadline: new Date(now.getTime() + 8 * 86400000), // not overdue
    },
    {
      id: "ADM-011",
      title: "WiFi connectivity issues in dorms",
      description: "Students in Dorm A and B report frequent WiFi outages.",
      category: "IT & Technology",
      department: "IT",
      priority: "High",
      status: "Unassigned",
      submittedBy: "Alice Brown",
      assignedStaff: undefined,
      submittedDate: new Date("2024-01-27"),
      lastUpdated: new Date("2024-01-27"),
      deadline: new Date(now.getTime() + 2 * 86400000),
    },
    {
      id: "ADM-012",
      title: "Broken chairs in classroom C-101",
      description: "Several chairs are broken and unsafe for use.",
      category: "Facility",
      department: "Maintenance",
      priority: "Medium",
      status: "Unassigned",
      submittedBy: "Bob Lee",
      assignedStaff: undefined,
      submittedDate: new Date("2024-01-28"),
      lastUpdated: new Date("2024-01-28"),
      deadline: new Date(now.getTime() - 1 * 86400000), // overdue
    },
    {
      id: "ADM-013",
      title: "Late bus service",
      description: "Campus bus service is consistently late in the mornings.",
      category: "Transport",
      department: "Transport",
      priority: "Low",
      status: "Unassigned",
      submittedBy: "Chris Evans",
      assignedStaff: undefined,
      submittedDate: new Date("2024-01-29"),
      lastUpdated: new Date("2024-01-29"),
      deadline: new Date(now.getTime() + 4 * 86400000),
    },
    {
      id: "ADM-014",
      title: "Noisy construction near library",
      description:
        "Ongoing construction is disturbing students in the library.",
      category: "Facility",
      department: "Construction",
      priority: "Medium",
      status: "Unassigned",
      submittedBy: "Dana White",
      assignedStaff: undefined,
      submittedDate: new Date("2024-01-30"),
      lastUpdated: new Date("2024-01-30"),
      deadline: new Date(now.getTime() + 6 * 86400000),
    },
    {
      id: "ADM-015",
      title: "Cafeteria menu lacks vegetarian options",
      description:
        "Vegetarian students request more options in the cafeteria menu.",
      category: "Cafeteria",
      department: "Cafeteria",
      priority: "High",
      status: "Unassigned",
      submittedBy: "Eve Adams",
      assignedStaff: undefined,
      submittedDate: new Date("2024-01-31"),
      lastUpdated: new Date("2024-01-31"),
      deadline: new Date(now.getTime() - 2 * 86400000), // overdue
    },
    {
      id: "ADM-016",
      title: "Exam results delayed",
      description:
        "Final exam results for 3rd year students are not published yet.",
      category: "Academic",
      department: "Exams",
      priority: "Critical",
      status: "Unassigned",
      submittedBy: "Frank Miller",
      assignedStaff: undefined,
      submittedDate: new Date("2024-02-01"),
      lastUpdated: new Date("2024-02-01"),
      deadline: new Date(now.getTime() - 3 * 86400000), // overdue
    },
    {
      id: "ADM-017",
      title: "Sports equipment missing",
      description:
        "Several footballs and rackets are missing from the sports room.",
      category: "Sports",
      department: "Sports",
      priority: "Medium",
      status: "Unassigned",
      submittedBy: "Grace Hopper",
      assignedStaff: undefined,
      submittedDate: new Date("2024-02-02"),
      lastUpdated: new Date("2024-02-02"),
      deadline: new Date(now.getTime() + 5 * 86400000),
    },
    {
      id: "ADM-018",
      title: "Water leakage in hostel bathrooms",
      description: "Hostel B bathrooms have water leakage issues.",
      category: "Facility",
      department: "Maintenance",
      priority: "High",
      status: "Unassigned",
      submittedBy: "Henry Ford",
      assignedStaff: undefined,
      submittedDate: new Date("2024-02-03"),
      lastUpdated: new Date("2024-02-03"),
      deadline: new Date(now.getTime() + 1 * 86400000),
    },
    {
      id: "ADM-019",
      title: "Unhygienic restrooms",
      description: "Restrooms in Block D are not cleaned regularly.",
      category: "Facility",
      department: "Cleaning",
      priority: "Critical",
      status: "Unassigned",
      submittedBy: "Ivy Clark",
      assignedStaff: undefined,
      submittedDate: new Date("2024-02-04"),
      lastUpdated: new Date("2024-02-04"),
      deadline: new Date(now.getTime() - 1 * 86400000), // overdue
    },
    {
      id: "ADM-020",
      title: "No hand sanitizer in classrooms",
      description: "Hand sanitizer dispensers are empty in most classrooms.",
      category: "Facility",
      department: "Health & Safety",
      priority: "Low",
      status: "Unassigned",
      submittedBy: "Jack Black",
      assignedStaff: undefined,
      submittedDate: new Date("2024-02-05"),
      lastUpdated: new Date("2024-02-05"),
      deadline: new Date(now.getTime() + 3 * 86400000),
    },
  ];
  // Ensure all complaints have a department value
  const demoComplaintsWithDept = demoComplaints.map((c) => ({
    ...c,
    department: c.department || "General",
  }));
  const [complaints, setComplaints] = useReactState<Complaint[]>(
    demoComplaintsWithDept
  );
  // Backend fetch and polling removed for demo/testing. Only mock data is shown.

  const allComplaints = complaints;
  // Remove priority sort
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [overdueFilter, setOverdueFilter] = useState<string>("all"); // 'all' | 'overdue' | 'notOverdue'
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null
  );
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [assigningStaffId, setAssigningStaffId] = useState<string>("");
  const [reassigningRow, setReassigningRow] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "Pending" | "Accepted" | "Rejected"
  >("Pending");

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
    // Local-only update for demo/testing
    setComplaints((prev) =>
      prev.map((c) =>
        c.id === complaintId
          ? {
              ...c,
              assignedStaff: staff?.fullName || staff?.name || "Unknown",
              lastUpdated: new Date(),
              deadline: assigningDeadline
                ? new Date(assigningDeadline)
                : c.deadline,
              status: "Accepted",
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
          ? { ...c, status: "Rejected", lastUpdated: new Date() }
          : c
      )
    );
    toast({ title: "Rejected", description: "Complaint rejected." });
  };

  // Adapt local complaint shape to Modal's expected Complaint type
  const toModalComplaint = (c: Complaint): ModalComplaint => ({
    ...(c as unknown as ModalComplaint),
    status:
      c.status === "Accepted"
        ? "In Progress"
        : c.status === "Rejected"
        ? "Closed"
        : (c.status as ModalComplaint["status"]),
  });
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

  const matchesTab = (c: Complaint) => {
    if (activeTab === "Pending")
      return c.status === "Pending" || c.status === "Unassigned";
    if (activeTab === "Accepted")
      return (
        c.status === "Accepted" ||
        c.status === "Assigned" ||
        c.status === "In Progress"
      );
    if (activeTab === "Rejected") return c.status === "Rejected";
    return true;
  };

  const filteredComplaints = complaints
    .filter(matchesTab)
    .filter((c) =>
      [c.title, c.department, c.submittedBy]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    )
    .filter((c) =>
      priorityFilter === "all" ? true : c.priority === priorityFilter
    )
    .filter((c) =>
      overdueFilter === "all"
        ? true
        : overdueFilter === "overdue"
        ? isOverdue(c)
        : !isOverdue(c)
    );

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
            {/* Overdue filter dropdown */}
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
                  <TableHead className="text-sm">Department</TableHead>
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
                        {/* Role-based actions */}
                        {role === "admin" && (
                          <>
                            <Button
                              size="sm"
                              className="text-xs"
                              onClick={() => handleResolve(complaint.id)}
                            >
                              Resolve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="text-xs"
                              onClick={() => handleReject(complaint.id)}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {role === "staff" &&
                          complaint.assignedStaff === userName && (
                            <>
                              <Button
                                size="sm"
                                className="text-xs"
                                onClick={() => handleResolve(complaint.id)}
                              >
                                Resolve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="text-xs"
                                onClick={() => handleReject(complaint.id)}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        {(role === "dean" || role === "headOfDepartment") && (
                          <>
                            {/* Dean/HoD can resolve or reject directly */}
                            <Button
                              size="sm"
                              className="text-xs"
                              onClick={() => handleResolve(complaint.id)}
                            >
                              Resolve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="text-xs"
                              onClick={() => handleReject(complaint.id)}
                            >
                              Reject
                            </Button>
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
                                      .filter((s) =>
                                        role === "dean"
                                          ? s.role === "headOfDepartment"
                                          : s.role === "staff"
                                      )
                                      .map((staff) => (
                                        <SelectItem
                                          key={staff.id}
                                          value={staff.id}
                                        >
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
                                  disabled={
                                    !assigningStaffId || !assigningDeadline
                                  }
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
                                  {complaint.assignedStaff
                                    ? "Reassign"
                                    : "Assign"}
                                </Button>
                              )
                            )}
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
                          {complaint.assignedStaff}
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
                    {/* Role-based actions (mobile) */}
                    {role === "admin" && (
                      <>
                        <Button
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => handleResolve(complaint.id)}
                        >
                          Resolve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="w-full text-xs"
                          onClick={() => handleReject(complaint.id)}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {role === "staff" &&
                      complaint.assignedStaff === userName && (
                        <>
                          <Button
                            size="sm"
                            className="w-full text-xs"
                            onClick={() => handleResolve(complaint.id)}
                          >
                            Resolve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="w-full text-xs"
                            onClick={() => handleReject(complaint.id)}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    {(role === "dean" || role === "headOfDepartment") && (
                      <>
                        <Button
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => handleResolve(complaint.id)}
                        >
                          Resolve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="w-full text-xs"
                          onClick={() => handleReject(complaint.id)}
                        >
                          Reject
                        </Button>
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
                                  .filter((s) =>
                                    role === "dean"
                                      ? s.role === "headOfDepartment"
                                      : s.role === "staff"
                                  )
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
                              onChange={(e) =>
                                setAssigningDeadline(e.target.value)
                              }
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
                          (!complaint.assignedStaff ||
                            isOverdue(complaint)) && (
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
                      </>
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
          complaint={toModalComplaint(selectedComplaint)}
          open={showDetailModal}
          onOpenChange={setShowDetailModal}
          // Pass deadline to modal as prop
        />
      )}
      {/* No action buttons below modal; all assignment actions are now side by side with View Detail in the table */}
    </div>
  );
}
// polling removed in demo mode
