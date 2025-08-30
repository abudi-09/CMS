import { useEffect, useState, useCallback, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Eye, MessageSquare } from "lucide-react";
import { RoleBasedComplaintModal } from "@/components/RoleBasedComplaintModal";
import { FeedbackModal } from "@/components/FeedbackModal";
import { Complaint } from "@/components/ComplaintCard";
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

import { getMyComplaintsApi } from "@/lib/api";

interface ExtendedComplaint extends Complaint {
  friendlyCode?: string;
}

interface BackendComplaintDTO {
  id?: string;
  _id?: string;
  complaintCode?: string;
  title?: string;
  subject?: string;
  description?: string;
  category?: string;
  department?: string;
  status?: string;
  sourceRole?: string;
  submittedBy?: { fullName?: string; name?: string } | null;
  // assignedTo may come as populated object or as a plain string name when sent directly to staff
  assignedTo?:
    | { fullName?: string; name?: string; role?: string }
    | string
    | null;
  assignedByRole?: string | null;
  assignmentPath?: string[];
  assignedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  deadline?: string;
  priority?: "Low" | "Medium" | "High" | "Critical";
  feedback?: { rating: number; comment: string } | null;
  resolutionNote?: string;
  evidenceFile?: string;
  isEscalated?: boolean;
  submittedTo?: string;
}

const statusColors = {
  Pending: "bg-warning/10 text-warning border-warning/20",
  "In Progress": "bg-info/10 text-info border-info/20",
  Resolved: "bg-success/10 text-success border-success/20",
  Closed: "bg-muted/10 text-muted-foreground border-muted/20",
  Overdue: "bg-red-100 text-red-700 border-red-200",
};

