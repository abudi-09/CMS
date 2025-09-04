import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  Clock,
  AlertCircle,
  CheckCircle2,
  Users,
} from "lucide-react";
import { RoleBasedComplaintModal } from "@/components/RoleBasedComplaintModal";
import { Complaint } from "@/components/ComplaintCard";
import { useAuth } from "@/components/auth/AuthContext";
import {
  getAdminCalendarSummaryApi,
  getAdminCalendarDayApi,
  getDeanCalendarSummaryApi,
  getDeanCalendarDayApi,
  getHodCalendarSummaryApi,
  getHodCalendarDayApi,
  getHodManagedComplaintsApi,
} from "@/lib/api";
import { fetchCategoriesApi } from "@/lib/categoryApi";
import {
  format,
  isSameDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
} from "date-fns";

type CategoryRes = {
  name: string;
  roles?: string[];
  status?: "active" | "inactive";
};

type QueryComplaint = {
  _id?: string;
  id?: string;
  title?: string;
  status?: string;
  priority?: "Low" | "Medium" | "High" | "Critical" | string;
  category?: string;
  submittedBy?: { name?: string; email?: string } | string | null;
  createdAt?: string;
  submittedDate?: string;
  updatedAt?: string;
  lastUpdated?: string;
  deadline?: string | null;
  isEscalated?: boolean;
  submittedTo?: string | null;
  department?: string | null;
  sourceRole?: string | null;
  assignedByRole?: string | null;
  assignmentPath?: string[];
  fullDescription?: string;
  shortDescription?: string;
  description?: string;
  assignedTo?: string | { _id?: string; name?: string; role?: string } | null;
};

// Local API helper (keeps this page self-sufficient while api client is being consolidated)
const API_BASE = import.meta.env.VITE_API_BASE?.toString() || "/api";
async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

const statusColors: Record<string, string> = {
  Pending: "bg-yellow-500 text-white",
  Accepted: "bg-sky-500 text-white",
  "In Progress": "bg-blue-500 text-white",
  Resolved: "bg-green-500 text-white",
  Rejected: "bg-red-500 text-white",
  Closed: "bg-gray-500 text-white",
  Overdue: "bg-red-600 text-white",
};

const priorityColors: Record<string, string> = {
  Low: "border-green-300",
  Medium: "border-yellow-400",
  High: "border-orange-400",
  Critical: "border-red-500",
};

interface CalendarViewProps {
  role?: "admin" | "staff";
  staffName?: string; // for demo filtering, unused now
}

