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
  ArrowUpDown,
} from "lucide-react";
import { ComplaintDetailModal } from "@/components/ComplaintDetailModal";
import { StatusUpdateModal } from "@/components/StatusUpdateModal";
import { Complaint } from "@/components/ComplaintCard";
import { toast } from "@/hooks/use-toast";

// Mock data for staff - showing only assigned complaints with new fields
const mockStaffComplaints: Complaint[] = [
  {
    id: "CMP-001",
    title: "Library computers are slow and outdated",
    description:
      "The computers in the main library are extremely slow and need upgrading. Students are waiting long times to access resources for research and assignments. This is affecting productivity significantly.",
    category: "IT Department",
    status: "In Progress",
    priority: "High",
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
    category: "IT Department",
    status: "Pending",
    priority: "Critical",
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
    category: "IT Department",
    status: "Resolved",
    priority: "Medium",
    submittedBy: "Mike Wilson",
    assignedStaff: "IT Support Team",
    submittedDate: new Date("2024-01-12"),
    lastUpdated: new Date("2024-01-19"),
  },
  {
    id: "CMP-008",
    title: "Cafeteria hygiene concerns",
    description:
      "Several students have reported hygiene issues in the main cafeteria including dirty tables and food serving areas.",
    category: "Food Services",
    status: "In Progress",
    priority: "Low",
    submittedBy: "Emma Davis",
    assignedStaff: "Food Services Manager",
    submittedDate: new Date("2024-01-22"),
    lastUpdated: new Date("2024-01-23"),
  },
];

export function MyAssignedComplaints() {
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null
  );
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [complaints, setComplaints] =
    useState<Complaint[]>(mockStaffComplaints);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

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

  const handleSortByPriority = () => {
    const priorityOrder = { Critical: 4, High: 3, Medium: 2, Low: 1 };

    const sorted = [...complaints].sort((a, b) => {
      const orderA =
        priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
      const orderB =
        priorityOrder[b.priority as keyof typeof priorityOrder] || 0;

      return sortOrder === "desc" ? orderB - orderA : orderA - orderB;
    });

    setComplaints(sorted);
    setSortOrder(sortOrder === "desc" ? "asc" : "desc");
  };

  // Filter complaints based on search, status, and priority
  const filteredComplaints = complaints.filter((complaint) => {
    const matchesSearch =
      complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "All" || complaint.status === statusFilter;
    const matchesPriority =
      priorityFilter === "All" || complaint.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const statusColors = {
    Pending:
      "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400",
    "In Progress":
      "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400",
    Resolved:
      "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400",
    Closed:
      "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400",
  };

  const priorityColors = {
    Critical: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
    High: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400",
    Medium:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
    Low: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          My Assigned Complaints
        </h1>
        <p className="text-muted-foreground">
          Manage complaints assigned specifically to you
        </p>
      </div>

      {/* Main Content */}
      <Card className="shadow-lg rounded-2xl bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Assigned Complaints ({filteredComplaints.length})
          </CardTitle>

          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-lg"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex items-center gap-2 min-w-0 sm:min-w-[180px]">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="rounded-lg">
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

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="min-w-0 sm:min-w-[150px] rounded-lg">
                  <SelectValue placeholder="All Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Priority</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={handleSortByPriority}
                className="min-w-0 sm:min-w-[140px] rounded-lg hover:bg-muted"
              >
                <ArrowUpDown className="h-4 w-4 mr-2" />
                Sort Priority
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Desktop Table */}
          <div className="hidden lg:block rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-sm">Title</TableHead>
                  <TableHead className="text-sm">Department</TableHead>
                  <TableHead className="text-sm">Priority</TableHead>
                  <TableHead className="text-sm">Submitted By</TableHead>
                  <TableHead className="text-sm">Status</TableHead>
                  <TableHead className="text-sm">Date Assigned</TableHead>
                  <TableHead className="text-sm">Last Updated</TableHead>
                  <TableHead className="text-right text-sm">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredComplaints.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {searchTerm ||
                      statusFilter !== "All" ||
                      priorityFilter !== "All"
                        ? "No complaints match your search criteria"
                        : "No complaints assigned to you yet"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredComplaints.map((complaint) => (
                    <TableRow
                      key={complaint.id}
                      className="hover:bg-muted/50 dark:hover:bg-accent/10"
                    >
                      <TableCell className="max-w-xs">
                        <div className="font-medium truncate">
                          {complaint.title}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {complaint.description.substring(0, 60)}...
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {complaint.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`text-xs ${
                            priorityColors[
                              complaint.priority as keyof typeof priorityColors
                            ]
                          }`}
                          variant="outline"
                        >
                          {complaint.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">
                            {complaint.submittedBy}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`text-xs ${
                            statusColors[complaint.status]
                          }`}
                          variant="outline"
                        >
                          {complaint.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {complaint.submittedDate.toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {complaint.lastUpdated.toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewComplaint(complaint)}
                            className="hover:bg-primary/10 dark:hover:bg-hover-blue/10"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusUpdate(complaint)}
                            className="hover:bg-primary/10 dark:hover:bg-hover-blue/10"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-4">
            {filteredComplaints.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ||
                statusFilter !== "All" ||
                priorityFilter !== "All"
                  ? "No complaints match your search criteria"
                  : "No complaints assigned to you yet"}
              </div>
            ) : (
              filteredComplaints.map((complaint) => (
                <Card key={complaint.id} className="p-4 shadow-md rounded-2xl">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-sm">
                          {complaint.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          #{complaint.id}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-2">
                        <Badge
                          className={`text-xs ${
                            priorityColors[
                              complaint.priority as keyof typeof priorityColors
                            ]
                          }`}
                          variant="outline"
                        >
                          {complaint.priority}
                        </Badge>
                        <Badge
                          className={`text-xs ${
                            statusColors[complaint.status]
                          }`}
                          variant="outline"
                        >
                          {complaint.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          Department:
                        </span>
                        <span className="font-medium ml-2">
                          {complaint.category}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Submitted By:
                        </span>
                        <span className="font-medium ml-2">
                          {complaint.submittedBy}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Date Assigned:
                        </span>
                        <span className="font-medium ml-2">
                          {complaint.submittedDate.toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-sm">
                        {complaint.description.substring(0, 120)}...
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewComplaint(complaint)}
                        className="flex-1 hover:bg-primary/10 dark:hover:bg-hover-blue/10"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusUpdate(complaint)}
                        className="flex-1 hover:bg-primary/10 dark:hover:bg-hover-blue/10"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Update Status
                      </Button>
                    </div>
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
