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
import { Search, UserPlus } from "lucide-react";
import { RoleBasedComplaintModal } from "@/components/RoleBasedComplaintModal";
import { useAuth } from "@/components/auth/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useState as useReactState } from "react";
import { Complaint as ComplaintType } from "@/components/ComplaintCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
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
  listAllComplaintsApi,
  listMyDepartmentActiveStaffApi,
  assignComplaintApi,
  getDeanInboxApi,
  getDeanActiveHodApi,
  deanAssignToHodApi,
  approveComplaintApi,
  type InboxComplaint,
} from "@/lib/api";
import { updateComplaintStatusApi } from "@/lib/api";
import { getComplaintApi } from "@/lib/getComplaintApi";
// Use ComplaintType for all references to Complaint

const statusColors = {
  Pending: "bg-yellow-100 text-yellow-800",
  "In Progress": "bg-blue-100 text-blue-800",
  Resolved: "bg-green-100 text-green-800",
  Closed: "bg-gray-100 text-gray-800",
  Delayed: "bg-red-100 text-red-800",
};

export function DeanAssignComplaints() {
  // State for deadline during assignment
  const [assigningDeadline, setAssigningDeadline] = useState<string>("");
  const { getAllStaff, user } = useAuth();
  const role = user?.role;
  // Pagination state
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const [complaints, setComplaints] = useReactState<ComplaintType[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffOptions, setStaffOptions] = useState<
    Array<{ id: string; name: string }>
  >([]);
  type RawComplaint = {
    id: string;
    complaintCode?: string;
    title?: string;
    description?: string;
    category?: string;
    department?: string;
    status: "Pending" | "In Progress" | "Resolved" | "Closed";
    submittedBy?: string;
    submittedDate?: string | Date;
    lastUpdated?: string | Date;
    assignedTo?: string | { name?: string } | null;
    assignedByRole?: string | null;
    assignmentPath?: string[];
    deadline?: string | Date | null;
    priority?: "Low" | "Medium" | "High" | "Critical";
    feedback?: unknown;
    isEscalated?: boolean;
    submittedTo?: string | null;
    sourceRole?:
      | "student"
      | "staff"
      | "dean"
      | "headOfDepartment"
      | "hod"
      | "admin";
  };
  type DeptStaff = {
    _id: string;
    fullName?: string;
    name?: string;
    username?: string;
    email: string;
  };

  // Load real complaints and eligible staff
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const inboxP = getDeanInboxApi().catch(() => []);
        const allP = listAllComplaintsApi().catch(() => []);
        // Only fetch department staff if the current user has a department set; otherwise default to empty
        const staffP = (
          user?.department
            ? listMyDepartmentActiveStaffApi()
            : Promise.resolve([])
        ).catch(() => []);
        const [inboxRaw, allRaw, staffRaw] = await Promise.all([
          inboxP,
          allP,
          staffP,
        ]);
        const inbox = inboxRaw as InboxComplaint[];
        const all = allRaw as unknown as RawComplaint[];
        const staff = staffRaw as unknown as DeptStaff[];
        if (!mounted) return;
        const mappedFromAll = (all as RawComplaint[])
          .filter((c) => c && c.id && c.status) // basic sanity
          .map((c) => ({
            id: c.id,
            title: c.title || c.complaintCode || "Complaint",
            description: c.description || "",
            category: c.category || c.department || "General",
            status: c.status,
            submittedBy: c.submittedBy || "",
            sourceRole: c.sourceRole,
            assignedStaff:
              typeof c.assignedTo === "string"
                ? c.assignedTo
                : (c.assignedTo as { name?: string } | null)?.name || undefined,
            assignedStaffRole:
              c.assignedByRole === "dean"
                ? "dean"
                : c.assignedByRole === "hod"
                ? "headOfDepartment"
                : undefined,
            assignedByRole: c.assignedByRole || undefined,
            assignmentPath: Array.isArray(c.assignmentPath)
              ? (c.assignmentPath as string[])
              : [],
            submittedDate: c.submittedDate
              ? new Date(c.submittedDate)
              : new Date(),
            lastUpdated: c.lastUpdated ? new Date(c.lastUpdated) : new Date(),
            deadline: c.deadline ? new Date(c.deadline) : undefined,
            priority: c.priority || "Medium",
            feedback: c.feedback || undefined,
            isEscalated: !!c.isEscalated,
            submittedTo: c.submittedTo || undefined,
            department: c.department || undefined,
          })) as ComplaintType[];
        // For Pending tab, prefer inbox items; for other tabs rely on all list mapping
        const mappedInbox = (inbox || []).map((c: InboxComplaint) => ({
          id: String(c.id || ""),
          title: String(c.title || "Complaint"),
          description: "",
          category: String(c.category || "General"),
          status: (c.status as ComplaintType["status"]) || "Pending",
          submittedBy:
            typeof c.submittedBy === "string"
              ? c.submittedBy
              : c.submittedBy?.name || "",
          sourceRole:
            (c.sourceRole as ComplaintType["sourceRole"]) || undefined,
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
          submittedDate: c.submittedDate
            ? new Date(c.submittedDate)
            : new Date(),
          lastUpdated: c.lastUpdated ? new Date(c.lastUpdated) : new Date(),
          deadline: c.deadline ? new Date(c.deadline) : undefined,
          priority: (c.priority as ComplaintType["priority"]) || "Medium",
          feedback: undefined,
          isEscalated: false,
          submittedTo: c.submittedTo || undefined,
          department: undefined,
        })) as ComplaintType[];
        // Merge: Pending from inbox + others from all
        const nonPending = mappedFromAll.filter((c) => {
          if (c.status === "Pending" || c.status === "Unassigned") return false;
          const path = Array.isArray(c.assignmentPath) ? c.assignmentPath : [];
          const submittedTo = (c.submittedTo || "").toLowerCase();
          const byRole = (c.assignedByRole || "").toLowerCase();
          return (
            path.includes("dean") ||
            byRole === "dean" ||
            /dean/.test(submittedTo)
          );
        });
        setComplaints([...(mappedInbox || []), ...nonPending]);
        setStaffOptions(
          (staff || []).map((s) => ({
            id: s._id,
            name: s.fullName || s.name || s.username || s.email,
          }))
        );
      } catch (e) {
        // Keep current state on failure; no mock fallback
        console.error("Failed to load dean data:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
    const t = setInterval(load, 30000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [overdueFilter, setOverdueFilter] = useState<string>("all");
  const [selectedComplaint, setSelectedComplaint] =
    useState<ComplaintType | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [assigningStaffId, setAssigningStaffId] = useState<string>("");
  const [reassigningRow, setReassigningRow] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "Pending" | "Accepted" | "Assigned" | "Rejected"
  >("Pending");
  // Reset page when filters/tab change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, priorityFilter, overdueFilter, activeTab]);
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
  const handleAssignClick = (complaint: ComplaintType) => {
    setReassigningRow(complaint.id);
    setAssigningStaffId("");
  };

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
      const body: {
        staffId: string;
        assignedByRole: "dean";
        assignmentPath: string[];
        deadline?: string;
      } = {
        staffId,
        assignedByRole: "dean",
        assignmentPath: ["dean", "staff"],
      };
      if (assigningDeadline) body.deadline = assigningDeadline;
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
                assignedStaffRole: "headOfDepartment",
                assignedByRole: "dean",
                assignmentPath: Array.isArray(updated.assignmentPath)
                  ? updated.assignmentPath
                  : c.assignmentPath,
                lastUpdated: new Date(),
                deadline: updated.deadline
                  ? new Date(updated.deadline)
                  : c.deadline,
                status: "In Progress",
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

  const handleResolve = (complaintId: string) => {
    // Deprecated on this page: resolved items should not be managed here
  };

  const handleReject = async (complaintId: string) => {
    try {
      await updateComplaintStatusApi(complaintId, "Closed", "Rejected by Dean");
      // Refresh datasets after rejection
      const [inboxRaw, allRaw] = await Promise.all([
        getDeanInboxApi().catch(() => []),
        listAllComplaintsApi().catch(() => []),
      ]);
      const inbox = (inboxRaw || []) as InboxComplaint[];
      const all = (allRaw || []) as unknown as RawComplaint[];
      const mappedFromAll = (all || [])
        .filter((c) => c && c.id && c.status)
        .map((c) => ({
          id: c.id,
          title: c.title || c.complaintCode || "Complaint",
          description: c.description || "",
          category: c.category || c.department || "General",
          status: c.status,
          submittedBy: c.submittedBy || "",
          sourceRole: c.sourceRole,
          assignedStaff:
            typeof c.assignedTo === "string"
              ? c.assignedTo
              : (c.assignedTo as { name?: string } | null)?.name || undefined,
          assignedStaffRole:
            c.assignedByRole === "dean"
              ? "dean"
              : c.assignedByRole === "hod"
              ? "headOfDepartment"
              : undefined,
          assignedByRole: c.assignedByRole || undefined,
          assignmentPath: Array.isArray(c.assignmentPath)
            ? (c.assignmentPath as string[])
            : [],
          submittedDate: c.submittedDate
            ? new Date(c.submittedDate)
            : new Date(),
          lastUpdated: c.lastUpdated ? new Date(c.lastUpdated) : new Date(),
          deadline: c.deadline ? new Date(c.deadline) : undefined,
          priority: c.priority || "Medium",
          feedback: c.feedback || undefined,
          isEscalated: !!c.isEscalated,
          submittedTo: c.submittedTo || undefined,
          department: c.department || undefined,
        })) as ComplaintType[];
      const mappedInbox = (inbox || []).map((c: InboxComplaint) => ({
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
      const nonPending = mappedFromAll.filter((c) => {
        if (c.status === "Pending" || c.status === "Unassigned") return false;
        const path = Array.isArray(c.assignmentPath) ? c.assignmentPath : [];
        const submittedTo = (c.submittedTo || "").toLowerCase();
        const byRole = (c.assignedByRole || "").toLowerCase();
        return (
          path.includes("dean") || byRole === "dean" || /dean/.test(submittedTo)
        );
      });
      setComplaints([...(mappedInbox || []), ...nonPending]);
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

  const handleReapprove = async (complaintId: string) => {
    try {
      await approveComplaintApi(complaintId, { assignToSelf: true });
      const updated = await getComplaintApi(complaintId);
      setComplaints((prev) =>
        prev.map((c) =>
          c.id === complaintId
            ? {
                ...c,
                status: updated.status || "In Progress",
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
      // Update local state: remains Pending but shows as Assigned tab when HoD accepts
      setComplaints((prev) =>
        prev.map((c) =>
          c.id === assignHodOpen.id
            ? {
                ...c,
                assignedStaff:
                  hodOptions.find((h) => h.id === selectedHodId)?.name ||
                  c.assignedStaff,
                // Keep assignedStaffRole undefined until HoD accepts
                assignedByRole: "dean",
                assignmentPath: Array.from(
                  new Set([
                    ...(c.assignmentPath || []),
                    "dean",
                    "headOfDepartment",
                  ])
                ) as ComplaintType["assignmentPath"],
                deadline: hodDeadline ? new Date(hodDeadline) : c.deadline,
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
      return (
        (c.status === "Pending" || c.status === "Unassigned") &&
        !c.assignedStaffRole
      );
    if (activeTab === "Accepted")
      return c.status === "In Progress" && c.assignedStaffRole === "dean";
    if (activeTab === "Assigned")
      return (
        (c.status === "In Progress" || c.status === "Assigned") &&
        c.assignedStaffRole === "headOfDepartment"
      );
    if (activeTab === "Rejected") return c.status === "Closed";
    return false; // exclude other statuses like Resolved entirely
  };
  const filteredComplaints = complaints
    .filter(matchesTab)
    // ensure resolved never shows regardless of tab/filter
    .filter((c) => c.status !== "Resolved")
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

  const unassignedCount = complaints.filter((c) => !c.assignedStaff).length;
  const assignedCount = complaints.filter((c) => c.assignedStaff).length;
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Complaints
            </CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{complaints.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
            <div className="h-4 w-4 rounded-full bg-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {unassignedCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned</CardTitle>
            <div className="h-4 w-4 rounded-full bg-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {assignedCount}
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
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as typeof activeTab)}
            >
              <TabsList>
                <TabsTrigger value="Pending">Pending</TabsTrigger>
                <TabsTrigger value="Accepted">Accepted</TabsTrigger>
                <TabsTrigger value="Assigned">Assigned</TabsTrigger>
                <TabsTrigger value="Rejected">Rejected</TabsTrigger>
              </TabsList>
            </Tabs>
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
                          onClick={() => handleViewDetail(complaint)}
                          className="text-xs dark:hover:text-blue-400"
                        >
                          View Detail
                        </Button>
                        {/* Dean can accept to solve and assign to HoD */}
                        {!complaint.assignedStaff &&
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
                        {(!complaint.assignedStaff ||
                          complaint.assignedStaffRole !== "headOfDepartment") &&
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
                          <Button
                            size="sm"
                            variant="destructive"
                            className="text-xs"
                            onClick={() => handleReject(complaint.id)}
                          >
                            Reject
                          </Button>
                        )}
                        {reassigningRow === complaint.id ? (
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
                        ) : (
                          (!complaint.assignedStaff ||
                            isOverdue(complaint)) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs dark:hover:text-blue-400"
                              onClick={() => handleAssignClick(complaint)}
                            >
                              {complaint.assignedStaff ? "Reassign" : "Assign"}
                            </Button>
                          )
                        )}
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
                      {complaint.assignedStaff ? (
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
                    {/* Dean actions on mobile */}
                    {!complaint.assignedStaff &&
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
                    {(!complaint.assignedStaff ||
                      complaint.assignedStaffRole !== "headOfDepartment") &&
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
                      <Button
                        size="sm"
                        variant="destructive"
                        className="w-full text-xs"
                        onClick={() => handleReject(complaint.id)}
                      >
                        Reject
                      </Button>
                    )}
                    {reassigningRow === complaint.id ? (
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
                    ) : (
                      (!complaint.assignedStaff || isOverdue(complaint)) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs dark:hover:text-blue-400"
                          onClick={() => handleAssignClick(complaint)}
                        >
                          {complaint.assignedStaff ? "Reassign" : "Assign"}
                        </Button>
                      )
                    )}
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
          fetchLatest={false}
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
              You are accepting this complaint. Status will change to "In
              Progress" and it will be assigned to you.
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
                              status:
                                (updated?.status as ComplaintType["status"]) ||
                                "In Progress",
                              assignedStaff:
                                updated?.assignedTo?.name || assignee,
                              assignedStaffRole: "dean",
                              resolutionNote: acceptNote || c.resolutionNote,
                              lastUpdated: new Date(),
                            }
                          : c
                      )
                    );
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
            <DialogTitle>Accept all visible pending complaints</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              All currently visible Pending/Unassigned complaints will be set to
              "In Progress" and assigned to you.
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
                setBulkLoading(true);
                const assignee =
                  (user?.fullName as string) ||
                  (user?.name as string) ||
                  (user?.email as string) ||
                  "Dean";
                // Limit bulk accept to items visible on the current page
                const start = (page - 1) * pageSize;
                const idsOnPage = filteredComplaints
                  .slice(start, start + pageSize)
                  .map((c) => c.id);
                setComplaints((prev) => {
                  const passesSearch = (c: ComplaintType) =>
                    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    c.category
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase()) ||
                    c.submittedBy
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase());
                  const passesPriority = (c: ComplaintType) =>
                    priorityFilter === "all" ||
                    (c.priority || "Medium") === priorityFilter;
                  const passesOverdue = (c: ComplaintType) =>
                    overdueFilter === "all"
                      ? true
                      : overdueFilter === "overdue"
                      ? isOverdue(c)
                      : !isOverdue(c);
                  return prev.map((c) => {
                    const isPendingUnassigned =
                      (c.status === "Pending" || c.status === "Unassigned") &&
                      !c.assignedStaff;
                    const isVisible =
                      activeTab === "Pending" &&
                      isPendingUnassigned &&
                      passesSearch(c) &&
                      passesPriority(c) &&
                      passesOverdue(c) &&
                      idsOnPage.includes(c.id);
                    if (!isVisible) return c;
                    return {
                      ...c,
                      status: "In Progress",
                      assignedStaff: assignee,
                      resolutionNote: bulkNote || c.resolutionNote,
                      lastUpdated: new Date(),
                    };
                  });
                });
                setBulkLoading(false);
                setBulkOpen(false);
                setBulkNote("");
                toast({
                  title: "Accepted",
                  description: "All visible pending complaints accepted.",
                });
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
