import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Search,
  Filter,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
  User,
  Flag,
  Download,
  ArrowUpDown,
} from "lucide-react";
import { RoleBasedComplaintModal } from "@/components/RoleBasedComplaintModal";
import { Complaint } from "@/components/ComplaintCard";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useAuth } from "@/components/auth/AuthContext";
import { getAssignedComplaintsApi } from "@/lib/api";

// Mock data for all complaints (half overdue, half not overdue)
const now = new Date();
const mockAllComplaints: Complaint[] = [
  {
    id: "CMP-007",
    title: "Dormitory maintenance request",
    description:
      "The door lock in Dorm 5, Room 12 is broken and needs urgent repair.",
    category: "Facility",
    priority: "Low",
    status: "Closed",
    submittedBy: "Lily Adams",
    assignedStaff: "Maintenance Team",
    submittedDate: new Date("2024-01-05"),
    lastUpdated: new Date("2024-01-10"),
    resolutionNote: "Lock replaced and tested.",
    feedback: { rating: 5, comment: "Quick and professional!" },
    deadline: new Date(now.getTime() - 2 * 86400000), // overdue
  },
  {
    id: "CMP-008",
    title: "Exam schedule not published",
    description:
      "The final exam schedule for 2nd year students is overdue and not yet published.",
    category: "Academic",
    priority: "Critical",
    status: "Overdue",
    submittedBy: "Paul Green",
    assignedStaff: "Academic Office",
    submittedDate: new Date("2024-01-01"),
    lastUpdated: new Date("2024-01-20"),
    resolutionNote: "Awaiting department response.",
    deadline: new Date(now.getTime() - 5 * 86400000), // overdue
  },
  {
    id: "CMP-009",
    title: "Unassigned complaint test",
    description: "This complaint has not yet been assigned to any staff.",
    category: "General",
    priority: "Medium",
    status: "Unassigned",
    submittedBy: "Test User",
    assignedStaff: undefined,
    submittedDate: new Date("2024-01-12"),
    lastUpdated: new Date("2024-01-12"),
    deadline: new Date(now.getTime() + 3 * 86400000), // not overdue
  },
  {
    id: "CMP-010",
    title: "Edge case: No description",
    description: "",
    category: "Other",
    priority: "Low",
    status: "Pending",
    submittedBy: "Edge Case",
    assignedStaff: "Support",
    submittedDate: new Date("2024-01-18"),
    lastUpdated: new Date("2024-01-18"),
    deadline: new Date(now.getTime() + 7 * 86400000), // not overdue
  },
  {
    id: "CMP-011",
    title: "Edge case: No assigned staff, no feedback",
    description: "Complaint submitted but not yet processed.",
    category: "General",
    priority: "Medium",
    status: "Pending",
    submittedBy: "Edge Case 2",
    assignedStaff: undefined,
    submittedDate: new Date("2024-01-19"),
    lastUpdated: new Date("2024-01-19"),
    deadline: new Date(now.getTime() - 1 * 86400000), // overdue
  },
  {
    id: "CMP-001",
    title: "Library computers are slow and outdated",
    description:
      "The computers in the main library are extremely slow and need upgrading. Students are waiting long times to access resources for research and assignments. This is affecting productivity significantly.",
    category: "Academic",
    priority: "High",
    status: "In Progress",
    submittedBy: "John Doe",
    assignedStaff: "IT Support Team",
    submittedDate: new Date("2024-01-15"),
    lastUpdated: new Date("2024-01-18"),
    evidenceFile: "library_computer_issues.pdf",
    resolutionNote: "Working on upgrading the hardware.",
    deadline: new Date(now.getTime() + 10 * 86400000), // not overdue
  },
  {
    id: "CMP-002",
    title: "Cafeteria food quality concerns",
    description:
      "The food quality in the main cafeteria has declined significantly. Many students are getting sick after eating there.",
    category: "Cafeteria",
    priority: "Critical",
    status: "Resolved",
    submittedBy: "Jane Smith",
    assignedStaff: "Food Services Manager",
    submittedDate: new Date("2024-01-10"),
    lastUpdated: new Date("2024-01-20"),
    feedback: {
      rating: 4,
      comment: "Issue was resolved quickly and effectively.",
    },
    resolutionNote:
      "Improved food handling procedures and conducted staff training.",
    deadline: new Date(now.getTime() + 5 * 86400000), // not overdue
  },
  {
    id: "CMP-003",
    title: "Broken air conditioning in lecture hall",
    description:
      "The air conditioning in lecture hall B-204 has been broken for over a week. Classes are unbearable in this heat.",
    category: "Facility",
    priority: "Medium",
    status: "Pending",
    submittedBy: "Mike Johnson",
    assignedStaff: "Facilities Team",
    submittedDate: new Date("2024-01-22"),
    lastUpdated: new Date("2024-01-22"),
    deadline: new Date(now.getTime() - 4 * 86400000), // overdue
  },
  {
    id: "CMP-004",
    title: "Network connectivity issues in computer lab",
    description:
      "The computer lab on the 3rd floor has been experiencing intermittent internet connectivity issues. Students can't access online resources for their assignments.",
    category: "ICT Support",
    priority: "High",
    status: "In Progress",
    submittedBy: "Sarah Johnson",
    assignedStaff: "IT Support Team",
    submittedDate: new Date("2024-01-20"),
    lastUpdated: new Date("2024-01-23"),
    resolutionNote: "Investigating network infrastructure issues.",
    deadline: new Date(now.getTime() + 8 * 86400000), // not overdue
  },
  {
    id: "CMP-005",
    title: "Parking lot lighting issues",
    description:
      "Several lights in the main parking lot are not working, making it unsafe for students and staff during evening hours.",
    category: "Facility",
    priority: "Medium",
    status: "Resolved",
    submittedBy: "David Wilson",
    assignedStaff: "Facilities Manager",
    submittedDate: new Date("2024-01-08"),
    lastUpdated: new Date("2024-01-18"),
    feedback: {
      rating: 5,
      comment: "Excellent work! All lights were replaced quickly.",
    },
    resolutionNote:
      "All parking lot lights have been replaced with LED fixtures.",
    deadline: new Date(now.getTime() - 6 * 86400000), // overdue
  },
  {
    id: "CMP-006",
    title: "Student fee billing discrepancy",
    description:
      "There's an error in my tuition billing. I've been charged for courses I'm not enrolled in this semester.",
    category: "Finance",
    priority: "High",
    status: "Pending",
    submittedBy: "Emma Davis",
    assignedStaff: "Finance Office",
    submittedDate: new Date("2024-01-25"),
    lastUpdated: new Date("2024-01-25"),
    deadline: new Date(now.getTime() + 2 * 86400000), // not overdue
  },
];

