import { useState, useEffect } from "react";
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
  Sector,
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
  getAdminDepartmentPerformanceApi,
  getAdminPriorityDistributionApi,
  getAdminStatusDistributionApi,
  getAdminMonthlyTrendsApi,
  getCategoryCountsApi,
  getAllUsersApi,
  getAdminAnalyticsSummaryApi,
} from "@/lib/api";

// Mock data for charts (used as initial fallbacks)
const categoryData = [
  { name: "IT Support", value: 35, count: 45 },
  { name: "Academic", value: 28, count: 36 },
  { name: "Facility", value: 22, count: 28 },
  { name: "Finance", value: 15, count: 19 },
];

const priorityData = [
  { priority: "Critical", count: 8, color: "#ef4444" },
  { priority: "High", count: 22, color: "#f97316" },
  { priority: "Medium", count: 45, color: "#eab308" },
  { priority: "Low", count: 53, color: "#22c55e" },
];

const statusData = [
  { status: "Pending", count: 25 },
  { status: "In Progress", count: 42 },
  { status: "Resolved", count: 89 },
  { status: "Rejected", count: 12 },
];

const monthlyTrendData = [
  { month: "Jan", submitted: 45, resolved: 38 },
  { month: "Feb", submitted: 52, resolved: 45 },
  { month: "Mar", submitted: 48, resolved: 51 },
  { month: "Apr", submitted: 61, resolved: 49 },
  { month: "May", submitted: 55, resolved: 58 },
  { month: "Jun", submitted: 67, resolved: 62 },
];

// Department performance mock data (fallback)
const departmentPerformance = [
  {
    department: "Computer Science",
    staff: ["Dr. Sarah Johnson", "Dr. Alan Turing"],
    totalAssigned: 60,
    resolved: 55,
    pending: 3,
    inProgress: 2,
    successRate: 91.7,
  },
  {
    department: "IT",
    staff: ["Ms. Emily Davis", "Mr. Steve Jobs"],
    totalAssigned: 50,
    resolved: 47,
    pending: 2,
    inProgress: 1,
    successRate: 94.0,
  },
  {
    department: "Information System",
    staff: ["Prof. Michael Chen", "Ms. Ada Lovelace"],
    totalAssigned: 40,
    resolved: 36,
    pending: 2,
    inProgress: 2,
    successRate: 90.0,
  },
  {
    department: "Information Science",
    staff: ["Mr. James Wilson", "Ms. Grace Hopper"],
    totalAssigned: 35,
    resolved: 30,
    pending: 3,
    inProgress: 2,
    successRate: 85.7,
  },
];

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#8dd1e1"];

type DeptPerf = {
  department: string;
  totalAssigned: number;
  resolved: number;
  pending: number;
  inProgress: number;
  successRate?: number;
  staffCount?: number;
};

