// Admin dashboard now loads complaints from backend (no mock)
import { useEffect, useState } from "react";
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
  MessageSquare,
  Filter,
  FileText,
  User as UserIcon,
  Calendar,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RoleSummaryCards } from "@/components/RoleSummaryCards";
// pagination imports removed; recent table shows only top 3
import { ComplaintTable } from "@/components/ComplaintTable";
import { RoleBasedComplaintModal } from "@/components/RoleBasedComplaintModal";
// Updates are handled inside RoleBasedComplaintModal's Admin section
import { AssignStaffModal } from "@/components/AssignStaffModal";
import { Complaint } from "@/components/ComplaintCard";
import { useComplaints } from "@/context/ComplaintContext";
import { useAuth } from "@/components/auth/AuthContext";
import { getPendingDeansApi } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import {
  getRoleCountsApi,
  updateComplaintStatusApi,
  getAdminInboxApi,
  approveComplaintApi,
} from "@/lib/api";

export function AdminDashboard() {
  // Backend-loaded complaints for recent list
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const { updateComplaint } = useComplaints();
  const navigate = useNavigate();
  const { user: User } = useAuth();

  // Local UI state for modals and selection
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null
  );
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  // No separate status modal; update inside detail modal
  const [priorityFilter] = useState<string | undefined>(undefined);

  // Updates happen within the View Detail modal; no separate "Update" button in table

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
      } catch (e: unknown) {
        const msg =
          typeof e === "object" && e && "message" in e
            ? String((e as { message?: unknown }).message)
            : "Failed to update status";
        // toast is already imported in this file
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

  // Helper: scope to complaints sent directly to Admin by students
  const isDirectToAdmin = (c: Complaint) => {
    const submittedTo = (c.submittedTo || "").toLowerCase();
    const src = (c.sourceRole || "").toLowerCase();
    const assignedBy = (c.assignedByRole || "").toLowerCase();
    return (
      submittedTo === "admin" || (src === "student" && assignedBy === "admin")
    );
  };

  // Compute the latest 3 direct-to-admin complaints for the "Recent Complaints" table
  const recentDirectAdmin = [...complaints]
    .filter(isDirectToAdmin)
    .sort((a, b) => {
      const d1 = a.submittedDate ? new Date(a.submittedDate).getTime() : 0;
      const d2 = b.submittedDate ? new Date(b.submittedDate).getTime() : 0;
      return d2 - d1;
    })
    .slice(0, 3);

  const categories = Array.from(new Set(complaints.map((c) => c.category)));
  const priorities = ["Critical", "High", "Medium", "Low"];

  // Load complaints for recent list (admin inbox) — keep only up to 3 pending/unassigned
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const inbox = (await getAdminInboxApi()) as unknown as Array<
          Record<string, unknown>
        >;
        if (cancelled) return;

        const mapped: Complaint[] = (inbox || []).map((raw) => {
          const c =
            raw && typeof raw === "object"
              ? (raw as Record<string, unknown>)
              : {};
          const id = String(c._id ?? c.id ?? "");
          const title = String(c.title ?? c.complaintCode ?? "Complaint");
          const category = String(c.category ?? c.department ?? "General");
          const status = String(c.status ?? "Pending") as Complaint["status"];
          const priority = String(
            c.priority ?? "Medium"
          ) as Complaint["priority"];
          const submittedBy =
            typeof c.submittedBy === "string"
              ? String(c.submittedBy)
              : c.submittedBy && typeof c.submittedBy === "object"
              ? String(
                  (c.submittedBy as Record<string, unknown>).name ??
                    (c.submittedBy as Record<string, unknown>).fullName ??
                    ""
                )
              : "";
          const assignedStaff =
            typeof c.assignedTo === "string"
              ? String(c.assignedTo)
              : c.assignedTo && typeof c.assignedTo === "object"
              ? String(
                  (c.assignedTo as Record<string, unknown>).name ??
                    (c.assignedTo as Record<string, unknown>).fullName ??
                    ""
                )
              : undefined;
          const submittedDate = c.submittedDate
            ? new Date(String(c.submittedDate))
            : new Date();
          const lastUpdated = c.lastUpdated
            ? new Date(String(c.lastUpdated))
            : new Date();
          const deadline = c.deadline
            ? new Date(String(c.deadline))
            : undefined;
          const assignmentPath = Array.isArray(c.assignmentPath)
            ? (c.assignmentPath as string[])
            : [];
          const submittedTo =
            typeof c.submittedTo === "string" ? c.submittedTo : undefined;

          return {
            id,
            title,
            description: String(c.description ?? ""),
            category,
            status,
            priority,
            submittedBy,
            assignedStaff,
            submittedDate,
            lastUpdated,
            deadline,
            sourceRole: (String(c.sourceRole ?? "") ||
              undefined) as Complaint["sourceRole"],
            assignedByRole: (String(c.assignedByRole ?? "") ||
              undefined) as Complaint["assignedByRole"],
            assignmentPath,
            submittedTo: submittedTo as string | undefined,
            department:
              typeof c.department === "string" ? c.department : undefined,
          } as Complaint;
        });

        // Keep only pending/unassigned and limit to latest 3 by submittedDate
        const pending = mapped
          .filter((x) => {
            const s = (x.status || "").toLowerCase();
            return s === "pending" || s === "unassigned";
          })
          .sort((a, b) => {
            const t1 = a.submittedDate
              ? new Date(a.submittedDate).getTime()
              : 0;
            const t2 = b.submittedDate
              ? new Date(b.submittedDate).getTime()
              : 0;
            return t2 - t1;
          })
          .slice(0, 3);

        setComplaints(pending);
      } catch (err) {
        // ignore
      }
    };

    load();
    const pollingId = window.setInterval(load, 15000);

    const onCreated = () => load();
    const onStatusChange = () => load();
    window.addEventListener("complaint:created", onCreated as EventListener);
    window.addEventListener(
      "complaint:status-changed",
      onStatusChange as EventListener
    );

    return () => {
      cancelled = true;
      if (pollingId) clearInterval(pollingId);
      window.removeEventListener(
        "complaint:created",
        onCreated as EventListener
      );
      window.removeEventListener(
        "complaint:status-changed",
        onStatusChange as EventListener
      );
    };
  }, []);

  // Role count summary (deans, HoDs, students, staff)
  const [roleCounts, setRoleCounts] = useState({
    deans: 0,
    departmentHeads: 0,
    students: 0,
    staff: 0,
  });
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [countsError, setCountsError] = useState<string | null>(null);
  const [newDeanNotifications, setNewDeanNotifications] = useState<
    { name?: string; email?: string; workingPlace?: string; ts: Date }[]
  >([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoadingCounts(true);
      setCountsError(null);
      try {
        const data = await getRoleCountsApi();
        if (mounted) setRoleCounts(data);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to load counts";
        if (mounted) setCountsError(msg);
      } finally {
        if (mounted) setLoadingCounts(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  // Seed notifications from backend pending dean list so admins opening the dashboard
  // will see existing pending dean sign-ups even if they occurred earlier.
  useEffect(() => {
    let mounted = true;
    type PendingDean = {
      fullName?: string;
      name?: string;
      email?: string;
      workingPlace?: string;
    };
    const seedPendingDeans = async () => {
      try {
        if (User?.role !== "admin") return;
        const pending = await getPendingDeansApi();
        if (!mounted || !pending || pending.length === 0) return;
        const notes = pending.map((d: PendingDean) => ({
          name: d.fullName || d.name || d.email,
          email: d.email,
          workingPlace: d.workingPlace,
          ts: new Date(),
        }));
        setNewDeanNotifications((prev) => {
          // Prepend new pending ones but avoid duplicates by email
          const emails = new Set(prev.map((p) => p.email));
          const combined = [
            ...notes.filter((n) => !emails.has(n.email)),
            ...prev,
          ];
          return combined.slice(0, 20);
        });
        if (pending.length > 0) {
          toast({
            title: "Pending Dean Sign-ups",
            description: `${pending.length} pending dean sign-up${
              pending.length > 1 ? "s" : ""
            } awaiting review`,
          });
        }
      } catch (err) {
        // ignore failures
      }
    };
    seedPendingDeans();
    return () => {
      mounted = false;
    };
    // only run when user resolves / on mount
  }, [User]);

  // Quick Access Box for Admins (same as Staff Dashboard)
  const quickAccess = (
    <Card className="border-2 border-primary/10 bg-gradient-to-r from-white to-muted/5 dark:from-gray-800 dark:to-gray-800 shadow-lg">
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-sm font-medium">Quick Access</CardTitle>
        <div className="text-xs text-muted-foreground">Shortcuts</div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            className="flex-1 flex items-center justify-center gap-2"
            onClick={() => navigate("/my-assigned")}
          >
            <FileText className="h-4 w-4" />
            My Assigned
          </Button>
          <Button
            variant="outline"
            className="flex-1 flex items-center justify-center gap-2"
            onClick={() => navigate("/all-complaints")}
          >
            <UserIcon className="h-4 w-4" />
            All Complaints
          </Button>
          <Button
            variant="outline"
            className="flex-1 flex items-center justify-center gap-2"
            onClick={() => navigate("/calendar-view")}
          >
            <Calendar className="h-4 w-4" />
            Calendar View
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Listen for in-page dean signup events and notify admins
  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const ce = e as CustomEvent<{
          name?: string;
          email?: string;
          workingPlace?: string;
        }>;
        const d = ce.detail || {};
        const note = {
          name: d.name,
          email: d.email,
          workingPlace: d.workingPlace,
          ts: new Date(),
        };
        setNewDeanNotifications((prev) => [note, ...prev].slice(0, 10));
        toast({
          title: "New Dean Signup",
          description: `${
            d.name || d.email || "A dean"
          } has signed up. Review and approve as necessary.`,
        });
      } catch (err) {
        // ignore
      }
    };
    window.addEventListener("dean:created", handler as EventListener);
    return () =>
      window.removeEventListener("dean:created", handler as EventListener);
  }, []);

  // The "Recent Complaints" section shows only the top 3 direct-to-admin items, no pagination needed

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor and manage all complaints
        </p>
      </div>

      {/* Role Summary Cards (totals by role) */}
      <RoleSummaryCards counts={roleCounts} />
      {countsError && <p className="text-sm text-destructive">{countsError}</p>}
      {/* New Dean signup notification (in-page) */}
      {newDeanNotifications.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <MessageSquare className="h-5 w-5" /> New Dean Sign-ups
            </CardTitle>
            <CardDescription className="text-orange-700">
              {newDeanNotifications.length} new dean
              {newDeanNotifications.length > 1 ? "s" : ""} waiting for review
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                {newDeanNotifications.slice(0, 3).map((n, idx) => (
                  <div key={idx} className="text-sm text-orange-800">
                    • {n.name || n.email}{" "}
                    {n.workingPlace ? `(${n.workingPlace})` : ""}
                  </div>
                ))}
                {newDeanNotifications.length > 3 && (
                  <div className="text-sm text-orange-700">
                    +{newDeanNotifications.length - 3} more...
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => navigate("/dean-role-management")}
                className="text-orange-700 border-orange-300 hover:bg-orange-100"
              >
                Review Deans
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Quick link: Admin Complaints */}
        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => navigate("/admin-complaints")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Admin Complaints
            </CardTitle>
            <CardDescription>Review and update complaints</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              View Detail
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

        {/* Quick link: Category Management */}
        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => navigate("/category-management")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Category Management
            </CardTitle>
            <CardDescription>Manage complaint categories</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Manage Categories
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Complaint Search and Filters */}

      {/* Handlers */}
      {/** Open details modal */}
      {/** Note: ComplaintTable will call onView with a Complaint */}

      <ComplaintTable
        complaints={complaints}
        onView={(c) => {
          setSelectedComplaint(c);
          setShowDetailModal(true);
        }}
        // Updates inside view modal only
        userRole="admin"
        title="Recent Complaints"
        priorityFilter={priorityFilter}
        actionLabel="View Detail"
        showAssignedStaffColumn={false}
        hideIdColumn
        onAccept={async (c) => {
          try {
            // Accept immediately without requiring a note
            await approveComplaintApi(c.id);
            // update local state for immediate feedback
            setComplaints((prev) =>
              prev.map((x) =>
                x.id === c.id ? { ...x, status: "In Progress" } : x
              )
            );
            window.dispatchEvent(
              new CustomEvent("complaint:status-changed", {
                detail: { id: c.id },
              })
            );
            toast({ title: "Accepted", description: "Moved to In Progress." });
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Failed to accept";
            toast({ title: "Error", description: msg, variant: "destructive" });
          }
        }}
        onReject={async (c) => {
          const reason = window.prompt(
            "Enter reason for rejection (required):",
            ""
          );
          if (!reason || !reason.trim()) {
            toast({
              title: "Reason required",
              description: "Please enter a reason to reject.",
              variant: "destructive",
            });
            return;
          }
          try {
            await updateComplaintStatusApi(
              c.id,
              "Closed",
              `Rejected: ${reason.trim()}`
            );
            // update local state for immediate feedback
            setComplaints((prev) =>
              prev.map((x) => (x.id === c.id ? { ...x, status: "Closed" } : x))
            );
            window.dispatchEvent(
              new CustomEvent("complaint:status-changed", {
                detail: { id: c.id },
              })
            );
            toast({ title: "Rejected", description: "Complaint rejected." });
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Failed to reject";
            toast({ title: "Error", description: msg, variant: "destructive" });
          }
        }}
      />

      {/* Modals */}
      <RoleBasedComplaintModal
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        complaint={selectedComplaint}
      />

      {/** StatusUpdateModal removed; Admin updates inside RoleBasedComplaintModal */}
    </div>
  );
}
function getAllStaff(): Array<{
  id: string;
  fullName?: string;
  name?: string;
}> {
  // Placeholder: integrate with staff directory when available
  return [];
}

// showAssignModal state is managed above; AssignStaffModal can use it when wired
