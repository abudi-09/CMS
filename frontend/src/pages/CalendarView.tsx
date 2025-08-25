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
import { RoleBasedComplaintModal } from "@/components/RoleBasedComplaintModal";
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
  // Additional mock complaints for demo
  {
    id: "C005",
    title: "Cafeteria food quality complaint",
    description: "Food served in cafeteria is cold and lacks variety.",
    status: "Pending",
    submittedDate: new Date(2025, 7, 8),
    submittedBy: "Alemu Bekele",
    category: "Cafeteria",
    priority: "Medium",
    deadline: new Date(2025, 7, 15),
    assignedStaff: "Helen Mulu",
    lastUpdated: new Date(2025, 7, 10),
  },
  {
    id: "C006",
    title: "Elevator malfunction in dormitory",
    description: "Elevator in Dorm A is stuck on 3rd floor.",
    status: "In Progress",
    submittedDate: new Date(2025, 7, 5),
    submittedBy: "Samuel Getachew",
    category: "Facilities",
    priority: "Critical",
    deadline: new Date(2025, 7, 7),
    assignedStaff: "Lisa Chen",
    lastUpdated: new Date(2025, 7, 6),
  },
  {
    id: "C007",
    title: "Exam schedule conflict",
    description: "Two exams scheduled at the same time for 3rd year students.",
    status: "Resolved",
    submittedDate: new Date(2025, 7, 2),
    submittedBy: "Mekdes Tadesse",
    category: "Academic Affairs",
    priority: "High",
    deadline: new Date(2025, 7, 3),
    assignedStaff: "Mark Thompson",
    lastUpdated: new Date(2025, 7, 3),
  },
  {
    id: "C008",
    title: "Noisy construction near lecture halls",
    description: "Ongoing construction is disrupting classes in Block B.",
    status: "Pending",
    submittedDate: new Date(2025, 7, 14),
    submittedBy: "Hanna Fikru",
    category: "Facilities",
    priority: "Low",
    deadline: new Date(2025, 7, 25),
    assignedStaff: "James Wilson",
    lastUpdated: new Date(2025, 7, 15),
  },
  {
    id: "C009",
    title: "Library printer out of service",
    description: "Main library printer is not working for student use.",
    status: "In Progress",
    submittedDate: new Date(2025, 7, 13),
    submittedBy: "Betelhem Abebe",
    category: "IT Services",
    priority: "Medium",
    deadline: new Date(2025, 7, 16),
    assignedStaff: "Dr. Sarah Johnson",
    lastUpdated: new Date(2025, 7, 14),
  },
  {
    id: "C010",
    title: "Unhygienic restrooms in Block C",
    description: "Restrooms are not cleaned regularly, causing complaints.",
    status: "Pending",
    submittedDate: new Date(2025, 7, 9),
    submittedBy: "Yared Solomon",
    category: "Facilities",
    priority: "High",
    deadline: new Date(2025, 7, 12),
    assignedStaff: "Helen Mulu",
    lastUpdated: new Date(2025, 7, 10),
  },
  {
    id: "C011",
    title: "Delay in grade release",
    description: "Grades for last semester have not been published yet.",
    status: "Pending",
    submittedDate: new Date(2025, 7, 6),
    submittedBy: "Selamawit Kebede",
    category: "Academic Affairs",
    priority: "Medium",
    deadline: new Date(2025, 7, 20),
    assignedStaff: "Mark Thompson",
    lastUpdated: new Date(2025, 7, 8),
  },
  {
    id: "C012",
    title: "Power outage in lab building",
    description: "Frequent power cuts affecting lab sessions.",
    status: "In Progress",
    submittedDate: new Date(2025, 7, 11),
    submittedBy: "Abel Tesfaye",
    category: "Facilities",
    priority: "Critical",
    deadline: new Date(2025, 7, 13),
    assignedStaff: "Lisa Chen",
    lastUpdated: new Date(2025, 7, 12),
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

interface CalendarViewProps {
  role?: "admin" | "staff";
  staffName?: string; // for demo filtering
}

export default function CalendarView({
  role = "admin",
  staffName = "",
}: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewType, setViewType] = useState<"submission" | "deadline">(
    "submission"
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Only show assigned complaints for staff, all for admin
  const filteredComplaints = mockComplaints.filter((complaint) => {
    const matchesStatus =
      statusFilter === "all" || complaint.status === statusFilter;
    const matchesPriority =
      priorityFilter === "all" || complaint.priority === priorityFilter;
    const matchesCategory =
      categoryFilter === "all" || complaint.category === categoryFilter;
    const matchesRole =
      role === "admin" ? true : complaint.assignedStaff === staffName;
    return matchesStatus && matchesPriority && matchesCategory && matchesRole;
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
    <div className="space-y-6">
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
              {/* Only show filters to admin, or allow for staff if needed */}
              {role === "admin" && (
                <>
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
                  <Select
                    value={priorityFilter}
                    onValueChange={setPriorityFilter}
                  >
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
                  <Select
                    value={categoryFilter}
                    onValueChange={setCategoryFilter}
                  >
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="IT Services">IT Services</SelectItem>
                      <SelectItem value="Facilities">Facilities</SelectItem>
                      <SelectItem value="Academic Affairs">
                        Academic Affairs
                      </SelectItem>
                      <SelectItem value="Student Services">
                        Student Services
                      </SelectItem>
                      <SelectItem value="Cafeteria">Cafeteria</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}
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
                {selectedDateComplaints.map((complaint) => {
                  const isOverdue =
                    complaint.deadline &&
                    complaint.deadline < new Date() &&
                    complaint.status !== "Resolved" &&
                    complaint.status !== "Closed";
                  return (
                    <div
                      key={complaint.id}
                      onClick={() => {
                        setSelectedComplaint(complaint);
                        setModalOpen(true);
                      }}
                      className={`p-3 border-l-4 cursor-pointer hover:bg-accent/50 transition-colors ${
                        isOverdue
                          ? "border-red-500 bg-red-50 dark:bg-red-900/10"
                          : priorityColors[complaint.priority || "Low"]
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm leading-tight">
                            {complaint.title}
                          </p>
                          {isOverdue && (
                            <Badge className="bg-red-500 text-white text-xs">
                              Overdue
                            </Badge>
                          )}
                        </div>
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
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Summary */}
      {/* Monthly Summary: Only show to admin */}
      {role === "admin" && (
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
                          compareDate.getFullYear() ===
                            selectedDate.getFullYear()
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
      )}
      <RoleBasedComplaintModal
        complaint={selectedComplaint}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onUpdate={(id, updates) => {
          setAllComplaints((prev) =>
            prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
          );
        }}
        fetchLatest={false}
      />
    </div>
  );
}
