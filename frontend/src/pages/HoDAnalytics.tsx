import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import {
  listMyDepartmentActiveStaffApi,
  hodGetUsersApi,
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
  const [totalStudents, setTotalStudents] = useState<number>(0);
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
          usersRes,
          statsRes,
          priorityRes,
          statusRes,
          categoryRes,
          monthlyRes,
          staffPerfRes,
        ] = await Promise.all([
          listMyDepartmentActiveStaffApi().catch(() => []),
          hodGetUsersApi().catch(() => []),
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
        // Department users (students + staff) – used to compute student count
        type DeptUser = { role?: string } & Record<string, unknown>;
        const usersArr: DeptUser[] = Array.isArray(usersRes) ? usersRes : [];
        // Count students (no role or explicit 'student')
        const studentsCount = usersArr.filter((u) => {
          if (!u) return false;
          const r = String((u.role as string) || "").toLowerCase();
          return !r || r === "student";
        }).length;
        setTotalStudents(studentsCount);

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
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 lg:space-y-8">
      <div className="space-y-2 md:space-y-3">
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight">
          HOD Analytics
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Analytics and statistics for your department's complaints, staff, and
          performance.
        </p>
      </div>

      {/* Top summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center space-x-2 md:space-x-3">
              <div className="bg-blue-50 p-1.5 md:p-2 rounded-lg dark:bg-blue-900/20 flex-shrink-0">
                <Users className="h-4 w-4 md:h-5 md:w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">
                  Total Students
                </p>
                <p className="text-lg md:text-2xl font-bold text-blue-600">
                  {totalStudents}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center space-x-2 md:space-x-3">
              <div className="bg-green-50 p-1.5 md:p-2 rounded-lg dark:bg-green-900/20 flex-shrink-0">
                <Users className="h-4 w-4 md:h-5 md:w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">
                  Total Staff
                </p>
                <p className="text-lg md:text-2xl font-bold text-green-600">
                  {staffPerformance.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center space-x-2 md:space-x-3">
              <div className="bg-orange-50 p-1.5 md:p-2 rounded-lg dark:bg-orange-900/20 flex-shrink-0">
                <FileText className="h-4 w-4 md:h-5 md:w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">
                  Total Complaints
                </p>
                <p className="text-lg md:text-2xl font-bold text-orange-600">
                  {complaintStats.total}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center space-x-2 md:space-x-3">
              <div className="bg-emerald-50 p-1.5 md:p-2 rounded-lg dark:bg-emerald-900/20 flex-shrink-0">
                <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">
                  Resolved Complaints
                </p>
                <p className="text-lg md:text-2xl font-bold text-emerald-600">
                  {complaintStats.resolved}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="p-3 md:p-6 pb-2 md:pb-4">
            <CardTitle className="text-base md:text-lg">
              Complaints by Category
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="h-48 md:h-64 lg:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  {(() => {
                    // Sort categories by count descending
                    const sorted = [...categoryData].sort(
                      (a, b) => b.count - a.count
                    );
                    const top4 = sorted.slice(0, 4);
                    const othersCount = sorted
                      .slice(4)
                      .reduce((sum, c) => sum + c.count, 0);
                    const pieData = [
                      ...top4.map((c) => ({
                        name: c.category,
                        count: c.count,
                      })),
                      ...(othersCount > 0
                        ? [{ name: "Others", count: othersCount }]
                        : []),
                    ];
                    return (
                      <Pie
                        data={pieData}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius="70%"
                        innerRadius="30%"
                        label={({ name, percent }) =>
                          percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ""
                        }
                        labelLine={false}
                      >
                        {pieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                    );
                  })()}
                  <Tooltip />
                  <Legend
                    wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="p-3 md:p-6 pb-2 md:pb-4">
            <CardTitle className="text-base md:text-lg">
              Complaints by Priority
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="h-48 md:h-64 lg:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={priorityData}
                  margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="priority"
                    fontSize={12}
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend
                    wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-bar-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status and Monthly Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="p-3 md:p-6 pb-2 md:pb-4">
            <CardTitle className="text-base md:text-lg">
              Complaints by Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="h-48 md:h-64 lg:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={statusData}
                  margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="status"
                    fontSize={12}
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend
                    wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                  />
                  <Bar dataKey="count" fill="#8884d8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="p-3 md:p-6 pb-2 md:pb-4">
            <CardTitle className="text-base md:text-lg">
              Monthly Complaint Trends
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="h-48 md:h-64 lg:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={monthlyTrendData}
                  margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    fontSize={12}
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend
                    wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="submitted"
                    stroke="#8884d8"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="resolved"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staff Performance Table */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="p-3 md:p-6 pb-2 md:pb-4">
          <CardTitle className="text-base md:text-lg">
            Staff Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-6 pt-0">
          <div className="space-y-3 md:space-y-4">
            {sortedStaff.length === 0 ? (
              <div className="text-center py-8 md:py-12 text-muted-foreground text-sm md:text-base">
                No staff performance data available
              </div>
            ) : (
              sortedStaff.map((staff, index) => (
                <div
                  key={staff.id}
                  className="p-3 md:p-4 border rounded-lg hover:shadow-sm transition-shadow bg-card"
                >
                  {/* Mobile Layout */}
                  <div className="block lg:hidden space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center bg-primary/10 rounded-full font-bold text-sm text-primary flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm md:text-base leading-tight line-clamp-2">
                          {staff.name}
                        </h3>
                        <p className="text-xs md:text-sm text-muted-foreground truncate">
                          {staff.department}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs flex-shrink-0 ${
                          staff.successRate >= 90
                            ? "border-green-500 text-green-700 dark:border-green-400 dark:text-green-400"
                            : staff.successRate >= 80
                            ? "border-yellow-500 text-yellow-700 dark:border-yellow-400 dark:text-yellow-400"
                            : "border-red-500 text-red-700 dark:border-red-400 dark:text-red-400"
                        }`}
                      >
                        {staff.successRate.toFixed(1)}%
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-2 bg-muted/50 rounded-md">
                        <div className="text-lg md:text-xl font-bold text-primary">
                          {staff.totalAssigned}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Total
                        </div>
                      </div>
                      <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-md">
                        <div className="text-lg md:text-xl font-bold text-green-600">
                          {staff.resolved}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Resolved
                        </div>
                      </div>
                      <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                        <div className="text-lg md:text-xl font-bold text-yellow-600">
                          {staff.pending}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Pending
                        </div>
                      </div>
                      <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                        <div className="text-lg md:text-xl font-bold text-blue-600">
                          {staff.inProgress}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          In Progress
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden lg:flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-[200px]">
                      <div className="w-8 h-8 flex items-center justify-center bg-primary/10 rounded-full font-bold text-lg text-primary">
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
                        <div className="text-xs text-muted-foreground">
                          Total
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">
                          {staff.resolved}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Resolved
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-yellow-600">
                          {staff.pending}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Pending
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">
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
                            ? "border-green-500 text-green-700"
                            : staff.successRate >= 80
                            ? "border-yellow-500 text-yellow-700"
                            : "border-red-500 text-red-700"
                        }
                      >
                        {staff.successRate.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
