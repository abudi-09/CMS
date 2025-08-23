import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
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

// minimal mock data kept for demo
const mockComplaints: Complaint[] = [
  {
    id: "C001",
    title: "WiFi issues",
    description: "...",
    status: "Pending",
    submittedDate: new Date(2025, 7, 15),
    submittedBy: "A",
    category: "IT",
    priority: "High",
    deadline: new Date(2025, 7, 18),
    assignedStaff: "Staff A",
    lastUpdated: new Date(),
  },
  {
    id: "C002",
    title: "AC broken",
    description: "...",
    status: "In Progress",
    submittedDate: new Date(2025, 7, 12),
    submittedBy: "B",
    category: "Facilities",
    priority: "Medium",
    deadline: new Date(2025, 7, 19),
    assignedStaff: "Staff B",
    lastUpdated: new Date(),
  },
];

const statusColors: Record<string, string> = {
  Pending: "bg-yellow-500 text-white",
  "In Progress": "bg-blue-500 text-white",
  Resolved: "bg-green-500 text-white",
  Closed: "bg-gray-500 text-white",
};

const priorityColors: Record<string, string> = {
  Low: "border-green-300",
  Medium: "border-yellow-400",
  High: "border-orange-400",
  Urgent: "border-red-500",
};

interface CalendarViewProps {
  role?: "admin" | "staff";
  staffName?: string;
}

export default function CalendarView({
  role = "admin",
  staffName = "",
}: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewType] = useState<"submission" | "deadline">("submission");
  const [allComplaints, setAllComplaints] =
    useState<Complaint[]>(mockComplaints);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null
  );
  const [modalOpen, setModalOpen] = useState(false);

  const filteredComplaints = allComplaints.filter((c) =>
    role === "admin" ? true : c.assignedStaff === staffName
  );

  const getComplaintsForDate = (date: Date) =>
    filteredComplaints.filter((complaint) => {
      const compareDate =
        viewType === "submission"
          ? complaint.submittedDate
          : complaint.deadline;
      return compareDate && isSameDay(compareDate, date);
    });

  const getDateWithComplaints = () => {
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    return eachDayOfInterval({ start, end }).filter(
      (d) => getComplaintsForDate(d).length > 0
    );
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
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
            modifiers={{ hasComplaints: getDateWithComplaints() }}
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
              <div className="w-4 h-4 bg-primary rounded" />
              <span>Days with complaints</span>
            </div>
          </div>
        </CardContent>
      </Card>

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
        onOpenChange={(open) => setModalOpen(open)}
        onUpdate={(complaintId, updates) => {
          if (!complaintId || !updates) return;
          setAllComplaints((prev) =>
            prev.map((c) =>
              c.id === complaintId
                ? ({ ...c, ...(updates as Partial<Complaint>) } as Complaint)
                : c
            )
          );
        }}
      />
    </div>
  );
}
