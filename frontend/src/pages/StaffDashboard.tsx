import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ActivityLogTable } from "@/components/ActivityLogTable";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
  Calendar,
  MessageSquare,
} from "lucide-react";
import { RoleBasedComplaintModal } from "@/components/RoleBasedComplaintModal";
import { Complaint } from "@/components/ComplaintCard";
import { toast } from "@/hooks/use-toast";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { getAssignedComplaintsApi, updateComplaintStatusApi } from "@/lib/api";
import { useAuth } from "@/components/auth/AuthContext";
import { getActivityLogsForComplaint } from "@/lib/activityLogApi";
import type { ActivityLog } from "@/components/ActivityLogTable";

const today = new Date();
// Complaints will be loaded from the backend; remove demo/mock data

export function StaffDashboard() {
  const navigate = useNavigate();
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null
  );
  const [showActionModal, setShowActionModal] = useState(false);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const { user } = useAuth();
  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!user || user.role !== "staff") return;
      try {
        const data = await getAssignedComplaintsApi();
        if (ignore) return;
        const mapped: Complaint[] = (data || []).map((c: unknown) => {
          const obj = c as Record<string, unknown>;
          const submittedByField = obj["submittedBy"];
          let submittedByName: string | undefined;
          if (submittedByField && typeof submittedByField === "object") {
            const s = submittedByField as Record<string, unknown>;
            submittedByName =
              (typeof s.name === "string" && s.name) ||
              (typeof s.email === "string" && s.email) ||
              undefined;
          } else if (typeof submittedByField === "string") {
            submittedByName = submittedByField;
          }
          return {
            id: String(obj["id"] ?? obj["_id"] ?? ""),
            title: String(obj["title"] ?? ""),
            description: String(
              obj["fullDescription"] ?? obj["shortDescription"] ?? ""
            ),
            category: String(obj["category"] ?? ""),
            status: (String(obj["status"]) as Complaint["status"]) || "Pending",
            priority:
              typeof obj["priority"] === "string" && obj["priority"]
                ? (obj["priority"] as Complaint["priority"])
                : "Medium",
            submittedBy: String(submittedByName ?? "User"),
            assignedStaff: user.fullName || user.name || "Me",
            submittedDate: obj["submittedDate"]
              ? new Date(String(obj["submittedDate"]))
              : new Date(),
            lastUpdated: obj["lastUpdated"]
              ? new Date(String(obj["lastUpdated"]))
              : new Date(),
            deadline: obj["deadline"]
              ? new Date(String(obj["deadline"]))
              : undefined,
          } as Complaint;
        });
        setComplaints(mapped);
      } catch (err) {
        // keep empty list on failure
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [user]);
  const [searchTerm, setSearchTerm] = useState("");
  // removed status filter per request
  const [priorityFilter, setPriorityFilter] = useState("All");
  // Activity Log modal state
  const [showLogModal, setShowLogModal] = useState(false);
  const [logComplaintId, setLogComplaintId] = useState<string | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  // Accepted/Rejected tracking synced with My Assigned tabs
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem("myAssignedAccepted");
      if (!raw) return new Set<string>();
      const arr = JSON.parse(raw) as string[];
      return new Set(arr);
    } catch (e) {
      // ignore malformed localStorage content
      return new Set<string>();
    }
  });
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem("myAssignedRejected");
      if (!raw) return new Set<string>();
      const arr = JSON.parse(raw) as string[];
      return new Set(arr);
    } catch (e) {
      // ignore malformed localStorage content
      return new Set<string>();
    }
  });
  const persistSet = (key: string, set: Set<string>) => {
    try {
      localStorage.setItem(key, JSON.stringify([...set]));
    } catch (e) {
      // ignore storage errors
    }
  };

  const handleViewLogs = async (complaintId: string) => {
    setShowLogModal(true);
    setLogComplaintId(complaintId);
    try {
      const data = await getActivityLogsForComplaint(complaintId);
      setLogs(data as ActivityLog[]);
    } catch (e) {
      setLogs([]);
      toast({
        title: "Failed to load activity logs",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleViewAndUpdate = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setShowActionModal(true);
  };

  // Load logs when the action modal opens for a specific complaint
  useEffect(() => {
    let cancelled = false;
    async function loadLogs() {
      if (!showActionModal || !selectedComplaint) return;
      try {
        const data = await getActivityLogsForComplaint(selectedComplaint.id);
        if (!cancelled) setLogs(data as ActivityLog[]);
      } catch {
        if (!cancelled) setLogs([]);
      }
    }
    loadLogs();
    return () => {
      cancelled = true;
    };
  }, [showActionModal, selectedComplaint]);

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

  // Quick actions: Accept / Reject a pending complaint
  const acceptComplaintQuick = async (id: string) => {
    // Persist locally for Accepted tab parity with My Assigned
    setAcceptedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      persistSet("myAssignedAccepted", next);
      return next;
    });
    try {
      await updateComplaintStatusApi(id, "In Progress");
      setComplaints((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: "In Progress" } : c))
      );
      toast({ title: "Accepted", description: `Complaint #${id} accepted.` });
    } catch (e) {
      toast({
        title: "Accept failed",
        description: "Could not update status on server",
        variant: "destructive",
      });
    }
  };
  const rejectComplaintQuick = async (id: string) => {
    setRejectedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      persistSet("myAssignedRejected", next);
      return next;
    });
    try {
      await updateComplaintStatusApi(id, "Closed", "Rejected by staff");
      setComplaints((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: "Closed" } : c))
      );
      toast({ title: "Rejected", description: `Complaint #${id} rejected.` });
    } catch (e) {
      toast({
        title: "Reject failed",
        description: "Could not update status on server",
        variant: "destructive",
      });
    }
  };

  // Calculate stats for summary cards
  const stats = {
    assigned: complaints.length,
    pending: complaints.filter((c) => c.status === "Pending").length,
    inProgress: complaints.filter((c) => c.status === "In Progress").length,
    resolved: complaints.filter((c) => c.status === "Resolved").length,
  };

  // Overdue filter state
  const [overdueFilter, setOverdueFilter] = useState("All");

  // Helper: check if complaint is overdue
  const isOverdue = (complaint: Complaint) => {
    if (!complaint.deadline) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(complaint.deadline);
    deadline.setHours(0, 0, 0, 0);
    return (
      deadline < today &&
      complaint.status !== "Closed" &&
      complaint.status !== "Resolved"
    );
  };

  // Filter complaints based on search, status, priority, and overdue
  const filteredComplaints = complaints.filter((complaint) => {
    const matchesSearch =
      complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority =
      priorityFilter === "All" || complaint.priority === priorityFilter;
    const matchesOverdue =
      overdueFilter === "All"
        ? true
        : overdueFilter === "Overdue"
        ? isOverdue(complaint)
        : !isOverdue(complaint);
    return matchesSearch && matchesPriority && matchesOverdue;
  });

  // Pagination: 5 per page, reset on filter/search change
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const totalItems = filteredComplaints.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (page - 1) * pageSize;
  const pagedComplaints = filteredComplaints.slice(
    startIndex,
    startIndex + pageSize
  );
  useEffect(() => {
    setPage(1);
  }, [searchTerm, priorityFilter, overdueFilter]);
  const goToPage = (p: number) => setPage(Math.min(Math.max(1, p), totalPages));
  const getVisiblePages = () => {
    const maxToShow = 5;
    if (totalPages <= maxToShow)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: number[] = [];
    const left = Math.max(1, page - 2);
    const right = Math.min(totalPages, left + maxToShow - 1);
    for (let p = left; p <= right; p++) pages.push(p);
    return pages;
  };

  const statusColors = {
    Pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    "In Progress": "bg-blue-100 text-blue-800 border-blue-200",
    Resolved: "bg-green-100 text-green-800 border-green-200",
    Closed: "bg-gray-100 text-gray-800 border-gray-200",
  } as const;

  // Recently assigned: show the 3 most recent complaints that are still Pending
  const recentComplaints = [...complaints]
    .filter((c) => c.status === "Pending")
    .sort((a, b) => {
      const aDate = new Date(a.assignedDate || a.submittedDate).valueOf() || 0;
      const bDate = new Date(b.assignedDate || b.submittedDate).valueOf() || 0;
      return bDate - aDate;
    })
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Staff Dashboard
        </h1>
        <p className="text-muted-foreground">
          Manage your assigned complaints efficiently
        </p>
      </div>

      {/* Enhanced Summary Cards - responsive: 1/2/4 grid, stacked on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="hover:shadow-md transition-shadow w-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Assigned Complaints
            </CardTitle>
            <div className="bg-blue-50 p-2 rounded-lg">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.assigned}</div>
            <p className="text-xs text-muted-foreground">
              Total assigned to you
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow w-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
            <div className="bg-yellow-50 p-2 rounded-lg">
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting action</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow w-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Progress
            </CardTitle>
            <div className="bg-blue-50 p-2 rounded-lg">
              <AlertCircle className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">Currently working</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow w-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Resolved
            </CardTitle>
            <div className="bg-green-50 p-2 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.resolved}</div>
            <p className="text-xs text-muted-foreground">
              Successfully completed
            </p>
          </CardContent>
        </Card>
      </div>
      {/* Quick Actions (match Admin style) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => navigate("/my-assigned")}
        >
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              My Assigned
            </CardTitle>
            <CardDescription>Your assigned complaints</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <Button variant="outline" className="w-full">
              Open
            </Button>
          </CardContent>
        </Card>

        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => navigate("/all-complaints")}
        >
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              All Complaints
            </CardTitle>
            <CardDescription>Browse all complaints</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <Button variant="outline" className="w-full">
              View Complaints
            </Button>
          </CardContent>
        </Card>

        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => navigate("/calendar-view")}
        >
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendar View
            </CardTitle>
            <CardDescription>See complaints by date</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <Button variant="outline" className="w-full">
              Open Calendar
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* My Assigned Complaints Section */}
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            My Assigned Complaints
          </CardTitle>

          {/* Search and Filter Controls */}
          <div className="flex flex-col md:flex-row gap-4 pt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-col md:flex-row gap-2">
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="min-w-0 sm:min-w-[150px]">
                  <SelectValue placeholder="Filter by Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Priority</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>

              {/* Overdue Filter */}
              <Select value={overdueFilter} onValueChange={setOverdueFilter}>
                <SelectTrigger className="min-w-0 sm:min-w-[140px]">
                  <SelectValue placeholder="Overdue" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                  <SelectItem value="NotOverdue">Not Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-4 md:p-6">
          {/* Desktop Table (dashboard shows only recentComplaints) */}
          <div className="rounded-md border w-full overflow-x-auto hidden md:block">
            <Table className="w-full min-w-[760px] max-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Title</TableHead>
                  <TableHead scope="col">Category</TableHead>
                  <TableHead scope="col">Priority</TableHead>
                  <TableHead scope="col">Status</TableHead>
                  <TableHead scope="col">Overdue</TableHead>
                  <TableHead scope="col" className="text-right">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentComplaints.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground"
                      aria-live="polite"
                    >
                      {"No recent complaints assigned to you"}
                    </TableCell>
                  </TableRow>
                ) : (
                  recentComplaints.map((complaint) => (
                    <TableRow key={complaint.id} className="hover:bg-muted/50">
                      <TableCell className="max-w-xs">
                        <div
                          className="font-medium truncate"
                          title={complaint.title}
                        >
                          {complaint.title}
                        </div>
                        <div
                          className="text-sm text-muted-foreground truncate"
                          title={complaint.description}
                        >
                          {complaint.description.substring(0, 60)}
                          {complaint.description.length > 60 ? "..." : ""}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="text-xs"
                          title={complaint.category}
                        >
                          {complaint.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`text-xs ${
                            complaint.priority === "Critical"
                              ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                              : complaint.priority === "High"
                              ? "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
                              : complaint.priority === "Medium"
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                              : "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                          }`}
                          variant="outline"
                          title={complaint.priority}
                        >
                          {complaint.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={statusColors[complaint.status]}
                          variant="outline"
                          title={complaint.status}
                        >
                          {complaint.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isOverdue(complaint) ? (
                          <Badge
                            className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 text-xs"
                            variant="outline"
                          >
                            Overdue
                          </Badge>
                        ) : (
                          <Badge
                            className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 text-xs"
                            variant="outline"
                          >
                            Not Overdue
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right flex gap-2 justify-end">
                        {/* Hide quick accept/reject for Resolved complaints */}
                        {complaint.status !== "Resolved" && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => acceptComplaintQuick(complaint.id)}
                              className="bg-green-600 hover:bg-green-700 text-white"
                              aria-label={`Accept complaint ${complaint.title}`}
                              title="Accept"
                            >
                              Accept
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => rejectComplaintQuick(complaint.id)}
                              aria-label={`Reject complaint ${complaint.title}`}
                              title="Reject"
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewAndUpdate(complaint)}
                          className=" dark:hover:text-blue-400"
                          aria-label={`View complaint ${complaint.title}`}
                          title="View complaint"
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards (dashboard shows only recentComplaints) */}
          <div className="md:hidden space-y-4">
            {recentComplaints.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {"No recent complaints assigned to you"}
              </div>
            ) : (
              recentComplaints.map((complaint) => (
                <Card key={complaint.id} className="p-4 shadow-md rounded-2xl">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h3
                          className="font-medium text-sm truncate"
                          title={complaint.title}
                        >
                          {complaint.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          #{complaint.id}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-2 flex-wrap justify-end">
                        <Badge
                          className={`text-xs ${
                            complaint.priority === "Critical"
                              ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                              : complaint.priority === "High"
                              ? "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
                              : complaint.priority === "Medium"
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                              : "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                          }`}
                          variant="outline"
                        >
                          {complaint.priority}
                        </Badge>
                        <Badge
                          className={`text-xs ${
                            complaint.status === "Resolved"
                              ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400"
                              : complaint.status === "In Progress"
                              ? "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400"
                              : complaint.status === "Closed"
                              ? "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400"
                              : "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400"
                          }`}
                          variant="outline"
                        >
                          {complaint.status}
                        </Badge>
                        {isOverdue(complaint) && (
                          <Badge
                            className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 text-xs"
                            variant="outline"
                          >
                            Overdue
                          </Badge>
                        )}
                      </div>
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
                        <span className="font-medium ml-2">
                          {complaint.priority}
                        </span>
                      </div>
                    </div>

                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-sm">
                        {complaint.description.substring(0, 120)}
                        {complaint.description.length > 120 ? "..." : ""}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {complaint.status !== "Resolved" && (
                        <>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => acceptComplaintQuick(complaint.id)}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          >
                            Accept
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => rejectComplaintQuick(complaint.id)}
                            className="flex-1"
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewAndUpdate(complaint)}
                        className="flex-1 hover:bg-primary/10 dark:hover:bg-hover-blue/10"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Footer: link to full My Assigned page to view all complaints */}
          <div className="flex justify-end mt-4 pr-2">
            <Button
              variant="ghost"
              onClick={() => (window.location.href = "/my-assigned")}
            >
              View all assigned complaints
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="px-4 md:px-0">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    goToPage(page - 1);
                  }}
                  className={page === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              {getVisiblePages()[0] !== 1 && (
                <>
                  <PaginationItem className="hidden sm:list-item">
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        goToPage(1);
                      }}
                    >
                      1
                    </PaginationLink>
                  </PaginationItem>
                  <PaginationItem className="hidden sm:list-item">
                    <PaginationEllipsis />
                  </PaginationItem>
                </>
              )}
              {getVisiblePages().map((p) => (
                <PaginationItem key={p} className="hidden sm:list-item">
                  <PaginationLink
                    href="#"
                    isActive={p === page}
                    onClick={(e) => {
                      e.preventDefault();
                      goToPage(p);
                    }}
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ))}
              {getVisiblePages().slice(-1)[0] !== totalPages && (
                <>
                  <PaginationItem className="hidden sm:list-item">
                    <PaginationEllipsis />
                  </PaginationItem>
                  <PaginationItem className="hidden sm:list-item">
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        goToPage(totalPages);
                      }}
                    >
                      {totalPages}
                    </PaginationLink>
                  </PaginationItem>
                </>
              )}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    goToPage(page + 1);
                  }}
                  className={
                    page === totalPages ? "pointer-events-none opacity-50" : ""
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Complaint Action Modal */}
      <RoleBasedComplaintModal
        complaint={selectedComplaint}
        open={showActionModal}
        onOpenChange={setShowActionModal}
        onUpdate={(id, updates) => {
          setComplaints((prev) =>
            prev.map((c) =>
              c.id === id ? { ...c, ...updates, lastUpdated: new Date() } : c
            )
          );
        }}
      >
        {/* Activity Log Table integrated into modal */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Activity Log</h3>
          <ActivityLogTable logs={logs} />
        </div>
      </RoleBasedComplaintModal>

      {/* Activity Log Modal */}
      {showLogModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
          role="dialog"
          aria-modal="true"
          aria-label="Activity Log Modal"
        >
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
              onClick={() => setShowLogModal(false)}
              aria-label="Close activity log modal"
              title="Close"
            >
              ✖
            </button>
            <h3 className="text-lg font-semibold mb-4">Activity Log</h3>
            {logComplaintId && <ActivityLogTable logs={logs} />}
          </div>
        </div>
      )}
    </div>
  );
}
