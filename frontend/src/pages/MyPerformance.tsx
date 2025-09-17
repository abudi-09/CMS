import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  TrendingUp,
  Calendar,
  Star,
  Target,
  Activity,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";
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
  AssignedComplaintLite,
  StaffStats,
  getFeedbackByRoleApi,
  getMyStaffStatsApi,
  listMyAssignedComplaintsApi,
} from "@/lib/api";

function formatDuration(ms: number | undefined): string {
  if (!ms || ms <= 0) return "-";
  const d = Math.floor(ms / (24 * 3600_000));
  const h = Math.floor((ms % (24 * 3600_000)) / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function MyPerformance() {
  const [stats, setStats] = useState<StaffStats | null>(null);
  const [assigned, setAssigned] = useState<AssignedComplaintLite[]>([]);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, number | null>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [assigned]);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [s, a, fb] = await Promise.all([
          getMyStaffStatsApi(),
          listMyAssignedComplaintsApi(),
          getFeedbackByRoleApi().catch(() => []),
        ]);
        if (cancelled) return;
        setStats(s);
        const sorted = [...a].sort((x, y) => {
          const lx = x.lastUpdated ? new Date(x.lastUpdated).getTime() : 0;
          const ly = y.lastUpdated ? new Date(y.lastUpdated).getTime() : 0;
          return ly - lx;
        });
        setAssigned(sorted);
        const map: Record<string, number | null> = {};
        for (const item of fb as Array<{
          complaintId: string;
          feedback?: { rating?: number };
        }>) {
          if (item && typeof item.complaintId === "string") {
            const r = item.feedback?.rating;
            if (typeof r === "number") map[item.complaintId] = r;
          }
        }
        setFeedbackMap(map);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const averageRating = useMemo(() => {
    const values = Object.values(feedbackMap).filter(
      (v): v is number => typeof v === "number"
    );
    if (values.length === 0) return null;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return Math.round(avg * 10) / 10;
  }, [feedbackMap]);

  const avgResolutionMs = useMemo(() => {
    const candidates = assigned.filter(
      (c) =>
        c.submittedDate &&
        (c.resolvedAt || (c.status === "Resolved" && c.lastUpdated))
    );
    if (candidates.length === 0) return undefined;
    const sum = candidates.reduce((acc, c) => {
      const start = new Date(c.submittedDate as string).getTime();
      const end = c.resolvedAt
        ? new Date(c.resolvedAt as string).getTime()
        : new Date(c.lastUpdated as string).getTime();
      return acc + Math.max(0, end - start);
    }, 0);
    return Math.floor(sum / candidates.length);
  }, [assigned]);

  // Timeliness: % of resolved complaints finished on/before their deadline.
  // If there's no deadline, optionally compare against a default SLA (e.g., 72h) or skip.
  const timelinessScore = useMemo(() => {
    const defaultSlaMs = 72 * 3600_000; // 72 hours fallback SLA when no explicit deadline
    let considered = 0;
    let onTime = 0;
    for (const c of assigned) {
      const isResolved =
        c.resolvedAt || (c.status === "Resolved" && c.lastUpdated);
      if (!isResolved) continue; // only resolved contribute
      const start = c.submittedDate
        ? new Date(c.submittedDate as string).getTime()
        : undefined;
      const end = c.resolvedAt
        ? new Date(c.resolvedAt as string).getTime()
        : new Date(c.lastUpdated as string).getTime();
      if (!start) continue;
      considered++;
      if (c.deadline) {
        const dl = new Date(c.deadline as string).getTime();
        if (end <= dl) onTime++;
      } else {
        // Use default SLA window from submitted date
        if (end - start <= defaultSlaMs) onTime++;
      }
    }
    if (considered === 0) return undefined;
    return Math.round((onTime / considered) * 100);
  }, [assigned]);

  const statusData = useMemo(() => {
    const resolved = stats?.resolved ?? 0;
    const inProgress = stats?.inProgress ?? 0;
    const pending = stats?.pending ?? 0;
    return [
      { name: "Resolved", value: resolved, color: "#10b981" },
      { name: "In Progress", value: inProgress, color: "#f59e0b" },
      { name: "Pending", value: pending, color: "#3b82f6" },
    ];
  }, [stats]);

  const trendData = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of assigned) {
      // Count as resolved when explicit resolvedAt exists OR status is Resolved (fallback to lastUpdated)
      const resolvedDateStr = (c.resolvedAt ??
        (c.status === "Resolved" ? c.lastUpdated : null)) as string | null;
      if (!resolvedDateStr) continue;
      const d = new Date(resolvedDateStr);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    const now = new Date();
    const series: Array<{ month: string; resolved: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      series.push({
        month: dt.toLocaleString(undefined, { month: "short" }),
        resolved: map.get(key) ?? 0,
      });
    }
    return series;
  }, [assigned]);

  const categoryData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of assigned) {
      const key = (c.category || "Uncategorized").toString();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const palette = [
      "#8884d8",
      "#82ca9d",
      "#ffc658",
      "#ff7300",
      "#00C49F",
      "#FFBB28",
      "#3b82f6",
      "#f59e0b",
      "#10b981",
      "#ef4444",
    ];
    return Array.from(counts.entries()).map(([name, value], idx) => ({
      name,
      value,
      color: palette[idx % palette.length],
    }));
  }, [assigned]);

  const totalAssigned = stats?.assigned ?? 0;
  const totalResolved = stats?.resolved ?? 0;
  const totalPending = stats?.pending ?? 0;

  const recentActivity = useMemo(() => {
    const pageSize = 5;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return assigned.slice(startIndex, endIndex).map((c) => {
      const dateAssigned = c.assignedAt
        ? new Date(c.assignedAt).toLocaleDateString()
        : "-";
      let dateResolved = "-";
      if (c.resolvedAt) {
        dateResolved = new Date(c.resolvedAt).toLocaleDateString();
      } else if (c.status === "Resolved" && c.lastUpdated) {
        // Fallback in case status is Resolved but resolvedAt wasn't populated
        dateResolved = new Date(c.lastUpdated).toLocaleDateString();
      }
      const rating = (() => {
        const maybe = c.feedback as { rating?: number } | null | undefined;
        if (maybe && typeof maybe.rating === "number") return maybe.rating;
        const m = feedbackMap[c.id];
        return typeof m === "number" ? m : null;
      })();
      return {
        id: c.id,
        title: c.title,
        status: c.status,
        dateAssigned,
        dateResolved,
        rating,
      };
    });
  }, [assigned, currentPage, feedbackMap]);

  const totalPages = Math.ceil(assigned.length / 5);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center gap-2 mb-4 md:mb-6">
        <Activity className="h-5 w-5 md:h-6 md:w-6 text-primary" />
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold">
          My Performance Dashboard
        </h1>
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium">
              Total Assigned
            </CardTitle>
            <div className="bg-blue-50 p-1.5 md:p-2 rounded-lg dark:bg-blue-900/20 flex-shrink-0">
              <User className="h-3 w-3 md:h-4 md:w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="text-lg md:text-2xl font-bold">
              {loading ? "-" : totalAssigned}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total complaints assigned
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium">
              Total Resolved
            </CardTitle>
            <div className="bg-green-50 p-1.5 md:p-2 rounded-lg dark:bg-green-900/20 flex-shrink-0">
              <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="text-lg md:text-2xl font-bold text-green-600">
              {loading ? "-" : totalResolved}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Successfully completed
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium">
              Pending
            </CardTitle>
            <div className="bg-orange-50 p-1.5 md:p-2 rounded-lg dark:bg-orange-900/20 flex-shrink-0">
              <AlertCircle className="h-3 w-3 md:h-4 md:w-4 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="text-lg md:text-2xl font-bold text-orange-600">
              {loading ? "-" : totalPending}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting resolution
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium">
              Avg Resolution
            </CardTitle>
            <div className="bg-purple-50 p-1.5 md:p-2 rounded-lg dark:bg-purple-900/20 flex-shrink-0">
              <Clock className="h-3 w-3 md:h-4 md:w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="text-lg md:text-2xl font-bold">
              {loading ? "-" : formatDuration(avgResolutionMs)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Average time to resolve
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium">
              Avg Rating
            </CardTitle>
            <div className="bg-yellow-50 p-1.5 md:p-2 rounded-lg dark:bg-yellow-900/20 flex-shrink-0">
              <Star className="h-3 w-3 md:h-4 md:w-4 text-yellow-600 dark:text-yellow-400" />
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="text-lg md:text-2xl font-bold text-yellow-600">
              {averageRating ? `${averageRating}/5` : "-"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Customer satisfaction
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium">
              Timeliness
            </CardTitle>
            <div className="bg-indigo-50 p-1.5 md:p-2 rounded-lg dark:bg-indigo-900/20 flex-shrink-0">
              <Target className="h-3 w-3 md:h-4 md:w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="text-lg md:text-2xl font-bold text-blue-600">
              {typeof timelinessScore === "number"
                ? `${timelinessScore}%`
                : "-"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              On-time resolution rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Visual Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Complaints by Category */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="p-3 md:p-6">
            <CardTitle className="flex items-center gap-2 text-sm md:text-base">
              <BarChart3 className="h-4 w-4 md:h-5 md:w-5" />
              Complaints by Category
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <ResponsiveContainer
              width="100%"
              height={180}
              className="text-xs md:text-sm"
            >
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={60}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-cat-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Resolution Trend */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="p-3 md:p-6">
            <CardTitle className="flex items-center gap-2 text-sm md:text-base">
              <TrendingUp className="h-4 w-4 md:h-5 md:w-5" />
              Resolution Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <ResponsiveContainer
              width="100%"
              height={180}
              className="text-xs md:text-sm"
            >
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="resolved"
                  stroke="#8884d8"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card className="hover:shadow-md transition-shadow md:col-span-2 lg:col-span-1">
          <CardHeader className="p-3 md:p-6">
            <CardTitle className="flex items-center gap-2 text-sm md:text-base">
              <Calendar className="h-4 w-4 md:h-5 md:w-5" />
              Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <ResponsiveContainer
              width="100%"
              height={180}
              className="text-xs md:text-sm"
            >
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={65}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity - Responsive (cards on mobile, table on desktop) */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Activity className="h-4 w-4 md:h-5 md:w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-6 pt-0">
          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {recentActivity.map((c, idx) => (
              <Card
                key={`${c.id}-${idx}`}
                className="p-3 md:p-4 hover:shadow-sm transition-shadow"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm md:text-base leading-tight line-clamp-2">
                        {c.title}
                      </h3>
                    </div>
                    <Badge
                      className={`text-xs px-2 py-1 flex-shrink-0 ${
                        c.status === "Resolved"
                          ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400"
                          : "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400"
                      }`}
                    >
                      {c.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs md:text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Assigned:</span>
                      <span className="font-medium truncate">
                        {c.dateAssigned}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Resolved:</span>
                      <span className="font-medium truncate">
                        {c.dateResolved}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs md:text-sm">
                    <span className="text-muted-foreground">Rating:</span>
                    {c.rating ? (
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 md:h-4 md:w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{c.rating}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-sm font-medium">Title</TableHead>
                  <TableHead className="text-sm font-medium">Status</TableHead>
                  <TableHead className="text-sm font-medium">
                    Date Assigned
                  </TableHead>
                  <TableHead className="text-sm font-medium">
                    Date Resolved
                  </TableHead>
                  <TableHead className="text-sm font-medium">Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivity.map((complaint, idx) => (
                  <TableRow
                    key={`${complaint.id}-${idx}`}
                    className="hover:bg-muted/50"
                  >
                    <TableCell className="font-medium text-sm max-w-xs">
                      <div className="truncate" title={complaint.title}>
                        {complaint.title}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`text-xs ${
                          complaint.status === "Resolved"
                            ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400"
                            : "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400"
                        }`}
                      >
                        {complaint.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {complaint.dateAssigned}
                    </TableCell>
                    <TableCell className="text-sm">
                      {complaint.dateResolved}
                    </TableCell>
                    <TableCell>
                      {complaint.rating ? (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">
                            {complaint.rating}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-4 md:mt-6 px-2 md:px-0">
              <Pagination>
                <PaginationContent className="flex-wrap gap-1 md:gap-2 justify-center">
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() =>
                        setCurrentPage(Math.max(1, currentPage - 1))
                      }
                      className={`h-9 md:h-10 px-2 md:px-3 text-sm touch-manipulation ${
                        currentPage === 1
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }`}
                    />
                  </PaginationItem>

                  {/* Mobile: Show current page and total pages */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground lg:hidden">
                    <span>
                      Page {currentPage} of {totalPages}
                    </span>
                  </div>

                  {/* Desktop: Show page numbers */}
                  <div className="hidden lg:flex lg:items-center lg:gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="h-9 md:h-10 px-2 md:px-3 text-sm cursor-pointer touch-manipulation"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    )}
                  </div>

                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        setCurrentPage(Math.min(totalPages, currentPage + 1))
                      }
                      className={`h-9 md:h-10 px-2 md:px-3 text-sm touch-manipulation ${
                        currentPage === totalPages
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }`}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
