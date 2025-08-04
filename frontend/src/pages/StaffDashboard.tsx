import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Eye,
  Settings,
  Clock,
  AlertCircle,
  CheckCircle,
  FileText,
  User,
  Search,
  Filter,
} from "lucide-react";
import { ComplaintDetailModal } from "@/components/ComplaintDetailModal";
import { StatusUpdateModal } from "@/components/StatusUpdateModal";
import { Complaint } from "@/components/ComplaintCard";
import { toast } from "@/hooks/use-toast";

// Mock data for staff - showing only assigned complaints
const mockStaffComplaints: Complaint[] = [
  {
    id: "CMP-001",
    title: "Library computers are slow and outdated",
    description:
      "The computers in the main library are extremely slow and need upgrading. Students are waiting long times to access resources for research and assignments. This is affecting productivity significantly.",
    category: "IT & Technology",
    status: "In Progress",
    submittedBy: "John Doe",
    assignedStaff: "IT Support Team",
    submittedDate: new Date("2024-01-15"),
    lastUpdated: new Date("2024-01-18"),
  },
  {
    id: "CMP-004",
    title: "Classroom projector not working",
    description:
      "The projector in room C-305 has been malfunctioning for the past week. Teachers are unable to present slides and conduct effective lectures.",
    category: "IT & Technology",
    status: "Pending",
    submittedBy: "Sarah Johnson",
    assignedStaff: "IT Support Team",
    submittedDate: new Date("2024-01-20"),
    lastUpdated: new Date("2024-01-20"),
  },
  {
    id: "CMP-006",
    title: "Network connectivity issues in lab",
    description:
      "The computer lab on the 3rd floor has been experiencing intermittent internet connectivity issues. Students can't access online resources for their assignments.",
    category: "IT & Technology",
    status: "Resolved",
    submittedBy: "Mike Wilson",
    assignedStaff: "IT Support Team",
    submittedDate: new Date("2024-01-12"),
    lastUpdated: new Date("2024-01-19"),
  },
];