export default function AdminAnalytics() {
  const [timeframe, setTimeframe] = useState("all");

  const [categoryDataState, setCategoryDataState] = useState(categoryData);
  const [priorityDataState, setPriorityDataState] = useState(priorityData);
  const [statusDataState, setStatusDataState] = useState(statusData);
  const [monthlyTrendState, setMonthlyTrendState] = useState(monthlyTrendData);
  const [deptPerfState, setDeptPerfState] = useState<DeptPerf[]>(
    departmentPerformance as DeptPerf[]
  );
  const [deptPieState, setDeptPieState] = useState([
    { name: "Computer Science", value: 35, count: 45 },
    { name: "IT", value: 28, count: 36 },
    { name: "Information System", value: 22, count: 28 },
    { name: "Information Science", value: 15, count: 19 },
    { name: "Others", value: 0, count: 0 },
  ]);
  const [summary, setSummary] = useState({
    resolutionRate: 89.2,
    avgResolutionTime: 3.2,
    userSatisfaction: 4.6,
    totalReviews: 156,
  });
  const [roleCountsByDept, setRoleCountsByDept] = useState(
    {} as Record<
      string,
      { students: number; staff: number; hods: number; deans: number }
    >
  );
  const [loading, setLoading] = useState(false);

  // category pie active slice index for hover expansion
  const [categoryActiveIndex, setCategoryActiveIndex] = useState<number | null>(
    null
  );

  // primary departments to display (always show these 4)
  const PRIMARY_DEPARTMENTS = [
    "Computer Science",
    "IT",
    "Information System",
    "Information Science",
  ];

  // derive a fixed 4-item department display (falls back to zeros if missing)
  const displayedDeptPerf: DeptPerf[] = PRIMARY_DEPARTMENTS.map((name) => {
    const found = deptPerfState.find((d) => d.department === name);
    if (found) return found;
    const counts = roleCountsByDept[name] || {
      students: 0,
      staff: 0,
      hods: 0,
      deans: 0,
    };
    return {
      department: name,
      totalAssigned: 0,
      resolved: 0,
      pending: 0,
      inProgress: 0,
      successRate: 0,
      staffCount: counts.staff,
    } as DeptPerf;
  });

  // compute category pie as top-4 categories + Others
  const categoryPie = (() => {
    const arr = categoryDataState || [];
    const totalCount = arr.reduce((s, c) => s + (c.count || 0), 0);
    const sorted = [...arr].sort((a, b) => (b.count || 0) - (a.count || 0));
    const top = sorted.slice(0, 4);
    const others = sorted.slice(4);
    const othersCount = others.reduce((s, c) => s + (c.count || 0), 0);
    const pie = top.map((c) => ({
      name: c.name,
      count: c.count,
      value: totalCount ? Math.round(((c.count || 0) / totalCount) * 100) : 0,
    }));
    if (othersCount > 0) {
      pie.push({
        name: "Others",
        count: othersCount,
        value: totalCount ? Math.round((othersCount / totalCount) * 100) : 0,
      });
    }
    return pie;
  })();

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const [
          prioRes,
          statusRes,
          monthRes,
          deptRes,
          categoriesRes,
          usersRes,
          summaryRes,
        ] = await Promise.all([
          getAdminPriorityDistributionApi().catch(() => null),
          getAdminStatusDistributionApi().catch(() => null),
          getAdminMonthlyTrendsApi({ months: 6 }).catch(() => null),
          getAdminDepartmentPerformanceApi().catch(() => null),
          getCategoryCountsApi().catch(() => null),
          getAllUsersApi().catch(() => null),
          getAdminAnalyticsSummaryApi().catch(() => null),
        ]);

        if (!mounted) return;

        if (
          categoriesRes &&
          typeof categoriesRes === "object" &&
          categoriesRes !== null &&
          "categories" in categoriesRes
        ) {
          const container = categoriesRes as {
            total?: number;
            categories?: Array<{ category: string; count: number }>;
          };
          const total = container.total || 0;
          const cats = (container.categories || []).map((c) => ({
            name: c.category,
            value: total ? Math.round((c.count / total) * 100) : 0,
            count: c.count,
          }));
          setCategoryDataState(cats);
        }

        if (
          prioRes &&
          typeof prioRes === "object" &&
          prioRes !== null &&
          "priorities" in prioRes
        ) {
          const container = prioRes as {
            priorities?: Array<{
              priority: string;
              count: number;
              color?: string;
            }>;
          };
          // normalize priorities and group unexpected values into 'Other'
          const allowed = ["Critical", "High", "Medium", "Low"];
          const countsMap: Record<string, { count: number; color?: string }> =
            {};
          allowed.forEach((k) => (countsMap[k] = { count: 0 }));
          countsMap["Other"] = { count: 0, color: "#8884d8" };
          (container.priorities || []).forEach((p) => {
            const key = String(p.priority ?? "").trim();
            const found = allowed.find(
              (a) => a.toLowerCase() === key.toLowerCase()
            );
            if (found) {
              countsMap[found].count += Number(p.count ?? 0);
              if (p.color) countsMap[found].color = p.color;
            } else {
              countsMap["Other"].count += Number(p.count ?? 0);
            }
          });
          const ordered = [...allowed, "Other"].map((k) => ({
            priority: k,
            count: countsMap[k].count,
            color:
              countsMap[k].color ||
              (k === "Critical"
                ? "#ef4444"
                : k === "High"
                ? "#f97316"
                : k === "Medium"
                ? "#eab308"
                : k === "Low"
                ? "#22c55e"
                : "#8884d8"),
          }));
          setPriorityDataState(ordered.filter((o) => o.count > 0));
        }

        if (
          statusRes &&
          typeof statusRes === "object" &&
          statusRes !== null &&
          "statuses" in statusRes
        ) {
          const container = statusRes as {
            statuses?: Array<{ status: string; count: number }>;
          };
          setStatusDataState(
            (container.statuses || []).map((s) => ({
              status: s.status,
              count: s.count,
            }))
          );
        }

        if (
          monthRes &&
          typeof monthRes === "object" &&
          monthRes !== null &&
          "data" in monthRes
        ) {
          const container = monthRes as {
            data?: Array<{
              month: string;
              submitted: number;
              resolved: number;
            }>;
          };
          setMonthlyTrendState(
            (container.data || []).map((d) => ({
              month: d.month,
              submitted: d.submitted,
              resolved: d.resolved,
            }))
          );
        }

        if (
          deptRes &&
          typeof deptRes === "object" &&
          deptRes !== null &&
          "departments" in deptRes
        ) {
          const container = deptRes as {
            departments?: Array<Record<string, unknown>>;
          };
          setDeptPerfState(
            (container.departments || []).map((d) => ({
              department: String(d.department ?? ""),
              // normalize to previous UI fields
              totalAssigned: Number(d.totalComplaints ?? 0),
              resolved: Number(d.resolvedComplaints ?? 0),
              pending: Number(d.pendingComplaints ?? 0),
              inProgress: Number(d.inProgress ?? 0),
              successRate: Number(d.successRate ?? 0),
              staffCount: Number(d.staffCount ?? 0),
            })) as DeptPerf[]
          );
          // compute pie for the four base departments + Others
          const all = container.departments || [];
          const primary = [
            "Computer Science",
            "IT",
            "Information System",
            "Information Science",
          ];
          const totalsByDept: Record<string, number> = {};
          let grandTotal = 0;
          (all as Array<Record<string, unknown>>).forEach((d) => {
            const name = String(d.department ?? "");
            const count = Number(d.totalComplaints ?? 0);
            totalsByDept[name] = (totalsByDept[name] || 0) + count;
            grandTotal += count;
          });
          const pie = primary.map((name) => {
            const cnt = totalsByDept[name] || 0;
            return {
              name,
              value: grandTotal ? Math.round((cnt / grandTotal) * 100) : 0,
              count: cnt,
            };
          });
          const primarySum = pie.reduce((s, p) => s + (p.count || 0), 0);
          const othersCount = Math.max(0, grandTotal - primarySum);
          pie.push({
            name: "Others",
            value: grandTotal
              ? Math.round((othersCount / grandTotal) * 100)
              : 0,
            count: othersCount,
          });
          setDeptPieState(pie);
        }

        if (Array.isArray(usersRes)) {
          const arr = usersRes as unknown[];
          const map: Record<
            string,
            { students: number; staff: number; hods: number; deans: number }
          > = {};
          arr.forEach((u) => {
            if (!u || typeof u !== "object") return;
            const obj = u as Record<string, unknown>;
            const dept = String(obj.department ?? "");
            if (!map[dept])
              map[dept] = { students: 0, staff: 0, hods: 0, deans: 0 };
            const role = String(obj.role ?? "").toLowerCase();
            if (role === "student") map[dept].students++;
            else if (role === "staff") map[dept].staff++;
            else if (
              role === "hod" ||
              role === "headofdepartment" ||
              role === "headofdepartment"
            )
              map[dept].hods++;
            else if (role === "dean") map[dept].deans++;
          });
          setRoleCountsByDept(map);
        }
        if (
          summaryRes &&
          typeof summaryRes === "object" &&
          summaryRes !== null
        ) {
          const s = summaryRes as Record<string, unknown>;
          setSummary((prev) => ({
            resolutionRate: Number(s.resolutionRate ?? prev.resolutionRate),
            avgResolutionTime: Number(
              s.avgResolutionTime ?? prev.avgResolutionTime
            ),
            userSatisfaction: Number(
              s.userSatisfaction ?? prev.userSatisfaction
            ),
            totalReviews: Number(s.totalReviews ?? prev.totalReviews),
          }));
        }
      } catch (err) {
        // keep fallbacks on error
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive complaint management insights
          </p>
        </div>
        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="30">Last 30 Days</SelectItem>
            <SelectItem value="90">Last 90 Days</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Resolution Rate
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {Number(summary.resolutionRate).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />+
              {(Number(summary.resolutionRate) - 1).toFixed(1)}% from last month
            </p>
            <Progress value={Number(summary.resolutionRate)} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Resolution Time
            </CardTitle>
            <Clock className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">
              {Number(summary.avgResolutionTime).toFixed(1)} days
            </div>
            <p className="text-xs text-muted-foreground">
              {/* delta unavailable from API, keep placeholder */}
              {"-"} days from last month
            </p>
            <div className="text-xs text-muted-foreground mt-1">
              Target: 2.5 days
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              User Satisfaction
            </CardTitle>
            <Star className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {Number(summary.userSatisfaction).toFixed(1)}/5
            </div>
            <p className="text-xs text-muted-foreground">
              Based on {Number(summary.totalReviews || 0)} reviews
            </p>
            <div className="flex items-center mt-2">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 ${
                    i < 4
                      ? "text-warning fill-current"
                      : "text-muted-foreground"
                  }`}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
        {/* Complaint by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Complaints by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryPie}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  animationActive={true}
                  animationDuration={700}
                  activeIndex={categoryActiveIndex ?? undefined}
                  activeShape={(p: unknown) => {
                    const props = p as Record<string, unknown> & {
                      cx?: number;
                      cy?: number;
                      startAngle?: number;
                      endAngle?: number;
                      innerRadius?: number;
                      outerRadius?: number;
                      fill?: string;
                    };
                    const cx =
                      typeof props.cx === "number" ? props.cx : undefined;
                    const cy =
                      typeof props.cy === "number" ? props.cy : undefined;
                    const startAngle =
                      typeof props.startAngle === "number"
                        ? props.startAngle
                        : undefined;
                    const endAngle =
                      typeof props.endAngle === "number"
                        ? props.endAngle
                        : undefined;
                    const innerRadius =
                      typeof props.innerRadius === "number"
                        ? props.innerRadius
                        : undefined;
                    const outerRadius =
                      typeof props.outerRadius === "number"
                        ? props.outerRadius + 12
                        : undefined;
                    const fill =
                      typeof props.fill === "string" ? props.fill : undefined;
                    return (
                      <Sector
                        cx={cx}
                        cy={cy}
                        startAngle={startAngle}
                        endAngle={endAngle}
                        innerRadius={innerRadius}
                        outerRadius={outerRadius}
                        fill={fill}
                      />
                    );
                  }}
                  onMouseEnter={(_d: unknown, index: number) =>
                    setCategoryActiveIndex(index)
                  }
                  onMouseLeave={() => setCategoryActiveIndex(null)}
                >
                  {categoryPie.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Legend />
                <Tooltip
                  formatter={(value: number, name: string, props: unknown) => {
                    const propsObj = props as
                      | Record<string, unknown>
                      | undefined;
                    const item = propsObj
                      ? (propsObj["payload"] as
                          | Record<string, unknown>
                          | undefined)
                      : undefined;
                    const count =
                      item && typeof item["count"] === "number"
                        ? (item["count"] as number)
                        : value;
                    return [`${count}`, "Count"];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 text-sm text-muted-foreground">
              Total complaints:{" "}
              {categoryPie.reduce((s, c) => s + (c.count || 0), 0)}
            </div>
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Priority Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={priorityDataState}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="priority" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8">
                  {priorityDataState.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusDataState}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Monthly Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrendState}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="submitted"
                  stroke="#8884d8"
                  strokeWidth={2}
                  name="Submitted"
                />
                <Line
                  type="monotone"
                  dataKey="resolved"
                  stroke="#82ca9d"
                  strokeWidth={2}
                  name="Resolved"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Department Performance */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Department Performance Overview
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {displayedDeptPerf.map((dept: DeptPerf, index) => (
              <div
                key={dept.department}
                className="p-4 border rounded-lg flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{dept.department}</h3>
                  <p className="text-sm text-muted-foreground">
                    {(() => {
                      const counts = roleCountsByDept[dept.department] || {
                        students: 0,
                        staff: dept.staffCount || 0,
                        hods: 0,
                        deans: 0,
                      };
                      return `Students: ${counts.students} · Staff: ${counts.staff} · HODs: ${counts.hods} · Deans: ${counts.deans}`;
                    })()}
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:flex sm:items-center sm:gap-6 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold">
                      {dept.totalAssigned}
                    </div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-success">
                      {dept.resolved}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Resolved
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-warning">
                      {dept.pending}
                    </div>
                    <div className="text-xs text-muted-foreground">Pending</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-info">
                      {dept.inProgress}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      In Progress
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    <Badge
                      variant="outline"
                      className={`$${""} ${
                        (dept.successRate ?? 0) >= 90
                          ? "border-success text-success"
                          : (dept.successRate ?? 0) >= 80
                          ? "border-warning text-warning"
                          : "border-destructive text-destructive"
                      }`}
                    >
                      {typeof dept.successRate === "number"
                        ? dept.successRate.toFixed(1)
                        : "0.0"}
                      %
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