export default function AllComplaints() {
  const { user } = useAuth();
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null
  );
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [complaints, setComplaints] = useState<Complaint[]>(mockAllComplaints);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  // Priority sort state: 'asc' | 'desc'
  const [prioritySort, setPrioritySort] = useState<"asc" | "desc">("desc");
  // Overdue filter state
  const [overdueFilter, setOverdueFilter] = useState("All");
  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const handleViewComplaint = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setShowDetailModal(true);
  };

  // Infer submitter's department for demo data
  const nameToDept: Record<string, string> = useMemo(
    () => ({
      "John Doe": "IT",
      "Jane Smith": "Cafeteria",
      "Mike Johnson": "Facilities",
      "Sarah Johnson": "IT",
      "David Wilson": "Facilities",
      "Emma Davis": "Finance",
      "Lily Adams": "Facilities",
      "Paul Green": "Academic",
      "Test User": "General",
      "Edge Case": "General",
      "Edge Case 2": "General",
    }),
    []
  );

  type MinimalUser = {
    fullName?: string;
    name?: string;
    role?: string;
    department?: string;
    workingPlace?: string;
  };

  const normalize = (s?: string | null) => (s || "").toLowerCase();
  const matchesUser = useCallback(
    (c: Complaint) => {
      const u = (user || {}) as MinimalUser;
      const uName = u.fullName || u.name || "";
      return normalize(c.submittedBy) === normalize(uName);
    },
    [user]
  );
  const matchesAssignedStaff = useCallback(
    (c: Complaint) => {
      const u = (user || {}) as MinimalUser;
      const uName = u.fullName || u.name || "";
      return normalize(c.assignedStaff || "") === normalize(uName);
    },
    [user]
  );
  const getSubmitterDept = useCallback(
    (c: Complaint) => {
      // Prefer an explicit field if your real API supplies it (e.g., c.submitterDepartment)
      // Fallback to demo mapping by submitter name
      return (
        (c as { submitterDepartment?: string }).submitterDepartment ||
        nameToDept[c.submittedBy] ||
        ""
      );
    },
    [nameToDept]
  );
  const role = normalize(((user || {}) as MinimalUser).role);
  const myDept =
    ((user || {}) as MinimalUser).department ||
    ((user || {}) as MinimalUser).workingPlace ||
    "";

  // For staff: load complaints assigned to them so new direct submissions appear immediately
  useEffect(() => {
    let cancelled = false;
    // No outer mutable needed; keep the interval id constant within this effect
    async function loadAssignedForStaff() {
      if (!user) return;
      const roleNorm = normalize(((user || {}) as MinimalUser).role);
      if (roleNorm !== "staff") return;
      try {
        const data = await getAssignedComplaintsApi();
        if (cancelled) return;
        const staffName =
          ((user || {}) as MinimalUser).fullName ||
          ((user || {}) as MinimalUser).name ||
          "";
        const mapped: Complaint[] = (data || []).map((d: unknown) => {
          const obj = (d ?? {}) as Record<string, unknown>;
          const sb = obj.submittedBy as Record<string, unknown> | undefined;
          const submittedByName =
            (sb && typeof sb.name === "string" && (sb.name as string)) ||
            (sb && typeof sb.email === "string" && (sb.email as string)) ||
            "User";
          return {
            id: String((obj.id as string) || (obj._id as string) || ""),
            title: String(obj.title || ""),
            description: String(
              (obj.fullDescription as string) ||
                (obj.description as string) ||
                (obj.shortDescription as string) ||
                ""
            ),
            category: String(obj.category || ""),
            status: (obj.status as Complaint["status"]) || "Pending",
            priority: (obj.priority as Complaint["priority"]) || "Medium",
            submittedBy: submittedByName,
            assignedStaff: staffName || undefined,
            assignedStaffRole: "staff",
            assignedByRole: obj.assignedByRole as Complaint["assignedByRole"],
            assignmentPath: Array.isArray(obj.assignmentPath)
              ? (obj.assignmentPath as Array<
                  "student" | "headOfDepartment" | "dean" | "admin" | "staff"
                >)
              : [],
            assignedDate: obj.assignedAt
              ? new Date(String(obj.assignedAt))
              : undefined,
            submittedDate: obj.submittedDate
              ? new Date(String(obj.submittedDate))
              : new Date(),
            lastUpdated: obj.lastUpdated
              ? new Date(String(obj.lastUpdated))
              : new Date(),
            deadline: obj.deadline ? new Date(String(obj.deadline)) : undefined,
            feedback: (obj.feedback as Complaint["feedback"]) || undefined,
            resolutionNote: (obj.resolutionNote as string) || undefined,
            evidenceFile: (obj.evidenceFile as string) || undefined,
            isEscalated: Boolean(obj.isEscalated ?? false),
            sourceRole: obj.sourceRole as Complaint["sourceRole"],
            submittedTo: (obj.submittedTo as string) || undefined,
            department: ((user || {}) as MinimalUser).department,
          };
        });
        setComplaints((prev) => {
          // Merge by id: update if exists, else add
          const byId = new Map<string, Complaint>();
          for (const c of prev) byId.set(c.id, c);
          for (const c of mapped) byId.set(c.id, c);
          return Array.from(byId.values());
        });
      } catch {
        // ignore fetch errors; keep current state
      }
    }
    loadAssignedForStaff();
    // Refresh periodically while page is open to capture new direct submissions
    const intervalId = window.setInterval(
      loadAssignedForStaff,
      10000
    ) as unknown as number;
    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [user]);

  // Role-based visibility filter (hierarchical)
  const visibleComplaints = useMemo(() => {
    // If not authenticated, show all (demo)
    if (!user) return complaints;
    if (role === "admin") return complaints; // all
    if (role === "dean") return complaints; // simplified: all depts
    if (role === "headofdepartment" || role === "hod") {
      return complaints.filter(
        (c) => matchesUser(c) || getSubmitterDept(c) === myDept
      );
    }
    // staff and other roles: show complaints assigned to this staff member
    return complaints.filter(matchesAssignedStaff);
  }, [
    user,
    role,
    myDept,
    complaints,
    matchesUser,
    getSubmitterDept,
    matchesAssignedStaff,
  ]);

  // Calculate summary stats for the visible set
  const stats = {
    total: visibleComplaints.length,
    pending: visibleComplaints.filter((c) => c.status === "Pending").length,
    inProgress: visibleComplaints.filter((c) => c.status === "In Progress")
      .length,
    resolved: visibleComplaints.filter((c) => c.status === "Resolved").length,
  };

  // Reset to first page whenever filters/search/sort change
  useEffect(() => {
    // Reset to first page whenever filters/search/sort change
    setPage(1);
  }, [
    searchTerm,
    statusFilter,
    categoryFilter,
    priorityFilter,
    overdueFilter,
    prioritySort,
  ]);

  // Helper: check if complaint is overdue
  const isOverdue = (complaint: Complaint) => {
    if (!("deadline" in complaint) || !complaint.deadline) return false;
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
  // Filter complaints (from role-based visible set)
  let filteredComplaints = visibleComplaints.filter((complaint) => {
    const matchesSearch =
      complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.submittedBy.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "All" || complaint.status === statusFilter;
    const matchesCategory =
      categoryFilter === "All" || complaint.category === categoryFilter;
    const matchesPriority =
      priorityFilter === "All" || complaint.priority === priorityFilter;
    const matchesOverdue =
      overdueFilter === "All"
        ? true
        : overdueFilter === "Overdue"
        ? isOverdue(complaint)
        : !isOverdue(complaint);

    return (
      matchesSearch &&
      matchesStatus &&
      matchesCategory &&
      matchesPriority &&
      matchesOverdue
    );
  });
  // Always sort by priority (toggle asc/desc)
  const priorityOrder = { Critical: 4, High: 3, Medium: 2, Low: 1 };
  filteredComplaints = [...filteredComplaints].sort((a, b) => {
    const aValue =
      priorityOrder[(a.priority || "Medium") as keyof typeof priorityOrder] ||
      0;
    const bValue =
      priorityOrder[(b.priority || "Medium") as keyof typeof priorityOrder] ||
      0;
    return prioritySort === "desc" ? bValue - aValue : aValue - bValue;
  });

  const handleSortByPriority = () => {
    setPrioritySort(prioritySort === "desc" ? "asc" : "desc");
  };

  const categories = Array.from(
    new Set(visibleComplaints.map((c) => c.category))
  );

  // (pagination reset handled in useEffect above)

  const totalItems = filteredComplaints.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (page - 1) * pageSize;
  const pagedComplaints = filteredComplaints.slice(
    startIndex,
    startIndex + pageSize
  );
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "In Progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "Resolved":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "Closed":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "critical":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      case "high":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  // Listen for status changes coming from other pages (e.g., My Assigned -> Resolved)
  useEffect(() => {
    const onStatusChanged = (e: Event) => {
      try {
        const { id, status } = (e as CustomEvent).detail || {};
        if (!id || !status) return;
        setComplaints((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, status, lastUpdated: new Date() } : c
          )
        );
      } catch {
        // no-op
      }
    };
    const onUpsert = (e: Event) => {
      try {
        const { complaint } = (e as CustomEvent).detail || {};
        if (!complaint || !complaint.id) return;
        setComplaints((prev) => {
          const exists = prev.some((c) => c.id === complaint.id);
          if (exists) {
            return prev.map((c) => (c.id === complaint.id ? complaint : c));
          }
          return [complaint, ...prev];
        });
      } catch {
        // no-op
      }
    };
    window.addEventListener(
      "complaint:status-changed",
      onStatusChanged as EventListener
    );
    window.addEventListener("complaint:upsert", onUpsert as EventListener);
    return () => {
      window.removeEventListener(
        "complaint:status-changed",
        onStatusChanged as EventListener
      );
      window.removeEventListener("complaint:upsert", onUpsert as EventListener);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">All Complaints</h1>
        <p className="text-muted-foreground">
          Complete overview of all complaints in the system
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Complaints
            </CardTitle>
            <div className="bg-blue-50 p-2 rounded-lg dark:bg-blue-900/20">
              <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All submissions</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
            <div className="bg-yellow-50 p-2 rounded-lg dark:bg-yellow-900/20">
              <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting action</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Process
            </CardTitle>
            <div className="bg-blue-50 p-2 rounded-lg dark:bg-blue-900/20">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">Being worked on</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Resolved
            </CardTitle>
            <div className="bg-green-50 p-2 rounded-lg dark:bg-green-900/20">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.resolved}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Controls */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2 sm:gap-4 w-full">
            {/* Search input */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, department, or submitter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            {/* Status dropdown */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Status</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Resolved">Resolved</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            {/* Priority dropdown */}
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Priorities</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            {/* Category dropdown */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Overdue filter dropdown */}
            <Select value={overdueFilter} onValueChange={setOverdueFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by overdue" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="Overdue">Overdue Only</SelectItem>
                <SelectItem value="NotOverdue">Not Overdue Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <CardContent>
        {/* Desktop Table */}
        <div className="hidden lg:block rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Overdue</TableHead>
                <TableHead>Date Submitted</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedComplaints.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-8 text-muted-foreground"
                  >
                    {searchTerm ||
                    statusFilter !== "All" ||
                    categoryFilter !== "All" ||
                    priorityFilter !== "All"
                      ? "No complaints match your search criteria"
                      : "No complaints found"}
                  </TableCell>
                </TableRow>
              ) : (
                pagedComplaints.map((complaint) => (
                  <TableRow key={complaint.id} className="hover:bg-muted/50">
                    <TableCell className="max-w-xs">
                      <div className="font-medium truncate">
                        {complaint.title}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        #{complaint.id}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {complaint.submittedBy}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {complaint.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`text-xs ${getPriorityColor(
                          complaint.priority
                        )}`}
                        variant="outline"
                      >
                        <Flag className="h-3 w-3 mr-1" />
                        {complaint.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`text-xs ${getStatusColor(
                          complaint.status
                        )}`}
                        variant="outline"
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
                    <TableCell className="text-muted-foreground text-sm">
                      {complaint.submittedDate.toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {complaint.assignedStaff || "Unassigned"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewComplaint(complaint)}
                        className="hover:bg-primary/10"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-4">
          {pagedComplaints.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ||
              statusFilter !== "All" ||
              categoryFilter !== "All" ||
              priorityFilter !== "All"
                ? "No complaints match your search criteria"
                : "No complaints found"}
            </div>
          ) : (
            pagedComplaints.map((complaint) => (
              <Card key={complaint.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-medium text-sm">{complaint.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        #{complaint.id}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-2">
                      <Badge
                        className={`text-xs ${getPriorityColor(
                          complaint.priority
                        )}`}
                        variant="outline"
                      >
                        {complaint.priority}
                      </Badge>
                      <Badge
                        className={`text-xs ${getStatusColor(
                          complaint.status
                        )}`}
                        variant="outline"
                      >
                        {complaint.status}
                      </Badge>
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
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Student:</span>
                      <span className="font-medium ml-2">
                        {complaint.submittedBy}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Category:</span>
                      <span className="font-medium ml-2">
                        {complaint.category}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Assigned To:
                      </span>
                      <span className="font-medium ml-2">
                        {complaint.assignedStaff || "Unassigned"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Date:</span>
                      <span className="font-medium ml-2">
                        {complaint.submittedDate.toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewComplaint(complaint)}
                    className="w-full hover:bg-primary/10"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </CardContent>

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

      {/* Detail Modal */}
      <RoleBasedComplaintModal
        complaint={selectedComplaint}
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        onUpdate={() => {}} // Admin view only
      />
    </div>
  );
}
