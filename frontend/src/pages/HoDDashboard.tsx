import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserCheck,
  MessageSquare,
  TrendingUp,
  Search,
  Filter,
  Clock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SummaryCards } from "@/components/SummaryCards";
import { ComplaintTable } from "@/components/ComplaintTable";
import { RoleBasedComplaintModal } from "@/components/RoleBasedComplaintModal";
import { StatusUpdateModal } from "@/components/StatusUpdateModal";
import { AssignStaffModal } from "@/components/AssignStaffModal";
import { Complaint } from "@/components/ComplaintCard";
import { useComplaints } from "@/context/ComplaintContext";
import {
  getHodComplaintStatsApi,
  getHodInboxApi,
  approveComplaintApi,
  updateComplaintStatusApi,
  type InboxComplaint,
} from "@/lib/api";
import { useAuth } from "@/components/auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function HoDDashboard() {
  // Live complaints for other widgets if needed in the future
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const { updateComplaint } = useComplaints();
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null
  );
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [prioritySort, setPrioritySort] = useState<"asc" | "desc">("desc");

  const { pendingStaff, getAllStaff, user } = useAuth();
  const navigate = useNavigate();
  // Backend department-scoped stats
  const [deptStats, setDeptStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
  });

  // Load department stats from backend (HoD only)
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const s = await getHodComplaintStatsApi();
        if (cancelled) return;
        setDeptStats({
          total: s.total ?? 0,
          pending: s.pending ?? 0,
          inProgress: s.inProgress ?? 0,
          resolved: s.resolved ?? 0,
        });
      } catch {
        // keep previous stats
      }
    }
    load();
    const id = window.setInterval(load, 30000);
    // Also update on status-change events fired elsewhere in the app
    const handler = () => load();
    window.addEventListener(
      "complaint:status-changed",
      handler as EventListener
    );
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener(
        "complaint:status-changed",
        handler as EventListener
      );
    };
  }, []);

  // HoD inbox for live pending list (latest 100, we show top 3)
  const [hodInbox, setHodInbox] = useState<InboxComplaint[]>([]);
  useEffect(() => {
    let cancelled = false;
    async function loadInbox() {
      try {
        const res = await getHodInboxApi();
        if (!cancelled) setHodInbox(res || []);
      } catch {
        // ignore
      }
    }
    loadInbox();
    const id = window.setInterval(loadInbox, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const acceptFromInbox = async (id: string) => {
    try {
      await approveComplaintApi(id, { assignToSelf: true });
      const res = await getHodInboxApi();
      setHodInbox(res || []);
      window.dispatchEvent(new Event("complaint:status-changed"));
    } catch {
      // ignore approve errors
    }
  };

  const rejectFromInbox = async (id: string) => {
    try {
      await updateComplaintStatusApi(id, "Closed", "Rejected by HoD");
      const res = await getHodInboxApi();
      setHodInbox(res || []);
      window.dispatchEvent(new Event("complaint:status-changed"));
    } catch {
      // ignore reject errors
    }
  };

  // New staff signup notifications for HODs
  const [newStaffNotifications, setNewStaffNotifications] = useState<
    { name: string; email: string; department?: string }[]
  >([]);

  // Listen for in-page staff creation events (signup page dispatches this)
  useEffect(() => {
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent).detail as {
        name: string;
        email: string;
        department?: string;
      };
      // Only notify if the new staff is in this HOD's department
      if (!detail) return;
      if (user?.department && detail.department === user.department) {
        setNewStaffNotifications((prev) => [detail, ...prev].slice(0, 5));
        toast({
          title: "New Staff Signup",
          description: `${detail.name} has signed up for ${detail.department}.`,
        });
      }
    };
    window.addEventListener("staff:created", handler as EventListener);
    return () =>
      window.removeEventListener("staff:created", handler as EventListener);
  }, [user?.department]);

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
    updateComplaint(complaintId, {
      status: newStatus as Complaint["status"],
      lastUpdated: new Date(),
    });
  };

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
    updateComplaint(complaintId, {
      assignedStaff: staff?.fullName || staff?.name || "Unknown",
      lastUpdated: new Date(),
    });
    toast({
      title: "Staff Assigned",
      description: `Complaint has been assigned to ${
        staff?.fullName || staff?.name
      }`,
    });
  };

  // Add priority filter and sort to filtering logic
  const filteredComplaints = complaints.filter((complaint) => {
    const matchesSearch =
      complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.submittedBy.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || complaint.status === statusFilter;
    const matchesCategory =
      categoryFilter === "all" || complaint.category === categoryFilter;
    const matchesPriority =
      priorityFilter === "all" || complaint.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesCategory && matchesPriority;
  });
  // Sort by priority if enabled
  const priorityOrder = { Critical: 4, High: 3, Medium: 2, Low: 1 };
  const sortedComplaints = [...filteredComplaints].sort((a, b) => {
    const aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
    const bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
    return prioritySort === "desc" ? bValue - aValue : aValue - bValue;
  });

  const categories = Array.from(new Set(complaints.map((c) => c.category)));
  const priorities = ["Critical", "High", "Medium", "Low"];

  // Overdue helper: unassigned Pending/Unassigned should not be marked overdue
  const isOverdue = (complaint: Complaint) => {
    if (
      (complaint.status === "Pending" || complaint.status === "Unassigned") &&
      !complaint.assignedStaff &&
      !complaint.assignedStaffRole
    ) {
      return false;
    }
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

  // Recently Pending: compute from live inbox
  const visibleRecentPending = [...(hodInbox || [])]
    .map((c) => ({
      id: String(c.id || ""),
      title: String(c.title || "Complaint"),
      description: "",
      category: String(c.category || "General"),
      priority: (c.priority as Complaint["priority"]) || "Medium",
      status: (c.status as Complaint["status"]) || "Pending",
      submittedBy:
        typeof c.submittedBy === "string"
          ? c.submittedBy
          : (c.submittedBy as { name?: string })?.name || "",
      submittedDate: c.submittedDate ? new Date(c.submittedDate) : new Date(),
      lastUpdated: c.lastUpdated ? new Date(c.lastUpdated) : new Date(),
      assignedStaff: undefined,
    }))
    .filter((c) => c.status === "Pending")
    .sort(
      (a, b) =>
        new Date(b.submittedDate).getTime() -
        new Date(a.submittedDate).getTime()
    )
    .slice(0, 3);

  function setRecentPool(arg0: (prev: any) => any) {
    throw new Error("Function not implemented.");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold"> Head Department Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor and manage all complaints
        </p>
      </div>

      {/* Summary Cards - department scoped for HoD */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle>Total Complaints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deptStats.total}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle>Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deptStats.pending}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle>In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deptStats.inProgress}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle>Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deptStats.resolved}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Staff Notifications */}
      {pendingStaff.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Clock className="h-5 w-5" />
              Pending staff Approvals
            </CardTitle>
            <CardDescription className="text-orange-700">
              {pendingStaff.length} staff member
              {pendingStaff.length > 1 ? "s" : ""} waiting for approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                {pendingStaff.slice(0, 3).map((staff) => (
                  <div key={staff.id} className="text-sm text-orange-800">
                    • {staff.fullName || staff.name} ({staff.department})
                  </div>
                ))}
                {pendingStaff.length > 3 && (
                  <div className="text-sm text-orange-700">
                    +{pendingStaff.length - 3} more...
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => navigate("/hod/staff-management?tab=pending")}
                className="text-orange-700 border-orange-300 hover:bg-orange-100"
              >
                Review Applications
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* ...existing quick action cards... */}
        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => navigate("/hod/staff-management?tab=pending")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Staff Management
              {pendingStaff.length > 0 && (
                <Badge className="bg-orange-100 text-orange-800 ml-auto">
                  {pendingStaff.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Approve staff and manage roles</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Manage Staff
            </Button>
          </CardContent>
        </Card>

        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => navigate("/all-complaints")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              All Complaints
            </CardTitle>
            <CardDescription>Review user feedback and ratings</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              View Complaints
            </Button>
          </CardContent>
        </Card>

        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => navigate("/hod/assign-complaints")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Assign & Reassign
            </CardTitle>
            <CardDescription>
              {complaints.filter((c) => !c.assignedStaff).length} unassigned
              complaints
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Assign Complaints
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recently Pending (live HoD inbox, top 3) */}
      <Card>
        <CardHeader>
          <CardTitle>Recently Pending Complaints</CardTitle>
          <CardDescription>Top 3 pending complaints for HoD</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mobile: stacked cards */}
          <div className="space-y-3 md:hidden">
            {hodInbox.slice(0, 3).map((c) => (
              <Card key={String(c.id)} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="text-xs text-muted-foreground">
                      #{String(c.id)}
                    </div>
                    <div className="font-medium text-sm">{c.title}</div>
                    <div className="text-xs text-muted-foreground">
                      Category: {c.category || "General"}
                    </div>
                    {c.deadline && (
                      <div className="text-xs text-muted-foreground">
                        Deadline: {new Date(c.deadline).toLocaleDateString()}
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <Badge className="text-xs bg-yellow-100 text-yellow-800">
                        Pending
                      </Badge>
                      <Badge
                        className={
                          (c.priority === "Low" &&
                            "text-xs bg-gray-200 text-gray-700 border-gray-300") ||
                          (c.priority === "Medium" &&
                            "text-xs bg-blue-100 text-blue-800 border-blue-200") ||
                          (c.priority === "High" &&
                            "text-xs bg-orange-100 text-orange-800 border-orange-200") ||
                          (c.priority === "Critical" &&
                            "text-xs bg-red-100 text-red-800 border-red-200 font-bold border-2") ||
                          "text-xs bg-blue-100 text-blue-800 border-blue-200"
                        }
                      >
                        {c.priority || "Medium"}
                      </Badge>
                      <Badge
                        className="text-xs bg-green-100 text-green-800 border-green-200"
                        variant="outline"
                      >
                        On Time
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Assignee:{" "}
                      <span className="font-medium">Not Yet Assigned</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="col-span-2"
                    onClick={() => setShowDetailModal(true)}
                  >
                    View Detail
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => acceptFromInbox(String(c.id))}
                    className="w-full"
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => rejectFromInbox(String(c.id))}
                    className="w-full"
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAssignModal(true)}
                    className="col-span-2 w-full"
                  >
                    Assign
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop: table with horizontal scroll */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-sm">Title</TableHead>
                  <TableHead className="text-sm">Category</TableHead>
                  <TableHead className="text-sm">Priority</TableHead>
                  <TableHead className="text-sm">Status</TableHead>
                  <TableHead className="text-sm">Assignee</TableHead>
                  <TableHead className="text-sm">Overdue</TableHead>
                  <TableHead className="text-sm">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hodInbox.slice(0, 3).map((c) => (
                  <TableRow key={String(c.id)}>
                    <TableCell className="font-medium text-sm">
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          {c.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Submitted by{" "}
                          {typeof c.submittedBy === "string"
                            ? c.submittedBy
                            : c.submittedBy?.name}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.category || "General"}
                    </TableCell>
                    <TableCell className="text-sm">
                      <Badge
                        className={
                          (c.priority === "Low" &&
                            "bg-gray-200 text-gray-700 border-gray-300") ||
                          (c.priority === "Medium" &&
                            "bg-blue-100 text-blue-800 border-blue-200") ||
                          (c.priority === "High" &&
                            "bg-orange-100 text-orange-800 border-orange-200") ||
                          (c.priority === "Critical" &&
                            "bg-red-100 text-red-800 border-red-200 font-bold border-2") ||
                          "bg-blue-100 text-blue-800 border-blue-200"
                        }
                      >
                        {c.priority || "Medium"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                        Pending
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs font-medium">
                        Not Yet Assigned
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className="bg-green-100 text-green-800 border-green-200 text-xs"
                        variant="outline"
                      >
                        Not Overdue
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 items-center flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowDetailModal(true)}
                          className="text-xs"
                        >
                          View Detail
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-xs"
                          onClick={() => acceptFromInbox(String(c.id))}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="text-xs"
                          onClick={() => rejectFromInbox(String(c.id))}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => setShowAssignModal(true)}
                        >
                          Assign
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <RoleBasedComplaintModal
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        complaint={selectedComplaint}
      />

      <StatusUpdateModal
        complaint={selectedComplaint}
        open={showStatusModal}
        onOpenChange={setShowStatusModal}
        onUpdate={handleStatusSubmit}
        userRole="admin"
      />
      <AssignStaffModal
        complaint={selectedComplaint}
        open={showAssignModal}
        onOpenChange={setShowAssignModal}
        onAssign={(complaintId, staffId, notes) => {
          // Update global context (optional) and local recent pool
          handleStaffAssignment(complaintId, staffId, notes);
          setRecentPool((prev) =>
            prev.map((c) =>
              c.id === complaintId
                ? {
                    ...c,
                    assignedStaff:
                      getAllStaff().find((s) => s.id === staffId)?.fullName ||
                      getAllStaff().find((s) => s.id === staffId)?.name ||
                      "Unknown",
                    assignedStaffRole: "staff",
                    status: "In Progress",
                    lastUpdated: new Date(),
                  }
                : c
            )
          );
        }}
      />
    </div>
  );
}
