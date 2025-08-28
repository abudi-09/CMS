import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// Replacing ComplaintTable with a custom pending-style table to match Assign & Reassign page
import { RoleBasedComplaintModal } from "@/components/RoleBasedComplaintModal";
import { Complaint } from "@/components/ComplaintCard";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Clock, MessageSquare, UserCheck, Users } from "lucide-react";
import {
  getDeanPendingHodApi,
  listAllComplaintsApi,
  getDeanVisibleComplaintStatsApi,
} from "@/lib/api";

// Utilities
const toDate = (d?: string | Date | null) => (d ? new Date(d) : new Date());

// Pending dean approvals (fetched from backend)
// Shape used in UI
type PendingStaff = { id: string; fullName: string; department?: string };

export function DeanDashboard() {
  const navigate = useNavigate();
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null
  );
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [pendingStaff, setPendingStaff] = useState<PendingStaff[]>([]);
  const [summaryData, setSummaryData] = useState<
    { label: string; value: number }[]
  >([
    { label: "Total Complaints", value: 0 },
    { label: "Pending", value: 0 },
    { label: "In Progress", value: 0 },
    { label: "Resolved", value: 0 },
  ]);

  const fetchPending = useCallback(async () => {
    try {
      const data = await getDeanPendingHodApi();
      // API returns array of users
      const mapped: PendingStaff[] = (data || []).map((u: unknown) => {
        const obj = u as {
          _id?: string;
          id?: string;
          fullName?: string;
          name?: string;
          username?: string;
          department?: string;
        };
        return {
          id: obj._id || obj.id || String(Math.random()),
          fullName: obj.fullName || obj.name || obj.username || "",
          department: obj.department || "",
        };
      });
      setPendingStaff(mapped);
    } catch (err) {
      // swallow; dashboard shouldn't crash on fetch failure
      console.error("Failed to load pending HODs", err);
    }
  }, []);

  useEffect(() => {
    fetchPending();
    const handler = () => fetchPending();
    window.addEventListener("hod:updated", handler);
    return () => window.removeEventListener("hod:updated", handler);
  }, [fetchPending]);
  // Local state to allow Accept/Reject updates in the dashboard table
  const [complaints, setComplaints] = useState<Complaint[]>([]);

  // Load real complaints and stats for dean
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        console.log("Loading dean dashboard data...");
        const [rawComplaints, stats] = await Promise.all([
          listAllComplaintsApi(),
          getDeanVisibleComplaintStatsApi(),
        ]);
        console.log("Dean stats response:", stats);
        console.log("Raw complaints count:", rawComplaints.length);
        if (cancelled) return;
        type Raw = {
          id: string;
          title: string;
          status?: string;
          priority?: "Low" | "Medium" | "High" | "Critical";
          deadline?: string | null;
          submittedBy?: string | null;
          assignedTo?: string | null;
          category?: string | null;
          description?: string | null;
          submittedDate?: string | null;
          lastUpdated?: string | null;
          createdAt?: string | null;
          updatedAt?: string | null;
          feedback?: { rating?: number; comment?: string } | null;
          isEscalated?: boolean;
          department?: string | null;
        };
        const mapped: Complaint[] = (rawComplaints as Raw[]).map((c) => ({
          id: c.id,
          title: c.title,
          status: (c.status as Complaint["status"]) || "Pending",
          priority: c.priority || "Medium",
          deadline: c.deadline ? new Date(c.deadline) : undefined,
          submittedBy: c.submittedBy || "",
          assignedStaff: c.assignedTo || undefined,
          // Backend doesn't send role; leave undefined
          category: c.category || "General",
          description: c.description || "",
          submittedDate: toDate(c.submittedDate || c.createdAt || undefined),
          assignedDate: undefined,
          lastUpdated: toDate(c.lastUpdated || c.updatedAt || undefined),
          feedback: (c.feedback as Complaint["feedback"]) || undefined,
          isEscalated: !!c.isEscalated,
          department: c.department || undefined,
        }));
        setComplaints(mapped);
        setSummaryData([
          { label: "Total Complaints", value: stats.total ?? 0 },
          { label: "Pending", value: stats.pending ?? 0 },
          { label: "In Progress", value: stats.inProgress ?? 0 },
          { label: "Resolved", value: stats.resolved ?? 0 },
        ]);
        console.log("Summary data set:", [
          { label: "Total Complaints", value: stats.total ?? 0 },
          { label: "Pending", value: stats.pending ?? 0 },
          { label: "In Progress", value: stats.inProgress ?? 0 },
          { label: "Resolved", value: stats.resolved ?? 0 },
        ]);
      } catch (err) {
        console.error("Failed to load dean dashboard data", err);
      }
    }
    load();
    const id = window.setInterval(load, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const statusColors = {
    Pending: "bg-yellow-100 text-yellow-800",
    "In Progress": "bg-blue-100 text-blue-800",
    Resolved: "bg-green-100 text-green-800",
    Closed: "bg-gray-100 text-gray-800",
  } as const;

  const isOverdue = (c: Complaint) => {
    // Pending or Unassigned items with no assignee should not be marked overdue
    if (
      (c.status === "Pending" || c.status === "Unassigned") &&
      !c.assignedStaff &&
      !c.assignedStaffRole
    ) {
      return false;
    }
    if (!c.deadline) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(c.deadline);
    deadline.setHours(0, 0, 0, 0);
    return deadline < today && c.status !== "Resolved" && c.status !== "Closed";
  };

  const handleViewComplaint = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setShowDetailModal(true);
  };

  const handleAccept = (id: string) => {
    setComplaints((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status: "In Progress",
              assignedStaff: "Dean",
              assignedStaffRole: "dean",
              lastUpdated: new Date(),
            }
          : c
      )
    );
  };

  const handleReject = (id: string) => {
    setComplaints((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, status: "Closed", lastUpdated: new Date() } : c
      )
    );
  };

  // Summary cards now reflect live complaint stats

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dean Dashboard</h1>
        <p className="text-muted-foreground">
          Manage All department's and complaints
        </p>
      </div>

      {/* Department Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryData.map((card) => (
          <Card key={card.label}>
            <CardHeader>
              <CardTitle>{card.value}</CardTitle>
              <CardDescription>{card.label}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
      {/* Pending Dean Notifications - should be above the table */}
      {pendingStaff.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Clock className="h-5 w-5" />
              Pending HOD Approvals
            </CardTitle>
            <CardDescription className="text-orange-700">
              {pendingStaff.length} HOD{pendingStaff.length > 1 ? "s" : ""}{" "}
              waiting for approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                {pendingStaff.slice(0, 3).map((staff) => (
                  <div key={staff.id} className="text-sm text-orange-800">
                    • {staff.fullName} ({staff.department})
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
                onClick={() => navigate("/department-management?tab=pending")}
                className="text-orange-700 border-orange-300 hover:bg-orange-100"
              >
                Review Applications
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Quick Actions - should be above the table */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => navigate("/department-management")}
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
            <CardDescription>
              Approve head of department and manage roles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Manage Departments
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
          onClick={() => navigate("/dean/assign-complaints")}
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
      {/* Recent Pending Complaints - styled like Assign & Reassign (Pending tab) */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Pending Complaints</CardTitle>
          <CardDescription>
            Top 3 most recent pending complaints
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mobile: stacked cards */}
          <div className="space-y-3 md:hidden">
            {complaints
              .filter(
                (c) =>
                  (c.status === "Pending" || c.status === "Unassigned") &&
                  !c.assignedStaff &&
                  !c.assignedStaffRole
              )
              .sort(
                (a, b) =>
                  new Date(b.submittedDate).getTime() -
                  new Date(a.submittedDate).getTime()
              )
              .slice(0, 3)
              .map((complaint) => (
                <Card key={complaint.id} className="p-4">
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
                        <Badge
                          className={`text-xs ${
                            statusColors[
                              complaint.status as keyof typeof statusColors
                            ]
                          }`}
                        >
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
                    {(complaint.status === "Pending" ||
                      complaint.status === "Unassigned") && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleAccept(complaint.id)}
                        className="w-full"
                      >
                        Accept
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(complaint.id)}
                      className="w-full"
                    >
                      Reject
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
                {complaints
                  .filter(
                    (c) =>
                      (c.status === "Pending" || c.status === "Unassigned") &&
                      !c.assignedStaff &&
                      !c.assignedStaffRole
                  )
                  .sort(
                    (a, b) =>
                      new Date(b.submittedDate).getTime() -
                      new Date(a.submittedDate).getTime()
                  )
                  .slice(0, 3)
                  .map((complaint) => (
                    <TableRow key={complaint.id}>
                      <TableCell className="font-medium text-sm">
                        <div>
                          <div className="font-semibold flex items-center gap-2">
                            {complaint.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Submitted by {complaint.submittedBy}
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
                          <Badge
                            className={`text-xs ${
                              statusColors[
                                complaint.status as keyof typeof statusColors
                              ]
                            }`}
                          >
                            {complaint.status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {complaint.assignedStaff ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-medium">
                            {complaint.assignedStaff}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs font-medium">
                            Not Yet Assigned
                          </span>
                        )}
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
                      <TableCell>
                        <div className="flex gap-2 items-center flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewComplaint(complaint)}
                            className="text-xs dark:hover:text-blue-400"
                          >
                            View Detail
                          </Button>
                          {(complaint.status === "Pending" ||
                            complaint.status === "Unassigned") && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="text-xs"
                              onClick={() => handleAccept(complaint.id)}
                            >
                              Accept
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            className="text-xs"
                            onClick={() => handleReject(complaint.id)}
                          >
                            Reject
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
      {/* Modal */}
      <RoleBasedComplaintModal
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        complaint={selectedComplaint}
      />
    </div>
  );
}
