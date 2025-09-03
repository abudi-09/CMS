import { useState, useEffect, useMemo } from "react";

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
  hodAssignToStaffApi,
  listMyDepartmentActiveStaffApi,
  type InboxComplaint,
} from "@/lib/api";
import { AcceptComplaintModal } from "@/components/modals/AcceptComplaintModal";
import { RejectComplaintModal } from "@/components/modals/RejectComplaintModal";
import { ReopenComplaintModal } from "@/components/modals/ReopenComplaintModal";

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
  // Backend stats (department scoped) replacing local memo
  const [deptStats, setDeptStats] = useState<{
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
    unassigned: number;
  }>({ total: 0, pending: 0, inProgress: 0, resolved: 0, unassigned: 0 });
  const [loadingStats, setLoadingStats] = useState(false);
  const refreshStats = async () => {
    try {
      setLoadingStats(true);
      const s = await getHodComplaintStatsApi();
      if (s && typeof s === "object") {
        setDeptStats({
          total: s.total ?? 0,
          pending: s.pending ?? 0,
          inProgress: s.inProgress ?? 0,
          resolved: s.resolved ?? 0,
          unassigned: s.unassigned ?? 0,
        });
      }
    } catch (e) {
      // swallow
    } finally {
      setLoadingStats(false);
    }
  };

  const { updateComplaint } = useComplaints();
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null
  );
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [overdueFilter, setOverdueFilter] = useState("All");
  const [prioritySort, setPrioritySort] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const { pendingStaff, getAllStaff, user } = useAuth();
  const [deptStaff, setDeptStaff] = useState<
    Array<{
      _id: string;
      name?: string;
      fullName?: string;
      email: string;
      department: string;
    }>
  >([]);
  const navigate = useNavigate();
  // Compute department-scoped stats from fetched complaints
  // Initial stats load + refresh on status change events
  useEffect(() => {
    refreshStats();
    const handler = () => refreshStats();
    window.addEventListener("complaint:status-changed", handler);
    return () =>
      window.removeEventListener("complaint:status-changed", handler);
  }, []); // intentionally single-run for initial stats + event listener

  // HoD inbox for live pending list (latest 100, we show top 3)
  const [hodInbox, setHodInbox] = useState<InboxComplaint[]>([]);
  useEffect(() => {
    let cancelled = false;
    async function loadInbox() {
      try {
        const res = await getHodInboxApi();
        if (!cancelled) setHodInbox(res || []);
      } catch (e) {
        if (typeof console !== "undefined") {
          console.warn("Failed to load HoD inbox", e);
        }
      }
    }
    loadInbox();
    const id = window.setInterval(loadInbox, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  // Load department staff (approved & active) for assignment modal
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await listMyDepartmentActiveStaffApi();
        if (mounted) setDeptStaff(res);
      } catch (e) {
        // silent
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Modal states for shared actions
  const [acceptId, setAcceptId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reopenId, setReopenId] = useState<string | null>(null);
  const openAccept = (id: string) => setAcceptId(id);
  const openReject = (id: string) => setRejectId(id);
  const openReopen = (id: string) => setReopenId(id);

  const afterMutation = async () => {
    const res = await getHodInboxApi();
    setHodInbox(res || []);
    window.dispatchEvent(new CustomEvent("complaint:status-changed"));
    refreshStats();
  };

  const handleAccept = async ({
    id,
    note,
    assignToSelf,
  }: {
    id: string;
    note?: string;
    assignToSelf: boolean;
  }) => {
    try {
      await approveComplaintApi(id, { note, assignToSelf });
      toast({
        title: "Accepted",
        description: "Complaint moved to In Progress.",
      });
      await afterMutation();
    } catch (e) {
      toast({
        title: "Accept failed",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  };
  const handleReject = async ({
    id,
    reason,
  }: {
    id: string;
    reason: string;
  }) => {
    try {
      await updateComplaintStatusApi(id, "Closed", `Rejected: ${reason}`);
      toast({ title: "Rejected", description: "Complaint closed." });
      await afterMutation();
    } catch (e) {
      toast({
        title: "Reject failed",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  };
  const handleReopen = async ({
    id,
    reason,
    acceptImmediately,
  }: {
    id: string;
    reason: string;
    acceptImmediately: boolean;
  }) => {
    try {
      // Reopen by setting back to Pending (with note), then optionally accept
      await updateComplaintStatusApi(id, "Pending", `Reopened: ${reason}`);
      if (acceptImmediately) {
        await approveComplaintApi(id, {
          note: "Auto-accepted after reopening",
          assignToSelf: true,
        });
      }
      toast({
        title: "Reopened",
        description: acceptImmediately
          ? "Complaint reopened and accepted."
          : "Complaint reopened to Pending.",
      });
      await afterMutation();
    } catch (e) {
      toast({
        title: "Reopen failed",
        description: (e as Error).message,
        variant: "destructive",
      });
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
    (async () => {
      try {
        await updateComplaintStatusApi(
          complaintId,
          newStatus as "Pending" | "In Progress" | "Resolved" | "Closed",
          notes?.trim() || undefined
        );
        updateComplaint(complaintId, {
          status: newStatus as Complaint["status"],
          lastUpdated: new Date(),
        });
        window.dispatchEvent(
          new CustomEvent("complaint:status-changed", {
            detail: { id: complaintId },
          })
        );
        toast({
          title: "Status Updated",
          description: `Complaint status updated to ${newStatus}.`,
        });
      } catch (e: unknown) {
        const msg =
          typeof e === "object" && e && "message" in e
            ? String((e as { message?: unknown }).message)
            : "Failed to update status";
        toast({
          title: "Update failed",
          description: msg,
          variant: "destructive",
        });
      }
    })();
  };

  const handleAssignStaff = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setShowAssignModal(true);
  };

  const handleStaffAssignment = async (
    complaintId: string,
    staffId: string,
    notes: string,
    deadline?: string
  ) => {
    try {
      await hodAssignToStaffApi(complaintId, {
        staffId,
        deadline: deadline || undefined,
      });
      await afterMutation();
      const staff =
        deptStaff.find((s) => s._id === staffId) ||
        getAllStaff().find((s) => s.id === staffId);
      toast({
        title: "Staff Assigned",
        description: `Assigned to ${
          staff?.fullName || staff?.name || staff?.email || "Staff"
        }${
          deadline
            ? ` (deadline ${new Date(deadline).toLocaleDateString()})`
            : ""
        }`,
      });
    } catch (e) {
      toast({
        title: "Assignment failed",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  };

  // (Legacy dashboard filtering removed; stats now from backend)

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

  // no-op placeholder removed (was causing lint error)

  // Helper: get complaint id safely
  function getComplaintId(c: unknown) {
    const obj = c as unknown as Record<string, unknown>;
    return String(obj?.id ?? obj?._id ?? "");
  }

  // Helper: get submitter display name
  function getSubmitterName(c: unknown) {
    const obj = c as unknown as Record<string, unknown>;
    const sb = obj["submittedBy"];
    if (!sb) return "Unknown";
    if (typeof sb === "string") return sb;
    if (typeof sb === "object") {
      const sbo = sb as Record<string, unknown>;
      return String(
        sbo["fullName"] ?? sbo["name"] ?? sbo["email"] ?? "Unknown"
      );
    }
    return String(sb);
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
            <div className="text-2xl font-bold">
              {deptStats.total}
              {loadingStats && (
                <span className="ml-2 animate-pulse text-xs text-muted-foreground">
                  ...
                </span>
              )}
            </div>
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
              {deptStats.unassigned} unassigned complaints
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
                    onClick={() => {
                      setSelectedComplaint({
                        id: String(c.id),
                        title: c.title || "Complaint",
                        description: "", // placeholder (will be refetched in modal)
                        category: c.category || "General",
                        status: (c.status as Complaint["status"]) || "Pending",
                        submittedBy:
                          typeof c.submittedBy === "string"
                            ? c.submittedBy
                            : c.submittedBy?.name || "",
                        priority:
                          (c.priority as Complaint["priority"]) || "Medium",
                        submittedDate: c.submittedDate
                          ? new Date(c.submittedDate)
                          : new Date(),
                        lastUpdated: c.lastUpdated
                          ? new Date(c.lastUpdated)
                          : new Date(),
                        assignedStaff: undefined,
                      } as Complaint);
                      setShowDetailModal(true);
                    }}
                  >
                    View Detail
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setSelectedComplaint({
                        id: String(c.id),
                        title: c.title || "Complaint",
                        description: "",
                        category: c.category || "General",
                        status: (c.status as Complaint["status"]) || "Pending",
                        submittedBy:
                          typeof c.submittedBy === "string"
                            ? c.submittedBy
                            : c.submittedBy?.name || "",
                        priority:
                          (c.priority as Complaint["priority"]) || "Medium",
                        submittedDate: c.submittedDate
                          ? new Date(c.submittedDate)
                          : new Date(),
                        lastUpdated: c.lastUpdated
                          ? new Date(c.lastUpdated)
                          : new Date(),
                        assignedStaff: undefined,
                      } as Complaint);
                      openAccept(String(c.id));
                    }}
                    className="w-full"
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setSelectedComplaint({
                        id: String(c.id),
                        title: c.title || "Complaint",
                        description: "",
                        category: c.category || "General",
                        status: (c.status as Complaint["status"]) || "Pending",
                        submittedBy:
                          typeof c.submittedBy === "string"
                            ? c.submittedBy
                            : c.submittedBy?.name || "",
                        priority:
                          (c.priority as Complaint["priority"]) || "Medium",
                        submittedDate: c.submittedDate
                          ? new Date(c.submittedDate)
                          : new Date(),
                        lastUpdated: c.lastUpdated
                          ? new Date(c.lastUpdated)
                          : new Date(),
                        assignedStaff: undefined,
                      } as Complaint);
                      openReject(String(c.id));
                    }}
                    className="w-full"
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedComplaint({
                        id: String(c.id),
                        title: c.title || "Complaint",
                        description: "",
                        category: c.category || "General",
                        status: (c.status as Complaint["status"]) || "Pending",
                        submittedBy:
                          typeof c.submittedBy === "string"
                            ? c.submittedBy
                            : c.submittedBy?.name || "",
                        priority:
                          (c.priority as Complaint["priority"]) || "Medium",
                        submittedDate: c.submittedDate
                          ? new Date(c.submittedDate)
                          : new Date(),
                        lastUpdated: c.lastUpdated
                          ? new Date(c.lastUpdated)
                          : new Date(),
                        assignedStaff: undefined,
                      } as Complaint);
                      setShowAssignModal(true);
                    }}
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
                          onClick={() => {
                            setSelectedComplaint({
                              id: String(c.id),
                              title: c.title || "Complaint",
                              description: "",
                              category: c.category || "General",
                              status:
                                (c.status as Complaint["status"]) || "Pending",
                              submittedBy:
                                typeof c.submittedBy === "string"
                                  ? c.submittedBy
                                  : c.submittedBy?.name || "",
                              priority:
                                (c.priority as Complaint["priority"]) ||
                                "Medium",
                              submittedDate: c.submittedDate
                                ? new Date(c.submittedDate)
                                : new Date(),
                              lastUpdated: c.lastUpdated
                                ? new Date(c.lastUpdated)
                                : new Date(),
                              assignedStaff: undefined,
                            } as Complaint);
                            setShowDetailModal(true);
                          }}
                          className="text-xs"
                        >
                          View Detail
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-xs"
                          onClick={() => {
                            setSelectedComplaint({
                              id: String(c.id),
                              title: c.title || "Complaint",
                              description: "",
                              category: c.category || "General",
                              status:
                                (c.status as Complaint["status"]) || "Pending",
                              submittedBy:
                                typeof c.submittedBy === "string"
                                  ? c.submittedBy
                                  : c.submittedBy?.name || "",
                              priority:
                                (c.priority as Complaint["priority"]) ||
                                "Medium",
                              submittedDate: c.submittedDate
                                ? new Date(c.submittedDate)
                                : new Date(),
                              lastUpdated: c.lastUpdated
                                ? new Date(c.lastUpdated)
                                : new Date(),
                              assignedStaff: undefined,
                            } as Complaint);
                            openAccept(String(c.id));
                          }}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="text-xs"
                          onClick={() => {
                            setSelectedComplaint({
                              id: String(c.id),
                              title: c.title || "Complaint",
                              description: "",
                              category: c.category || "General",
                              status:
                                (c.status as Complaint["status"]) || "Pending",
                              submittedBy:
                                typeof c.submittedBy === "string"
                                  ? c.submittedBy
                                  : c.submittedBy?.name || "",
                              priority:
                                (c.priority as Complaint["priority"]) ||
                                "Medium",
                              submittedDate: c.submittedDate
                                ? new Date(c.submittedDate)
                                : new Date(),
                              lastUpdated: c.lastUpdated
                                ? new Date(c.lastUpdated)
                                : new Date(),
                              assignedStaff: undefined,
                            } as Complaint);
                            openReject(String(c.id));
                          }}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => {
                            setSelectedComplaint({
                              id: String(c.id),
                              title: c.title || "Complaint",
                              description: "",
                              category: c.category || "General",
                              status:
                                (c.status as Complaint["status"]) || "Pending",
                              submittedBy:
                                typeof c.submittedBy === "string"
                                  ? c.submittedBy
                                  : c.submittedBy?.name || "",
                              priority:
                                (c.priority as Complaint["priority"]) ||
                                "Medium",
                              submittedDate: c.submittedDate
                                ? new Date(c.submittedDate)
                                : new Date(),
                              lastUpdated: c.lastUpdated
                                ? new Date(c.lastUpdated)
                                : new Date(),
                              assignedStaff: undefined,
                            } as Complaint);
                            setShowAssignModal(true);
                          }}
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
        userRole="hod"
      />
      <AssignStaffModal
        complaint={selectedComplaint}
        open={showAssignModal}
        onOpenChange={setShowAssignModal}
        onAssign={handleStaffAssignment}
        staffList={deptStaff.map((s) => ({
          id: s._id,
          name: s.name,
          fullName: s.fullName,
          email: s.email,
          department: s.department,
        }))}
      />
      {/* Shared action modals */}
      <AcceptComplaintModal
        open={!!acceptId}
        complaintId={acceptId}
        onOpenChange={(o) => !o && setAcceptId(null)}
        onAccepted={handleAccept}
      />
      <RejectComplaintModal
        open={!!rejectId}
        complaintId={rejectId}
        onOpenChange={(o) => !o && setRejectId(null)}
        onRejected={handleReject}
      />
      <ReopenComplaintModal
        open={!!reopenId}
        complaintId={reopenId}
        onOpenChange={(o) => !o && setReopenId(null)}
        onReopen={handleReopen}
      />
    </div>
  );
}
// Safely extract an assigned user id from a loosely-typed complaint-like object
function getAssignedId(c: unknown): string {
  if (!c) return "";
  const obj = c as Record<string, unknown>;
  // Common shapes: assignedTo can be an id string or an object with id/_id
  const assignedTo = obj["assignedTo"];
  if (typeof assignedTo === "string") return assignedTo;
  if (assignedTo && typeof assignedTo === "object") {
    const at = assignedTo as Record<string, unknown>;
    const val = at["_id"] ?? at["id"]; // support either key
    if (typeof val === "string") return val;
  }
  // Some UIs keep a direct id field
  const altId =
    obj["assignedToId"] || obj["assigneeId"] || obj["assignedStaffId"]; // fallback keys
  if (typeof altId === "string") return altId;
  return "";
}
