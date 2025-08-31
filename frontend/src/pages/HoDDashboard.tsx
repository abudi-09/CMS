// For demo/testing: import mockComplaint
import { mockComplaint } from "@/lib/mockComplaint";
import { useEffect, useState, useMemo } from "react";
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
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loadingRecent, setLoadingRecent] = useState<boolean>(true);

  // Hoisted helper to get assigned id (function declaration so it's available before use)
  function getAssignedId(c: unknown): string | null {
    if (!c || typeof c !== "object") return null;
    const obj = c as Record<string, unknown>;
    const fields = [
      "assignedTo",
      "assignedStaff",
      "recipientStaffId",
      "assignedStaffId",
      "assignedBy",
      "recipientHodId",
    ];
    for (const f of fields) {
      const v = obj[f];
      if (v !== undefined && v !== null) return String(v);
    }
    return null;
  }

  // Helper: get the current user's id safely
  function getUserId(): string | null {
    const u = user as unknown as Record<string, unknown> | null;
    if (!u) return null;
    const id = u["_id"] ?? u["id"] ?? u["username"] ?? u["email"];
    return id ? String(id) : null;
  }

  // Helper: get submission time safely
  function getSubmittedTime(c: unknown): number {
    const obj = c as unknown as Record<string, unknown>;
    const sd = obj["submittedDate"] ?? obj["createdAt"] ?? Date.now();
    return new Date(String(sd)).getTime();
  }

  useEffect(() => {
    async function fetchComplaints() {
      setLoadingRecent(true);
      try {
        const res = await fetch(`/api/complaints`, { credentials: "include" });
        const data = await res.json();
        setComplaints(Array.isArray(data) ? data : []);
      } catch (err) {
        setComplaints([]);
      } finally {
        setLoadingRecent(false);
      }
    }
    fetchComplaints();
  }, []);
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
  const navigate = useNavigate();
  // Compute department-scoped stats from fetched complaints
  const stats = useMemo(() => {
    const role = String(user?.role || "").toLowerCase();
    const isHod = role.includes("hod");

    const visible = complaints.filter((c) => {
      if (isHod) {
        const assigned = getAssignedId(c as any);
        return String(assigned) === String((user as any)?._id);
      }
      const dept = user?.department;
      if (dept)
        return (
          String(c.department) === String(dept) ||
          String(getAssignedId(c as any)) === String((user as any)?._id)
        );
      return true;
    });

    return {
      total: visible.length,
      pending: visible.filter((c) => c.status === "Pending").length,
      inProgress: visible.filter((c) => c.status === "In Progress").length,
      resolved: visible.filter((c) => c.status === "Resolved").length,
    };
  }, [complaints, user]);

  useEffect(() => {
    console.log(
      `HoD stats - total: ${stats.total}, pending: ${stats.pending}, inProgress: ${stats.inProgress}, resolved: ${stats.resolved}`
    );
  }, [stats.total, stats.pending, stats.inProgress, stats.resolved]);

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

  // Recently Pending: derive top 3 unassigned pending complaints from real data
  // Recent pending complaints (real data):
  // - For HoD: include complaints already assigned to this HoD (recent) AND unassigned pending complaints in their department.
  // - For others (admin/dean): show dept-scoped unassigned pending complaints
  const visibleRecentPending = (() => {
    const myId = getUserId();
    const dept = user?.department;

    // Assigned to me
    const assignedToMe = myId
      ? complaints.filter((c) => {
          const assigned = getAssignedId(c);
          return assigned && String(assigned) === String(myId);
        })
      : [];

    // Unassigned pending in department
    const unassignedDept = complaints.filter((c) => {
      const obj = c as unknown as Record<string, unknown>;
      const status = String(obj["status"] ?? "").toLowerCase();
      const assigned = getAssignedId(c);
      const isUnassigned = !assigned;
      const deptMatch = dept
        ? String(obj["department"]) === String(dept)
        : true;
      return (
        (status === "pending" || status === "unassigned") &&
        isUnassigned &&
        deptMatch
      );
    });

    // Merge and dedupe by id (preserve first occurrence order: assignedToMe first)
    const merged = [...assignedToMe, ...unassignedDept];
    const seen = new Map<string, unknown>();
    for (const item of merged) {
      const obj = item as unknown as Record<string, unknown>;
      const cid = String(obj["id"] ?? obj["_id"] ?? "");
      if (cid && !seen.has(cid)) seen.set(cid, item);
    }
    const uniques = Array.from(seen.values()) as unknown[];

    // Sort by submitted time desc and take top 3
    return uniques
      .sort((a, b) => getSubmittedTime(b) - getSubmittedTime(a))
      .slice(0, 3) as Complaint[];
  })();

  const handleAccept = (id: string) => {
    const assignee =
      user?.fullName || user?.name || user?.email || "Head of Department";
    setComplaints((prev) =>
      prev.map((c) => {
        const obj = c as unknown as Record<string, unknown>;
        const cid = String(obj["id"] ?? obj["_id"] ?? "");
        if (cid === String(id)) {
          return {
            ...c,
            status: "In Progress",
            assignedStaff: assignee,
            assignedStaffRole: "headOfDepartment",
            lastUpdated: new Date(),
          } as Complaint;
        }
        return c;
      })
    );
    // Optionally call updateComplaint to persist change via API
  };

  const handleReject = (id: string) => {
    setComplaints((prev) =>
      prev.map((c) => {
        const obj = c as unknown as Record<string, unknown>;
        const cid = String(obj["id"] ?? obj["_id"] ?? "");
        if (cid === String(id)) {
          return { ...c, status: "Closed" } as Complaint;
        }
        return c;
      })
    );
    // Optionally call updateComplaint to persist change via API
  };

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
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle>Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle>In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle>Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.resolved}</div>
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

      {/* Recently Pending (like HoD Pending tab) */}
      <Card>
        <CardHeader>
          <CardTitle>Recently Pending Complaints</CardTitle>
          {loadingRecent ? <CardDescription>Loading...</CardDescription> : null}
        </CardHeader>
        <CardContent>
          {/* Mobile: stacked cards */}
          <div className="space-y-3 md:hidden">
            {loadingRecent ? (
              <div className="text-center py-6 text-muted-foreground">
                Loading...
              </div>
            ) : visibleRecentPending.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                No recent pending complaints
              </div>
            ) : (
              visibleRecentPending.map((complaint) => (
                <Card key={getComplaintId(complaint)} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="text-xs text-muted-foreground">
                        #{complaint.id}
                      </div>
                      <div className="font-medium text-sm">
                        {complaint.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Category: {complaint.category}
                      </div>
                      {complaint.deadline && (
                        <div className="text-xs text-muted-foreground">
                          Deadline:{" "}
                          {new Date(complaint.deadline).toLocaleDateString()}
                        </div>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        <Badge className="text-xs bg-yellow-100 text-yellow-800">
                          {complaint.status === "Unassigned"
                            ? "Pending"
                            : complaint.status}
                        </Badge>
                        <Badge
                          className={
                            (complaint.priority === "Low" &&
                              "text-xs bg-gray-200 text-gray-700 border-gray-300") ||
                            (complaint.priority === "Medium" &&
                              "text-xs bg-blue-100 text-blue-800 border-blue-200") ||
                            (complaint.priority === "High" &&
                              "text-xs bg-orange-100 text-orange-800 border-orange-200") ||
                            (complaint.priority === "Critical" &&
                              "text-xs bg-red-100 text-red-800 border-red-200 font-bold border-2") ||
                            "text-xs bg-blue-100 text-blue-800 border-blue-200"
                          }
                        >
                          {complaint.priority || "Medium"}
                        </Badge>
                        {isOverdue(complaint) ? (
                          <Badge
                            className="text-xs bg-red-100 text-red-800 border-red-200"
                            variant="outline"
                          >
                            Overdue
                          </Badge>
                        ) : (
                          <Badge
                            className="text-xs bg-green-100 text-green-800 border-green-200"
                            variant="outline"
                          >
                            On Time
                          </Badge>
                        )}
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
                      onClick={() => handleViewComplaint(complaint)}
                    >
                      View Detail
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleAccept(complaint.id)}
                      className="w-full"
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(complaint.id)}
                      className="w-full"
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAssignStaff(complaint)}
                      className="col-span-2 w-full"
                    >
                      Assign
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Desktop: table with horizontal scroll */}
          <div className="hidden md:block overflow-x-auto">
            {loadingRecent ? (
              <div className="text-center py-6 text-muted-foreground">
                Loading...
              </div>
            ) : visibleRecentPending.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                No recent pending complaints
              </div>
            ) : (
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
                  {visibleRecentPending.map((complaint) => (
                    <TableRow key={getComplaintId(complaint)}>
                      <TableCell className="font-medium text-sm">
                        <div>
                          <div className="font-semibold flex items-center gap-2">
                            {complaint.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Submitted by {getSubmitterName(complaint)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {complaint.category}
                      </TableCell>
                      <TableCell className="text-sm">
                        <Badge
                          className={
                            (complaint.priority === "Low" &&
                              "bg-gray-200 text-gray-700 border-gray-300") ||
                            (complaint.priority === "Medium" &&
                              "bg-blue-100 text-blue-800 border-blue-200") ||
                            (complaint.priority === "High" &&
                              "bg-orange-100 text-orange-800 border-orange-200") ||
                            (complaint.priority === "Critical" &&
                              "bg-red-100 text-red-800 border-red-200 font-bold border-2") ||
                            "bg-blue-100 text-blue-800 border-blue-200"
                          }
                        >
                          {complaint.priority || "Medium"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {complaint.status !== "Unassigned" && (
                          <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                            {complaint.status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs font-medium">
                          Not Yet Assigned
                        </span>
                      </TableCell>
                      <TableCell>
                        {isOverdue(complaint) ? (
                          <Badge
                            className="bg-red-100 text-red-800 border-red-200 text-xs"
                            variant="outline"
                          >
                            Overdue
                          </Badge>
                        ) : (
                          <Badge
                            className="bg-green-100 text-green-800 border-green-200 text-xs"
                            variant="outline"
                          >
                            Not Overdue
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 items-center flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewComplaint(complaint)}
                            className="text-xs"
                          >
                            View Detail
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="text-xs"
                            onClick={() => handleAccept(complaint.id)}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="text-xs"
                            onClick={() => handleReject(complaint.id)}
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => handleAssignStaff(complaint)}
                          >
                            Assign
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
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
          setComplaints((prev) =>
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
