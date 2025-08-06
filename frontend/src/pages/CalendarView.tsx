import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  Clock,
  AlertCircle,
  CheckCircle2,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Complaint } from "@/components/ComplaintCard";
import {
  format,
  isSameDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
} from "date-fns";

// Mock data for demonstration
const mockComplaints: Complaint[] = [
  {
    id: "C001",
    title: "WiFi connectivity issues in library",
    description: "Students unable to connect to university WiFi",
    status: "Pending",
    submittedDate: new Date(2024, 7, 15),
    submittedBy: "John Smith",
    category: "IT Services",
    priority: "High",
    deadline: new Date(2025, 7, 18),
    assignedStaff: "Dr. Sarah Johnson",
    lastUpdated: new Date(2025, 7, 16),
  },
  {
    id: "C002",
    title: "Broken AC in classroom 201",
    description: "Air conditioning not working properly",
    status: "In Progress",
    submittedDate: new Date(2025, 7, 12),
    submittedBy: "Jane Doe",
    category: "Facilities",
    priority: "Medium",
    deadline: new Date(2025, 7, 19),
    assignedStaff: "Lisa Chen",
    lastUpdated: new Date(2025, 7, 16),
  },
  {
    id: "C003",
    title: "Course registration system error",
    description: "Unable to register for courses",
    status: "Resolved",
    submittedDate: new Date(2025, 7, 10),
    submittedBy: "Mike Johnson",
    category: "Academic Affairs",
    priority: "High",
    deadline: new Date(2025, 7, 11),
    assignedStaff: "Mark Thompson",
    lastUpdated: new Date(2025, 7, 16),
  },
  {
    id: "C004",
    title: "Parking permit application issue",
    description: "Online parking permit system not working",
    status: "Pending",
    submittedDate: new Date(2025, 7, 20),
    submittedBy: "Emily Davis",
    category: "Student Services",
    priority: "Low",
    deadline: new Date(2025, 7, 27),
    assignedStaff: "James Wilson",
    lastUpdated: new Date(2025, 7, 16),
  },
];

const statusColors = {
  Pending: "bg-yellow-500 text-white",
  "In Progress": "bg-blue-500 text-white",
  Resolved: "bg-green-500 text-white",
  Closed: "bg-gray-500 text-white",
};

const priorityColors = {
  Low: "border-green-300",
  Medium: "border-yellow-400",
  High: "border-orange-400",
  Urgent: "border-red-500",
};