export function StaffDashboard() {
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null
  );
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [complaints, setComplaints] =
    useState<Complaint[]>(mockStaffComplaints);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

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
    setComplaints((prev) =>
      prev.map((c) =>
        c.id === complaintId
          ? {
              ...c,
              status: newStatus as Complaint["status"],
              lastUpdated: new Date(),
            }
          : c
      )
    );

    toast({
      title: "Status Updated",
      description: `Complaint #${complaintId} has been updated to ${newStatus}`,
    });
  };

  // Calculate stats for summary cards
  const stats = {
    assigned: complaints.length,
    pending: complaints.filter((c) => c.status === "Pending").length,
    inProgress: complaints.filter((c) => c.status === "In Progress").length,
    resolved: complaints.filter((c) => c.status === "Resolved").length,
  };

  // Filter complaints based on search and status
  const filteredComplaints = complaints.filter((complaint) => {
    const matchesSearch =
      complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "All" || complaint.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusColors = {
    Pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    "In Progress": "bg-blue-100 text-blue-800 border-blue-200",
    Resolved: "bg-green-100 text-green-800 border-green-200",
    Closed: "bg-gray-100 text-gray-800 border-gray-200",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Staff Dashboard
        </h1>
        <p className="text-muted-foreground">
          Manage your assigned complaints efficiently
        </p>
      </div>

      {/* Enhanced Summary Cards - Responsive grid */}
      <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        <Card className="hover:shadow-md transition-shadow p-2 sm:p-4 w-full min-w-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2 w-full">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Assigned Complaints
            </CardTitle>
            <div className="bg-blue-50 p-2 rounded-lg">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="w-full">
            <div className="text-xl sm:text-2xl font-bold">
              {stats.assigned}
            </div>
            <p className="text-xs text-muted-foreground">
              Total assigned to you
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow p-2 sm:p-4 w-full min-w-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2 w-full">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
            <div className="bg-yellow-50 p-2 rounded-lg">
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent className="w-full">
            <div className="text-xl sm:text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting action</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow p-2 sm:p-4 w-full min-w-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2 w-full">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              In Progress
            </CardTitle>
            <div className="bg-blue-50 p-2 rounded-lg">
              <AlertCircle className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="w-full">
            <div className="text-xl sm:text-2xl font-bold">
              {stats.inProgress}
            </div>
            <p className="text-xs text-muted-foreground">Currently working</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow p-2 sm:p-4 w-full min-w-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2 w-full">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Resolved
            </CardTitle>
            <div className="bg-green-50 p-2 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="w-full">
            <div className="text-xl sm:text-2xl font-bold">
              {stats.resolved}
            </div>
            <p className="text-xs text-muted-foreground">
              Successfully completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* My Assigned Complaints Section */}
      <Card className="p-1 sm:p-4">
        <CardHeader className="p-1 sm:p-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <FileText className="h-5 w-5" />
            My Assigned Complaints
          </CardTitle>
          {/* Search and Filter Controls - improved for mobile */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4 pt-2 sm:pt-4">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 sm:pl-10 py-1.5 sm:py-2 text-xs sm:text-sm"
              />
            </div>
            <div className="flex items-center gap-1 sm:gap-2 min-w-0 sm:min-w-[200px] w-full sm:w-auto">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-auto text-xs sm:text-sm py-1.5 sm:py-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Status</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Responsive: Table on md+, cards on mobile */}
          <div className="hidden md:block rounded-md border overflow-x-auto p-0 sm:p-2">
            <Table className="min-w-0 sm:min-w-[700px] text-xs sm:text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date Assigned</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredComplaints.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {searchTerm || statusFilter !== "All"
                        ? "No complaints match your search criteria"
                        : "No complaints assigned to you yet"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredComplaints.map((complaint) => (
                    <TableRow key={complaint.id} className="hover:bg-muted/50">
                      <TableCell className="max-w-[120px] sm:max-w-xs">
                        <div className="font-medium truncate text-xs sm:text-sm">
                          {complaint.title}
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground truncate">
                          {complaint.description.substring(0, 40)}...
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="text-[10px] sm:text-xs"
                        >
                          {complaint.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-xs sm:text-sm">
                            {complaint.submittedBy}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            statusColors[complaint.status] +
                            " text-[10px] sm:text-xs px-2 py-1"
                          }
                          variant="outline"
                        >
                          {complaint.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs sm:text-sm">
                        {complaint.submittedDate.toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs sm:text-sm">
                        {complaint.lastUpdated.toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusUpdate(complaint)}
                          className="hover:bg-primary/10 text-xs sm:text-sm px-2 py-1"
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          Update Status
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {filteredComplaints.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm || statusFilter !== "All"
                  ? "No complaints match your search criteria"
                  : "No complaints assigned to you yet"}
              </div>
            ) : (
              filteredComplaints.map((complaint) => (
                <Card key={complaint.id} className="p-3">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm leading-tight">
                          {complaint.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {complaint.description.substring(0, 40)}...
                        </p>
                      </div>
                      <div className="flex flex-col gap-1 ml-2">
                        <Badge
                          className={
                            statusColors[complaint.status] +
                            " text-[10px] px-2 py-1"
                          }
                          variant="outline"
                        >
                          {complaint.status}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] mt-1">
                          {complaint.category}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {complaint.submittedBy}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Assigned:</span>
                      <span>
                        {complaint.submittedDate.toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Updated:</span>
                      <span>{complaint.lastUpdated.toLocaleDateString()}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusUpdate(complaint)}
                      className="w-full text-xs px-2 py-1 mt-2"
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Update Status
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <ComplaintDetailModal
        complaint={selectedComplaint}
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
      />

      <StatusUpdateModal
        complaint={selectedComplaint}
        open={showStatusModal}
        onOpenChange={setShowStatusModal}
        onUpdate={handleStatusSubmit}
        userRole="staff"
      />
    </div>
  );
}
