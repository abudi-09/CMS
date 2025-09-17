import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Search, UserPlus } from "lucide-react";
import { RoleBasedComplaintModal } from "@/components/RoleBasedComplaintModal";
import { useAuth } from "@/components/auth/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Complaint as ComplaintType } from "@/components/ComplaintCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  approveComplaintApi,
  getHodManagedComplaintsApi,
  getHodInboxApi,
  hodAcceptAssignmentApi,
  hodAssignToStaffApi,
  listMyDepartmentActiveStaffApi,
  updateComplaintStatusApi,
} from "@/lib/api";
import { AcceptComplaintModal } from "@/components/modals/AcceptComplaintModal";
import { RejectComplaintModal } from "@/components/modals/RejectComplaintModal";
import { ReopenComplaintModal } from "@/components/modals/ReopenComplaintModal";
import { AssignStaffModal } from "@/components/AssignStaffModal";

const statusColors = {
  Pending: "bg-yellow-100 text-yellow-800",
  "In Progress": "bg-blue-100 text-blue-800",
  Resolved: "bg-green-100 text-green-800",
  Closed: "bg-gray-100 text-gray-800",
  Delayed: "bg-red-100 text-red-800",
} as const;

export default function HoDAssignComplaints() {
  const { user } = useAuth();
  const [assigningDeadline, setAssigningDeadline] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [complaints, setComplaints] = useState<ComplaintType[]>([]);
  const [inbox, setInbox] = useState<ComplaintType[]>([]);
  // Staff list in department
  const [deptStaff, setDeptStaff] = useState<
    Array<{
      _id: string;
      name?: string;
      fullName?: string;
      email: string;
      department: string;
    }>
  >([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [overdueFilter, setOverdueFilter] = useState<string>("all");
  const [selectedComplaint, setSelectedComplaint] =
    useState<ComplaintType | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  // (Re)Assignment via shared modal
  const [assigningStaffId, setAssigningStaffId] = useState<string>("");
  const [reassigningRow, setReAssigningRow] = useState<string | null>(null); // kept for legacy but no longer used for inline UI
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [updatingRow, setUpdatingRow] = useState<string | null>(null);
  const [updateStatusValue, setUpdateStatusValue] = useState<
    "Pending" | "In Progress" | "Resolved" | "Closed" | ""
  >("");
  const [updateNote, setUpdateNote] = useState("");
  const [activeTab, setActiveTab] = useState<
    "All" | "Pending" | "Accepted" | "Resolved" | "Rejected"
  >("Pending");
  // Shared modals state
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [actionComplaintId, setActionComplaintId] = useState<string | null>(
    null
  );
  // Helper to compare if a complaint is assigned to current HoD
  const isAssignedToSelf = useCallback(
    (c: ComplaintType) => {
      // If backend returned an assignedToId (ObjectId string), compare to current user id
      const assignedToId = (c as unknown as Record<string, unknown>)
        ?.assignedToId as string | undefined;
      const hodId = String(
        (user as unknown as { _id?: string; id?: string })?._id ||
          (user as unknown as { _id?: string; id?: string })?.id ||
          ""
      );
      if (assignedToId && hodId && String(assignedToId) === hodId) return true;

      // Fallback: compare assignedStaff label to name/email
      const assignee = (c.assignedStaff || "").toLowerCase();
      const myName = (
        (user?.fullName as string) ||
        (user?.name as string) ||
        ""
      ).toLowerCase();
      const myEmail = (user?.email as string)?.toLowerCase?.() || "";
      const myUsername = String(
        (user as unknown as { username?: string })?.username || ""
      ).toLowerCase();
      if (!assignee) return false;
      return (
        assignee === myName ||
        assignee === myEmail ||
        assignee === myUsername ||
        assignee.includes(myName) ||
        assignee.includes(myEmail) ||
        (myUsername && assignee.includes(myUsername))
      );
    },
    [user]
  );
  // Type guards and mappers
  const mapApiToComplaint = useCallback((raw: unknown): ComplaintType => {
    const c = (raw ?? {}) as Record<string, unknown>;
    const assignedTo = c["assignedTo"] as unknown;
    const submittedBy = c["submittedBy"] as unknown;
    let assignedStaff: string | undefined;
    let assignedToId: string | undefined;
    if (typeof assignedTo === "string") {
      // If backend sent a raw ObjectId string (e.g., an assignment id), capture it.
      const looksLikeObjectId = /^[a-fA-F0-9]{24}$/.test(assignedTo);
      assignedToId = looksLikeObjectId ? assignedTo : undefined;
      // If it's not an ObjectId string, it's likely a display label
      assignedStaff = looksLikeObjectId ? undefined : assignedTo;
    } else if (assignedTo && typeof assignedTo === "object") {
      // Prefer fullName/name/email fields from populated user
      assignedStaff =
        ((assignedTo as Record<string, unknown>)["fullName"] as string) ||
        ((assignedTo as Record<string, unknown>)["name"] as string) ||
        ((assignedTo as Record<string, unknown>)["email"] as string) ||
        undefined;
      // capture id when populated
      assignedToId =
        ((assignedTo as Record<string, unknown>)["_id"] as string) ||
        ((assignedTo as Record<string, unknown>)["id"] as string) ||
        assignedToId;
    } else {
      assignedStaff = undefined;
    }
    const submittedByLabel =
      typeof submittedBy === "string"
        ? submittedBy
        : submittedBy && typeof submittedBy === "object"
        ? ((submittedBy as Record<string, unknown>)["name"] as string) ||
          ((submittedBy as Record<string, unknown>)["email"] as string) ||
          ""
        : "";
    const allowedPathRoles = new Set<
      ComplaintType["assignmentPath"] extends Array<infer U> ? U : never
    >(["student", "hod", "dean", "admin", "staff"]);
    const assignmentPath = Array.isArray(c["assignmentPath"])
      ? (c["assignmentPath"] as unknown[])
          .filter((x): x is string => typeof x === "string")
          .map((r) => (r === "headOfDepartment" ? "hod" : r))
          .filter((r): r is ComplaintType["assignmentPath"][number] =>
            allowedPathRoles.has(r as ComplaintType["assignmentPath"][number])
          )
      : undefined;
    // Narrow recipientRole to allowed union early to satisfy TS
    const rawRecipientRole = c["recipientRole"];
    const recipientRoleVal: ComplaintType["recipientRole"] | undefined = (():
      | ComplaintType["recipientRole"]
      | undefined => {
      const rr = String(rawRecipientRole || "").toLowerCase();
      if (rr === "hod" || rr === "dean" || rr === "admin" || rr === "staff")
        return rr as ComplaintType["recipientRole"];
      return undefined;
    })();
    const recipientIdVal = (c["recipientId"] as string) || undefined;
    return {
      id: String(c["id"] ?? c["_id"] ?? ""),
      title: String(c["title"] ?? "Untitled Complaint"),
      description: String(c["description"] ?? ""),
      category: String(c["category"] ?? "General"),
      status:
        (c["status"] as ComplaintType["status"]) ||
        ("Pending" as ComplaintType["status"]),
      submittedBy: submittedByLabel,
      assignedStaff,
      assignedStaffRole: undefined,
      submittedDate: (c["submittedDate"] as string | Date | undefined)
        ? new Date(String(c["submittedDate"]))
        : new Date(),
      lastUpdated: (c["lastUpdated"] as string | Date | undefined)
        ? new Date(String(c["lastUpdated"]))
        : new Date(),
      deadline: c["deadline"] ? new Date(String(c["deadline"])) : undefined,
      priority:
        c["priority"] === "Low" ||
        c["priority"] === "Medium" ||
        c["priority"] === "High" ||
        c["priority"] === "Critical"
          ? (c["priority"] as ComplaintType["priority"])
          : "Medium",
      sourceRole: (c["sourceRole"] as ComplaintType["sourceRole"]) || undefined,
      assignedByRole:
        (c["assignedByRole"] as ComplaintType["assignedByRole"]) || undefined,
      assignmentPath,
      submittedTo: (c["submittedTo"] as string) || undefined,
      // carry explicit recipient info when present so frontend can honor single-recipient targeting
      recipientRole: recipientRoleVal,
      recipientId: recipientIdVal,
      department: (c["department"] as string) || undefined,
      // internal id to allow robust HOD-scoped filtering
      assignedToId,
    };
  }, []);

  // Helper: determine whether a complaint belongs to the currently logged-in HoD
  const isForCurrentHod = useCallback(
    (c: ComplaintType) => {
      if (!user) return false;
      const hodId = String(
        (user as unknown as { _id?: string; id?: string })?._id ||
          (user as unknown as { _id?: string; id?: string })?.id ||
          ""
      );
      if (!hodId) return false;

      // 1) If explicitly assigned to this HoD (id), include
      const assignedToId = (c as unknown as Record<string, unknown>)
        ?.assignedToId as string | undefined;
      if (assignedToId && String(assignedToId) === hodId) return true;

      // 1b) If assignedStaff label (string) matches this user's username/name/email, include
      const assignedStaffLabel = String(
        (c as unknown as Record<string, unknown>)["assignedStaff"] || ""
      ).toLowerCase();
      const myUsername = String(
        (user as unknown as { username?: string })?.username || ""
      ).toLowerCase();
      const myEmail = String(user?.email || "").toLowerCase();
      const myName = (
        (user?.fullName as string) ||
        (user?.name as string) ||
        ""
      ).toLowerCase();
      if (assignedStaffLabel) {
        if (
          assignedStaffLabel === myUsername ||
          assignedStaffLabel === myEmail ||
          assignedStaffLabel === myName ||
          assignedStaffLabel.includes(myName) ||
          assignedStaffLabel.includes(myEmail)
        )
          return true;
      }

      // (duplicate block removed)

      // 2) If backend provided explicit recipientRole/recipientId, include only when recipientId matches this HoD
      const recRole = (c as unknown as Record<string, unknown>)[
        "recipientRole"
      ] as string | undefined;
      const recId = (c as unknown as Record<string, unknown>)["recipientId"] as
        | string
        | undefined;
      if (recRole && String(recRole).toLowerCase() === "hod" && recId) {
        return String(recId) === hodId;
      }

      // Strict scoping: do NOT include generic department-targeted items by submittedTo.
      // If it's not explicitly for this HOD (assignment or recipient), exclude.
      return false;
    },
    [user]
  );

  // Load data
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [inboxRaw, managedRaw, staffRaw] = await Promise.all([
          getHodInboxApi(),
          getHodManagedComplaintsApi(),
          listMyDepartmentActiveStaffApi(),
        ]);
        if (!mounted) return;
        const inboxMapped = (inboxRaw as unknown[]).map(mapApiToComplaint);
        const managedMapped = (managedRaw as unknown[]).map(mapApiToComplaint);
        setInbox(inboxMapped.filter(isForCurrentHod));
        setComplaints(managedMapped.filter(isForCurrentHod));
        setDeptStaff(staffRaw);
      } catch (err) {
        toast({
          title: "Failed to load HoD data",
          description: (err as Error).message,
        });
      }
    };
    load();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Reset page when filters/tab change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, priorityFilter, overdueFilter, activeTab]);

  // Listen for cross-view status changes (e.g., from modal) and refetch to keep UI in sync
  useEffect(() => {
    const onStatusChanged = async (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | { id?: string; newStatus?: string; status?: string }
        | undefined;
      try {
        const [inboxRaw, managedRaw] = await Promise.all([
          getHodInboxApi(),
          getHodManagedComplaintsApi(),
        ]);
        setInbox(
          (inboxRaw as unknown[]).map(mapApiToComplaint).filter(isForCurrentHod)
        );
        setComplaints(
          (managedRaw as unknown[])
            .map(mapApiToComplaint)
            .filter(isForCurrentHod)
        );
        const ns = detail?.newStatus || detail?.status;
        if (ns === "Resolved") setActiveTab("Resolved");
        else if (ns === "Closed") setActiveTab("Rejected");
      } catch (err) {
        // non-fatal sync failure
      }
    };
    window.addEventListener(
      "complaint:status-changed",
      onStatusChanged as EventListener
    );
    return () => {
      window.removeEventListener(
        "complaint:status-changed",
        onStatusChanged as EventListener
      );
    };
  }, [mapApiToComplaint, isForCurrentHod]);
  const handleAssignClick = (complaint: ComplaintType) => {
    // Open modal instead of inline controls
    setSelectedComplaint(complaint);
    setShowAssignModal(true);
  };

  const handleViewDetail = (complaint: ComplaintType) => {
    setSelectedComplaint(complaint);
    setShowDetailModal(true);
    setAssigningStaffId("");
    setReAssigningRow(null);
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
        deadline: deadline || assigningDeadline || undefined,
      });
      const managedRaw = await getHodManagedComplaintsApi();
      setComplaints(
        (managedRaw as unknown[]).map(mapApiToComplaint).filter(isForCurrentHod)
      );
      const staff = deptStaff.find((s) => s._id === staffId);
      toast({
        title: "Assigned",
        description: `Assigned to ${
          staff?.fullName || staff?.name || staff?.email
        }${
          deadline
            ? ` (deadline ${new Date(deadline).toLocaleDateString()})`
            : ""
        }`,
      });
      window.dispatchEvent(
        new CustomEvent("complaint:status-changed", {
          detail: { id: complaintId },
        })
      );
      // After assignment, switch to All so the item remains visible without an Assigned tab
      setActiveTab("All");
    } catch (err) {
      toast({
        title: "Assignment failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setReAssigningRow(null);
      setAssigningStaffId("");
      setAssigningDeadline("");
      setShowAssignModal(false);
    }
  };

  const handleResolve = (complaintId: string) => {
    setComplaints((prev) =>
      prev.map((c) =>
        c.id === complaintId
          ? { ...c, status: "Resolved", lastUpdated: new Date() }
          : c
      )
    );
    toast({ title: "Resolved", description: "Complaint marked as resolved." });
  };

  // Modal trigger helpers
  const openAccept = (id: string) => {
    setActionComplaintId(id);
    setAcceptOpen(true);
  };
  const openReject = (id: string) => {
    setActionComplaintId(id);
    setRejectOpen(true);
  };
  const openReopen = (id: string) => {
    setActionComplaintId(id);
    setReopenOpen(true);
  };

  const isOverdue = (complaint: ComplaintType) => {
    // Pending or Unassigned items with no assignee should not be marked overdue
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

  // Summary counts are computed from the same set used by the table below
  // (we compute them after filteredComplaints so they reflect active tab + filters)
  const priorityColors = {
    Low: "bg-gray-200 text-gray-700 border-gray-300",
    Medium: "bg-blue-100 text-blue-800 border-blue-200",
    High: "bg-orange-100 text-orange-800 border-orange-200",
    Critical: "bg-red-100 text-red-800 border-red-200 font-bold border-2",
  };

  const matchesTab = (c: ComplaintType) => {
    if (activeTab === "All") return true;
    if (activeTab === "Pending") {
      // Pending items are awaiting HoD action:
      // - Submitted directly to HoD and unassigned
      // - Or assigned to HoD by Dean (status Assigned) but not yet accepted
      const isDirectToHodPending =
        (c.status === "Pending" || c.status === "Unassigned") &&
        !c.assignedStaff;
      const isDeanAssignedAwaitingAccept =
        c.status === "Assigned" && !c.assignedStaff;
      return isDirectToHodPending || isDeanAssignedAwaitingAccept;
    }
    if (activeTab === "Accepted") {
      // Accepted: handled by HoD (assigned to self). Some backends use "Accepted"
      // while others use "In Progress" — accept both for compatibility.
      return (
        (c.status === "In Progress" || c.status === "Accepted") &&
        isAssignedToSelf(c)
      );
    }
    // Assigned tab removed
    if (activeTab === "Resolved") return c.status === "Resolved";
    if (activeTab === "Rejected") return c.status === "Closed";
    return false;
  };

  // Merge helper to create a unique list by id
  const uniqById = (arr: ComplaintType[]) => {
    const seen = new Set<string>();
    const out: ComplaintType[] = [];
    for (const c of arr) {
      if (!c.id) continue;
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      out.push(c);
    }
    return out;
  };

  // Use inbox for Pending; All shows union of inbox+managed and should include
  // all complaints that belong to the current HoD (department-scoped). Previously
  // we filtered the All list to only items assigned to the HoD which removed
  // complaints after they were delegated to staff. Use `isForCurrentHod` so
  // All remains department/HOD-scoped rather than limited to assignments to self.
  const baseList =
    activeTab === "Pending"
      ? inbox
      : activeTab === "All"
      ? uniqById([...(inbox || []), ...(complaints || [])]).filter(
          isForCurrentHod
        )
      : (complaints || []).filter(isForCurrentHod);
  const filteredComplaints = baseList
    .filter(matchesTab)
    .filter((c) =>
      [c.title, c.category, c.submittedBy]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    )
    .filter((c) =>
      priorityFilter === "all"
        ? true
        : (c.priority || "Medium") === priorityFilter
    )
    .filter((c) =>
      overdueFilter === "all"
        ? true
        : overdueFilter === "overdue"
        ? isOverdue(c)
        : !isOverdue(c)
    );
  // no-op
  // Summary counts derived from the same filtered list so the cards reflect
  // the active tab + filters shown in the table.
  const summaryBaseList = filteredComplaints;
  const pendingCount = summaryBaseList.filter((c) => {
    const s = String(c.status || "");
    return s === "Pending" || s === "Unassigned";
  }).length;
  const inProgressCount = summaryBaseList.filter((c) => {
    const s = String(c.status || "");
    return (
      s === "In Progress" ||
      s === "Assigned" ||
      s === "Under Review" ||
      s === "Accepted"
    );
  }).length;
  const resolvedCount = summaryBaseList.filter(
    (c) => c.status === "Resolved"
  ).length;

  // Pagination calculations
  const totalItems = filteredComplaints.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (page - 1) * pageSize;
  const paginatedComplaints = filteredComplaints.slice(
    startIndex,
    startIndex + pageSize
  );

  // Clamp page if filtered size shrinks
  useEffect(() => {
    const newTotal = Math.max(
      1,
      Math.ceil(filteredComplaints.length / pageSize)
    );
    if (page > newTotal) setPage(newTotal);
  }, [filteredComplaints.length, page]);

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

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 lg:space-y-8">
      <div className="space-y-2">
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold">
          Assign & Reassign Complaints (HOD)
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Manage staff assignments for complaints in your department
        </p>
      </div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium">
              Total Complaints
            </CardTitle>
            <div className="bg-blue-50 p-1.5 md:p-2 rounded-lg dark:bg-blue-900/20 flex-shrink-0">
              <UserPlus className="h-3 w-3 md:h-4 md:w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="text-lg md:text-2xl font-bold">
              {summaryBaseList.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All department complaints
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium">
              Pending
            </CardTitle>
            <div className="bg-yellow-50 p-1.5 md:p-2 rounded-lg dark:bg-yellow-900/20 flex-shrink-0">
              <div className="h-3 w-3 md:h-4 md:w-4 rounded-full bg-yellow-500" />
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="text-lg md:text-2xl font-bold text-yellow-600">
              {pendingCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting action
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium">
              In Progress
            </CardTitle>
            <div className="bg-blue-50 p-1.5 md:p-2 rounded-lg dark:bg-blue-900/20 flex-shrink-0">
              <div className="h-3 w-3 md:h-4 md:w-4 rounded-full bg-blue-500" />
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="text-lg md:text-2xl font-bold text-blue-600">
              {inProgressCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Being worked on
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium">
              Resolved
            </CardTitle>
            <div className="bg-green-50 p-1.5 md:p-2 rounded-lg dark:bg-green-900/20 flex-shrink-0">
              <div className="h-3 w-3 md:h-4 md:w-4 rounded-full bg-green-500" />
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="text-lg md:text-2xl font-bold text-green-600">
              {resolvedCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Successfully completed
            </p>
          </CardContent>
        </Card>
      </div>
      {/* Search & Filter */}
      <Card className="p-3 md:p-6">
        <CardHeader className="p-0 pb-3 md:pb-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Search className="h-4 w-4 md:h-5 md:w-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, department, or submitter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9 md:h-10 text-sm"
              />
            </div>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-9 md:h-10 text-sm">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Select value={overdueFilter} onValueChange={setOverdueFilter}>
              <SelectTrigger className="h-9 md:h-10 text-sm">
                <SelectValue placeholder="Filter by overdue" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All complaints</SelectItem>
                <SelectItem value="overdue">Overdue Only</SelectItem>
                <SelectItem value="notOverdue">Not Overdue Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      {/* Complaints Table */}
      <Card>
        <CardHeader className="p-3 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-2">
            <CardTitle className="text-base md:text-lg">Complaints</CardTitle>
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as typeof activeTab)}
            >
              <TabsList className="grid w-full grid-cols-5 sm:w-auto sm:grid-cols-5 h-9 md:h-10">
                <TabsTrigger
                  value="All"
                  className="text-xs md:text-sm px-1 md:px-3"
                >
                  All
                </TabsTrigger>
                <TabsTrigger
                  value="Pending"
                  className="text-xs md:text-sm px-1 md:px-3"
                >
                  Pending
                </TabsTrigger>
                <TabsTrigger
                  value="Accepted"
                  className="text-xs md:text-sm px-1 md:px-3"
                >
                  Accepted
                </TabsTrigger>
                <TabsTrigger
                  value="Resolved"
                  className="text-xs md:text-sm px-1 md:px-3"
                >
                  Resolved
                </TabsTrigger>
                <TabsTrigger
                  value="Rejected"
                  className="text-xs md:text-sm px-1 md:px-3"
                >
                  Rejected
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <CardDescription className="text-sm">
            {filteredComplaints.length} complaint
            {filteredComplaints.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3 md:space-y-4">
            {filteredComplaints.length === 0 ? (
              <div className="text-center py-6 md:py-8 text-muted-foreground text-sm md:text-base">
                {activeTab === "Pending" && "No pending complaints"}
                {activeTab === "Accepted" && "No accepted complaints"}
                {activeTab === "Resolved" && "No resolved complaints"}
                {activeTab === "Rejected" && "No rejected complaints"}
                {activeTab === "All" && "No complaints found"}
              </div>
            ) : (
              paginatedComplaints.map((complaint) => (
                <Card
                  key={complaint.id}
                  className="p-3 md:p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground mb-1">
                          #{complaint.id}
                        </div>
                        <h3 className="font-medium text-sm md:text-base leading-tight line-clamp-2">
                          {complaint.title}
                        </h3>
                        <div className="text-xs text-muted-foreground mt-1">
                          Category: {complaint.category}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 flex-shrink-0">
                        <Badge
                          className={`text-xs px-1.5 py-0.5 ${
                            statusColors[
                              complaint.status as keyof typeof statusColors
                            ]
                          }`}
                        >
                          {complaint.status}
                        </Badge>
                        <Badge
                          className={`text-xs px-1.5 py-0.5 ${
                            priorityColors[complaint.priority || "Medium"]
                          }`}
                        >
                          {complaint.priority || "Medium"}
                        </Badge>
                        {isOverdue(complaint) ? (
                          <Badge
                            className="text-xs px-1.5 py-0.5 bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400"
                            variant="outline"
                          >
                            Overdue
                          </Badge>
                        ) : (
                          <Badge
                            className="text-xs px-1.5 py-0.5 bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400"
                            variant="outline"
                          >
                            On Time
                          </Badge>
                        )}
                      </div>
                    </div>
                    {/* Inline Status Update */}
                    {updatingRow === complaint.id ? (
                      <div className="flex flex-col gap-2 w-full max-w-xs">
                        <Select
                          value={updateStatusValue || undefined}
                          onValueChange={(v) =>
                            setUpdateStatusValue(
                              v as
                                | "Pending"
                                | "In Progress"
                                | "Resolved"
                                | "Closed"
                            )
                          }
                        >
                          <SelectTrigger className="w-full text-xs">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="In Progress">
                              In Progress
                            </SelectItem>
                            <SelectItem value="Resolved">Resolved</SelectItem>
                            <SelectItem value="Closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Add description (optional)"
                          value={updateNote}
                          onChange={(e) => setUpdateNote(e.target.value)}
                          className="text-xs"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            className="text-xs"
                            disabled={!updateStatusValue}
                            onClick={async () => {
                              try {
                                console.log("[HOD] Inline update start", {
                                  id: complaint.id,
                                  to: updateStatusValue,
                                  note: updateNote.trim() || undefined,
                                });
                                const result = await updateComplaintStatusApi(
                                  complaint.id,
                                  updateStatusValue as
                                    | "Pending"
                                    | "In Progress"
                                    | "Resolved"
                                    | "Closed",
                                  updateNote.trim() || undefined
                                );
                                console.log("[HOD] Update API result:", result);
                                const [inboxRaw, managedRaw] =
                                  await Promise.all([
                                    getHodInboxApi(),
                                    getHodManagedComplaintsApi(),
                                  ]);
                                setInbox(
                                  (inboxRaw as unknown[])
                                    .map(mapApiToComplaint)
                                    .filter(isForCurrentHod)
                                );
                                const managedMapped: ComplaintType[] = (
                                  managedRaw as unknown[]
                                ).map(mapApiToComplaint);
                                setComplaints(
                                  managedMapped.filter(isForCurrentHod)
                                );
                                try {
                                  const updated = managedMapped.find(
                                    (c) => c.id === complaint.id
                                  );
                                  console.log(
                                    "[HOD] Post-refetch status:",
                                    updated?.status,
                                    updated
                                  );
                                } catch {
                                  // ignore debug mapping errors
                                }
                                // Keep item visible by switching to Resolved tab when resolved
                                if (updateStatusValue === "Resolved") {
                                  setActiveTab("Resolved");
                                }
                                // dispatch event to refresh open modals timelines
                                try {
                                  window.dispatchEvent(
                                    new CustomEvent(
                                      "complaint:status-changed",
                                      {
                                        detail: { id: complaint.id },
                                      }
                                    ) as Event
                                  );
                                } catch {
                                  // no-op: best-effort event dispatch
                                }
                                toast({
                                  title: "Status Updated",
                                  description:
                                    `Updated to ${updateStatusValue}$$${
                                      updateNote.trim()
                                        ? `: ${updateNote.trim()}`
                                        : ""
                                    }`.replace("$:", ":"),
                                });
                              } catch (err) {
                                toast({
                                  title: "Update failed",
                                  description: (err as Error).message,
                                  variant: "destructive",
                                });
                              } finally {
                                setUpdatingRow(null);
                                setUpdateStatusValue("");
                                setUpdateNote("");
                              }
                            }}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs"
                            onClick={() => {
                              setUpdatingRow(null);
                              setUpdateStatusValue("");
                              setUpdateNote("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => setUpdatingRow(complaint.id)}
                      >
                        Update Status
                      </Button>
                    )}
                    {/* Assignee Info */}
                    <div className="text-xs text-muted-foreground">
                      Assignee:{" "}
                      {complaint.status === "Closed"
                        ? "Rejected"
                        : complaint.assignedStaff || "Not Assigned"}
                    </div>
                  </div>
                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      className="col-span-2"
                      onClick={() => handleViewDetail(complaint)}
                    >
                      View Detail
                    </Button>
                    {(complaint.status === "Pending" ||
                      complaint.status === "Unassigned" ||
                      complaint.status === "Assigned") &&
                      !complaint.assignedStaff && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openAccept(complaint.id)}
                        >
                          Accept
                        </Button>
                      )}
                    {activeTab === "Rejected" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openReopen(complaint.id)}
                      >
                        Undo Rejection
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => openReject(complaint.id)}
                      >
                        Reject
                      </Button>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
          <div className="hidden lg:block overflow-x-auto">
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
                {paginatedComplaints.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-10 text-center text-muted-foreground text-sm"
                    >
                      {activeTab === "Pending" && "No pending complaints"}
                      {activeTab === "Accepted" && "No accepted complaints"}
                      {activeTab === "Resolved" && "No resolved complaints"}
                      {activeTab === "Rejected" && "No rejected complaints"}
                      {activeTab === "All" && "No complaints found"}
                    </TableCell>
                  </TableRow>
                )}
                {paginatedComplaints.map((complaint) => (
                  <TableRow key={complaint.id}>
                    <TableCell className="font-medium text-sm">
                      {complaint.title}
                    </TableCell>
                    <TableCell className="text-sm">
                      {complaint.category}
                    </TableCell>
                    <TableCell className="text-sm">
                      <Badge
                        className={
                          priorityColors[complaint.priority || "Medium"]
                        }
                      >
                        {complaint.priority || "Medium"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`text-xs ${
                          statusColors[
                            complaint.status as keyof typeof statusColors
                          ]
                        }`}
                      >
                        {complaint.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {complaint.status === "Closed" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-100 text-red-800 text-xs font-medium">
                          Rejected
                        </span>
                      ) : complaint.assignedStaff ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-medium">
                          {complaint.assignedStaff}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs font-medium">
                          Not Assigned
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
                          onClick={() => handleViewDetail(complaint)}
                          className="text-xs dark:hover:text-blue-400"
                        >
                          View Detail
                        </Button>
                        {(complaint.status === "Pending" ||
                          complaint.status === "Unassigned" ||
                          complaint.status === "Assigned") &&
                          !complaint.assignedStaff && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="text-xs"
                              onClick={() => openAccept(complaint.id)}
                            >
                              Accept
                            </Button>
                          )}
                        {activeTab === "Rejected" ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="text-xs"
                            onClick={() => openReopen(complaint.id)}
                          >
                            Undo Rejection
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="text-xs"
                            onClick={() => openReject(complaint.id)}
                          >
                            Reject
                          </Button>
                        )}
                        {(!complaint.assignedStaff || isOverdue(complaint)) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs dark:hover:text-blue-400"
                            onClick={() => handleAssignClick(complaint)}
                          >
                            {complaint.assignedStaff ? "Reassign" : "Assign"}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {/* Pagination Controls - aligned with AllComplaints */}
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
      {/* Role-based Complaint Modal for View Detail */}
      {selectedComplaint && (
        <RoleBasedComplaintModal
          complaint={selectedComplaint}
          open={showDetailModal}
          onOpenChange={setShowDetailModal}
          // Hide HoD action panel if the selected complaint is delegated to staff
          hideHodActionsIfAssigned={
            !!selectedComplaint?.assignedStaff &&
            !isAssignedToSelf(selectedComplaint)
          }
          timelineFilterMode="summary"
        />
      )}
      {/* Shared Accept Modal */}
      <AcceptComplaintModal
        open={acceptOpen}
        onOpenChange={setAcceptOpen}
        complaintId={actionComplaintId}
        onAccepted={async ({ id, note, assignToSelf }) => {
          try {
            // Decide path: if item was assigned to HoD by Dean (status Assigned), call HoD accept API
            const pendingItem = [...inbox, ...complaints].find(
              (c) => c.id === id
            );
            const wasDeanAssigned =
              pendingItem?.status === "Assigned" && !pendingItem?.assignedStaff;
            if (wasDeanAssigned) {
              await hodAcceptAssignmentApi(id);
            } else {
              // Direct-to-HoD submissions: accept and assign to self (this already moves to In Progress)
              await approveComplaintApi(id, { assignToSelf: true, note });
            }
            const [inboxRaw, managedRaw] = await Promise.all([
              getHodInboxApi(),
              getHodManagedComplaintsApi(),
            ]);
            setInbox(
              (inboxRaw as unknown[])
                .map(mapApiToComplaint)
                .filter(isForCurrentHod)
            );
            setComplaints(
              (managedRaw as unknown[])
                .map(mapApiToComplaint)
                .filter(isForCurrentHod)
            );
            toast({
              title: "Accepted",
              description: "Complaint is now In Progress.",
            });
            window.dispatchEvent(
              new CustomEvent("complaint:status-changed", { detail: { id } })
            );
            // Move UI focus to Accepted tab
            setActiveTab("Accepted");
          } catch (err) {
            toast({
              title: "Accept failed",
              description: (err as Error).message,
              variant: "destructive",
            });
          }
        }}
      />
      {/* Shared Reject Modal */}
      <RejectComplaintModal
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        complaintId={actionComplaintId}
        onRejected={async ({ id, reason }) => {
          try {
            await updateComplaintStatusApi(id, "Closed", reason);
            const [inboxRaw, managedRaw] = await Promise.all([
              getHodInboxApi(),
              getHodManagedComplaintsApi(),
            ]);
            setInbox(
              (inboxRaw as unknown[])
                .map(mapApiToComplaint)
                .filter(isForCurrentHod)
            );
            setComplaints(
              (managedRaw as unknown[])
                .map(mapApiToComplaint)
                .filter(isForCurrentHod)
            );
            toast({
              title: "Rejected",
              description: "Complaint rejected and closed.",
            });
            window.dispatchEvent(
              new CustomEvent("complaint:status-changed", { detail: { id } })
            );
            // Move UI focus to Rejected tab
            setActiveTab("Rejected");
          } catch (err) {
            toast({
              title: "Reject failed",
              description: (err as Error).message,
              variant: "destructive",
            });
          }
        }}
      />
      {/* Shared Reopen Modal */}
      <ReopenComplaintModal
        open={reopenOpen}
        onOpenChange={setReopenOpen}
        complaintId={actionComplaintId}
        onReopen={async ({ id, reason, acceptImmediately }) => {
          try {
            // Step 1: Closed -> Pending
            await updateComplaintStatusApi(
              id,
              "Pending",
              `Reopened: ${reason}`
            );
            // Optional immediate approve
            if (acceptImmediately) {
              await approveComplaintApi(id, {
                assignToSelf: true,
                note: "Auto-accepted after reopen",
              });
            }
            const [inboxRaw, managedRaw] = await Promise.all([
              getHodInboxApi(),
              getHodManagedComplaintsApi(),
            ]);
            setInbox(
              (inboxRaw as unknown[])
                .map(mapApiToComplaint)
                .filter(isForCurrentHod)
            );
            setComplaints(
              (managedRaw as unknown[])
                .map(mapApiToComplaint)
                .filter(isForCurrentHod)
            );
            toast({
              title: "Reopened",
              description: acceptImmediately
                ? "Complaint reopened and accepted."
                : "Complaint reopened to Pending.",
            });
            window.dispatchEvent(
              new CustomEvent("complaint:status-changed", { detail: { id } })
            );
            // Move UI focus to Pending (or Accepted if auto-accepted)
            setActiveTab(acceptImmediately ? "Accepted" : "Pending");
          } catch (err) {
            toast({
              title: "Reopen failed",
              description: (err as Error).message,
              variant: "destructive",
            });
          }
        }}
      />
      {/* Shared Assign Staff Modal */}
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
    </div>
  );
}