export default function CalendarView() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewType, setViewType] = useState<"submission" | "deadline">(
    "submission"
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const filteredComplaints = mockComplaints.filter((complaint) => {
    const matchesStatus =
      statusFilter === "all" || complaint.status === statusFilter;
    const matchesPriority =
      priorityFilter === "all" || complaint.priority === priorityFilter;
    return matchesStatus && matchesPriority;
  });

  const getComplaintsForDate = (date: Date) => {
    return filteredComplaints.filter((complaint) => {
      const compareDate =
        viewType === "submission"
          ? complaint.submittedDate
          : complaint.deadline;
      return compareDate && isSameDay(compareDate, date);
    });
  };

  const getDateWithComplaints = () => {
    const currentMonth = selectedDate;
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const dates = eachDayOfInterval({ start, end });

    return dates.filter((date) => getComplaintsForDate(date).length > 0);
  };

  const selectedDateComplaints = getComplaintsForDate(selectedDate);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Pending":
        return <Clock className="h-4 w-4" />;
      case "In Progress":
        return <AlertCircle className="h-4 w-4" />;
      case "Resolved":
        return <CheckCircle2 className="h-4 w-4" />;
      case "Closed":
        return <Users className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar View</h1>
          <p className="text-muted-foreground">
            View complaints by{" "}
            {viewType === "submission" ? "submission" : "deadline"} dates
          </p>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Calendar Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Select
                value={viewType}
                onValueChange={(value: "submission" | "deadline") =>
                  setViewType(value)
                }
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="submission">Submission Dates</SelectItem>
                  <SelectItem value="deadline">Deadline Dates</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
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

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {format(selectedDate, "MMMM yyyy")} -{" "}
              {viewType === "submission" ? "Submission" : "Deadline"} Calendar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="w-full pointer-events-auto"
              modifiers={{
                hasComplaints: getDateWithComplaints(),
              }}
              modifiersStyles={{
                hasComplaints: {
                  backgroundColor: "hsl(var(--primary))",
                  color: "hsl(var(--primary-foreground))",
                  borderRadius: "4px",
                },
              }}
            />
            <div className="mt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-primary rounded"></div>
                <span>Days with complaints</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selected Date Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {format(selectedDate, "MMMM d, yyyy")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {selectedDateComplaints.length} complaint
              {selectedDateComplaints.length !== 1 ? "s" : ""}
            </p>
          </CardHeader>
          <CardContent>
            {selectedDateComplaints.length === 0 ? (
              <div className="text-center py-8">
                <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No complaints on this date
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDateComplaints.map((complaint) => (
                  <Dialog key={complaint.id}>
                    <DialogTrigger asChild>
                      <div
                        className={`p-3 border-l-4 cursor-pointer hover:bg-accent/50 transition-colors ${
                          priorityColors[complaint.priority || "Low"]
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-medium text-sm leading-tight">
                            {complaint.title}
                          </p>
                          <Badge
                            className={`${
                              statusColors[complaint.status]
                            } text-xs ml-2`}
                          >
                            {complaint.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {getStatusIcon(complaint.status)}
                          <span>{complaint.category}</span>
                          <span>•</span>
                          <span>{complaint.priority}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Assigned to: {complaint.assignedStaff || "Unassigned"}
                        </p>
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Complaint Details</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">
                            #{complaint.id} - {complaint.title}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {complaint.description}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium">Status</p>
                            <Badge className={statusColors[complaint.status]}>
                              {complaint.status}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Priority</p>
                            <Badge variant="outline">
                              {complaint.priority}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Category</p>
                            <p className="text-sm">{complaint.category}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              Assigned Staff
                            </p>
                            <p className="text-sm">
                              {complaint.assignedStaff || "Unassigned"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Submitted</p>
                            <p className="text-sm">
                              {format(complaint.submittedDate, "MMM d, yyyy")}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Deadline</p>
                            <p className="text-sm">
                              {complaint.deadline
                                ? format(complaint.deadline, "MMM d, yyyy")
                                : "Not set"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Total This Month</p>
                <p className="text-2xl font-bold">
                  {
                    filteredComplaints.filter((c) => {
                      const compareDate =
                        viewType === "submission"
                          ? c.submittedDate
                          : c.deadline;
                      return (
                        compareDate &&
                        compareDate.getMonth() === selectedDate.getMonth() &&
                        compareDate.getFullYear() === selectedDate.getFullYear()
                      );
                    }).length
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm font-medium">Overdue</p>
                <p className="text-2xl font-bold text-destructive">
                  {
                    mockComplaints.filter(
                      (c) =>
                        c.deadline &&
                        c.deadline < new Date() &&
                        c.status !== "Resolved" &&
                        c.status !== "Closed"
                    ).length
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">Due Today</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {
                    mockComplaints.filter(
                      (c) => c.deadline && isSameDay(c.deadline, new Date())
                    ).length
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <div>
                <p className="text-sm font-medium">Resolved This Month</p>
                <p className="text-2xl font-bold text-success">
                  {
                    filteredComplaints.filter(
                      (c) =>
                        c.status === "Resolved" &&
                        c.submittedDate.getMonth() ===
                          selectedDate.getMonth() &&
                        c.submittedDate.getFullYear() ===
                          selectedDate.getFullYear()
                    ).length
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
