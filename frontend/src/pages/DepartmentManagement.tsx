import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserCheck, UserX } from "lucide-react";
import {
  API_BASE,
  getDeanAllHodApi,
  deanApproveHodApi,
  deanRejectHodApi,
  deanReapproveHodApi,
  deanDeactivateHodApi,
  deanReactivateHodApi,
} from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/AuthContext";
import { ConfirmDialog } from "@/components/ConfirmDialog";

// Status tabs
type Status = "all" | "pending" | "approved" | "rejected" | "deactivated";

// UI row shape
interface HoDRow {
  id: string;
  name: string;
  department: string;
  email: string;
  status: Status;
  active: boolean;
}

// Actions supported via confirm modal
type ActionType =
  | "approve"
  | "reject"
  | "deactivate"
  | "reapprove"
  | "reactivate";

export default function DepartmentManagement() {
  const { user } = useAuth();
  const unauthorized = user?.role !== "dean";
  const location = useLocation();
  // Safe error message extractor (avoids `any` use)
  const getErrorMessage = (e: unknown): string => {
    if (e instanceof Error) return e.message;
    if (typeof e === "object" && e && "message" in e) {
      const msg = (e as { message?: unknown }).message;
      return typeof msg === "string" ? msg : String(msg);
    }
    return String(e);
  };

  // Three lists driven from backend
  const [pending, setPending] = useState<HoDRow[]>([]);
  const [approved, setApproved] = useState<HoDRow[]>([]);
  const [rejected, setRejected] = useState<HoDRow[]>([]);
  const [deactivated, setDeactivated] = useState<HoDRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false); // marks that an initial fetch has completed
  // Debug helpers to diagnose missing HODs in UI
  const [lastFetchError, setLastFetchError] = useState<string | null>(null);
  const [lastFetchCounts, setLastFetchCounts] = useState<{
    total?: number;
    pending?: number;
    approved?: number;
    rejected?: number;
    deactivated?: number;
  } | null>(null);
  // Dev-only server debug response (removed in production)

  // UI state
  // Default to 'all' so Dean can view the complete HOD list immediately
  const [activeTab, setActiveTab] = useState<Status>("all");
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("all");

  // Confirm modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: ActionType;
    hod: HoDRow | null;
  }>({ type: "approve", hod: null });

  // Summary cards
  const totalHods =
    pending.length + approved.length + rejected.length + deactivated.length;
  const activeHods = useMemo(
    () => approved.filter((h) => h.active).length,
    [approved]
  );
  const deactivatedHods = useMemo(() => deactivated.length, [deactivated]);

  // Derive departments from backend data (no hardcoded list)
  const departments = useMemo(() => {
    const all = [...pending, ...approved, ...rejected, ...deactivated];
    const set = new Set<string>();
    for (const h of all) {
      if (h.department && h.department.trim().length > 0) set.add(h.department);
    }
    return Array.from(set).sort();
  }, [pending, approved, rejected, deactivated]);

  // API HoD user type returned by backend
  interface ApiHodUser {
    _id: string;
    fullName?: string;
    name?: string;
    username?: string;
    email: string;
    department?: string;
    isApproved?: boolean;
    isRejected?: boolean;
    isActive?: boolean;
  }

  // Typed response for the dean grouped HOD endpoint
  interface DeanAllHodResponse {
    pending?: ApiHodUser[];
    approved?: ApiHodUser[];
    rejected?: ApiHodUser[];
    deactivated?: ApiHodUser[];
    counts?: {
      total?: number;
      pending?: number;
      approved?: number;
      rejected?: number;
      deactivated?: number;
    };
  }

  // Map API user to UI row (stable for hooks)
  const mapUserToRow = useCallback((u: ApiHodUser): HoDRow => {
    const isApproved = !!u.isApproved;
    const isRejected = !!u.isRejected;
    const isActive = u.isActive !== false; // default true unless explicitly false
    const status: Status = isRejected
      ? "rejected"
      : !isApproved
      ? "pending"
      : isApproved && !isActive
      ? "deactivated"
      : "approved";

    return {
      id: u._id,
      name: u.fullName || u.name || u.username || "",
      email: u.email,
      department: u.department || "",
      status,
      active: isApproved && isActive,
    };
  }, []);

  const fetchLists = useCallback(async () => {
    setLoading(true);
    setLastFetchError(null);
    try {
      // Use the dean-scoped grouped endpoint so the Dean can fetch all HoDs
      // (existing + newly created) without calling the admin-only endpoint.
      const grouped = await getDeanAllHodApi();

      const pendingList = grouped.pending || [];
      const approvedList = grouped.approved || [];
      const rejectedList = grouped.rejected || [];
      const deactivatedList = grouped.deactivated || [];

      // Prefer counts returned by the endpoint if available.
      // If backend returned counts, use them; otherwise compute locally.
      const counts = (grouped as DeanAllHodResponse & { counts?: unknown })
        .counts;
      if (
        counts &&
        typeof counts === "object" &&
        "total" in counts &&
        "pending" in counts
      ) {
        const c = counts as {
          total?: number;
          pending?: number;
          approved?: number;
          rejected?: number;
          deactivated?: number;
        };
        setLastFetchCounts({
          total: c.total,
          pending: c.pending,
          approved: c.approved,
          rejected: c.rejected,
          deactivated: c.deactivated,
        });
      } else {
        setLastFetchCounts({
          total:
            pendingList.length +
            approvedList.length +
            rejectedList.length +
            deactivatedList.length,
          pending: pendingList.length,
          approved: approvedList.length,
          rejected: rejectedList.length,
          deactivated: deactivatedList.length,
        });
      }

      setPending(pendingList.map(mapUserToRow));
      setApproved(approvedList.map(mapUserToRow));
      setRejected(rejectedList.map(mapUserToRow));
      setDeactivated(deactivatedList.map(mapUserToRow));
    } catch (e: unknown) {
      const msg = getErrorMessage(e) || "Failed to load";
      setLastFetchError(String(msg));
      toast({
        title: "Failed to load HoDs",
        description: String(msg),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [mapUserToRow]);

  useEffect(() => {
    if (unauthorized) return;
    // Allow linking to a specific tab via query param: ?tab=pending|approved|rejected|deactivated|all
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (
      tab === "pending" ||
      tab === "approved" ||
      tab === "rejected" ||
      tab === "deactivated" ||
      tab === "all"
    ) {
      setActiveTab(tab as Status);
    }
    fetchLists();
  }, [fetchLists, unauthorized, location.search]);

  // (dev debug removed)

  // Current tab rows with search/filter applied
  const listForTab = useMemo(() => {
    let rows: HoDRow[] = [];
    if (activeTab === "pending") rows = pending;
    else if (activeTab === "approved") rows = approved;
    else if (activeTab === "rejected") rows = rejected;
    else if (activeTab === "deactivated") rows = deactivated;
    else rows = [...pending, ...approved, ...rejected, ...deactivated];

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          h.email.toLowerCase().includes(q) ||
          h.department.toLowerCase().includes(q)
      );
    }

    if (deptFilter !== "all") {
      if (deptFilter === "unassigned") {
        rows = rows.filter((h) => !h.department || h.department.trim() === "");
      } else {
        rows = rows.filter((h) => h.department === deptFilter);
      }
    }

    return rows;
  }, [pending, approved, rejected, deactivated, activeTab, search, deptFilter]);

  function openConfirm(type: ActionType, hod: HoDRow) {
    setPendingAction({ type, hod });
    setConfirmOpen(true);
  }

  // centralized action renderer used by both mobile and desktop lists
  const renderActions = (h: HoDRow) => {
    if (h.status === "pending") {
      return (
        <>
          <Button
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={loading}
            onClick={() => openConfirm("approve", h)}
          >
            Approve
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            disabled={loading}
            onClick={() => openConfirm("reject", h)}
          >
            Reject
          </Button>
        </>
      );
    }
    if (h.status === "approved") {
      return h.active ? (
        <Button
          className="bg-red-600 hover:bg-red-700 text-white"
          disabled={loading}
          onClick={() => openConfirm("deactivate", h)}
        >
          Deactivate
        </Button>
      ) : (
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white"
          disabled={loading}
          onClick={() => openConfirm("reactivate", h)}
        >
          Reactivate
        </Button>
      );
    }
    if (h.status === "rejected") {
      return (
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white"
          disabled={loading}
          onClick={() => openConfirm("reapprove", h)}
        >
          Re-approve
        </Button>
      );
    }
    // deactivated
    return (
      <Button
        className="bg-blue-600 hover:bg-blue-700 text-white"
        disabled={loading}
        onClick={() => openConfirm("reactivate", h)}
      >
        Reactivate
      </Button>
    );
  };

  async function applyAction() {
    const action = pendingAction.type;
    const hod = pendingAction.hod;
    if (!hod) return setConfirmOpen(false);

    try {
      if (action === "approve") {
        await deanApproveHodApi(hod.id);
        toast({
          title: "Approved",
          description: "✅ HOD approved successfully.",
        });
      } else if (action === "reject") {
        await deanRejectHodApi(hod.id);
        toast({
          title: "Rejected",
          description: "❌ HOD has been rejected.",
        });
      } else if (action === "deactivate") {
        // Toggle active=false but keep approved state
        await deanDeactivateHodApi(hod.id);
        toast({
          title: "Deactivated",
          description: "📴 HOD account deactivated.",
        });
      } else if (action === "reapprove") {
        await deanReapproveHodApi(hod.id);
        toast({
          title: "Approved",
          description: "✅ HOD approved successfully.",
        });
      } else if (action === "reactivate") {
        await deanReactivateHodApi(hod.id);
        toast({
          title: "Activated",
          description: "🔵 HOD account activated.",
        });
      }
      // refresh lists to reflect latest server state
      await fetchLists();
      // notify other pages (AdminManagement etc.) that HODs were updated
      try {
        window.dispatchEvent(
          new CustomEvent("hod:updated", { detail: { id: hod.id, action } })
        );
      } catch (e) {
        /* ignore for older browsers */
      }
    } catch (e: unknown) {
      const msg = getErrorMessage(e) || "Action failed";
      toast({
        title: "Action failed",
        description: String(msg),
        variant: "destructive",
      });
    } finally {
      setConfirmOpen(false);
    }
  }

  const confirmText = useMemo(() => {
    switch (pendingAction.type) {
      case "approve":
        return "Are you sure you want to approve this Head of Department?";
      case "reject":
        return "Are you sure you want to reject this Head of Department?";
      case "deactivate":
        return "Are you sure you want to deactivate this Head of Department? They will be unable to login.";
      case "reapprove":
        return "Are you sure you want to re-approve this Head of Department?";
      case "reactivate":
        return "Are you sure you want to reactivate this Head of Department?";
      default:
        return "Confirm action";
    }
  }, [pendingAction.type]);

  if (unauthorized) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="text-muted-foreground">
          You must be a Dean to access this page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h1 className="text-3xl font-bold">Head of Department Management</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border border-blue-200 bg-blue-50 dark:bg-blue-950/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Total HoDs
            </CardTitle>
            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-800 dark:text-blue-200">
              {totalHods}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-green-200 bg-green-50 dark:bg-green-950/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
              Active HoDs
            </CardTitle>
            <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-800 dark:text-green-200">
              {activeHods}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-red-200 bg-red-50 dark:bg-red-950/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">
              Deactivated HoDs
            </CardTitle>
            <UserX className="h-5 w-5 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-800 dark:text-red-200">
              {deactivatedHods}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="mb-3 w-full sm:w-auto">
          <Tabs
            defaultValue="pending"
            value={activeTab}
            onValueChange={(v: string) => setActiveTab(v as Status)}
          >
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="deactivated">Deactivated</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Search and filter */}
        <div className="flex flex-wrap gap-2 items-center">
          <Input
            placeholder="Search by name, email, or department"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => fetchLists()}
            disabled={loading}
            className="ml-2"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {activeTab === "all"
              ? "All HoDs"
              : activeTab === "pending"
              ? "Pending List"
              : activeTab === "approved"
              ? "Approved List"
              : activeTab === "rejected"
              ? "Rejected List"
              : "Deactivated List"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Loading */}
          {loading && (
            <div className="text-sm text-muted-foreground pb-3">Loading…</div>
          )}

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {!loading && loaded && listForTab.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                No results
              </div>
            ) : !loaded ? null : (
              listForTab.map((h) => (
                <Card key={h.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-sm">{h.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {h.email}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Dept:{" "}
                        {h.department && h.department.trim().length > 0
                          ? h.department
                          : "Unassigned"}
                      </div>
                      <Badge
                        className={
                          h.status === "approved"
                            ? "bg-green-100 text-green-800"
                            : h.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : h.status === "deactivated"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-red-100 text-red-800"
                        }
                      >
                        {h.status === "approved"
                          ? "Approved"
                          : h.status === "pending"
                          ? "Pending"
                          : h.status === "deactivated"
                          ? "Deactivated"
                          : "Rejected"}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-col gap-2 [&>button]:w-full">
                    {renderActions(h)}
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loading && loaded && listForTab.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={activeTab === "approved" ? 5 : 4}
                      className="text-center text-muted-foreground"
                    >
                      No results
                    </TableCell>
                  </TableRow>
                ) : (
                  listForTab.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="font-medium">{h.name}</TableCell>
                      <TableCell>
                        {h.department && h.department.trim().length > 0
                          ? h.department
                          : "Unassigned"}
                      </TableCell>
                      <TableCell>{h.email}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            h.status === "approved"
                              ? "bg-green-100 text-green-800"
                              : h.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : h.status === "deactivated"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-red-100 text-red-800"
                          }
                        >
                          {h.status === "approved"
                            ? "Approved"
                            : h.status === "pending"
                            ? "Pending"
                            : h.status === "deactivated"
                            ? "Deactivated"
                            : "Rejected"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {renderActions(h)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm Action"
        onConfirm={applyAction}
        onCancel={() => setConfirmOpen(false)}
        confirmText="Confirm"
        cancelText="Cancel"
        warning={undefined}
      >
        {confirmText}
      </ConfirmDialog>
    </div>
  );
}
