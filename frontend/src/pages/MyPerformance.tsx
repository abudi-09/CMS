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
import { useEffect, useMemo, useState } from "react";
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
    const resolvedItems = assigned.filter(
      (c) => c.resolvedAt && c.submittedDate
    );
    if (resolvedItems.length === 0) return undefined;
    const sum = resolvedItems.reduce((acc, c) => {
      const end = new Date(c.resolvedAt as string).getTime();
      const start = new Date(c.submittedDate as string).getTime();
      return acc + Math.max(0, end - start);
    }, 0);
    return Math.floor(sum / resolvedItems.length);
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
      if (!c.resolvedAt) continue;
      const d = new Date(c.resolvedAt as string);
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
  const timelinessScore = undefined as number | undefined;

  const recentActivity = assigned.slice(0, 10).map((c) => {
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
    const rating =
      typeof c.feedback?.rating === "number"
        ? c.feedback.rating
        : feedbackMap[c.id] ?? null;
    return {
      id: c.id,
      title: c.title,
      status: c.status,
      dateAssigned,
      dateResolved,
      rating,
    };
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Activity className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold">My Performance Dashboard</h1>
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Assigned
            </CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "-" : totalAssigned}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Resolved
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {loading ? "-" : totalResolved}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {loading ? "-" : totalPending}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Resolution
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "-" : formatDuration(avgResolutionMs)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {averageRating ? `${averageRating}/5` : "-"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Timeliness</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {typeof timelinessScore === "number"
                ? `${timelinessScore}%`
                : "-"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Complaints by Category (placeholder) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Complaints by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Resolution Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {recentActivity.map((c, idx) => (
              <Card key={`${c.id}-${idx}`} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="text-sm font-semibold">{c.title}</div>
                  <Badge
                    className={
                      c.status === "Resolved"
                        ? "bg-green-100 text-green-800"
                        : "bg-orange-100 text-orange-800"
                    }
                  >
                    {c.status}
                  </Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Assigned:</span>
                    <span className="ml-1 font-medium">{c.dateAssigned}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Resolved:</span>
                    <span className="ml-1 font-medium">{c.dateResolved}</span>
                  </div>
                </div>
                <div className="mt-2 text-xs">
                  <span className="text-muted-foreground">Rating:</span>
                  {c.rating ? (
                    <span className="ml-1 inline-flex items-center gap-1 font-medium">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      {c.rating}
                    </span>
                  ) : (
                    <span className="ml-1 text-muted-foreground">-</span>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date Assigned</TableHead>
                  <TableHead>Date Resolved</TableHead>
                  <TableHead>Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivity.map((complaint, idx) => (
                  <TableRow
                    key={`${complaint.id}-${idx}`}
                    className="hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">
                      {complaint.title}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          complaint.status === "Resolved"
                            ? "bg-green-100 text-green-800"
                            : "bg-orange-100 text-orange-800"
                        }
                      >
                        {complaint.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{complaint.dateAssigned}</TableCell>
                    <TableCell>{complaint.dateResolved}</TableCell>
                    <TableCell>
                      {complaint.rating ? (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span>{complaint.rating}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
