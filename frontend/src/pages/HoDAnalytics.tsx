import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import {
  listMyDepartmentActiveStaffApi,
  getHodComplaintStatsApi,
  getHodPriorityDistributionApi,
  getHodStatusDistributionApi,
  getHodCategoryDistributionApi,
  getHodMonthlyTrendsApi,
  getHodStaffPerformanceApi,
} from "@/lib/api";
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

// Dynamic datasets (fetched)
interface CategoryDatum {
  category: string;
  count: number;
}
interface PriorityDatum {
  priority: string;
  count: number;
  color?: string;
}
interface StatusDatum {
  status: string;
  count: number;
}
interface MonthlyTrend {
  month: string;
  year: number;
  submitted: number;
  resolved: number;
}

// typed staff perf items for HOD view
type StaffPerfItem = {
  id: string;
  name: string;
  department?: string;
  totalAssigned: number;
  resolved: number;
  pending: number;
  inProgress: number;
  successRate: number;
};

const initialStaffPerformance: StaffPerfItem[] = [];

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#8dd1e1"];

// Monthly complaint trends mock data
// helper colors
const PRIORITY_COLORS: Record<string, string> = {
  Critical: "#ef4444",
  High: "#f97316",
  Medium: "#eab308",
  Low: "#22c55e",
};

export default function HoDAnalytics() {
  const [timeframe, setTimeframe] = useState("all");
  const [sortBy, setSortBy] = useState("successRate");
  const [staffPerformance, setStaffPerformance] = useState(
    initialStaffPerformance
  );
  const [complaintStats, setComplaintStats] = useState({
    total: 0,
    resolved: 0,
  });
  const [categoryData, setCategoryData] = useState<CategoryDatum[]>([]);
  const [priorityData, setPriorityData] = useState<PriorityDatum[]>([]);
  const [statusData, setStatusData] = useState<StatusDatum[]>([]);
  const [monthlyTrendData, setMonthlyTrendData] = useState<MonthlyTrend[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const [
          staffRes,
          statsRes,
          priorityRes,
          statusRes,
          categoryRes,
          monthlyRes,
          staffPerfRes,
        ] = await Promise.all([
          listMyDepartmentActiveStaffApi().catch(() => []),
          getHodComplaintStatsApi().catch(() => null),
          getHodPriorityDistributionApi().catch(() => null),
          getHodStatusDistributionApi().catch(() => null),
          getHodCategoryDistributionApi().catch(() => null),
          getHodMonthlyTrendsApi(6).catch(() => null),
          getHodStaffPerformanceApi().catch(() => null),
        ]);

        if (cancelled) return;

        // Staff list baseline for fallback ordering
        const staffArr = Array.isArray(staffRes) ? staffRes : [];

        // Staff performance aggregated results
        if (staffPerfRes && typeof staffPerfRes === "object") {
          interface RawStaffPerf {
            staffId?: string;
            _id?: string;
            name?: string;
            email?: string;
            department?: string;
            totalAssigned?: number;
            pending?: number;
            inProgress?: number;
            resolved?: number;
            successRate?: number;
          }
          const arr = (staffPerfRes as { staff?: RawStaffPerf[] }).staff || [];
          setStaffPerformance(
            arr.map((r: RawStaffPerf) => ({
              id: String(r.staffId || r._id || r.email || ""),
              name: String(r.name || r.email || "Unknown"),
              department: String(r.department || ""),
              totalAssigned: Number(r.totalAssigned ?? 0),
              resolved: Number(r.resolved ?? 0),
              pending: Number(r.pending ?? 0),
              inProgress: Number(r.inProgress ?? 0),
              successRate: Number(r.successRate ?? 0),
            }))
          );
        } else {
          // fallback zeros if aggregation missing
          setStaffPerformance(
            staffArr.map((raw: Record<string, unknown>, idx: number) => {
              interface StaffLite {
                _id?: string;
                id?: string;
                email?: string;
                name?: string;
                fullName?: string;
                department?: string;
              }
              const s = raw as StaffLite;
              return {
                id: String(s._id || s.id || s.email || `dept-${idx}`),
                name: String(s.fullName || s.name || s.email || "Unknown"),
                department: String(s.department || ""),
                totalAssigned: 0,
                resolved: 0,
                pending: 0,
                inProgress: 0,
                successRate: 0,
              };
            })
          );
        }

        if (statsRes && typeof statsRes === "object") {
          setComplaintStats({
            total: Number((statsRes as { total?: number }).total || 0),
            resolved: Number((statsRes as { resolved?: number }).resolved || 0),
          });
        }
        if (priorityRes && typeof priorityRes === "object") {
          type RawPriority = { priority?: string; count?: number };
          const pArr =
            (priorityRes as { priorities?: RawPriority[] }).priorities || [];
          setPriorityData(
            pArr.map((p: RawPriority) => ({
              priority: String(p.priority || "Unknown"),
              count: Number(p.count || 0),
              color: PRIORITY_COLORS[String(p.priority || "")] || "#8884d8",
            }))
          );
        }
        if (statusRes && typeof statusRes === "object") {
          type RawStatus = { status?: string; count?: number };
          const sArr = (statusRes as { statuses?: RawStatus[] }).statuses || [];
          setStatusData(
            sArr.map((s: RawStatus) => ({
              status: String(s.status || "Unknown"),
              count: Number(s.count || 0),
            }))
          );
        }
        if (categoryRes && typeof categoryRes === "object") {
          type RawCategory = { category?: string; count?: number };
          const cArr =
            (categoryRes as { categories?: RawCategory[] }).categories || [];
          setCategoryData(
            cArr.map((c: RawCategory) => ({
              category: String(c.category || "Unknown"),
              count: Number(c.count || 0),
            }))
          );
        }
        if (monthlyRes && typeof monthlyRes === "object") {
          setMonthlyTrendData(
            (monthlyRes as { data?: MonthlyTrend[] }).data || []
          );
        }
      } catch (e) {
        console.error("Failed to fetch HOD analytics", e);
      }
    }
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [user?.department]);

  const sortedStaff = [...staffPerformance].sort((a, b) => {
    if (sortBy === "successRate") return b.successRate - a.successRate;
    if (sortBy === "resolved") return b.resolved - a.resolved;
    return b.totalAssigned - a.totalAssigned;
  });
  return (
    <div className="space-y-8 p-6">
      <h1 className="text-3xl font-bold mb-2">HOD Analytics</h1>
      <p className="text-muted-foreground mb-6">
        Analytics and statistics for your department's complaints, staff, and
        performance.
      </p>

      {/* Top summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <Users className="h-8 w-8 text-primary mb-2" />
            <span className="text-2xl font-bold">{complaintStats.total}</span>
            <span className="text-muted-foreground">Total Students</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <Users className="h-8 w-8 text-primary mb-2" />
            <span className="text-2xl font-bold">
              {staffPerformance.length}
            </span>
            <span className="text-muted-foreground">Total Staff</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <FileText className="h-8 w-8 text-primary mb-2" />
            <span className="text-2xl font-bold">{complaintStats.total}</span>
            <span className="text-muted-foreground">Total Complaints</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <CheckCircle className="h-8 w-8 text-green-600 mb-2" />
            <span className="text-2xl font-bold">
              {complaintStats.resolved}
            </span>
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
                  data={categoryData.map((c) => ({
                    name: c.category,
                    count: c.count,
                  }))}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {categoryData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
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
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="priority" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count">
                  {priorityData.map((entry, index) => (
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
              <BarChart data={statusData}>
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
              <LineChart data={monthlyTrendData}>
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

      {/* Staff Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Performance</CardTitle>
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
