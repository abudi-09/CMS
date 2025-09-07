// For demo/testing: import mockComplaint
// Demo mock removed; complaints will be loaded from backend
// import { mockComplaint as baseMockComplaint } from "@/lib/mockComplaint";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
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
  Settings,
  Clock,
  AlertCircle,
  CheckCircle,
  FileText,
  User,
  Search,
  Filter,
  ArrowUpDown,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { RoleBasedComplaintModal } from "@/components/RoleBasedComplaintModal";
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

// Removed useComplaints to avoid requiring ComplaintProvider for this page's local mock state
import { useAuth } from "@/components/auth/AuthContext";
import { toast } from "@/hooks/use-toast";
import { getAssignedComplaintsApi, updateComplaintStatusApi } from "@/lib/api";
import React from "react";

// Import the Complaint type from the context to ensure type compatibility
import type { Complaint } from "@/components/ComplaintCard";

export function MyAssignedComplaints() {
  // MOCK DATA ENABLED BY DEFAULT
  const { user } = useAuth();
  // Complaints will be loaded from backend; remove demo generation
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [overdueFilter, setOverdueFilter] = useState("All"); // New filter
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  // Sorting mode: default by date (newest first), or priority when toggled
  const [sortingMode, setSortingMode] = useState<"date" | "priority">("date");
  // Quick filter from summary cards
  const [quickFilter, setQuickFilter] = useState<
    "recent" | "inprogress" | "resolvedThisMonth" | "overdue" | null
  >(null);
  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 5;
  // Category tabs (per requirements)
  type CategoryTab =
    | "direct"
    | "assignedByHod"
    | "accepted"
    | "rejected"
    | "resolved";
  const [categoryTab, setCategoryTab] = useState<CategoryTab>("direct");
  // Track opened complaints to hide NEW badge once viewed
  const [openedIds, setOpenedIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem("myAssignedOpened");
      const arr = raw ? (JSON.parse(raw) as string[]) : [];
      return new Set(arr);
    } catch (e) {
      // ignore JSON/Storage errors
      return new Set();
    }
  });
  const location = useLocation();

  // Load assigned complaints from backend for staff user
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user || user.role !== "staff") return;
      try {
        const data = await getAssignedComplaintsApi();
        if (cancelled) return;
        const name = user.fullName ?? user.name ?? "";
        const mapped: Complaint[] = (data || []).map((d: unknown) => {
          const obj = (d ?? {}) as Record<string, unknown>;
          const sb = obj.submittedBy as Record<string, unknown> | undefined;
          const submittedByName =
            (sb && typeof sb?.name === "string" && (sb.name as string)) ||
            (sb && typeof sb?.email === "string" && (sb.email as string)) ||
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
            assignedStaff: name || undefined,
            assignedStaffRole: "staff",
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
            sourceRole: obj.sourceRole as Complaint["sourceRole"],
            assignedByRole: obj.assignedByRole as Complaint["assignedByRole"],
            assignmentPath: Array.isArray(obj.assignmentPath)
              ? ((obj.assignmentPath as string[]).map((v) =>
                  String(v) === "headOfDepartment"
                    ? "hod"
                    : (String(v) as
                        | "student"
                        | "staff"
                        | "hod"
                        | "dean"
                        | "admin")
                ) as Array<"student" | "staff" | "hod" | "dean" | "admin">)
              : [],
            isEscalated: !!obj.isEscalated,
          };
        });
        setComplaints(mapped);
      } catch {
        setComplaints([]);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // If navigated with ?complaintId=..., open the details modal for that complaint when data loads
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qId = params.get("complaintId");
    if (!qId || !complaints.length) return;
    const match = complaints.find((c) => String(c.id) === String(qId));
    if (match) {
      setSelectedComplaint(match);
      setShowDetailModal(true);
    }
  }, [location.search, complaints]);

  // Only show complaints assigned to the current staff user; if no user (demo), show all mock complaints
  const myAssignedComplaints = React.useMemo(() => {
    if (!user) return complaints; // demo fallback: show all mock complaints
    const name = user.fullName ?? user.name;
    if (!name) return complaints;
    return complaints.filter(
      (c) => c.assignedStaff && c.assignedStaff === name
    );
  }, [complaints, user]);

  // No demo reassignment — complaints are loaded from backend for staff users

  const handleViewComplaint = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setShowDetailModal(true);
    // Mark as opened to hide NEW badge
    setOpenedIds((prev) => {
      const next = new Set(prev);
      next.add(complaint.id);
      try {
        localStorage.setItem("myAssignedOpened", JSON.stringify([...next]));
      } catch (e) {
        // ignore storage errors
      }
      return next;
    });
  };

  const handleUpdate = async (
    complaintId: string,
    updates: Partial<Complaint>
  ) => {
    // Type guard for server responses that may include either id or _id
    const isIdLike = (
      val: unknown
    ): val is Record<string, unknown> & { id?: string; _id?: string } => {
      return (
        !!val &&
        typeof val === "object" &&
        ("id" in (val as object) || "_id" in (val as object))
      );
    };

    setComplaints((prev) =>
      prev.map((c) =>
        c.id === complaintId ? { ...c, ...updates, lastUpdated: new Date() } : c
      )
    );

    // If backend/modal changed status, sync accepted/rejected tabs
    if (updates.status) {
      const st = updates.status;
      // Push status to backend; prefer using server response when available
      let updatedComplaintFromServer: unknown = null;
      try {
        // Only send valid backend statuses
        const allowed = [
          "Pending",
          "In Progress",
          "Resolved",
          "Closed",
        ] as const;
        type Allowed = (typeof allowed)[number];
        const isAllowed = (s: string): s is Allowed =>
          (allowed as readonly string[]).includes(s);
        if (isAllowed(st)) {
          // If a resolution note was provided via modal, forward it as the optional description
          const description =
            typeof updates.resolutionNote === "string"
              ? updates.resolutionNote
              : undefined;
          // Try to use server returned complaint object so All Complaints gets full details
          const resp = await updateComplaintStatusApi(
            complaintId,
            st,
            description
          );
          updatedComplaintFromServer = isIdLike(resp) ? resp : null;
        }
      } catch (err) {
        // Surface non-blocking error
        toast({
          title: "Failed to update",
          description: "Could not sync status to server",
          variant: "destructive",
        });
      }
      // Consider 'In Progress' as accepted by staff
      if (st === "In Progress") {
        acceptComplaint(complaintId);
      }
      // Consider 'Closed' with a rejection note as rejected
      else if (st === "Closed") {
        rejectComplaint(complaintId);
      } else if (st === "Resolved") {
        // Resolved complaints should not appear on My Assigned
        // Remove from local accepted/rejected sets to avoid showing in those tabs
        setAcceptedIds((prev) => {
          if (!prev.has(complaintId)) return prev;
          const next = new Set(prev);
          next.delete(complaintId);
          persistSets("myAssignedAccepted", next);
          return next;
        });
        setRejectedIds((prev) => {
          if (!prev.has(complaintId)) return prev;
          const next = new Set(prev);
          next.delete(complaintId);
          persistSets("myAssignedRejected", next);
          return next;
        });

        try {
          // Notify other views of the status change
          window.dispatchEvent(
            new CustomEvent("complaint:status-changed", {
              detail: { id: complaintId, status: "Resolved" },
            })
          );

          // Mapper to normalize arbitrary backend complaint to client shape
          const mapServerToClient = (
            input: unknown,
            fallback?: Complaint | null
          ): Complaint | null => {
            if (!input || typeof input !== "object") return fallback || null;
            const obj = input as Record<string, unknown>;
            const id = String(
              (obj.id as string) || (obj._id as string) || fallback?.id || ""
            );
            const sb = obj.submittedBy as Record<string, unknown> | undefined;
            const at = obj.assignedTo as Record<string, unknown> | undefined;
            const asg = obj.assignedStaff as
              | string
              | Record<string, unknown>
              | undefined;
            const submittedByName =
              (sb && typeof sb.name === "string" && (sb.name as string)) ||
              (sb && typeof sb.email === "string" && (sb.email as string)) ||
              fallback?.submittedBy ||
              "User";
            const assignedStaffName =
              (typeof asg === "string" && asg) ||
              (asg &&
                typeof (asg as Record<string, unknown>).name === "string" &&
                ((asg as Record<string, unknown>).name as string)) ||
              (asg &&
                typeof (asg as Record<string, unknown>).email === "string" &&
                ((asg as Record<string, unknown>).email as string)) ||
              (at && typeof at.name === "string" && (at.name as string)) ||
              (at && typeof at.email === "string" && (at.email as string)) ||
              (fallback?.assignedStaff as string | undefined);

            const hasEscalated = Object.prototype.hasOwnProperty.call(
              obj,
              "isEscalated"
            );
            const isEscalated = hasEscalated
              ? Boolean(obj["isEscalated"] as unknown as boolean)
              : fallback?.isEscalated ?? false;

            return {
              id,
              title: String(obj.title || fallback?.title || ""),
              description: String(
                (obj.fullDescription as string) ||
                  (obj.description as string) ||
                  (obj.shortDescription as string) ||
                  fallback?.description ||
                  ""
              ),
              category: String(obj.category || fallback?.category || ""),
              status: ((obj.status as Complaint["status"]) ||
                (fallback?.status as Complaint["status"]) ||
                "Pending") as Complaint["status"],
              priority: ((obj.priority as Complaint["priority"]) ||
                (fallback?.priority as Complaint["priority"]) ||
                "Medium") as Complaint["priority"],
              submittedBy: submittedByName,
              assignedStaff: assignedStaffName,
              assignedStaffRole: fallback?.assignedStaffRole,
              assignedByRole:
                (obj.assignedByRole as Complaint["assignedByRole"]) ||
                fallback?.assignedByRole,
              assignmentPath: Array.isArray(obj.assignmentPath)
                ? ((obj.assignmentPath as string[]).map((v) =>
                    String(v) === "headOfDepartment"
                      ? "hod"
                      : (String(v) as
                          | "student"
                          | "staff"
                          | "hod"
                          | "dean"
                          | "admin")
                  ) as Array<"student" | "staff" | "hod" | "dean" | "admin">)
                : fallback?.assignmentPath || [],
              assignedDate: obj.assignedAt
                ? new Date(String(obj.assignedAt))
                : fallback?.assignedDate,
              submittedDate: obj.createdAt
                ? new Date(String(obj.createdAt))
                : obj.submittedDate
                ? new Date(String(obj.submittedDate))
                : fallback?.submittedDate || new Date(),
              lastUpdated: obj.updatedAt
                ? new Date(String(obj.updatedAt))
                : obj.lastUpdated
                ? new Date(String(obj.lastUpdated))
                : fallback?.lastUpdated || new Date(),
              deadline: obj.deadline
                ? new Date(String(obj.deadline))
                : fallback?.deadline,
              resolutionNote:
                (obj.resolutionNote as string) ||
                (fallback?.resolutionNote as string | undefined),
              feedback:
                (obj.feedback as Complaint["feedback"]) || fallback?.feedback,
              evidenceFile:
                (obj.evidenceFile as string) || fallback?.evidenceFile,
              isEscalated,
              sourceRole:
                (obj.sourceRole as Complaint["sourceRole"]) ||
                fallback?.sourceRole,
              submittedTo: (obj.submittedTo as string) || fallback?.submittedTo,
              department: fallback?.department,
            };
          };

          const localFallback =
            (myAssignedComplaints || []).find((x) => x.id === complaintId) ||
            null;
          // If server returned a full complaint object, upsert that so All Complaints
          // receives full details (resolutionNote, timeline, etc.). Otherwise fall back
          // to the local object with updated status.
          const serverComplaint = isIdLike(updatedComplaintFromServer)
            ? mapServerToClient(updatedComplaintFromServer, localFallback)
            : localFallback
            ? { ...localFallback, status: "Resolved", lastUpdated: new Date() }
            : null;

          if (serverComplaint) {
            // Upsert locally with Resolved status so it appears under Resolved tab
            setComplaints((prev) => {
              const updated = serverComplaint as Complaint;
              const idx = prev.findIndex((c) => c.id === complaintId);
              if (idx === -1) return [...prev, updated];
              const next = [...prev];
              next[idx] = updated;
              return next;
            });

            window.dispatchEvent(
              new CustomEvent("complaint:upsert", {
                detail: {
                  complaint: serverComplaint,
                },
              })
            );
          }
        } catch {
          // no-op: best-effort event
        }

        toast({
          title: "Complaint Resolved",
          description: `Complaint #${complaintId} moved to All Complaints`,
        });
      }
    }

    toast({
      title: "Complaint Updated",
      description: `Complaint #${complaintId} has been updated successfully`,
    });
  };

  const handleSortByPriority = () => {
    const priorityOrder = { Critical: 4, High: 3, Medium: 2, Low: 1 };
    setSortingMode("priority");
    setSortOrder(sortOrder === "desc" ? "asc" : "desc");
  };

  // Filter complaints based on search, status, priority, and overdue
  const [filtered, setFiltered] = useState(myAssignedComplaints);
  const totalPages = Math.ceil(filtered.length / pageSize);
  // Helper sorts
  const sortByAssignedDateDesc = (items: Complaint[]) => {
    return [...items].sort((a, b) => {
      const aDate = (a.assignedDate || a.submittedDate)?.valueOf?.() || 0;
      const bDate = (b.assignedDate || b.submittedDate)?.valueOf?.() || 0;
      return bDate - aDate;
    });
  };
  const sortByPriority = React.useCallback(
    (items: Complaint[]) => {
      const priorityOrder = {
        Critical: 4,
        High: 3,
        Medium: 2,
        Low: 1,
      } as const;
      return [...items].sort((a, b) => {
        const orderA =
          priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
        const orderB =
          priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
        return sortOrder === "desc" ? orderB - orderA : orderA - orderB;
      });
    },
    [sortOrder]
  );
  // NEW badge helper (assigned within last 48h and not opened yet)
  const isNew = (complaint: Complaint) => {
    const assigned = complaint.assignedDate || complaint.submittedDate;
    if (!assigned) return false;
    const diffMs = Date.now() - new Date(assigned).getTime();
    const twoDays = 48 * 60 * 60 * 1000;
    return diffMs <= twoDays && !openedIds.has(complaint.id);
  };

  // Accept/Reject local state (persisted)
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem("myAssignedAccepted");
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  });
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem("myAssignedRejected");
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  });

  const persistSets = (key: string, set: Set<string>) => {
    try {
      localStorage.setItem(key, JSON.stringify([...set]));
    } catch {
      // ignore storage errors
    }
  };

  const acceptComplaint = async (id: string) => {
    // Immediately mark as accepted in UI
    setAcceptedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      persistSets("myAssignedAccepted", next);
      return next;
    });
    setRejectedIds((prev) => {
      if (prev.has(id)) {
        const next = new Set(prev);
        next.delete(id);
        persistSets("myAssignedRejected", next);
        return next;
      }
      return prev;
    });
    try {
      await updateComplaintStatusApi(id, "In Progress");
      // reflect status in local list
      setComplaints((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: "In Progress" } : c))
      );
      // Emit realtime event for student views
      try {
        window.dispatchEvent(
          new CustomEvent("complaint:status-changed", {
            detail: { id, status: "In Progress" },
          })
        );
      } catch {
        // best-effort event dispatch; ignore
      }
      toast({ title: "Accepted", description: `Complaint #${id} accepted.` });
    } catch (e: unknown) {
      toast({
        title: "Accept failed",
        description:
          e && typeof e === "object" && "message" in e
            ? String((e as { message?: unknown }).message)
            : "Could not update status",
        variant: "destructive",
      });
    }
  };
  const rejectComplaint = async (id: string) => {
    setRejectedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      persistSets("myAssignedRejected", next);
      return next;
    });
    setAcceptedIds((prev) => {
      if (prev.has(id)) {
        const next = new Set(prev);
        next.delete(id);
        persistSets("myAssignedAccepted", next);
        return next;
      }
      return prev;
    });
    try {
      const note = "Rejected by staff";
      await updateComplaintStatusApi(id, "Closed", note);
      setComplaints((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: "Closed" } : c))
      );
      // Emit realtime event for student views
      try {
        window.dispatchEvent(
          new CustomEvent("complaint:status-changed", {
            detail: { id, status: "Closed", note },
          })
        );
      } catch {
        // best-effort event dispatch; ignore
      }
      toast({ title: "Rejected", description: `Complaint #${id} rejected.` });
    } catch (e: unknown) {
      toast({
        title: "Reject failed",
        description:
          e && typeof e === "object" && "message" in e
            ? String((e as { message?: unknown }).message)
            : "Could not update status",
        variant: "destructive",
      });
    }
  };

  const isAssignedByHod = (c: Complaint) => {
    const arb = (c.assignedByRole || "").toLowerCase();
    const ap = (c.assignmentPath || []).map((r) => r.toLowerCase());
    return (
      arb === "headofdepartment" ||
      arb === "hod" ||
      ap.includes("headofdepartment") ||
      ap.includes("hod")
    );
  };
  const isDirectFromStudents = (c: Complaint) => {
    const src = (c.sourceRole || "").toLowerCase();
    const arb = (c.assignedByRole || "").toLowerCase();
    return src === "student" && (!arb || arb === "student");
  };

  React.useEffect(() => {
    // Determine category base first
    let categoryBase: Complaint[];
    if (categoryTab === "direct") {
      // Exclude complaints that have been accepted or rejected already
      categoryBase = myAssignedComplaints
        .filter(isDirectFromStudents)
        .filter((c) => !acceptedIds.has(c.id) && !rejectedIds.has(c.id));
    } else if (categoryTab === "assignedByHod") {
      categoryBase = myAssignedComplaints
        .filter(isAssignedByHod)
        .filter((c) => !acceptedIds.has(c.id) && !rejectedIds.has(c.id));
    } else if (categoryTab === "accepted") {
      categoryBase = myAssignedComplaints.filter((c) => acceptedIds.has(c.id));
    } else {
      categoryBase = myAssignedComplaints.filter((c) => rejectedIds.has(c.id));
    }

    // Keep resolved complaints only in the Resolved tab
    if (categoryTab === "resolved") {
      categoryBase = myAssignedComplaints.filter(
        (c) => c.status === "Resolved"
      );
    } else {
      categoryBase = categoryBase.filter((c) => c.status !== "Resolved");
    }

    let base = categoryBase.filter((complaint) => {
      const matchesSearch =
        complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "All" || complaint.status === statusFilter;
      const matchesPriority =
        priorityFilter === "All" || complaint.priority === priorityFilter;
      const matchesOverdue =
        overdueFilter === "All"
          ? true
          : overdueFilter === "Overdue"
          ? isOverdue(complaint)
          : !isOverdue(complaint);
      return (
        matchesSearch && matchesStatus && matchesPriority && matchesOverdue
      );
    });

    // Apply quick filters
    if (quickFilter === "recent") {
      base = sortByAssignedDateDesc(myAssignedComplaints).slice(0, 3);
    } else if (quickFilter === "resolvedThisMonth") {
      const now = new Date();
      const m = now.getMonth();
      const y = now.getFullYear();
      base = base.filter((c) => {
        const d = c.lastUpdated || c.submittedDate;
        const dt = new Date(d);
        return (
          c.status === "Resolved" &&
          dt.getMonth() === m &&
          dt.getFullYear() === y
        );
      });
    }

    // Apply sorting
    const sorted =
      sortingMode === "priority"
        ? sortByPriority(base)
        : sortByAssignedDateDesc(base);

    setFiltered(sorted);
    // reset to first page when filters/sorts change
    setPage(1);
  }, [
    myAssignedComplaints,
    categoryTab,
    acceptedIds,
    rejectedIds,
    searchTerm,
    statusFilter,
    priorityFilter,
    overdueFilter,
    sortingMode,
    sortOrder,
    quickFilter,
    openedIds,
    sortByPriority,
  ]);

  const statusColors = {
    Pending:
      "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400",
    "In Progress":
      "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400",
    Resolved:
      "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400",
    Closed:
      "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400",
  };

  const priorityColors = {
    Critical: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
    High: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400",
    Medium:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
    Low: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
  };

  // Memoize a lightweight dependency key for escalation effect
  const escalationKey = React.useMemo(
    () =>
      complaints
        .map((c) => `${c.id}|${c.deadline?.toString()}|${c.status}`)
        .join(";"),
    [complaints]
  );

  // Helper: check if complaint is overdue
  const isOverdue = (complaint: Complaint) => {
    if (!complaint.deadline) return false;
    const today = new Date();
    // Remove time for accurate comparison
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(complaint.deadline);
    deadline.setHours(0, 0, 0, 0);
    return (
      deadline < today &&
      complaint.status !== "Closed" &&
      complaint.status !== "Resolved"
    );
  };

  // Summary metrics (computed on myAssignedComplaints)
  const recentTop3 = React.useMemo(
    () => sortByAssignedDateDesc(myAssignedComplaints).slice(0, 3),
    [myAssignedComplaints]
  );
  const inProgressCount = myAssignedComplaints.filter(
    (c) => c.status === "In Progress"
  ).length;
  const resolvedThisMonthCount = React.useMemo(() => {
    const now = new Date();
    const m = now.getMonth();
    const y = now.getFullYear();
    return myAssignedComplaints.filter((c) => {
      if (c.status !== "Resolved") return false;
      const d = c.lastUpdated || c.submittedDate;
      const dt = new Date(d);
      return dt.getMonth() === m && dt.getFullYear() === y;
    }).length;
  }, [myAssignedComplaints]);
  const overdueCount = myAssignedComplaints.filter((c) => isOverdue(c)).length;
  const pendingCount = myAssignedComplaints.filter(
    (c) => c.status === "Pending"
  ).length;
  const resolvedCount = myAssignedComplaints.filter(
    (c) => c.status === "Resolved"
  ).length;
  const closedCount = myAssignedComplaints.filter(
    (c) => c.status === "Closed"
  ).length;

  // Card click helpers
  const applyRecentFilter = () => {
    setQuickFilter("recent");
    setSearchTerm("");
    setStatusFilter("All");
    setPriorityFilter("All");
    setOverdueFilter("All");
    setSortingMode("date");
  };
  const applyInProgressFilter = () => {
    setQuickFilter(null);
    setSearchTerm("");
    setStatusFilter("In Progress");
    setPriorityFilter("All");
    setOverdueFilter("All");
    setSortingMode("date");
  };
  const applyResolvedThisMonthFilter = () => {
    setQuickFilter("resolvedThisMonth");
    setSearchTerm("");
    setStatusFilter("All");
    setPriorityFilter("All");
    setOverdueFilter("All");
    setSortingMode("date");
  };
  const applyOverdueFilter = () => {
    setQuickFilter(null);
    setSearchTerm("");
    setStatusFilter("All");
    setPriorityFilter("All");
    setOverdueFilter("Overdue");
    setSortingMode("date");
  };
  const onCategoryTabChange = (v: string) => {
    const tab = v as CategoryTab;
    setCategoryTab(tab);
    setQuickFilter(null);
    setSearchTerm("");
    setPriorityFilter("All");
    setSortingMode("date");
    // Keep status/overdue filters user-adjustable; don't force reset beyond basics
    setStatusFilter("All");
    setOverdueFilter("All");
  };

  // Note: no auto-escalation side-effects here; escalation is handled by backend if applicable.

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          My Assigned Complaints
        </h1>
        <p className="text-muted-foreground">
          Manage complaints assigned specifically to you
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card
          onClick={applyRecentFilter}
          className="cursor-pointer hover:shadow"
        >
          <CardHeader className="pb-2 p-3 sm:p-4 md:p-6">
            <CardTitle className="text-sm font-medium">
              Recently Assigned
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="text-2xl font-bold">{recentTop3.length}</div>
            <p className="text-xs text-muted-foreground">Top 3 newest</p>
          </CardContent>
        </Card>
        <Card
          onClick={applyInProgressFilter}
          className="cursor-pointer hover:shadow"
        >
          <CardHeader className="pb-2 p-3 sm:p-4 md:p-6">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="text-2xl font-bold">{inProgressCount}</div>
            <p className="text-xs text-muted-foreground">Working now</p>
          </CardContent>
        </Card>
        <Card
          onClick={applyResolvedThisMonthFilter}
          className="cursor-pointer hover:shadow"
        >
          <CardHeader className="pb-2 p-3 sm:p-4 md:p-6">
            <CardTitle className="text-sm font-medium">
              Resolved This Month
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="text-2xl font-bold">{resolvedThisMonthCount}</div>
            <p className="text-xs text-muted-foreground">This calendar month</p>
          </CardContent>
        </Card>
        <Card
          onClick={applyOverdueFilter}
          className="cursor-pointer hover:shadow"
        >
          <CardHeader className="pb-2 p-3 sm:p-4 md:p-6">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="text-2xl font-bold">{overdueCount}</div>
            <p className="text-xs text-muted-foreground">Past deadline</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card className="shadow-lg rounded-2xl bg-white dark:bg-gray-800">
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Assigned Complaints ({filtered.length})
          </CardTitle>

          {/* Tabs: category groups per requirements */}
          <div className="pt-2">
            <Tabs value={categoryTab} onValueChange={onCategoryTabChange}>
              <TabsList className="flex gap-2 overflow-x-auto md:overflow-visible whitespace-nowrap md:whitespace-normal -mx-2 px-2 py-1">
                <TabsTrigger className="shrink-0" value="direct">
                  Direct Complaints
                </TabsTrigger>
                <TabsTrigger className="shrink-0" value="assignedByHod">
                  Assigned by HOD
                </TabsTrigger>
                <TabsTrigger className="shrink-0" value="accepted">
                  Accepted
                </TabsTrigger>
                <TabsTrigger className="shrink-0" value="rejected">
                  Rejected
                </TabsTrigger>
                <TabsTrigger className="shrink-0" value="resolved">
                  Resolved
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Search and Filter Controls */}
          <div className="flex flex-col md:flex-row gap-4 pt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-lg"
              />
            </div>

            <div className="flex flex-col md:flex-row gap-2">
              <div className="flex items-center gap-2 min-w-0 sm:min-w-[180px]">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Status</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="min-w-0 sm:min-w-[150px] rounded-lg">
                  <SelectValue placeholder="All Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Priority</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>

              {/* Overdue Filter */}
              <Select value={overdueFilter} onValueChange={setOverdueFilter}>
                <SelectTrigger className="min-w-0 sm:min-w-[140px] rounded-lg">
                  <SelectValue placeholder="Overdue" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                  <SelectItem value="NotOverdue">Not Overdue</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={handleSortByPriority}
                className="min-w-0 sm:min-w-[140px] rounded-lg hover:bg-muted"
              >
                <ArrowUpDown className="h-4 w-4 mr-2" />
                Sort Priority
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-3 sm:p-4 md:p-6">
          {/* Desktop/Tablet Table */}
          <div className="hidden md:block rounded-md border overflow-x-auto bg-transparent">
            <Table className="bg-transparent min-w-[760px]">
              <style>{`
                .my-assigned-table tr,
                .my-assigned-table th,
                .my-assigned-table td {
                  background: transparent !important;
                }
              `}</style>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-sm align-middle">Title</TableHead>
                  <TableHead className="text-sm align-middle">
                    Category
                  </TableHead>
                  <TableHead className="text-sm align-middle">
                    Priority
                  </TableHead>
                  <TableHead className="text-sm align-middle">Status</TableHead>
                  <TableHead className="text-sm align-middle">
                    Overdue
                  </TableHead>
                  <TableHead className="text-right text-sm align-middle">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {searchTerm ||
                      statusFilter !== "All" ||
                      priorityFilter !== "All"
                        ? "No complaints match your search criteria"
                        : "No complaints assigned to you yet"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered
                    .slice((page - 1) * pageSize, page * pageSize)
                    .map((complaint) => (
                      <TableRow
                        key={complaint.id}
                        className="hover:bg-muted/50 dark:hover:bg-accent/10"
                      >
                        <TableCell className="max-w-xs">
                          <div className="font-medium truncate flex items-center gap-2">
                            <span className="truncate">{complaint.title}</span>
                            {isNew(complaint) && (
                              <Badge
                                className="ml-1 bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 text-[10px]"
                                variant="outline"
                              >
                                NEW
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {complaint.description.substring(0, 60)}...
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {complaint.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-xs ${
                              priorityColors[
                                complaint.priority as keyof typeof priorityColors
                              ]
                            }`}
                            variant="outline"
                          >
                            {complaint.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="align-middle">
                          <Badge
                            className={`text-xs ${
                              statusColors[complaint.status]
                            }`}
                            variant="outline"
                          >
                            {complaint.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="align-middle">
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
                        <TableCell className="text-right align-middle">
                          <div className="inline-flex gap-2 items-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewComplaint(complaint)}
                              className=" dark:hover:text-blue-400"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                            </Button>

                            {/* Actions depend on active category tab */}
                            {categoryTab === "accepted" ? (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => rejectComplaint(complaint.id)}
                                className="ml-2"
                              >
                                <ThumbsDown className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            ) : categoryTab === "rejected" ? (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => acceptComplaint(complaint.id)}
                                className="ml-2 bg-green-600 hover:bg-green-700 text-white"
                              >
                                <ThumbsUp className="h-4 w-4 mr-1" />
                                Re-accept
                              </Button>
                            ) : // When not in accepted/rejected tabs: show accept/reject only when not Resolved
                            complaint.status === "Resolved" ? null : (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => acceptComplaint(complaint.id)}
                                  disabled={acceptedIds.has(complaint.id)}
                                  className="ml-2 bg-green-600 hover:bg-green-700 text-white disabled:opacity-70"
                                >
                                  <ThumbsUp className="h-4 w-4 mr-1" />
                                  Accept
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => rejectComplaint(complaint.id)}
                                  disabled={rejectedIds.has(complaint.id)}
                                  className="ml-2"
                                >
                                  <ThumbsDown className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ||
                statusFilter !== "All" ||
                priorityFilter !== "All"
                  ? "No complaints match your search criteria"
                  : "No complaints assigned to you yet"}
              </div>
            ) : (
              filtered
                .slice((page - 1) * pageSize, page * pageSize)
                .map((complaint) => (
                  <Card
                    key={complaint.id}
                    className="p-4 shadow-md rounded-2xl"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-medium text-sm">
                            {complaint.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            #{complaint.id}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-2">
                          {isNew(complaint) && (
                            <Badge
                              className="text-xs bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400"
                              variant="outline"
                            >
                              NEW
                            </Badge>
                          )}
                          <Badge
                            className={`text-xs ${
                              priorityColors[
                                complaint.priority as keyof typeof priorityColors
                              ]
                            }`}
                            variant="outline"
                          >
                            {complaint.priority}
                          </Badge>
                          <Badge
                            className={`text-xs ${
                              statusColors[complaint.status]
                            }`}
                            variant="outline"
                          >
                            {complaint.status}
                          </Badge>
                          {isOverdue(complaint) && (
                            <Badge
                              className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 text-xs"
                              variant="outline"
                            >
                              Overdue
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">
                            Category:
                          </span>
                          <span className="font-medium ml-2">
                            {complaint.category}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Category:
                          </span>
                          <span className="font-medium ml-2">
                            {complaint.category}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Overdue:
                          </span>
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

                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-sm">
                          {complaint.description.substring(0, 120)}...
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewComplaint(complaint)}
                          className="flex-1 hover:bg-primary/10 dark:hover:bg-hover-blue/10"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>

                        {categoryTab === "accepted" ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => rejectComplaint(complaint.id)}
                            className="flex-1"
                          >
                            <ThumbsDown className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        ) : categoryTab === "rejected" ? (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => acceptComplaint(complaint.id)}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          >
                            <ThumbsUp className="h-4 w-4 mr-2" />
                            Re-accept
                          </Button>
                        ) : (
                          <>
                            {/* Mobile: hide accept/reject for Resolved complaints */}
                            {complaint.status !== "Resolved" && (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => acceptComplaint(complaint.id)}
                                  disabled={acceptedIds.has(complaint.id)}
                                  className="flex-1 bg-green-600 hover:bg-green-700 text-white disabled:opacity-70"
                                >
                                  <ThumbsUp className="h-4 w-4 mr-2" />
                                  {acceptedIds.has(complaint.id)
                                    ? "Accepted"
                                    : "Accept"}
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => rejectComplaint(complaint.id)}
                                  disabled={rejectedIds.has(complaint.id)}
                                  className="flex-1"
                                >
                                  <ThumbsDown className="h-4 w-4 mr-2" />
                                  {rejectedIds.has(complaint.id)
                                    ? "Rejected"
                                    : "Reject"}
                                </Button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pagination Controls (both views) */}
      {totalPages > 1 && (
        <div className="px-4 md:px-0">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setPage((p) => Math.max(1, p - 1));
                  }}
                  className={page === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              {(() => {
                const windowSize = 3;
                let start = Math.max(1, page - 1);
                const end = Math.min(totalPages, start + windowSize - 1);
                if (end - start + 1 < windowSize) {
                  start = Math.max(1, end - windowSize + 1);
                }
                const pages: number[] = [];
                for (let i = start; i <= end; i++) pages.push(i);
                return (
                  <>
                    {pages[0] !== 1 && (
                      <>
                        <PaginationItem className="hidden sm:list-item">
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setPage(1);
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
                    {pages.map((p) => (
                      <PaginationItem key={p} className="hidden sm:list-item">
                        <PaginationLink
                          href="#"
                          isActive={p === page}
                          onClick={(e) => {
                            e.preventDefault();
                            setPage(p);
                          }}
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    {pages[pages.length - 1] !== totalPages && (
                      <>
                        <PaginationItem className="hidden sm:list-item">
                          <PaginationEllipsis />
                        </PaginationItem>
                        <PaginationItem className="hidden sm:list-item">
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setPage(totalPages);
                            }}
                          >
                            {totalPages}
                          </PaginationLink>
                        </PaginationItem>
                      </>
                    )}
                  </>
                );
              })()}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setPage((p) => Math.min(totalPages, p + 1));
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

      {/* Modal */}
      <RoleBasedComplaintModal
        complaint={selectedComplaint}
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
