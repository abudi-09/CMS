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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Search } from "lucide-react";
import { RoleBasedComplaintModal } from "@/components/RoleBasedComplaintModal";
import { useAuth } from "@/components/auth/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { Complaint as ComplaintType } from "@/components/ComplaintCard";
import {
  assignComplaintApi,
  deanAssignToHodApi,
  getDeanActiveHodApi,
  getDeanInboxApi,
  getDeanScopedComplaintsApi,
  listMyDepartmentActiveStaffApi,
  openNotificationsEventSource,
  updateComplaintStatusApi,
  approveComplaintApi,
  type InboxComplaint,
} from "@/lib/api";
import { getComplaintApi } from "@/lib/getComplaintApi";

const statusColors = {
  Pending: "bg-yellow-100 text-yellow-800",
  Accepted: "bg-blue-100 text-blue-800",
  "In Progress": "bg-blue-100 text-blue-800",
  Resolved: "bg-green-100 text-green-800",
  Closed: "bg-gray-100 text-gray-800",
  Rejected: "bg-red-100 text-red-800",
  Overdue: "bg-red-100 text-red-800",
} as const;

type RawComplaint = {
  id: string;
  title?: string;
  description?: string;
  category?: string;
  department?: string;
  status?: string;
  submittedBy?: string | { name?: string } | null;
  sourceRole?: string | null;
  assignedTo?: string | { name?: string } | null;
  assignedByRole?: string | null;
  assignmentPath?: string[] | null;
  submittedDate?: string | null;
  lastUpdated?: string | null;
  deadline?: string | null;
  priority?: "Low" | "Medium" | "High" | "Critical" | null;
  feedback?: unknown;
  isEscalated?: boolean | null;
  submittedTo?: string | null;
};