export function MyComplaints() {
  const [complaints, setComplaints] = useState<ExtendedComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Role mapping helpers (component scope so they can be reused in effects and handlers)
  type RoleU = "student" | "staff" | "headOfDepartment" | "dean" | "admin";
  type RoleNoStaff = Exclude<RoleU, "staff">;
  const roleGuard = useCallback((r?: string | null): RoleU | undefined => {
    switch ((r || "").toLowerCase()) {
      case "student":
        return "student";
      case "staff":
        return "staff";
      case "headofdepartment":
      case "hod":
        return "headOfDepartment";
      case "dean":
        return "dean";
      case "admin":
        return "admin";
      default:
        return undefined;
    }
  }, []);
  const roleGuardNoStaff = useCallback(
    (r?: string | null): RoleNoStaff | undefined => {
      const g = roleGuard(r);
      return g && g !== "staff" ? (g as RoleNoStaff) : undefined;
    },
    [roleGuard]
  );
  const pathGuard = useCallback(
    (arr?: string[] | null): Array<RoleU | "staff"> => {
      const out: Array<RoleU | "staff"> = [];
      for (const x of Array.isArray(arr) ? arr : []) {
        const g = roleGuard(x);
        if (g) out.push(g);
      }
      return out;
    },
    [roleGuard]
  );

  // Normalize assignedTo into displayable name
  const getAssignedToName = useCallback((c: BackendComplaintDTO): string => {
    const a = c?.assignedTo as unknown;
    if (!a) return "";
    if (typeof a === "string") return a;
    const obj = a as { fullName?: string; name?: string };
    return obj.fullName || obj.name || "";
  }, []);

  // Fetch real complaints from backend
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = (await getMyComplaintsApi()) as unknown;
        const arr: BackendComplaintDTO[] = Array.isArray(data)
          ? (data as BackendComplaintDTO[])
          : [];
        const mapped: ExtendedComplaint[] = arr.map((c) => ({
          id: c.id || c._id || c.complaintCode || "", // real db id preferred
          title: (c.title || c.subject || "").trim() || "Untitled Complaint",
          description: c.description || "No description provided",
          category: (c.category || c.department || "").trim() || "General",
          status: (c.status as Complaint["status"]) || "Pending",
          submittedBy: c.submittedBy?.fullName || c.submittedBy?.name || "You",
          sourceRole: roleGuard(c.sourceRole),
          assignedStaff: getAssignedToName(c),
          // staff role for assignee cannot be 'student'; fallback to 'staff' when ambiguous
          assignedStaffRole:
            (roleGuard(
              (typeof c.assignedTo === "object" && c.assignedTo
                ? (c.assignedTo as { role?: string }).role
                : undefined) as string | undefined
            ) as Exclude<RoleU, "student">) || ("staff" as const),
          assignedByRole: roleGuardNoStaff(c.assignedByRole),
          assignmentPath: pathGuard(c.assignmentPath),
          assignedDate: c.assignedAt ? new Date(c.assignedAt) : undefined,
          submittedDate: c.createdAt ? new Date(c.createdAt) : new Date(),
          deadline: c.deadline ? new Date(c.deadline) : undefined,
          lastUpdated: c.updatedAt ? new Date(c.updatedAt) : new Date(),
          priority: c.priority || "Medium",
          feedback: c.feedback
            ? { rating: c.feedback.rating, comment: c.feedback.comment }
            : undefined,
          resolutionNote: c.resolutionNote,
          evidenceFile: c.evidenceFile,
          isEscalated: c.isEscalated,
          submittedTo: c.submittedTo,
          department: c.department,
          friendlyCode: c.complaintCode,
        }));
        if (!cancelled) setComplaints(mapped);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (!cancelled) setError(message || "Failed to load complaints");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [roleGuard, roleGuardNoStaff, pathGuard, getAssignedToName]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null
  );
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [lastResolvedId, setLastResolvedId] = useState<string | null>(null);
  const complaintsRef = useRef<ExtendedComplaint[]>([]);
  const lastResolvedIdRef = useRef<string | null>(null);

  // keep refs in sync
  useEffect(() => {
    complaintsRef.current = complaints;
  }, [complaints]);
  useEffect(() => {
    lastResolvedIdRef.current = lastResolvedId;
  }, [lastResolvedId]);

  // Listen for global complaint status changes to keep list in sync in real-time
  useEffect(() => {
    const onStatusChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | { id?: string; status?: Complaint["status"]; note?: string }
        | undefined;
      if (!detail?.id) return;
      setComplaints((prev) =>
        prev.map((c) =>
          c.id === detail.id
            ? {
                ...c,
                status: (detail.status as Complaint["status"]) || c.status,
                lastUpdated: new Date(),
                resolutionNote:
                  typeof detail.note === "string" && detail.note
                    ? [c.resolutionNote, detail.note].filter(Boolean).join("\n")
                    : c.resolutionNote,
              }
            : c
        )
      );
      // If this complaint just resolved, prompt for feedback once
      if (detail.status === "Resolved") {
        const justResolved = complaintsRef.current.find(
          (c) => c.id === detail.id
        );
        const alreadyPrompted = lastResolvedIdRef.current === detail.id;
        if (justResolved && !justResolved.feedback && !alreadyPrompted) {
          setSelectedComplaint(justResolved);
          setLastResolvedId(detail.id);
          lastResolvedIdRef.current = detail.id;
          setShowFeedbackModal(true);
        }
      }
    };
    window.addEventListener(
      "complaint:status-changed",
      onStatusChanged as EventListener
    );
    return () =>
      window.removeEventListener(
        "complaint:status-changed",
        onStatusChanged as EventListener
      );
  }, []);

  const handleViewComplaint = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setShowDetailModal(true);
  };

  const handleFeedback = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setShowFeedbackModal(true);
  };

  const handleFeedbackSubmit = (
    complaintId: string,
    feedback: { rating: number; comment: string }
  ) => {
    setComplaints((prev) =>
      prev.map((c) => (c.id === complaintId ? { ...c, feedback } : c))
    );
    // Let other views refresh (e.g., staff can see feedback in details)
    const updated = complaints.find((c) => c.id === complaintId);
    if (updated) {
      const evt = new CustomEvent("complaint:upsert", {
        detail: { complaint: { ...updated, feedback } },
      });
      window.dispatchEvent(evt);
    }
  };

  const isOverdue = (c: Complaint) =>
    !!c.deadline &&
    new Date() > new Date(c.deadline) &&
    c.status !== "Resolved" &&
    c.status !== "Closed";

  // Tab counts
  const counts = {
    all: complaints.length,
    Pending: complaints.filter((c) => c.status === "Pending").length,
    "In Progress": complaints.filter((c) => c.status === "In Progress").length,
    Resolved: complaints.filter((c) => c.status === "Resolved").length,
    Closed: complaints.filter((c) => c.status === "Closed").length,
    Overdue: complaints.filter((c) => isOverdue(c)).length,
  } as const;

  // Filter complaints based on search, status, and priority
  const filteredComplaints = complaints.filter((complaint) => {
    const matchesSearch =
      complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "Overdue"
        ? isOverdue(complaint)
        : complaint.status === statusFilter;

    const matchesPriority =
      priorityFilter === "all" || complaint.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Pagination: 5 per page, reset when filters change
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const totalItems = filteredComplaints.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (page - 1) * pageSize;
  const pagedComplaints = filteredComplaints.slice(
    startIndex,
    startIndex + pageSize
  );
  // Reset to first page whenever filters/search change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, priorityFilter]);

  // Poll periodically for status changes to Resolved and prompt for feedback once
  useEffect(() => {
    let cancelled = false;
    const getPrompted = (): Set<string> => {
      try {
        const raw = localStorage.getItem("feedbackPromptedIds");
        if (!raw) return new Set();
        const arr = JSON.parse(raw);
        return new Set(Array.isArray(arr) ? arr : []);
      } catch {
        return new Set();
      }
    };
    const savePrompted = (setIds: Set<string>) => {
      try {
        localStorage.setItem(
          "feedbackPromptedIds",
          JSON.stringify(Array.from(setIds))
        );
      } catch {
        // ignore
      }
    };
    async function tick() {
      try {
        const data = (await getMyComplaintsApi()) as unknown;
        const arr: BackendComplaintDTO[] = Array.isArray(data)
          ? (data as BackendComplaintDTO[])
          : [];
        const mapped: ExtendedComplaint[] = arr.map((c) => ({
          id: c.id || c._id || c.complaintCode || "",
          title: (c.title || c.subject || "").trim() || "Untitled Complaint",
          description: c.description || "No description provided",
          category: (c.category || c.department || "").trim() || "General",
          status: (c.status as Complaint["status"]) || "Pending",
          submittedBy: c.submittedBy?.fullName || c.submittedBy?.name || "You",
          sourceRole: roleGuard(c.sourceRole),
          assignedStaff: getAssignedToName(c),
          assignedStaffRole:
            (roleGuard(
              (typeof c.assignedTo === "object" && c.assignedTo
                ? (c.assignedTo as { role?: string }).role
                : undefined) as string | undefined
            ) as Exclude<RoleU, "student">) || ("staff" as const),
          assignedByRole: roleGuardNoStaff(c.assignedByRole),
          assignmentPath: pathGuard(c.assignmentPath),
          assignedDate: c.assignedAt ? new Date(c.assignedAt) : undefined,
          submittedDate: c.createdAt ? new Date(c.createdAt) : new Date(),
          deadline: c.deadline ? new Date(c.deadline) : undefined,
          lastUpdated: c.updatedAt ? new Date(c.updatedAt) : new Date(),
          priority: c.priority || "Medium",
          feedback: c.feedback
            ? { rating: c.feedback.rating, comment: c.feedback.comment }
            : undefined,
          resolutionNote: c.resolutionNote,
          evidenceFile: c.evidenceFile,
          isEscalated: c.isEscalated,
          submittedTo: c.submittedTo,
          department: c.department,
          friendlyCode: c.complaintCode,
        }));
        if (!cancelled) setComplaints(mapped);
        // Prompt for first eligible complaint
        const prompted = getPrompted();
        const candidate = mapped
          .filter((c) => c.status === "Resolved" && !c.feedback && c.id)
          .sort(
            (a, b) =>
              (b.lastUpdated?.getTime?.() || 0) -
              (a.lastUpdated?.getTime?.() || 0)
          )[0];
        if (candidate && !prompted.has(candidate.id)) {
          setSelectedComplaint(candidate);
          setShowFeedbackModal(true);
          setLastResolvedId(candidate.id);
          lastResolvedIdRef.current = candidate.id;
          prompted.add(candidate.id);
          savePrompted(prompted);
        }
      } catch {
        // ignore transient errors
      }
    }
    // initial tick and interval
    tick();
    const intervalId = window.setInterval(tick, 20000) as unknown as number;
    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [pathGuard, roleGuard, roleGuardNoStaff, getAssignedToName]);

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Complaints</h1>
        <p className="text-muted-foreground">
          Track and manage all your submitted complaints
        </p>
      </div>

      {loading && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Loading complaints...
          </CardContent>
        </Card>
      )}

      {error && !loading && (
        <Card>
          <CardContent className="p-6 text-center text-red-600">
            {error}
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  // retry
                  setLoading(true);
                  setError(null);
                  (async () => {
                    try {
                      const data = (await getMyComplaintsApi()) as unknown;
                      const arr: BackendComplaintDTO[] = Array.isArray(data)
                        ? (data as BackendComplaintDTO[])
                        : [];
                      const mapped: ExtendedComplaint[] = arr.map((c) => ({
                        id: c.id || c._id || c.complaintCode || "",
                        title:
                          (c.title || c.subject || "").trim() ||
                          "Untitled Complaint",
                        description: c.description || "No description provided",
                        category:
                          (c.category || c.department || "").trim() ||
                          "General",
                        status: (c.status as Complaint["status"]) || "Pending",
                        submittedBy:
                          c.submittedBy?.fullName ||
                          c.submittedBy?.name ||
                          "You",
                        sourceRole: roleGuard(c.sourceRole),
                        assignedStaff: getAssignedToName(c),
                        assignedStaffRole:
                          (roleGuard(
                            (typeof c.assignedTo === "object" && c.assignedTo
                              ? (c.assignedTo as { role?: string }).role
                              : undefined) as string | undefined
                          ) as Exclude<RoleU, "student">) || ("staff" as const),
                        assignedByRole: roleGuardNoStaff(c.assignedByRole),
                        assignmentPath: pathGuard(c.assignmentPath),
                        assignedDate: c.assignedAt
                          ? new Date(c.assignedAt)
                          : undefined,
                        submittedDate: c.createdAt
                          ? new Date(c.createdAt)
                          : new Date(),
                        deadline: c.deadline ? new Date(c.deadline) : undefined,
                        lastUpdated: c.updatedAt
                          ? new Date(c.updatedAt)
                          : new Date(),
                        priority: c.priority || "Medium",
                        feedback: c.feedback
                          ? {
                              rating: c.feedback.rating,
                              comment: c.feedback.comment,
                            }
                          : undefined,
                        resolutionNote: c.resolutionNote,
                        evidenceFile: c.evidenceFile,
                        isEscalated: c.isEscalated,
                        submittedTo: c.submittedTo,
                        department: c.department,
                        friendlyCode: c.complaintCode,
                      }));
                      setComplaints(mapped);
                    } catch (e: unknown) {
                      const message =
                        e instanceof Error ? e.message : String(e);
                      setError(message || "Failed to load complaints");
                    } finally {
                      setLoading(false);
                    }
                  })();
                }}
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter Controls */}
      {!loading && !error && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Search & Filter
            </CardTitle>
            <CardDescription>
              Find specific complaints or filter by status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title, description, or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Pending">
                    <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 mr-2 align-middle"></span>
                    Pending
                  </SelectItem>
                  <SelectItem value="In Progress">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-2 align-middle"></span>
                    In Progress
                  </SelectItem>
                  <SelectItem value="Resolved">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2 align-middle"></span>
                    Resolved
                  </SelectItem>
                  <SelectItem value="Closed">
                    <span className="inline-block w-2 h-2 rounded-full bg-gray-400 mr-2 align-middle"></span>
                    Closed
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Complaints Table */}
      <Card>
        <CardHeader>
          <CardTitle>Complaints ({filteredComplaints.length})</CardTitle>
          <CardDescription>
            {filteredComplaints.length === complaints.length
              ? "All your complaints"
              : `Showing ${filteredComplaints.length} of ${complaints.length} complaints`}
          </CardDescription>
          <div className="mt-2">
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList className="flex flex-wrap gap-1">
                <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
                <TabsTrigger value="Pending">
                  Pending ({counts["Pending"]})
                </TabsTrigger>
                <TabsTrigger value="In Progress">
                  In Progress ({counts["In Progress"]})
                </TabsTrigger>
                <TabsTrigger value="Resolved">
                  Resolved ({counts["Resolved"]})
                </TabsTrigger>
                <TabsTrigger value="Closed">
                  Closed ({counts["Closed"]})
                </TabsTrigger>
                <TabsTrigger value="Overdue">
                  Overdue ({counts["Overdue"]})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {filteredComplaints.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No complaints found matching your criteria.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Title</th>
                      <th className="text-left p-3 font-medium">Category</th>
                      <th className="text-left p-3 font-medium">Priority</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Overdue</th>
                      <th className="text-left p-3 font-medium">Assigned To</th>
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-left p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedComplaints.map((complaint) => (
                      <tr
                        key={complaint.id}
                        className="border-b hover:bg-muted/5 dark:hover:bg-accent/10"
                      >
                        <td className="p-3">
                          <div className="font-medium">{complaint.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {/* Complaint ID intentionally hidden in UI */}
                            {complaint.friendlyCode && (
                              <span className="ml-2">
                                [{complaint.friendlyCode}]
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="text-sm">{complaint.category}</span>
                        </td>
                        <td className="p-3">
                          <Badge
                            className={`text-xs px-2 py-0.5 rounded font-semibold ${
                              complaint.priority === "Critical"
                                ? "bg-red-100 text-red-800"
                                : complaint.priority === "High"
                                ? "bg-orange-100 text-orange-800"
                                : complaint.priority === "Medium"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {complaint.priority}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={
                              statusColors[
                                complaint.status as keyof typeof statusColors
                              ]
                            }
                          >
                            {complaint.status}
                          </Badge>
                        </td>
                        <td className="p-3">
                          {isOverdue(complaint) ? (
                            <Badge className="text-xs px-2 py-0.5 bg-red-100 text-red-700 border-red-200">
                              Yes
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-xs px-2 py-0.5 text-muted-foreground"
                            >
                              No
                            </Badge>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="text-sm">
                            {complaint.assignedStaff || "Not Assigned"}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="text-sm">
                            {complaint.submittedDate.toLocaleDateString()}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewComplaint(complaint)}
                              className="dark:hover:text-blue-400"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            {complaint.status === "Resolved" && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleFeedback(complaint)}
                                className="dark:hover:bg-blue-400"
                              >
                                <MessageSquare className="h-4 w-4 mr-1" />
                                Give Feedback
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {pagedComplaints.map((complaint) => (
                  <Card key={complaint.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-medium text-sm leading-tight">
                            {complaint.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {/* Complaint ID intentionally hidden in UI */}
                            {complaint.friendlyCode && (
                              <span className="ml-1">
                                [{complaint.friendlyCode}]
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge
                            className={`text-xs px-2 py-0.5 rounded font-semibold ${
                              complaint.priority === "Critical"
                                ? "bg-red-100 text-red-800"
                                : complaint.priority === "High"
                                ? "bg-orange-100 text-orange-800"
                                : complaint.priority === "Medium"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {complaint.priority}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`ml-2 text-xs ${
                              statusColors[
                                complaint.status as keyof typeof statusColors
                              ]
                            }`}
                          >
                            {complaint.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">
                            category:
                          </span>
                          <p className="font-medium">{complaint.category}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Date:</span>
                          <p className="font-medium">
                            {complaint.submittedDate.toLocaleDateString()}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">
                            Assigned Staff:
                          </span>
                          <p className="font-medium">
                            {complaint.assignedStaff || "Not Assigned"}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewComplaint(complaint)}
                          className="flex-1 text-xs dark:hover:text-blue-400"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        {complaint.status === "Resolved" && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleFeedback(complaint)}
                            className="flex-1 text-xs dark:hover:bg-blue-400"
                          >
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Feedback
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {!loading && !error && totalPages > 1 && (
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

      {/* Modals */}
      {!loading && selectedComplaint && (
        <RoleBasedComplaintModal
          complaint={selectedComplaint}
          open={showDetailModal}
          onOpenChange={setShowDetailModal}
          onUpdate={() => {}} // User view only
        />
      )}
      {!loading && (
        <FeedbackModal
          complaint={selectedComplaint}
          open={showFeedbackModal}
          onOpenChange={setShowFeedbackModal}
          onSubmit={handleFeedbackSubmit}
        />
      )}
    </div>
  );
}
