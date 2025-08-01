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
import { Complaint } from "@/components/ComplaintCard";
import { useAuth } from "@/components/auth/AuthContext";
import { toast } from "@/hooks/use-toast";

// Mock complaints data
const mockComplaints: Complaint[] = [
  {
    id: "CMP-001",
    title: "Library computers are slow and outdated",
    description:
      "The computers in the main library are extremely slow and need upgrading.",
    department: "IT & Technology",
    status: "In Progress",
    submittedBy: "John Doe",
    assignedStaff: "IT Support Team",
    submittedDate: new Date("2024-01-15"),
    lastUpdated: new Date("2024-01-18"),
  },
  {
    id: "CMP-003",
    title: "Broken air conditioning in lecture hall",
    description:
      "The air conditioning in lecture hall B-204 has been broken for over a week.",
    department: "Infrastructure & Facilities",
    status: "Pending",
    submittedBy: "Mike Johnson",
    assignedStaff: undefined,
    submittedDate: new Date("2024-01-22"),
    lastUpdated: new Date("2024-01-22"),
  },
  {
    id: "CMP-004",
    title: "Classroom projector not working",
    description:
      "The projector in room C-305 has been malfunctioning for the past week.",
    department: "IT & Technology",
    status: "Pending",
    submittedBy: "Sarah Johnson",
    assignedStaff: undefined,
    submittedDate: new Date("2024-01-20"),
    lastUpdated: new Date("2024-01-20"),
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
  const [prioritySort, setPrioritySort] = useState<"asc" | "desc">("desc");
  const priorityOrder = { Critical: 4, High: 3, Medium: 2, Low: 1 };
  const [complaints, setComplaints] = useState<Complaint[]>(mockComplaints);
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null
  );
  const [showAssignModal, setShowAssignModal] = useState(false);

  const { getAllStaff } = useAuth();

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
      complaint.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.submittedBy.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || complaint.status === statusFilter;

    const matchesPriority =
      priorityFilter === "all" ||
      (complaint.priority || "Medium") === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const unassignedCount = complaints.filter((c) => !c.assignedStaff).length;
  const assignedCount = complaints.filter((c) => c.assignedStaff).length;
  const departments = Array.from(new Set(complaints.map((c) => c.department)));
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
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
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
                  <TableHead className="text-sm">
                    <div className="flex items-center gap-1">
                      Priority
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setPrioritySort((s) => (s === "asc" ? "desc" : "asc"))
                        }
                      >
                        {prioritySort === "asc" ? "↑" : "↓"}
                      </Button>
                    </div>
                  </TableHead>
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
                      {complaint.department}
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAssignStaff(complaint)}
                        className="text-xs dark:hover:text-blue-400"
                      >
                        {complaint.assignedStaff ? "Reassign" : "Assign"}
                      </Button>
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
                      <span className="text-muted-foreground">Department:</span>
                      <span className="font-medium ml-2">
                        {complaint.department}
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

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAssignStaff(complaint)}
                    className="w-full text-xs dark:hover:text-blue-400"
                  >
                    {complaint.assignedStaff
                      ? "Reassign Staff"
                      : "Assign Staff"}
                  </Button>
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
    </div>
  );
}