export default function CalendarView({ role = "admin" }: CalendarViewProps) {
  const { user } = useAuth();
  const effectiveRole: "admin" | "staff" | "dean" | "hod" =
    user?.role === "staff"
      ? "staff"
      : user?.role === "dean"
      ? "dean"
      : user?.role === "hod"
      ? "hod"
      : "admin";

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewType, setViewType] = useState<"submission" | "deadline">(
    "submission"
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  // Date range filters
  const [submissionFrom, setSubmissionFrom] = useState<Date | null>(null);
  const [submissionTo, setSubmissionTo] = useState<Date | null>(null);
  const [deadlineFrom, setDeadlineFrom] = useState<Date | null>(null);
  const [deadlineTo, setDeadlineTo] = useState<Date | null>(null);

  const [allComplaints, setAllComplaints] = useState<Complaint[]>([]);
  const [adminCategories, setAdminCategories] = useState<string[]>([]);

  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    totalThisMonth: number;
    overdue: number;
    dueToday: number;
    resolvedThisMonth: number;
    countsByStatus?: Record<string, number>;
    countsByPriority?: Record<string, number>;
    countsByCategory?: Record<string, number>;
  }>({ totalThisMonth: 0, overdue: 0, dueToday: 0, resolvedThisMonth: 0 });

  // Staff: load only their assigned complaints
  useEffect(() => {
    let cancelled = false;
    if (effectiveRole !== "staff") return;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchJson<QueryComplaint[]>(
          `${API_BASE}/complaints/assigned`
        );
        if (cancelled) return;
        const mapped: Complaint[] = data.map((c) => ({
          id: c.id,
          title: c.title,
          description: c.fullDescription || c.shortDescription || "",
          category: c.category,
          status: (c.status as Complaint["status"]) || "Pending",
          submittedBy:
            (c?.submittedBy && typeof c.submittedBy === "object"
              ? c?.submittedBy?.name || c?.submittedBy?.email
              : (c?.submittedBy as string)) || "Unknown",
          assignedStaff: "You",
          submittedDate: new Date(c.submittedDate as string),
          deadline: c.deadline ? new Date(c.deadline as string) : undefined,
          lastUpdated: new Date(c.lastUpdated as string),
          priority:
            c.priority === "Low" ||
            c.priority === "Medium" ||
            c.priority === "High" ||
            c.priority === "Critical"
              ? c.priority
              : "Medium",
          feedback: undefined,
          resolutionNote: undefined,
          evidenceFile: undefined,
          isEscalated: c.isEscalated,
          submittedTo: undefined,
          department: c.category,
          sourceRole: (c.sourceRole || undefined) as Complaint["sourceRole"],
          assignedByRole: (c.assignedByRole ||
            undefined) as Complaint["assignedByRole"],
          assignmentPath: Array.isArray(c.assignmentPath)
            ? (c.assignmentPath as Complaint["assignmentPath"])
            : undefined,
        }));
        setAllComplaints(mapped);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [effectiveRole]);

  // HoD: initial load from inbox + managed to populate calendar markers
  useEffect(() => {
    let cancelled = false;
    if (effectiveRole !== "hod") return;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [managed] = await Promise.all([getHodManagedComplaintsApi()]);
        if (cancelled) return;
        const rows = [...((managed as unknown[]) || [])];
        const mapped: Complaint[] = rows.map((raw) => {
          const c = raw as Record<string, unknown>;
          const ap = Array.isArray(c.assignmentPath)
            ? ((c.assignmentPath as unknown[])
                .map((v) => String(v))
                .filter((v) =>
                  ["student", "hod", "dean", "admin", "staff"].includes(v)
                ) as Array<"student" | "hod" | "dean" | "admin" | "staff">)
            : undefined;
          const priorityStr = String(c.priority || "");
          const priority =
            priorityStr === "Low" ||
            priorityStr === "Medium" ||
            priorityStr === "High" ||
            priorityStr === "Critical"
              ? (priorityStr as Complaint["priority"])
              : ("Medium" as Complaint["priority"]);
          const statusStr = String(c.status || "Pending");
          const status =
            statusStr === "Pending" ||
            statusStr === "Accepted" ||
            statusStr === "Assigned" ||
            statusStr === "In Progress" ||
            statusStr === "Resolved" ||
            statusStr === "Closed"
              ? (statusStr as Complaint["status"])
              : ("Pending" as Complaint["status"]);
          const assignedTo = c["assignedTo"] as
            | string
            | { name?: string; email?: string }
            | null
            | undefined;
          const assignedStaff = assignedTo
            ? typeof assignedTo === "object"
              ? assignedTo?.name || assignedTo?.email || "Assigned"
              : "Assigned"
            : "Unassigned";
          const submittedBy = c["submittedBy"] as
            | string
            | { name?: string; email?: string }
            | null
            | undefined;
          return {
            id: String(c.id || c._id || c.complaintId || ""),
            title: (c.title as string) || "Untitled Complaint",
            description:
              (c.description as string) || (c.shortDescription as string) || "",
            category: (c.category as string) || (c.department as string) || "",
            status,
            submittedBy:
              typeof submittedBy === "object"
                ? submittedBy?.name || submittedBy?.email || ""
                : (submittedBy as string) || "",
            assignedStaff,
            submittedDate: new Date(
              (c.submittedDate as string) ||
                (c.createdAt as string) ||
                Date.now()
            ),
            deadline: c.deadline ? new Date(String(c.deadline)) : undefined,
            lastUpdated: new Date(
              (c.lastUpdated as string) || (c.updatedAt as string) || Date.now()
            ),
            priority,
            feedback: undefined,
            resolutionNote: undefined,
            evidenceFile: undefined,
            isEscalated: Boolean(c.isEscalated),
            submittedTo: (c.submittedTo as string) || undefined,
            department: (c.department as string) || (c.category as string),
            sourceRole: (c.sourceRole as Complaint["sourceRole"]) || undefined,
            assignedByRole:
              (c.assignedByRole as Complaint["assignedByRole"]) || undefined,
            assignmentPath: ap,
          } as Complaint;
        });
        // De-dupe by id, prefer latest updated
        const map = new Map<string, Complaint>();
        for (const item of mapped) {
          const prev = map.get(item.id);
          if (!prev || item.lastUpdated > prev.lastUpdated)
            map.set(item.id, item);
        }
        setAllComplaints(Array.from(map.values()));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [effectiveRole]);

  // Admin/Dean: load categories (admin-only) + complaints directed to their office by students (no assignee restriction)
  useEffect(() => {
    let cancelled = false;
    if (!user?.id || effectiveRole === "hod") return;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        if (effectiveRole === "admin") {
          // Categories for admin role
          try {
            const cats = (await fetchCategoriesApi({
              role: "admin",
              status: "active",
            })) as unknown as CategoryRes[];
            if (!cancelled && Array.isArray(cats)) {
              const names = cats
                .map((cat) => (typeof cat?.name === "string" ? cat.name : null))
                .filter(Boolean) as string[];
              setAdminCategories(names);
            }
          } catch {
            // ignore
          }
        }
        // Fetch all complaints submitted to Admin/Dean by students (not restricted by assignee)
        const target =
          effectiveRole === "dean"
            ? "dean"
            : effectiveRole === "admin"
            ? "admin"
            : null;
        if (!target) return;
        const res = await fetchJson<QueryComplaint[]>(
          `${API_BASE}/complaints?submittedTo=${target}&sourceRole=student`
        );
        if (cancelled) return;
        const mapped: Complaint[] = (res || []).map((c) => {
          const status = (c?.status as Complaint["status"]) || "Pending";
          const priority: Complaint["priority"] =
            c?.priority === "Low" ||
            c?.priority === "Medium" ||
            c?.priority === "High" ||
            c?.priority === "Critical"
              ? (c.priority as Complaint["priority"])
              : "Medium";
          const submittedAt =
            c.createdAt ?? c.submittedDate ?? new Date().toISOString();
          const updatedAt =
            c.updatedAt ?? c.lastUpdated ?? new Date().toISOString();
          return {
            id: String(c?._id || c?.id || ""),
            title: c?.title || "Untitled Complaint",
            description:
              c?.fullDescription || c?.shortDescription || c?.description || "",
            category: c?.category || "",
            status,
            submittedBy:
              (c?.submittedBy && typeof c.submittedBy === "object"
                ? c?.submittedBy?.name || c?.submittedBy?.email
                : (c?.submittedBy as string)) || "Unknown",
            assignedStaff:
              effectiveRole === "dean" &&
              c &&
              typeof c === "object" &&
              "assignedTo" in c &&
              c.assignedTo
                ? (() => {
                    const at = c.assignedTo;
                    if (typeof at === "object" && at) {
                      const name = (at as { name?: string }).name;
                      const role = (at as { role?: string }).role;
                      if (role && role.toLowerCase() === "hod") {
                        return name
                          ? `Assigned to HOD: ${name}`
                          : "Assigned to HOD";
                      }
                      return name ? `Assigned: ${name}` : "Assigned";
                    }
                    return "Assigned";
                  })()
                : c &&
                  typeof c === "object" &&
                  "assignedTo" in c &&
                  c.assignedTo
                ? "Assigned"
                : "Unassigned",
            submittedDate: new Date(submittedAt),
            deadline: c?.deadline ? new Date(c.deadline) : undefined,
            lastUpdated: new Date(updatedAt),
            priority,
            feedback: undefined,
            resolutionNote: undefined,
            evidenceFile: undefined,
            isEscalated: !!c?.isEscalated,
            submittedTo: (c?.submittedTo || undefined) as string | undefined,
            department: (c?.department || c?.category || undefined) as
              | string
              | undefined,
            sourceRole: (c?.sourceRole || undefined) as Complaint["sourceRole"],
            assignedByRole: (c?.assignedByRole ||
              undefined) as Complaint["assignedByRole"],
            assignmentPath: Array.isArray(c?.assignmentPath)
              ? (c.assignmentPath as Complaint["assignmentPath"])
              : undefined,
          } as Complaint;
        });
        setAllComplaints(mapped);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [effectiveRole, user?.id, user?.name, user?.fullName]);

  // Load summary from backend for Admin/Dean/HOD
  useEffect(() => {
    let cancelled = false;
    if (!["admin", "dean", "hod"].includes(effectiveRole)) return;
    (async () => {
      try {
        const m = selectedDate.getMonth();
        const y = selectedDate.getFullYear();
        const params = {
          month: m,
          year: y,
          status: statusFilter !== "all" ? statusFilter : undefined,
          priority: priorityFilter !== "all" ? priorityFilter : undefined,
          categories: categoryFilter !== "all" ? [categoryFilter] : undefined,
          // Do not restrict by assignee for summary; show all admin-directed items
          submissionFrom: submissionFrom
            ? submissionFrom.toISOString().slice(0, 10)
            : undefined,
          submissionTo: submissionTo
            ? submissionTo.toISOString().slice(0, 10)
            : undefined,
          deadlineFrom: deadlineFrom
            ? deadlineFrom.toISOString().slice(0, 10)
            : undefined,
          deadlineTo: deadlineTo
            ? deadlineTo.toISOString().slice(0, 10)
            : undefined,
          viewType: viewType,
        };
        const s =
          effectiveRole === "dean"
            ? await getDeanCalendarSummaryApi(params)
            : effectiveRole === "hod"
            ? await getHodCalendarSummaryApi(params)
            : await getAdminCalendarSummaryApi(params);
        if (!cancelled) setSummary(s);
      } catch (_) {
        if (!cancelled)
          setSummary({
            totalThisMonth: 0,
            overdue: 0,
            dueToday: 0,
            resolvedThisMonth: 0,
          });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    effectiveRole,
    selectedDate,
    statusFilter,
    priorityFilter,
    categoryFilter,
    adminCategories,
    submissionFrom,
    submissionTo,
    deadlineFrom,
    deadlineTo,
    viewType,
    user?.id,
  ]);

  // Fetch date-specific complaints for Admin when clicking a date
  const handleSelectDate = async (date?: Date) => {
    if (!date) return;
    setSelectedDate(date);
    if (
      !user?.id ||
      (effectiveRole !== "admin" &&
        effectiveRole !== "dean" &&
        effectiveRole !== "hod")
    )
      return;
    try {
      setLoading(true);
      setError(null);
      // Format yyyy-mm-dd in UTC to  ensure consistency with backend
      const utcDate = new Date(
        Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
      );
      const yyyy = utcDate.getUTCFullYear();
      const mm = String(utcDate.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(utcDate.getUTCDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const categoriesParam =
        categoryFilter !== "all" ? [categoryFilter] : undefined;
      const items =
        effectiveRole === "dean"
          ? await getDeanCalendarDayApi({
              date: dateStr,
              viewType,
              status: statusFilter !== "all" ? statusFilter : undefined,
              priority: priorityFilter !== "all" ? priorityFilter : undefined,
              categories: categoriesParam,
            })
          : effectiveRole === "hod"
          ? await getHodCalendarDayApi({
              date: dateStr,
              viewType,
              status: statusFilter !== "all" ? statusFilter : undefined,
              priority: priorityFilter !== "all" ? priorityFilter : undefined,
              categories: categoriesParam,
            })
          : await getAdminCalendarDayApi({
              date: dateStr,
              viewType,
              status: statusFilter !== "all" ? statusFilter : undefined,
              priority: priorityFilter !== "all" ? priorityFilter : undefined,
              categories: categoriesParam,
            });
      const mapped: Complaint[] = (items as unknown as QueryComplaint[]).map(
        (c) => {
          const status = (c?.status as Complaint["status"]) || "Pending";
          const priority: Complaint["priority"] =
            c?.priority === "Low" ||
            c?.priority === "Medium" ||
            c?.priority === "High" ||
            c?.priority === "Critical"
              ? (c.priority as Complaint["priority"])
              : "Medium";
          const submittedAt = c.createdAt ?? c.submittedDate;
          const updatedAt = c.updatedAt ?? c.lastUpdated;
          return {
            id: String(c?._id || c?.id || ""),
            title: c?.title || "Untitled Complaint",
            description: c?.description || c?.shortDescription || "",
            category: c?.category || "",
            status,
            submittedBy:
              (c?.submittedBy && typeof c.submittedBy === "object"
                ? c?.submittedBy?.name || c?.submittedBy?.email
                : (c?.submittedBy as string)) || "Unknown",
            assignedStaff:
              effectiveRole === "dean" &&
              c &&
              typeof c === "object" &&
              (c as QueryComplaint).assignedTo
                ? (() => {
                    const at = (c as QueryComplaint).assignedTo;
                    if (typeof at === "object" && at) {
                      const name = (at as { name?: string }).name;
                      const role = (at as { role?: string }).role;
                      if (role && role.toLowerCase() === "hod") {
                        return name
                          ? `Assigned to HOD: ${name}`
                          : "Assigned to HOD";
                      }
                      return name ? `Assigned: ${name}` : "Assigned";
                    }
                    return "Assigned";
                  })()
                : user.fullName || user.name || "You",
            submittedDate: submittedAt ? new Date(submittedAt) : date,
            deadline: c?.deadline ? new Date(c.deadline) : undefined,
            lastUpdated: updatedAt ? new Date(updatedAt) : new Date(),
            priority,
            feedback: undefined,
            resolutionNote: undefined,
            evidenceFile: undefined,
            isEscalated: !!c?.isEscalated,
            submittedTo: (c?.submittedTo || undefined) as string | undefined,
            department: (c?.department || c?.category || undefined) as
              | string
              | undefined,
            sourceRole: (c?.sourceRole || undefined) as Complaint["sourceRole"],
            assignedByRole: (c?.assignedByRole ||
              undefined) as Complaint["assignedByRole"],
            assignmentPath: Array.isArray(c?.assignmentPath)
              ? (c.assignmentPath as string[])
              : undefined,
          } as Complaint;
        }
      );
      // Replace current selected day's events using a day range filter
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      setAllComplaints((prev) => {
        // Remove existing complaints for this day that match the current filters
        const keep = prev.filter((c) => {
          const compareDate =
            viewType === "submission" ? c.submittedDate : c.deadline;
          if (!compareDate) return true; // Keep complaints without dates
          // Use date-fns isSameDay for consistent comparison
          return !isSameDay(compareDate, date);
        });
        // Add the new complaints for this day (avoid duplicates by ID)
        const existingIds = new Set(keep.map((c) => c.id));
        const newComplaints = mapped.filter((c) => !existingIds.has(c.id));
        return [...keep, ...newComplaints];
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  // Filtering
  const filteredComplaints = useMemo(() => {
    return allComplaints.filter((complaint) => {
      const matchesStatus =
        statusFilter === "all" || complaint.status === statusFilter;
      const matchesPriority =
        priorityFilter === "all" || complaint.priority === priorityFilter;
      const matchesCategory =
        categoryFilter === "all" || complaint.category === categoryFilter;
      // Submission date range filter
      const sd = complaint.submittedDate;
      const submissionFromOk = !submissionFrom || (sd && sd >= submissionFrom);
      const submissionToOk = !submissionTo || (sd && sd <= submissionTo);
      const matchesSubmissionRange = submissionFromOk && submissionToOk;
      // Deadline date range filter
      const dl = complaint.deadline ?? null;
      const deadlineFromOk = !deadlineFrom || (dl && dl >= deadlineFrom);
      const deadlineToOk = !deadlineTo || (dl && dl <= deadlineTo);
      const matchesDeadlineRange = deadlineFromOk && deadlineToOk;
      return (
        matchesStatus &&
        matchesPriority &&
        matchesCategory &&
        matchesSubmissionRange &&
        matchesDeadlineRange
      );
    });
  }, [
    allComplaints,
    statusFilter,
    priorityFilter,
    categoryFilter,
    submissionFrom,
    submissionTo,
    deadlineFrom,
    deadlineTo,
  ]);

  const getComplaintsForDate = useCallback(
    (date: Date) => {
      return filteredComplaints.filter((complaint) => {
        const compareDate =
          viewType === "submission"
            ? complaint.submittedDate
            : complaint.deadline;
        return compareDate && isSameDay(compareDate, date);
      });
    },
    [filteredComplaints, viewType]
  );

  const getDateWithComplaints = useMemo(() => {
    const currentMonth = selectedDate;
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const dates = eachDayOfInterval({ start, end });

    return dates.filter((date) => getComplaintsForDate(date).length > 0);
  }, [selectedDate, getComplaintsForDate]);

  const selectedDateComplaints = useMemo(
    () => getComplaintsForDate(selectedDate),
    [getComplaintsForDate, selectedDate]
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Pending":
        return <Clock className="h-4 w-4" />;
      case "In Progress":
        return <AlertCircle className="h-4 w-4" />;
      case "Resolved":
        return <CheckCircle2 className="h-4 w-4" />;
      case "Closed":
        return <Users className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar View</h1>
          <p className="text-muted-foreground">
            View complaints by{" "}
            {viewType === "submission" ? "submission" : "deadline"} dates
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Calendar Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Select
                value={viewType}
                onValueChange={(value: "submission" | "deadline") =>
                  setViewType(value)
                }
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="submission">Submission Dates</SelectItem>
                  <SelectItem value="deadline">Deadline Dates</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>

              {effectiveRole === "admin" ? (
                <Select
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                >
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {adminCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                >
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {Array.from(
                      new Set(
                        allComplaints.map((c) => c.category).filter(Boolean)
                      )
                    ).map((cat) => (
                      <SelectItem key={cat as string} value={cat as string}>
                        {cat as string}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {format(selectedDate, "MMMM yyyy")} -{" "}
              {viewType === "submission" ? "Submission" : "Deadline"} Calendar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleSelectDate}
              className="w-full pointer-events-auto"
              modifiers={{ hasComplaints: getDateWithComplaints }}
              modifiersClassNames={{
                hasComplaints: "bg-primary text-primary-foreground rounded-md",
              }}
            />
            <div className="mt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-primary rounded"></div>
                <span>Days with complaints</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {format(selectedDate, "MMMM d, yyyy")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {selectedDateComplaints.length} complaint
              {selectedDateComplaints.length !== 1 ? "s" : ""}
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Loading...
              </div>
            ) : selectedDateComplaints.length === 0 ? (
              <div className="text-center py-8">
                <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No complaints on this date
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDateComplaints.map((complaint) => {
                  const isOverdue =
                    complaint.deadline &&
                    complaint.deadline < new Date() &&
                    complaint.status !== "Resolved" &&
                    complaint.status !== "Closed";
                  return (
                    <div
                      key={complaint.id}
                      onClick={() => {
                        setSelectedComplaint(complaint);
                        setModalOpen(true);
                      }}
                      className={`p-3 border-l-4 cursor-pointer hover:bg-accent/50 transition-colors ${
                        isOverdue
                          ? "border-red-500 bg-red-50 dark:bg-red-900/10"
                          : priorityColors[complaint.priority || "Low"]
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm leading-tight">
                            {complaint.title}
                          </p>
                          {isOverdue && (
                            <Badge className="bg-red-500 text-white text-xs">
                              Overdue
                            </Badge>
                          )}
                        </div>
                        <Badge
                          className={`${
                            statusColors[complaint.status]
                          } text-xs ml-2`}
                        >
                          {complaint.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {getStatusIcon(complaint.status)}
                        <span>{complaint.category}</span>
                        <span>•</span>
                        <span>{complaint.priority}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Assigned to: {complaint.assignedStaff || "Unassigned"}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Total This Month</p>
                <p className="text-2xl font-bold">
                  {effectiveRole === "admin" ||
                  effectiveRole === "dean" ||
                  effectiveRole === "hod"
                    ? summary.totalThisMonth
                    : filteredComplaints.filter((c) => {
                        const compareDate =
                          viewType === "submission"
                            ? c.submittedDate
                            : c.deadline;
                        return (
                          compareDate &&
                          compareDate.getMonth() === selectedDate.getMonth() &&
                          compareDate.getFullYear() ===
                            selectedDate.getFullYear()
                        );
                      }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm font-medium">Overdue</p>
                <p className="text-2xl font-bold text-destructive">
                  {effectiveRole === "admin" ||
                  effectiveRole === "dean" ||
                  effectiveRole === "hod"
                    ? summary.overdue
                    : filteredComplaints.filter(
                        (c) =>
                          c.deadline &&
                          c.deadline < new Date() &&
                          c.status !== "Resolved" &&
                          c.status !== "Closed"
                      ).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">Due Today</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {effectiveRole === "admin" ||
                  effectiveRole === "dean" ||
                  effectiveRole === "hod"
                    ? summary.dueToday
                    : filteredComplaints.filter(
                        (c) => c.deadline && isSameDay(c.deadline, new Date())
                      ).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <div>
                <p className="text-sm font-medium">Resolved This Month</p>
                <p className="text-2xl font-bold text-success">
                  {effectiveRole === "admin" ||
                  effectiveRole === "dean" ||
                  effectiveRole === "hod"
                    ? summary.resolvedThisMonth
                    : filteredComplaints.filter(
                        (c) =>
                          c.status === "Resolved" &&
                          c.submittedDate.getMonth() ===
                            selectedDate.getMonth() &&
                          c.submittedDate.getFullYear() ===
                            selectedDate.getFullYear()
                      ).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Removed admin breakdown cards (By Status / By Priority / By Category) per request */}

      <RoleBasedComplaintModal
        complaint={selectedComplaint}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onUpdate={(id, updates) => {
          setAllComplaints((prev) =>
            prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
          );
        }}
        fetchLatest={true}
      />
    </div>
  );
}