export function DeanAssignComplaints() {
  const { user } = useAuth();
  const pageSize = 10;

  // Core UI state
  const [assigningDeadline, setAssigningDeadline] = useState<string>("");
  const [staffOptions, setStaffOptions] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [complaints, setComplaints] = useState<ComplaintType[]>([]);
  const [selectedComplaint, setSelectedComplaint] =
    useState<ComplaintType | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [reassigningRow, setReassigningRow] = useState<string | null>(null);
  const [assigningStaffId, setAssigningStaffId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<
    "Pending" | "Accepted" | "Assigned" | "Resolved" | "Rejected"
  >("Pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<
    "all" | "Low" | "Medium" | "High" | "Critical"
  >("all");
  const [overdueFilter, setOverdueFilter] = useState<
    "all" | "overdue" | "notOverdue"
  >("all");
  const [page, setPage] = useState(1);

  // Initial load + refresh helper using strict dean-scoped endpoints only
  const loadComplaints = async (opts?: {
    status?: string;
    newStatus?: string;
  }) => {
    try {
      const [inboxRaw, scopedRaw, staff] = await Promise.all([
        getDeanInboxApi().catch(() => []),
        getDeanScopedComplaintsApi().catch(() => ({ items: [] })),
        listMyDepartmentActiveStaffApi().catch(() => []),
      ]);

      const inbox = (inboxRaw || []) as InboxComplaint[];
      const scopedItems: unknown[] =
        scopedRaw &&
        typeof scopedRaw === "object" &&
        "items" in (scopedRaw as { items?: unknown[] })
          ? (scopedRaw as { items?: unknown[] }).items || []
          : [];
      const all = scopedItems as RawComplaint[];

      const mappedInbox = (inbox || []).map((c) => ({
        id: String(c.id || ""),
        title: String(c.title || "Complaint"),
        description: "",
        category: String(c.category || "General"),
        status: (c.status as ComplaintType["status"]) || "Pending",
        submittedBy:
          typeof c.submittedBy === "string"
            ? c.submittedBy
            : c.submittedBy?.name || "",
        sourceRole: (c.sourceRole as ComplaintType["sourceRole"]) || undefined,
        assignedStaff:
          typeof c.assignedTo === "string"
            ? c.assignedTo
            : (c.assignedTo as { name?: string } | null)?.name || undefined,
        assignedStaffRole: undefined,
        assignedByRole:
          typeof c.assignedByRole === "string" ? c.assignedByRole : undefined,
        assignmentPath: Array.isArray(c.assignmentPath)
          ? (c.assignmentPath as string[])
          : [],
        submittedDate: c.submittedDate ? new Date(c.submittedDate) : new Date(),
        lastUpdated: c.lastUpdated ? new Date(c.lastUpdated) : new Date(),
        deadline: c.deadline ? new Date(c.deadline) : undefined,
        priority: (c.priority as ComplaintType["priority"]) || "Medium",
        feedback: undefined,
        isEscalated: false,
        submittedTo: c.submittedTo || undefined,
        department: undefined,
      })) as ComplaintType[];

      const mappedFromAll = (all || [])
        .filter((c) => c && c.id && c.status)
        .map((c) => ({
          id: c.id,
          title: c.title || "Complaint",
          description: c.description || "",
          category: c.category || c.department || "General",
          status: (c.status as ComplaintType["status"]) || "Pending",
          submittedBy:
            typeof c.submittedBy === "string"
              ? c.submittedBy
              : (c.submittedBy as { name?: string } | null)?.name || "",
          sourceRole:
            (c.sourceRole as ComplaintType["sourceRole"]) || undefined,
          assignedStaff:
            typeof c.assignedTo === "string"
              ? c.assignedTo
              : (c.assignedTo as { name?: string } | null)?.name || undefined,
          assignedStaffRole:
            c.assignedByRole === "dean"
              ? "dean"
              : c.assignedByRole === "hod"
              ? "hod"
              : undefined,
          assignedByRole: (c.assignedByRole ||
            undefined) as ComplaintType["assignedByRole"],
          assignmentPath: Array.isArray(c.assignmentPath)
            ? (c.assignmentPath as ComplaintType["assignmentPath"])
            : [],
          submittedDate: c.submittedDate
            ? new Date(c.submittedDate)
            : new Date(),
          lastUpdated: c.lastUpdated ? new Date(c.lastUpdated) : new Date(),
          deadline: c.deadline ? new Date(c.deadline) : undefined,
          priority: (c.priority as ComplaintType["priority"]) || "Medium",
          feedback: undefined,
          isEscalated: !!c.isEscalated,
          submittedTo: c.submittedTo || undefined,
          department: c.department || undefined,
        })) as ComplaintType[];

      // Strict dean scope: include only non-pending (work items) from scoped list
      const nonPending = mappedFromAll.filter(
        (c) => c.status !== "Pending" && c.status !== "Unassigned"
      );

      // Merge inbox + non-pending and dedupe by id
      const byId = new Map<string, ComplaintType>();
      for (const item of [...mappedInbox, ...nonPending])
        byId.set(item.id, item);
      setComplaints(Array.from(byId.values()));

      setStaffOptions(
        (staff as any[])
          .map((s) => ({
            id: s._id,
            name: s.fullName || s.name || s.username || s.email,
          }))
          .filter((s) => s.id)
      );

      // Optional tab auto-switch based on external status update
      const s = opts?.newStatus || opts?.status;
      if (s === "Resolved") setActiveTab("Resolved");
      if (s === "Accepted" || s === "In Progress") setActiveTab("Accepted");
      if (s === "Closed") setActiveTab("Rejected");
    } catch (e) {
      console.error("Failed to load dean complaints", e);
    }
  };

  // Accept flow state
  const [acceptTarget, setAcceptTarget] = useState<ComplaintType | null>(null);
  const [acceptNote, setAcceptNote] = useState("");
  const [accepting, setAccepting] = useState(false);
  // Dean -> HoD reassign state
  const [assignHodOpen, setAssignHodOpen] = useState<ComplaintType | null>(
    null
  );
  const [hodOptions, setHodOptions] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [selectedHodId, setSelectedHodId] = useState<string>("");
  const [hodDeadline, setHodDeadline] = useState<string>("");
  // Bulk accept state
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkNote, setBulkNote] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  // Helpers and actions
  const handleViewDetail = (complaint: ComplaintType) => {
    setSelectedComplaint(complaint);
    setShowDetailModal(true);
    setAssigningStaffId("");
    setReassigningRow(null);
  };

  const handleStaffAssignment = async (
    complaintId: string,
    staffId: string
  ) => {
    try {
      await assignComplaintApi(complaintId, staffId, assigningDeadline, {
        assignedByRole: "dean",
        assignmentPath: ["dean", "staff"],
      });
      const updated = await getComplaintApi(complaintId);
      setComplaints((prev) =>
        prev.map((c) =>
          c.id === complaintId
            ? {
                ...c,
                assignedStaff:
                  updated?.assignedTo?.name ||
                  staffOptions.find((s) => s.id === staffId)?.name ||
                  c.assignedStaff,
                assignedStaffRole: "staff",
                assignedByRole: "dean",
                assignmentPath: Array.isArray(updated.assignmentPath)
                  ? updated.assignmentPath
                  : c.assignmentPath,
                lastUpdated: new Date(),
                deadline: updated.deadline
                  ? new Date(updated.deadline)
                  : c.deadline,
                status: "Assigned",
              }
            : c
        )
      );
      toast({
        title: "Assigned",
        description: `Assigned successfully${
          assigningDeadline
            ? `, deadline ${new Date(assigningDeadline).toLocaleDateString()}`
            : ""
        }`,
      });
      // Broadcast status change and switch to Assigned tab
      window.dispatchEvent(
        new CustomEvent("complaint:status-changed", {
          detail: {
            id: complaintId,
            status: "Assigned",
            newStatus: "Assigned",
            byRole: "dean",
            at: Date.now(),
          },
        })
      );
      setActiveTab("Assigned");
    } catch (e: unknown) {
      const msg =
        typeof e === "object" && e && "message" in e
          ? String((e as { message?: unknown }).message || "")
          : "Unable to assign complaint";
      toast({
        title: "Assign failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setReassigningRow(null);
      setAssigningStaffId("");
      setAssigningDeadline("");
    }
  };

  const handleReject = async (complaintId: string) => {
    try {
      await updateComplaintStatusApi(complaintId, "Closed", "Rejected by Dean");
      await loadComplaints({ newStatus: "Closed" });
      toast({
        title: "Rejected",
        description: "Complaint rejected and closed.",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({
        title: "Reject failed",
        description: msg,
        variant: "destructive",
      });
    }
  };

  // Initial load and SSE refresh wiring
  useEffect(() => {
    loadComplaints();

    const handleStatusChange = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent).detail as {
          status?: string;
          newStatus?: string;
        };
        loadComplaints(detail || undefined);
      } catch (e) {
        loadComplaints();
      }
    };
    window.addEventListener(
      "complaint:status-changed",
      handleStatusChange as EventListener
    );
    window.addEventListener(
      "complaint-status-changed",
      handleStatusChange as EventListener
    );

    const es = openNotificationsEventSource((n: any) => {
      try {
        if (
          n?.type === "submission" &&
          (n?.meta?.audience === "dean" ||
            n?.meta?.redirectPath === "/dean/assign-complaints")
        ) {
          window.dispatchEvent(
            new CustomEvent("complaint-status-changed", {
              detail: { newStatus: "Pending" },
            })
          );
        }
      } catch {
        /* noop */
      }
    });
    return () => {
      window.removeEventListener(
        "complaint:status-changed",
        handleStatusChange as EventListener
      );
      window.removeEventListener(
        "complaint-status-changed",
        handleStatusChange as EventListener
      );
      try {
        es.close();
      } catch {
        /* noop */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReapprove = async (complaintId: string) => {
    try {
      const note = window.prompt(
        "Add a short note for this approval (required):",
        "Approved and taking ownership"
      );
      if (!note || !note.trim()) {
        toast({
          title: "Note required",
          description: "Approval note is required.",
          variant: "destructive",
        });
        return;
      }
      await approveComplaintApi(complaintId, {
        assignToSelf: true,
        note: note.trim(),
      });
      const updated = await getComplaintApi(complaintId);
      setComplaints((prev) =>
        prev.map((c) =>
          c.id === complaintId
            ? {
                ...c,
                status: updated.status || "Accepted",
                assignedStaff:
                  (user?.fullName as string) ||
                  (user?.name as string) ||
                  (user?.email as string) ||
                  "Dean",
                assignedStaffRole: "dean",
                lastUpdated: new Date(),
              }
            : c
        )
      );
      toast({ title: "Re-approved", description: "Assigned to you." });
    } catch (e: unknown) {
      const msg =
        typeof e === "object" && e && "message" in e
          ? String((e as { message?: unknown }).message || "")
          : "Failed to approve";
      toast({
        title: "Approve failed",
        description: msg,
        variant: "destructive",
      });
    }
  };

  // Open Dean->HoD assignment modal, lazy-load active HODs
  const openAssignHod = async (c: ComplaintType) => {
    setAssignHodOpen(c);
    setSelectedHodId("");
    setHodDeadline("");
    try {
      const hods = await getDeanActiveHodApi();
      setHodOptions(
        (hods || []).map((h) => ({
          id: h._id,
          name: h.fullName || h.name || h.username || h.email,
        }))
      );
    } catch {
      setHodOptions([]);
    }
  };

  const confirmAssignHod = async () => {
    if (!assignHodOpen || !selectedHodId) return;
    try {
      await deanAssignToHodApi(assignHodOpen.id, {
        hodId: selectedHodId,
        deadline: hodDeadline || undefined,
      });
      // Update local state: set status to Assigned and assignedStaffRole to hod
      setComplaints((prev) =>
        prev.map((c) =>
          c.id === assignHodOpen.id
            ? {
                ...c,
                assignedStaff:
                  hodOptions.find((h) => h.id === selectedHodId)?.name ||
                  c.assignedStaff,
                assignedStaffRole: "hod",
                assignedByRole: "dean",
                assignmentPath: Array.from(
                  new Set([...(c.assignmentPath || []), "dean", "hod"])
                ) as ComplaintType["assignmentPath"],
                deadline: hodDeadline ? new Date(hodDeadline) : c.deadline,
                status: "Assigned",
              }
            : c
        )
      );
      toast({
        title: "Assigned to HoD",
        description: "Awaiting HoD acceptance.",
      });
      setAssignHodOpen(null);
      setSelectedHodId("");
      setHodDeadline("");
      // Switch to Assigned tab to show the newly assigned complaint
      setActiveTab("Assigned");
    } catch (e: unknown) {
      const msg =
        typeof e === "object" && e && "message" in e
          ? String((e as { message?: unknown }).message || "")
          : "Failed to assign to HoD";
      toast({
        title: "Assign failed",
        description: msg,
        variant: "destructive",
      });
    }
  };

  const handleModalUpdate = (
    complaintId: string,
    updates: Partial<ComplaintType>
  ) => {
    setComplaints((prev) =>
      prev.map((c) => (c.id === complaintId ? { ...c, ...updates } : c))
    );
    if (updates.status === "Resolved") setActiveTab("Resolved");
    if (updates.status === "Accepted") setActiveTab("Accepted");
    if (updates.status === "Assigned") setActiveTab("Assigned");
  };

  const isOverdue = (complaint: ComplaintType) => {
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

  const matchesTab = (c: ComplaintType) => {
    if (activeTab === "Pending")
      return c.status === "Pending" || c.status === "Unassigned";
    // Accepted tab represents working items: legacy 'Accepted' plus new 'In Progress'
    if (activeTab === "Accepted")
      return c.status === "In Progress" || c.status === "Accepted";
    if (activeTab === "Assigned") return c.status === "Assigned";
    if (activeTab === "Resolved") return c.status === "Resolved";
    if (activeTab === "Rejected") return c.status === "Closed";
    return false;
  };
  const filteredComplaints = complaints
    .filter(matchesTab)
    .filter((complaint) => {
      const matchesSearch =
        complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.submittedBy.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPriority =
        priorityFilter === "all" ||
        (complaint.priority || "Medium") === priorityFilter;
      const matchesOverdue =
        overdueFilter === "all"
          ? true
          : overdueFilter === "overdue"
          ? isOverdue(complaint)
          : !isOverdue(complaint);
      return matchesSearch && matchesPriority && matchesOverdue;
    });

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

  const unassignedCount = filteredComplaints.filter(
    (c) => !c.assignedStaff
  ).length;
  const assignedCount = filteredComplaints.filter(
    (c) => c.assignedStaff
  ).length;
  const priorityColors = {
    Low: "bg-gray-200 text-gray-700 border-gray-300",
    Medium: "bg-blue-100 text-blue-800 border-blue-200",
    High: "bg-orange-100 text-orange-800 border-orange-200",
    Critical: "bg-red-100 text-red-800 border-red-200 font-bold border-2",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">
          Assign & Reassign Complaints (Dean)
        </h1>
        <p className="text-muted-foreground">
          Manage staff assignments for complaints in your department
        </p>
      </div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <div className="h-4 w-4 rounded-full bg-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                complaints.filter(
                  (c) => c.status === "Pending" || c.status === "Unassigned"
                ).length
              }
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <div className="h-4 w-4 rounded-full bg-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {complaints.filter((c) => c.status === "In Progress").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <div className="h-4 w-4 rounded-full bg-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {complaints.filter((c) => c.status === "Closed").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <div className="h-4 w-4 rounded-full bg-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {complaints.filter((c) => c.status === "Resolved").length}
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Search & Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 sm:gap-4 w-full">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, department, or submitter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full">
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
              <SelectTrigger className="w-full">
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
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle>Complaints</CardTitle>
            <div className="flex items-center gap-2">
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as typeof activeTab)}
              >
                <TabsList>
                  <TabsTrigger value="Pending">Pending</TabsTrigger>
                  <TabsTrigger value="Accepted">Accepted</TabsTrigger>
                  <TabsTrigger value="Assigned">Assigned</TabsTrigger>
                  <TabsTrigger value="Resolved">Resolved</TabsTrigger>
                  <TabsTrigger value="Rejected">Rejected</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          <CardDescription>
            {filteredComplaints.length} complaint
            {filteredComplaints.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-sm">Title</TableHead>
                  <TableHead className="text-sm">Category</TableHead>
                  <TableHead className="text-sm">Priority</TableHead>
                  <TableHead className="text-sm">Status</TableHead>
                  <TableHead className="text-sm">Assignee</TableHead>
                  <TableHead className="text-sm">Submission Date</TableHead>
                  <TableHead className="text-sm">Deadline</TableHead>
                  <TableHead className="text-sm">Overdue</TableHead>
                  <TableHead className="text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span>Actions</span>
                      {activeTab === "Pending" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setBulkOpen(true)}
                        >
                          Accept All
                        </Button>
                      )}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedComplaints.map((complaint) => (
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
                          priorityColors[complaint.priority || "Medium"]
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
                      {complaint.status === "Assigned" &&
                      complaint.assignedStaffRole === "hod" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs font-medium">
                          Assigned
                        </span>
                      ) : complaint.status === "Accepted" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-medium">
                          {complaint.assignedStaff || "Accepted"}
                        </span>
                      ) : complaint.assignedStaff ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-medium">
                          {complaint.assignedStaff}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs font-medium">
                          Not Yet Assigned
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {complaint.submittedDate
                        ? new Date(complaint.submittedDate).toLocaleDateString()
                        : "N/A"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {complaint.deadline
                        ? new Date(complaint.deadline).toLocaleDateString()
                        : "No deadline"}
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
                        {/* Dean can accept to solve and assign to HoD (hide on Resolved tab) */}
                        {activeTab === "Pending" &&
                          (complaint.status === "Pending" ||
                            complaint.status === "Unassigned") && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="text-xs"
                              onClick={() => {
                                setAcceptTarget(complaint);
                                setAcceptNote("");
                              }}
                            >
                              Accept
                            </Button>
                          )}
                        {activeTab === "Pending" &&
                          (!complaint.assignedStaff ||
                            complaint.assignedStaffRole !== "hod") &&
                          (complaint.status === "Pending" ||
                            complaint.status === "Unassigned") && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={() => openAssignHod(complaint)}
                            >
                              Assign to HoD
                            </Button>
                          )}
                        {activeTab === "Rejected" ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="text-xs"
                            onClick={() => handleReapprove(complaint.id)}
                          >
                            Re-approve
                          </Button>
                        ) : (
                          activeTab === "Pending" && (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="text-xs"
                              onClick={() => handleReject(complaint.id)}
                            >
                              Reject
                            </Button>
                          )
                        )}
                        {activeTab !== "Resolved" &&
                        reassigningRow === complaint.id ? (
                          <>
                            <Select
                              value={assigningStaffId}
                              onValueChange={setAssigningStaffId}
                            >
                              <SelectTrigger className="w-40 text-xs">
                                <SelectValue placeholder="Select assignee" />
                              </SelectTrigger>
                              <SelectContent>
                                {staffOptions.map((staff) => (
                                  <SelectItem key={staff.id} value={staff.id}>
                                    {staff.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              type="date"
                              className="w-36 text-xs"
                              value={assigningDeadline}
                              onChange={(e) =>
                                setAssigningDeadline(e.target.value)
                              }
                              required
                            />
                            <Button
                              size="sm"
                              variant="default"
                              className="text-xs"
                              disabled={!assigningStaffId || !assigningDeadline}
                              onClick={() =>
                                handleStaffAssignment(
                                  complaint.id,
                                  assigningStaffId
                                )
                              }
                            >
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs"
                              onClick={() => {
                                setReassigningRow(null);
                                setAssigningStaffId("");
                                setAssigningDeadline("");
                              }}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {paginatedComplaints.map((complaint) => (
              <Card key={complaint.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm leading-tight flex items-center gap-2">
                        {complaint.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Submitted by {complaint.submittedBy}
                      </p>
                    </div>
                    {complaint.status !== "Unassigned" && (
                      <Badge
                        className={`ml-2 text-xs ${
                          statusColors[
                            complaint.status as keyof typeof statusColors
                          ]
                        }`}
                      >
                        {complaint.status}
                      </Badge>
                    )}
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
                      <Badge
                        className={
                          priorityColors[complaint.priority || "Medium"]
                        }
                      >
                        {complaint.priority || "Medium"}
                      </Badge>
                    </div>
                    <div>
                      {complaint.status === "Assigned" &&
                      complaint.assignedStaffRole === "hod" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs font-medium">
                          Assigned
                        </span>
                      ) : complaint.status === "Accepted" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-medium">
                          Assigned to: {complaint.assignedStaff || "Accepted"}
                        </span>
                      ) : complaint.assignedStaff ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-medium">
                          Assigned to: {complaint.assignedStaff}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs font-medium">
                          Not Yet Assigned
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Submission Date:
                      </span>
                      <span className="font-medium ml-2">
                        {complaint.submittedDate
                          ? new Date(
                              complaint.submittedDate
                            ).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Deadline:</span>
                      <span className="font-medium ml-2">
                        {complaint.deadline
                          ? new Date(complaint.deadline).toLocaleDateString()
                          : "No deadline"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Overdue:</span>
                      {isOverdue(complaint) ? (
                        <Badge
                          className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 text-xs ml-2"
                          variant="outline"
                        >
                          Overdue
                        </Badge>
                      ) : (
                        <Badge
                          className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 text-xs ml-2"
                          variant="outline"
                        >
                          Not Overdue
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewDetail(complaint)}
                      className="w-full text-xs dark:hover:text-blue-400"
                    >
                      View Detail
                    </Button>
                    {/* Dean actions on mobile (hide on Resolved tab) */}
                    {activeTab === "Pending" &&
                      (complaint.status === "Pending" ||
                        complaint.status === "Unassigned") && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="w-full text-xs"
                          onClick={() => {
                            setAcceptTarget(complaint);
                            setAcceptNote("");
                          }}
                        >
                          Accept
                        </Button>
                      )}
                    {activeTab === "Pending" &&
                      (!complaint.assignedStaff ||
                        complaint.assignedStaffRole !== "hod") &&
                      (complaint.status === "Pending" ||
                        complaint.status === "Unassigned") && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs"
                          onClick={() => openAssignHod(complaint)}
                        >
                          Assign to HoD
                        </Button>
                      )}
                    {activeTab === "Rejected" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full text-xs"
                        onClick={() => handleReapprove(complaint.id)}
                      >
                        Re-approve
                      </Button>
                    ) : (
                      activeTab === "Pending" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="w-full text-xs"
                          onClick={() => handleReject(complaint.id)}
                        >
                          Reject
                        </Button>
                      )
                    )}
                    {activeTab !== "Resolved" &&
                    reassigningRow === complaint.id ? (
                      <>
                        <Select
                          value={assigningStaffId}
                          onValueChange={setAssigningStaffId}
                        >
                          <SelectTrigger className="w-full text-xs">
                            <SelectValue placeholder="Select assignee" />
                          </SelectTrigger>
                          <SelectContent>
                            {staffOptions.map((staff) => (
                              <SelectItem key={staff.id} value={staff.id}>
                                {staff.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="date"
                          className="w-full text-xs mt-1"
                          value={assigningDeadline}
                          onChange={(e) => setAssigningDeadline(e.target.value)}
                          required
                        />
                        <Button
                          size="sm"
                          variant="default"
                          className="w-full text-xs mt-1"
                          disabled={!assigningStaffId || !assigningDeadline}
                          onClick={() =>
                            handleStaffAssignment(
                              complaint.id,
                              assigningStaffId
                            )
                          }
                        >
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full text-xs mt-1"
                          onClick={() => {
                            setReassigningRow(null);
                            setAssigningStaffId("");
                            setAssigningDeadline("");
                          }}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              </Card>
            ))}
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
          onUpdate={handleModalUpdate}
          fetchLatest={true}
        />
      )}

      {/* Accept modal: dean accepts to solve with optional note */}
      <Dialog
        open={!!acceptTarget}
        onOpenChange={(open) => {
          if (!open) {
            setAcceptTarget(null);
            setAcceptNote("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept complaint to solve</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              You are accepting this complaint. Status will change to "Accepted"
              and it will be assigned to you.
            </p>
            <Textarea
              placeholder="Optional note visible to the user..."
              value={acceptNote}
              onChange={(e) => setAcceptNote(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setAcceptTarget(null);
                setAcceptNote("");
              }}
              disabled={accepting}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                (async () => {
                  if (!acceptTarget) return;
                  try {
                    setAccepting(true);
                    await approveComplaintApi(acceptTarget.id, {
                      assignToSelf: true,
                      note: acceptNote.trim() || undefined,
                    });
                    const updated = await getComplaintApi(acceptTarget.id);
                    const assignee =
                      (user?.fullName as string) ||
                      (user?.name as string) ||
                      (user?.email as string) ||
                      "Dean";
                    setComplaints((prev) =>
                      prev.map((c) =>
                        c.id === acceptTarget.id
                          ? {
                              ...c,
                              status: "In Progress",
                              assignedStaff:
                                updated?.assignedTo?.name || assignee,
                              assignedStaffRole: "dean",
                              resolutionNote: acceptNote || c.resolutionNote,
                              lastUpdated: new Date(),
                            }
                          : c
                      )
                    );
                    // Broadcast normalized event
                    window.dispatchEvent(
                      new CustomEvent("complaint:status-changed", {
                        detail: {
                          id: acceptTarget.id,
                          status: "In Progress",
                          newStatus: "In Progress",
                          note: acceptNote || undefined,
                          byRole: "dean",
                          at: new Date().toISOString(),
                        },
                      })
                    );
                    // Switch tab to Accepted (In Progress bucket)
                    setActiveTab("Accepted");
                    toast({
                      title: "Accepted",
                      description:
                        "Complaint assigned to you and set In Progress.",
                    });
                  } catch (e: unknown) {
                    const msg =
                      typeof e === "object" && e && "message" in e
                        ? String((e as { message?: unknown }).message || "")
                        : "Failed to accept complaint";
                    toast({
                      title: "Accept failed",
                      description: msg,
                      variant: "destructive",
                    });
                  } finally {
                    setAccepting(false);
                    setAcceptTarget(null);
                    setAcceptNote("");
                  }
                })();
              }}
              disabled={accepting}
            >
              Confirm Accept
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Accept modal */}
      <Dialog
        open={bulkOpen}
        onOpenChange={(open) => {
          if (!open) {
            setBulkOpen(false);
            setBulkNote("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Accept (set In Progress) all visible pending complaints
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              All currently visible Pending/Unassigned complaints will be
              assigned to you and moved to "In Progress".
            </p>
            <Textarea
              placeholder="Optional note applied to all..."
              value={bulkNote}
              onChange={(e) => setBulkNote(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setBulkOpen(false);
                setBulkNote("");
              }}
              disabled={bulkLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                (async () => {
                  try {
                    setBulkLoading(true);
                    const assignee =
                      (user?.fullName as string) ||
                      (user?.name as string) ||
                      (user?.email as string) ||
                      "Dean";
                    // Limit bulk accept to items visible on the current page
                    const start = (page - 1) * pageSize;
                    const onPage = filteredComplaints.slice(
                      start,
                      start + pageSize
                    );
                    const targets = onPage.filter(
                      (c) =>
                        activeTab === "Pending" &&
                        (c.status === "Pending" || c.status === "Unassigned") &&
                        !c.assignedStaff
                    );
                    const results = await Promise.allSettled(
                      targets.map((t) =>
                        approveComplaintApi(t.id, {
                          assignToSelf: true,
                          note: (bulkNote || "").trim() || undefined,
                        })
                      )
                    );
                    const successIds: string[] = [];
                    const failCount = results.reduce((acc, r, idx) => {
                      if (r.status === "fulfilled") {
                        successIds.push(targets[idx].id);
                        return acc;
                      }
                      return acc + 1;
                    }, 0);
                    if (successIds.length) {
                      setComplaints((prev) =>
                        prev.map((c) =>
                          successIds.includes(c.id)
                            ? {
                                ...c,
                                status: "In Progress",
                                assignedStaff: assignee,
                                assignedStaffRole: "dean",
                                resolutionNote: bulkNote || c.resolutionNote,
                                lastUpdated: new Date(),
                              }
                            : c
                        )
                      );
                      // Broadcast an event per success
                      successIds.forEach((id) =>
                        window.dispatchEvent(
                          new CustomEvent("complaint:status-changed", {
                            detail: {
                              id,
                              status: "In Progress",
                              newStatus: "In Progress",
                              note: (bulkNote || undefined) as
                                | string
                                | undefined,
                              byRole: "dean",
                              at: new Date().toISOString(),
                            },
                          })
                        )
                      );
                      setActiveTab("Accepted"); // Accepted tab now represents In Progress
                    }
                    toast({
                      title: "Bulk acceptance complete",
                      description: `${successIds.length} moved to In Progress${
                        failCount ? `, ${failCount} failed` : ""
                      }`,
                    });
                  } catch (e) {
                    const msg = e instanceof Error ? e.message : String(e);
                    toast({
                      title: "Bulk acceptance failed",
                      description: msg,
                      variant: "destructive",
                    });
                  } finally {
                    setBulkLoading(false);
                    setBulkOpen(false);
                    setBulkNote("");
                  }
                })();
              }}
              disabled={bulkLoading}
            >
              Confirm Accept All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign to HoD modal */}
      <Dialog
        open={!!assignHodOpen}
        onOpenChange={(open) => {
          if (!open) {
            setAssignHodOpen(null);
            setSelectedHodId("");
            setHodDeadline("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign to Head of Department</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Select a Head of Department to reassign this complaint. It will
              remain Pending until the HoD accepts.
            </p>
            <Select value={selectedHodId} onValueChange={setSelectedHodId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select HoD" />
              </SelectTrigger>
              <SelectContent>
                {hodOptions.map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div>
              <label className="text-xs text-muted-foreground">
                Optional deadline
              </label>
              <Input
                type="date"
                className="w-full"
                value={hodDeadline}
                onChange={(e) => setHodDeadline(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setAssignHodOpen(null);
                setSelectedHodId("");
                setHodDeadline("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={confirmAssignHod} disabled={!selectedHodId}>
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
