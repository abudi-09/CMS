import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  TrendingUp,
  Clock,
  Star,
  Users,
  CheckCircle,
  AlertTriangle,
  FileText,
  Calendar,
  Award,
} from "lucide-react";
import {
  getDeanVisibleComplaintStatsApi,
  listAllComplaintsApi,
  getStudentCountApi,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// Mock data for charts (Dean-specific or filtered for department)
const categoryData = [
  { name: "IT Support", value: 12, count: 15 },
  { name: "Academic", value: 8, count: 10 },
  { name: "Facility", value: 6, count: 8 },
  { name: "Finance", value: 4, count: 5 },
];

const priorityData = [
  { priority: "Critical", count: 2, color: "#ef4444" },
  { priority: "High", count: 6, color: "#f97316" },
  { priority: "Medium", count: 10, color: "#eab308" },
  { priority: "Low", count: 13, color: "#22c55e" },
];

const statusData = [
  { status: "Pending", count: 5 },
  { status: "In Progress", count: 8 },
  { status: "Resolved", count: 18 },
  { status: "Rejected", count: 2 },
];

const monthlyTrendData = [
  { month: "Jan", submitted: 10, resolved: 8 },
  { month: "Feb", submitted: 12, resolved: 10 },
  { month: "Mar", submitted: 11, resolved: 12 },
  { month: "Apr", submitted: 14, resolved: 11 },
  { month: "May", submitted: 13, resolved: 14 },
  { month: "Jun", submitted: 15, resolved: 13 },
];

const staffPerformance = [
  {
    id: "1",
    name: "Dr. Alice Carter",
    department: "Computer Science",
    totalAssigned: 20,
    resolved: 18,
    pending: 1,
    inProgress: 1,
    successRate: 90.0,
  },
  {
    id: "2",
    name: "Dr. Bob Lee",
    department: "Information System",
    totalAssigned: 15,
    resolved: 13,
    pending: 1,
    inProgress: 1,
    successRate: 86.7,
  },
  {
    id: "3",
    name: "Dr. Carol Smith",
    department: "Information Science",
    totalAssigned: 12,
    resolved: 10,
    pending: 1,
    inProgress: 1,
    successRate: 83.3,
  },
  {
    id: "4",
    name: "Dr. David Kim",
    department: "Information Technology",
    totalAssigned: 18,
    resolved: 16,
    pending: 1,
    inProgress: 1,
    successRate: 88.9,
  },
];

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#8dd1e1"];

export default function DeanAnalytics() {
  const { toast } = useToast();
  const [timeframe, setTimeframe] = useState("all");
  const [sortBy, setSortBy] = useState("successRate");

  // Backend data
  const [summary, setSummary] = useState<{
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
    unassigned: number;
  } | null>(null);
  const [complaints, setComplaints] = useState<
    Array<{
      id: string;
      title: string;
      status: string;
      department?: string | null;
      category?: string | null;
      priority?: "Low" | "Medium" | "High" | "Critical" | string;
      submittedDate?: string | Date | null;
      resolvedAt?: string | Date | null;
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [stats, all, studentsResp] = await Promise.all([
          getDeanVisibleComplaintStatsApi().catch((e) => {
            throw new Error(
              e instanceof Error ? e.message : "Failed to fetch dean stats"
            );
          }),
          listAllComplaintsApi().catch((e) => {
            throw new Error(
              e instanceof Error ? e.message : "Failed to fetch complaints"
            );
          }),
          getStudentCountApi().catch(() => ({ students: null })),
        ]);
        if (cancelled) return;
        setSummary(stats);
        setComplaints(all);
        setTotalStudents(
          typeof studentsResp?.students === "number"
            ? studentsResp.students
            : null
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        toast({
          variant: "destructive",
          title: "Analytics error",
          description: msg,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  // Compute datasets
  const [totalStudents, setTotalStudents] = useState<number | null>(null);
  const totalDepartments = useMemo(() => {
    const set = new Set(
      (complaints || []).map((c) => String(c.department || "")).filter(Boolean)
    );
    return set.size;
  }, [complaints]);

  const categoryDataDyn = useMemo(() => {
    const map = new Map<string, number>();
    complaints.forEach((c) => {
      const key = c.category || "Unknown";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [complaints]);

  // Hover-only interaction; no selection state needed

  const priorityDataDyn = useMemo(() => {
    const palette: Record<string, string> = {
      Critical: "#ef4444",
      High: "#f97316",
      Medium: "#eab308",
      Low: "#22c55e",
    };
    const map = new Map<string, number>();
    complaints.forEach((c) => {
      const p = (c.priority as string) || "Medium";
      map.set(p, (map.get(p) || 0) + 1);
    });
    return Array.from(map.entries()).map(([priority, count]) => ({
      priority,
      count,
      color: palette[priority] || "#8884d8",
    }));
  }, [complaints]);

  const statusDataDyn = useMemo(() => {
    const statuses = ["Pending", "In Progress", "Resolved", "Closed"] as const;
    const counts: Record<string, number> = {};
    statuses.forEach((s) => (counts[s] = 0));
    complaints.forEach((c) => (counts[c.status] = (counts[c.status] || 0) + 1));
    return statuses
      .filter((s) => counts[s] > 0)
      .map((s) => ({ status: s, count: counts[s] }));
  }, [complaints]);

  const monthlyTrendDataDyn = useMemo(() => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const submittedCounts = new Array(12).fill(0);
    const resolvedCounts = new Array(12).fill(0);
    complaints.forEach((c) => {
      const sub = c.submittedDate ? new Date(c.submittedDate as string) : null;
      if (sub && !isNaN(sub.getTime())) {
        submittedCounts[sub.getMonth()] += 1;
      }
      const res = c.resolvedAt ? new Date(c.resolvedAt as string) : null;
      if (res && !isNaN(res.getTime())) {
        resolvedCounts[res.getMonth()] += 1;
      }
    });
    return months.map((month, i) => ({
      month,
      submitted: submittedCounts[i],
      resolved: resolvedCounts[i],
    }));
  }, [complaints]);

  // Placeholder staff table derived from complaints if needed later
  const sortedStaff = staffPerformance; // keep mock until we add staff aggregation

  // No selected state for hover-only tooltips

  return (
    <div className="space-y-8 p-6">
      <h1 className="text-3xl font-bold mb-2">Dean Analytics</h1>
      <p className="text-muted-foreground mb-6">
        Analytics and statistics for All department's complaints and department
        performance.
      </p>

      {/* Top summary cards (wired to backend where possible) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <Users className="h-8 w-8 text-primary mb-2" />
            <span className="text-2xl font-bold">{totalStudents ?? "—"}</span>
            <span className="text-muted-foreground">Total Students</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <Users className="h-8 w-8 text-primary mb-2" />
            <span className="text-2xl font-bold">{totalDepartments}</span>
            <span className="text-muted-foreground">Total departments</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <FileText className="h-8 w-8 text-primary mb-2" />
            <span className="text-2xl font-bold">
              {summary?.total ?? (loading ? "…" : complaints.length)}
            </span>
            <span className="text-muted-foreground">Total Complaints</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <CheckCircle className="h-8 w-8 text-green-600 mb-2" />
            <span className="text-2xl font-bold">{summary?.resolved ?? 0}</span>
            <span className="text-muted-foreground">Resolved Complaints</span>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Complaints by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categoryDataDyn}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  // Hide labels by default; reveal name on click via center text
                  label={false}
                >
                  {categoryDataDyn.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                {/* Show names on hover via default tooltip; keep legend hidden */}
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Complaints by Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={priorityDataDyn}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="priority" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count">
                  {priorityDataDyn.map((entry, index) => (
                    <Cell key={`cell-bar-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Status and Monthly Trends */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Complaints by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={statusDataDyn}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Monthly Complaint Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyTrendDataDyn}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="submitted" stroke="#8884d8" />
                <Line type="monotone" dataKey="resolved" stroke="#22c55e" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Department Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Department Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedStaff.map((staff, index) => (
              <div
                key={staff.id}
                className="flex flex-col md:flex-row items-center justify-between gap-4 border-b pb-4"
              >
                <div className="flex items-center gap-4 min-w-[200px]">
                  <div className="w-8 h-8 flex items-center justify-center font-bold text-lg">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold">{staff.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {staff.department}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-lg font-bold">
                      {staff.totalAssigned}
                    </div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-success">
                      {staff.resolved}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Resolved
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-warning">
                      {staff.pending}
                    </div>
                    <div className="text-xs text-muted-foreground">Pending</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-info">
                      {staff.inProgress}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      In Progress
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      staff.successRate >= 90
                        ? "border-success text-success"
                        : staff.successRate >= 80
                        ? "border-warning text-warning"
                        : "border-destructive text-destructive"
                    }
                  >
                    {staff.successRate.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
