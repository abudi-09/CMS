import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Filter, Eye, MessageSquare, Settings } from "lucide-react";
import { Complaint } from "./ComplaintCard";

interface ComplaintTableProps {
  complaints: Complaint[];
  onView: (complaint: Complaint) => void;
  onStatusUpdate?: (complaint: Complaint) => void;
  onFeedback?: (complaint: Complaint) => void;
  onAssign?: (complaint: Complaint) => void;
  userRole?: "user" | "staff" | "admin";
  title?: string;
  actionLabel?: string;
  priorityFilter?: string; // Add this line
}

const statusColors = {
  Pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/20 dark:text-yellow-400",
  "In Progress":
    "bg-blue-100 text-blue-800 dark:bg-blue-950/20 dark:text-blue-400",
  Resolved:
    "bg-green-100 text-green-800 dark:bg-green-950/20 dark:text-green-400",
  Closed: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

const mockComplaints: Complaint[] = [
  {
    id: "C1001",
    title: "Leaking faucet in restroom",
    description: "The faucet in the main restroom is leaking.",
    category: "Facilities",
    priority: "High",
    status: "Pending",
    submittedBy: "John Doe",
    assignedStaff: "Staff A",
    submittedDate: new Date(Date.now() - 86400000 * 2),
    lastUpdated: new Date(Date.now() - 86400000 * 1),
    isEscalated: false,
    evidenceFile: "",
    feedback: null,
  },
  {
    id: "C1002",
    title: "WiFi not working",
    description: "WiFi is down in the library area.",
    category: "IT",
    priority: "Medium",
    status: "In Progress",
    submittedBy: "Jane Smith",
    assignedStaff: "Staff B",
    submittedDate: new Date(Date.now() - 86400000 * 3),
    lastUpdated: new Date(Date.now() - 86400000 * 2),
    isEscalated: true,
    evidenceFile: "",
    feedback: null,
  },
  {
    id: "C1003",
    title: "Library AC not working",
    description: "AC in library is broken since last week.",
    category: "Facilities",
    priority: "Critical",
    status: "Resolved",
    submittedBy: "Alice Brown",
    assignedStaff: "Staff C",
    submittedDate: new Date(Date.now() - 86400000 * 7),
    lastUpdated: new Date(Date.now() - 86400000 * 1),
    isEscalated: false,
    evidenceFile: "",
    feedback: { rating: 4, comment: "Resolved quickly, thanks!" },
  },
];

export function ComplaintTable({
  complaints,
  onView,
  onStatusUpdate,
  onFeedback,
  onAssign,
  userRole = "user",
  title = "Complaints",
  actionLabel,
  priorityFilter = "all", // Set default value for priorityFilter
}: ComplaintTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [localPriorityFilter, setLocalPriorityFilter] =
    useState<string>(priorityFilter);

  // Use mock data for user dashboard, otherwise use provided complaints
  // Type guard for staff object
  type Staff = { name?: string; email?: string };
  const getStaffDisplay = (staff: unknown) => {
    if (!staff) return "Not Assigned Yet";
    if (typeof staff === "string") return staff;
    if (typeof staff === "object" && staff !== null) {
      const s = staff as Staff;
      return s.name || s.email || "Assigned";
    }
    return "Assigned";
  };
  const complaintsData = userRole === "user" ? mockComplaints : complaints;
  const filteredComplaints = complaintsData.filter((complaint) => {
    const matchesSearch =
      complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || complaint.status === statusFilter;
    const matchesCategory =
      categoryFilter === "all" || complaint.category === categoryFilter;

    const matchesPriority =
      localPriorityFilter === "all" ||
      complaint.priority === localPriorityFilter;

    return matchesSearch && matchesStatus && matchesCategory && matchesPriority;
  });

  const categories = Array.from(new Set(complaints.map((c) => c.category)));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          {title}
        </CardTitle>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search complaints..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Resolved">Resolved</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={localPriorityFilter}
              onValueChange={setLocalPriorityFilter}
            >
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {filteredComplaints.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No complaints found matching your criteria
          </div>
        ) : (
          <>
            {/* Mobile Card Layout */}
            <div className="md:hidden space-y-4">
              {filteredComplaints.map((complaint) => (
                <Card key={complaint.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="text-xs text-muted-foreground">
                          #{complaint.id}
                        </div>
                        <h4 className="font-medium text-sm leading-tight">
                          {complaint.title}
                        </h4>
                        <div className="text-xs text-muted-foreground">
                          {complaint.category}
                        </div>
                      </div>
                      <Badge
                        className={`${statusColors[complaint.status]} text-xs`}
                      >
                        {complaint.status}
                      </Badge>
                    </div>

                    {(userRole === "admin" || userRole === "staff") && (
                      <div className="space-y-1">
                        {userRole === "admin" && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">Submitted by:</span>{" "}
                            {complaint.submittedBy}
                          </div>
                        )}
                        {(userRole === "staff" || userRole === "admin") && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">Assigned:</span>{" "}
                            {getStaffDisplay(complaint.assignedStaff)}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        {complaint.submittedDate
                          ? new Date(
                              complaint.submittedDate
                            ).toLocaleDateString()
                          : ""}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onView(complaint)}
                        >
                          <Eye className="h-4 w-4" />
                          {actionLabel && (
                            <span className="ml-1">{actionLabel}</span>
                          )}
                        </Button>

                        {userRole === "staff" && onStatusUpdate && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onStatusUpdate(complaint)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Removed assign staff member button for admin */}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Desktop Table Layout */}
            <div className="hidden md:block rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    {userRole === "admin" && (
                      <TableHead>Submitted By</TableHead>
                    )}
                    {(userRole === "staff" || userRole === "admin") && (
                      <TableHead>Assigned Staff</TableHead>
                    )}
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredComplaints.map((complaint) => (
                    <TableRow key={complaint.id}>
                      <TableCell className="font-medium">
                        #{complaint.id}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate">{complaint.title}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[complaint.status]}>
                          {complaint.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{complaint.category}</TableCell>
                      <TableCell>
                        <Badge
                          className={`text-xs px-2 py-0.5 rounded font-semibold ${
                            complaint.priority === "Critical"
                              ? "bg-red-100 text-red-800"
                              : complaint.priority === "High"
                              ? "bg-orange-100 text-orange-800"
                              : complaint.priority === "Medium"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {complaint.priority}
                        </Badge>
                      </TableCell>
                      {userRole === "admin" && (
                        <TableCell>{complaint.submittedBy}</TableCell>
                      )}
                      {(userRole === "staff" || userRole === "admin") && (
                        <TableCell>
                          {getStaffDisplay(complaint.assignedStaff)}
                        </TableCell>
                      )}
                      <TableCell>
                        {complaint.submittedDate
                          ? new Date(
                              complaint.submittedDate
                            ).toLocaleDateString()
                          : ""}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onView(complaint)}
                          >
                            <Eye className="h-4 w-4" />
                            {actionLabel && (
                              <span className="ml-1">{actionLabel}</span>
                            )}
                          </Button>

                          {userRole === "staff" && onStatusUpdate && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onStatusUpdate(complaint)}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                          )}

                          {userRole === "admin" && onAssign && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onAssign(complaint)}
                            >
                              <Settings className="h-4 w-4" />
                              <span className="ml-1">
                                {getStaffDisplay(complaint.assignedStaff) !==
                                "Not Assigned Yet"
                                  ? "Reassign"
                                  : "Assign"}
                              </span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
