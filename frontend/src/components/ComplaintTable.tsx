import { useState } from "react";
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

export function ComplaintTable({
  complaints,
  onView,
  onStatusUpdate,
  onFeedback,
  onAssign,
  userRole = "user",
  title = "Complaints",
}: ComplaintTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [prioritySort, setPrioritySort] = useState<"asc" | "desc">("desc");

  const priorityOrder = { Critical: 4, High: 3, Medium: 2, Low: 1 };
  const priorityColors = {
    Low: "bg-gray-200 text-gray-700 border-gray-300",
    Medium: "bg-blue-100 text-blue-800 border-blue-200",
    High: "bg-orange-100 text-orange-800 border-orange-200",
    Critical: "bg-red-100 text-red-800 border-red-200 font-bold border-2",
  };

  let filteredComplaints = complaints.filter((complaint) => {
    const matchesSearch =
      complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || complaint.status === statusFilter;
    const matchesDepartment =
      departmentFilter === "all" || complaint.department === departmentFilter;
    const matchesPriority =
      priorityFilter === "all" ||
      (complaint.priority || "Medium") === priorityFilter;
    return (
      matchesSearch && matchesStatus && matchesDepartment && matchesPriority
    );
  });

  // Sort by priority if enabled
  filteredComplaints = filteredComplaints.sort((a, b) => {
    const aP = priorityOrder[a.priority || "Medium"];
    const bP = priorityOrder[b.priority || "Medium"];
    return prioritySort === "asc" ? aP - bP : bP - aP;
  });

  const departments = Array.from(new Set(complaints.map((c) => c.department)));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          {title}
        </CardTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 w-full">
          {/* Search input */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search complaints..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          {/* Department dropdown */}
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Department" />
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
          {/* Priority dropdown */}
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
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
          {/* Status dropdown (full width on mobile, right-aligned on desktop) */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full">
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
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {complaint.department}
                          </span>
                          <Badge
                            className={
                              priorityColors[complaint.priority || "Medium"]
                            }
                          >
                            {complaint.priority || "Medium"}
                          </Badge>
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
                            {complaint.assignedStaff || "Unassigned"}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        {complaint.submittedDate.toLocaleDateString()}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onView(complaint)}
                        >
                          <Eye className="h-4 w-4" />
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
                          </Button>
                        )}
                        {userRole === "user" &&
                          complaint.status === "Resolved" &&
                          onFeedback &&
                          !complaint.feedback && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onFeedback(complaint)}
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          )}
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
                    <TableHead>Department</TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        Priority
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setPrioritySort((s) =>
                              s === "asc" ? "desc" : "asc"
                            )
                          }
                        >
                          {prioritySort === "asc" ? "↑" : "↓"}
                        </Button>
                      </div>
                    </TableHead>
                    {userRole === "admin" && (
                      <TableHead>Submitted By</TableHead>
                    )}
                    {(userRole === "staff" || userRole === "admin") && (
                      <TableHead>Assigned Staff</TableHead>
                    )}
                    <TableHead>Submitted Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredComplaints.map((complaint) => (
                    <TableRow key={complaint.id}>
                      <TableCell>{complaint.id}</TableCell>
                      <TableCell>{complaint.title}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[complaint.status]}>
                          {complaint.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{complaint.department}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            priorityColors[complaint.priority || "Medium"]
                          }
                        >
                          {complaint.priority || "Medium"}
                        </Badge>
                      </TableCell>
                      {userRole === "admin" && (
                        <TableCell>{complaint.submittedBy}</TableCell>
                      )}
                      {(userRole === "staff" || userRole === "admin") && (
                        <TableCell>
                          {complaint.assignedStaff || "Unassigned"}
                        </TableCell>
                      )}
                      <TableCell>
                        {complaint.submittedDate.toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onView(complaint)}
                          >
                            <Eye className="h-4 w-4" />
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
                            </Button>
                          )}
                          {userRole === "user" &&
                            complaint.status === "Resolved" &&
                            onFeedback &&
                            !complaint.feedback && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onFeedback(complaint)}
                              >
                                <MessageSquare className="h-4 w-4" />
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
