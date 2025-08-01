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
  // Priority filter/sort controls
  showPriorityFilter?: boolean;
  priorityFilter?: string;
  onPriorityFilterChange?: (value: string) => void;
  showPrioritySort?: boolean;
  prioritySort?: "asc" | "desc";
  onPrioritySortChange?: () => void;
  onViewAll?: () => void;
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

const priorityColors = {
  Critical: "bg-red-100 text-red-800 dark:bg-red-950/20 dark:text-red-400",
  High: "bg-orange-100 text-orange-800 dark:bg-orange-950/20 dark:text-orange-400",
  Medium:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/20 dark:text-yellow-400",
  Low: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

export function ComplaintTable({
  complaints = [],
  onView,
  onStatusUpdate,
  onFeedback,
  onAssign,
  userRole = "user",
  title = "Complaints",
  showPriorityFilter = false,
  priorityFilter = "all",
  onPriorityFilterChange,
  showPrioritySort = false,
  prioritySort = "desc",
  onPrioritySortChange,
  onViewAll,
}: ComplaintTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const filteredComplaints = complaints?.filter((complaint) => {
    const matchesSearch =
      complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || complaint.status === statusFilter;
    const matchesCategory =
      categoryFilter === "all" || complaint.department === categoryFilter;
    const matchesPriority =
      !showPriorityFilter ||
      priorityFilter === "all" ||
      complaint.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesCategory && matchesPriority;
  });

  // Priority sort if enabled
  let displayedComplaints = filteredComplaints;
  if (showPrioritySort) {
    const priorityOrder = { Critical: 4, High: 3, Medium: 2, Low: 1 };
    displayedComplaints = [...filteredComplaints].sort((a, b) => {
      const aValue =
        priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
      const bValue =
        priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
      return prioritySort === "desc" ? bValue - aValue : aValue - bValue;
    });
  }

  const categories = Array.from(new Set(complaints.map((c) => c.department)));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          {title}
        </CardTitle>

        <div className="flex flex-col gap-2 sm:flex-row sm:gap-4 w-full">
          <div className="relative w-full sm:flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search complaints..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
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
                {categories.map((category, idx) => (
                  <SelectItem key={category || idx} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {showPriorityFilter && onPriorityFilterChange && (
              <Select
                value={priorityFilter}
                onValueChange={onPriorityFilterChange}
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
            )}
            {showPrioritySort && onPrioritySortChange && (
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                onClick={onPrioritySortChange}
              >
                Sort by Priority {prioritySort === "desc" ? "↓" : "↑"}
              </Button>
            )}
            {onViewAll && (
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                onClick={onViewAll}
              >
                View All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {displayedComplaints.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No complaints found matching your criteria
          </div>
        ) : (
          <>
            {/* Mobile Card Layout */}
            <div className="md:hidden space-y-4">
              {displayedComplaints.map((complaint) => (
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
                          {complaint.department}
                        </div>
                        <div className="text-xs">
                          <Badge
                            className={
                              priorityColors[complaint.priority] + " text-xs"
                            }
                          >
                            {complaint.priority}
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
                    <TableHead>Priority</TableHead>
                    <TableHead>Department</TableHead>
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
                  {displayedComplaints.map((complaint) => (
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
                      <TableCell>
                        <Badge
                          className={
                            priorityColors[complaint.priority] + " text-xs"
                          }
                        >
                          {complaint.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>{complaint.department}</TableCell>
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
