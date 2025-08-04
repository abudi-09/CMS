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
import { AssignStaffModal } from "@/components/AssignStaffModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Complaint as BaseComplaint } from "@/components/ComplaintCard";

type Complaint = BaseComplaint & {
  evidence?: string;
  status: "Pending" | "In Progress" | "Resolved" | "Closed" | "Delayed";
};
import { useAuth } from "@/components/auth/AuthContext";
import { toast } from "@/hooks/use-toast";

// Mock complaints data
const mockComplaints: Complaint[] = [
  {
    id: "CMP-001",
    title: "Library computers are slow and outdated",
    description:
      "The computers in the main library are extremely slow and need upgrading.",
    category: "IT & Technology",
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
  const [complaints, setComplaints] = useState<Complaint[]>(mockComplaints);
  const [prioritySort, setPrioritySort] = useState<"asc" | "desc">("desc");
  const priorityOrder = { Critical: 4, High: 3, Medium: 2, Low: 1 };
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [assignmentFilter, setAssignmentFilter] = useState<string>("all");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null
  );
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [assigningStaffId, setAssigningStaffId] = useState<string>("");
  const [reassigning, setReassigning] = useState(false);

  const { getAllStaff } = useAuth();

  const handleAssignStaff = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setShowAssignModal(true);
  };

  const handleViewDetail = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setShowDetailModal(true);
    setAssigningStaffId("");
    setReassigning(false);
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

  // Filter complaints
  const filteredComplaints = complaints.filter((complaint) => {
    let filteredComplaints = complaints.filter((complaint) => {});
    // Sort by priority if enabled
    filteredComplaints = filteredComplaints.sort((a, b) => {
      const aP = priorityOrder[a.priority || "Medium"];
      const bP = priorityOrder[b.priority || "Medium"];
      return prioritySort === "asc" ? aP - bP : bP - aP;
    });
    const matchesSearch =
      complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.submittedBy.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || complaint.status === statusFilter;
    // Assignment filter
    const matchesAssignment =
      assignmentFilter === "all"
        ? true
        : assignmentFilter === "assigned"
        ? !!complaint.assignedStaff
        : !complaint.assignedStaff;

    const matchesPriority =
      priorityFilter === "all" ||
      (complaint.priority || "Medium") === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const unassignedCount = complaints.filter((c) => !c.assignedStaff).length;
  const assignedCount = complaints.filter((c) => c.assignedStaff).length;
  const categories = Array.from(new Set(complaints.map((c) => c.category)));
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 w-full">
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
            {/* Sort by Priority button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPrioritySort((s) => (s === "asc" ? "desc" : "asc"))
              }
              className="w-full h-10 flex items-center justify-center border rounded-md font-normal"
            >
              Sort by Priority {prioritySort === "asc" ? "↑" : "↓"}
            </Button>
            {/* Department dropdown */}
            <Select
              value={departmentFilter}
              onValueChange={setDepartmentFilter}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
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
                    className="dark:hover:bg-accent/10"
                  >
                    <TableCell className="font-medium text-sm">
                      <div>
                        <div className="font-semibold">{complaint.title}</div>
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
                        <span className="text-green-600">
                          {complaint.assignedStaff}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          Unassigned
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetail(complaint)}
                          className="text-xs dark:hover:text-blue-400"
                        >
                          View Detail
                        </Button>
                        {!complaint.assignedStaff && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAssignStaff(complaint)}
                            className="text-xs dark:hover:text-blue-400"
                          >
                            Assign
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
              <Card key={complaint.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm leading-tight">
                        {complaint.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Submitted by {complaint.submittedBy}
                      </p>
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
                      <span className="text-muted-foreground">
                        Assigned Staff:
                      </span>
                      <span
                        className={`font-medium ml-2 ${
                          complaint.assignedStaff
                            ? "text-green-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        {complaint.assignedStaff || "Unassigned"}
                      </span>
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
                    {!complaint.assignedStaff && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAssignStaff(complaint)}
                        className="w-full text-xs dark:hover:text-blue-400"
                      >
                        Assign Staff
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Assign Staff Modal */}
      <AssignStaffModal
        complaint={selectedComplaint}
        open={showAssignModal}
        onOpenChange={setShowAssignModal}
        onAssign={handleStaffAssignment}
      />

      {/* Complaint Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Complaint Details</DialogTitle>
          </DialogHeader>
          {selectedComplaint && (
            <div className="space-y-6">
              {/* Complaint Detail Section */}
              <div>
                <h2 className="font-semibold text-lg mb-2">
                  📝 {selectedComplaint.title}
                </h2>
                <p className="mb-2 text-muted-foreground">
                  {selectedComplaint.description}
                </p>
                {selectedComplaint.evidence && (
                  <div className="mb-2">
                    <span className="font-medium">📎 Evidence:</span>{" "}
                    {typeof selectedComplaint.evidence === "string" &&
                    selectedComplaint.evidence.match(
                      /\.(jpg|jpeg|png|gif)$/i
                    ) ? (
                      <img
                        src={selectedComplaint.evidence}
                        alt="Evidence"
                        className="max-h-40 mt-2 rounded"
                      />
                    ) : (
                      <a
                        href={selectedComplaint.evidence}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline"
                      >
                        Download Evidence
                      </a>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium">📍 Status:</span>
                  <Badge
                    className={`text-xs ${
                      statusColors[
                        selectedComplaint.status as keyof typeof statusColors
                      ]
                    }`}
                  >
                    {selectedComplaint.status}
                  </Badge>
                </div>
              </div>
              {/* Complaint Info Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/50 p-4 rounded">
                <div>
                  <span className="font-medium">👨‍🎓 Student Name:</span>
                  <span className="ml-2">{selectedComplaint.submittedBy}</span>
                </div>
                <div>
                  <span className="font-medium">📚 Category:</span>
                  <span className="ml-2">{selectedComplaint.category}</span>
                </div>
                <div>
                  <span className="font-medium">🚨 Priority:</span>
                  <span className="ml-2">
                    {selectedComplaint.priority || "Medium"}
                  </span>
                </div>
                <div>
                  <span className="font-medium">🗓️ Date Submitted:</span>
                  <span className="ml-2">
                    {selectedComplaint.submittedDate?.toLocaleDateString?.() ||
                      "-"}
                  </span>
                </div>
              </div>
              {/* Action Buttons */}
              <div className="pt-2">
                {!selectedComplaint.assignedStaff && !reassigning && (
                  <Button onClick={() => setReassigning(true)} className="mr-2">
                    ✅ Assign
                  </Button>
                )}
                {selectedComplaint.assignedStaff && !reassigning && (
                  <Button onClick={() => setReassigning(true)} className="mr-2">
                    🔁 Re-Assign
                  </Button>
                )}
                {reassigning && (
                  <div className="flex flex-col sm:flex-row gap-2 items-center mt-2">
                    <Label htmlFor="staff-select">Select Staff:</Label>
                    <Select
                      value={assigningStaffId}
                      onValueChange={setAssigningStaffId}
                    >
                      <SelectTrigger id="staff-select" className="w-48">
                        <SelectValue placeholder="Choose staff" />
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
                      onClick={() => {
                        if (selectedComplaint && assigningStaffId) {
                          handleStaffAssignment(
                            selectedComplaint.id,
                            assigningStaffId,
                            ""
                          );
                          setShowDetailModal(false);
                          setReassigning(false);
                          setAssigningStaffId("");
                        }
                      }}
                      disabled={!assigningStaffId}
                      className="ml-2"
                    >
                      Confirm
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setReassigning(false);
                        setAssigningStaffId("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
