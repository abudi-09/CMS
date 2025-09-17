import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, BarChart3, CheckCircle2, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api";

type SortKey = "successRate" | "total" | "resolved" | "overdue" | "inProgress";

type DeptRow = {
  department: string;
  totalComplaints: number;
  resolvedComplaints: number;
  pendingComplaints: number;
  inProgress: number;
  overdue: number;
  resolvedHoD: number;
  resolvedStaff: number;
  staffCount: number;
  avgResolutionTime: number;
  successRate: number;
};

type DeptComplaint = {
  id: string;
  code?: string;
  title: string;
  status: string;
  assignedTo?: { name?: string; role?: string } | null;
  createdAt?: string;
  deadline?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
};

const CANONICAL_DEPARTMENTS = [
  "Information Technology",
  "Information Science",
  "Computer Science",
  "Information System",
] as const;

export default function DeanDepartmentPerformance() {
  const { toast } = useToast();
  const [departmentFilter, setDepartmentFilter] = useState<"All" | string>(
    "All"
  );
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortKey>("successRate");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<DeptRow[]>([]);
  const [deptComplaints, setDeptComplaints] = useState<DeptComplaint[] | null>(
    null
  );
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Load department performance
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const q = new URLSearchParams();
        if (dateFrom) q.set("from", dateFrom);
        if (dateTo) q.set("to", dateTo);
        const path = `/stats/analytics/dean/department-performance?${q.toString()}`;
        const data = await apiClient.get<{ departments: DeptRow[] }>(path);
        if (!cancelled) setRows(data.departments || []);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        toast({
          variant: "destructive",
          title: "Failed to load performance",
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
  }, [dateFrom, dateTo, toast]);

  // Filter rows by department
  const perDept = useMemo(() => {
    const base =
      departmentFilter === "All"
        ? rows
        : rows.filter((r) => r.department === departmentFilter);
    return base
      .filter(
        (r) =>
          r.department.toLowerCase() !== "general" &&
          r.department.toLowerCase() !== "it"
      )
      .map((r) => ({
        department: r.department,
        total: r.totalComplaints,
        resolvedHoD: r.resolvedHoD || 0,
        resolvedStaff: r.resolvedStaff || 0,
        inProgress: r.inProgress || 0,
        overdue: r.overdue || 0,
        resolved: r.resolvedComplaints || 0,
        successRate: Math.round(r.successRate || 0),
      }));
  }, [rows, departmentFilter]);

  const totals = useMemo(() => {
    return perDept.reduce(
      (acc, d) => {
        acc.total += d.total;
        acc.resolved += d.resolved;
        acc.inProgress += d.inProgress;
        acc.overdue += d.overdue;
        return acc;
      },
      { total: 0, resolved: 0, inProgress: 0, overdue: 0 }
    );
  }, [perDept]);

  const sorted = useMemo(() => {
    const copy = [...perDept];
    copy.sort((a, b) => {
      switch (sortBy) {
        case "total":
          return b.total - a.total;
        case "resolved":
          return b.resolved - a.resolved;
        case "overdue":
          return b.overdue - a.overdue;
        case "inProgress":
          return b.inProgress - a.inProgress;
        case "successRate":
        default:
          return b.successRate - a.successRate;
      }
    });
    return copy;
  }, [perDept, sortBy]);

  // Build dynamic department options from loaded data
  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.department && set.add(r.department));
    return Array.from(set)
      .filter(
        (dept) =>
          dept.toLowerCase() !== "general" && dept.toLowerCase() !== "it"
      )
      .sort((a, b) => a.localeCompare(b));
  }, [rows]);

  // Chart data
  const barData = perDept.map((d) => ({
    name: d.department,
    Resolved: d.resolved,
  }));

  // Modal selection
  const selectedDetails = useMemo(() => {
    if (!selectedDept) return null;
    const dept = perDept.find((d) => d.department === selectedDept);
    return dept ? { department: dept.department } : null;
  }, [selectedDept, perDept]);

  // Load complaints for selected department
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!selectedDept) return;
      try {
        setDetailsLoading(true);
        setDeptComplaints(null);
        const q = new URLSearchParams({ department: selectedDept });
        if (dateFrom) q.set("from", dateFrom);
        if (dateTo) q.set("to", dateTo);
        const path = `/stats/analytics/dean/department-complaints?${q.toString()}`;
        const data = await apiClient.get<{
          items?: DeptComplaint[];
          complaints?: DeptComplaint[];
          total?: number;
          page?: number;
          pageSize?: number;
        }>(path);
        if (!cancelled) setDeptComplaints(data.items || data.complaints || []);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        toast({
          variant: "destructive",
          title: "Failed to load complaints",
          description: msg,
        });
      } finally {
        if (!cancelled) setDetailsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedDept, dateFrom, dateTo, toast]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4 md:px-6 md:py-6 max-w-7xl">
        <div className="space-y-4 md:space-y-6">
          <div className="flex flex-col gap-2 md:gap-4">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Department Performance
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Monitor and analyze department-level complaint resolution
              performance
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <Card className="p-4 md:p-6">
              <CardHeader className="flex items-center justify-between pb-2 md:pb-3">
                <CardTitle className="text-xs md:text-sm text-muted-foreground font-medium">
                  Total Assigned
                </CardTitle>
                <BarChart3 className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl md:text-3xl font-bold">
                  {totals.total}
                </div>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  Total complaints assigned
                </p>
              </CardContent>
            </Card>

            <Card className="p-4 md:p-6 border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800">
              <CardHeader className="flex items-center justify-between pb-2 md:pb-3">
                <CardTitle className="text-xs md:text-sm text-green-700 dark:text-green-300 font-medium">
                  Resolved (HoD + Staff)
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl md:text-3xl font-bold text-green-800 dark:text-green-200">
                  {totals.resolved}
                </div>
                <p className="text-xs md:text-sm text-green-600 dark:text-green-400 mt-1">
                  Successfully resolved
                </p>
              </CardContent>
            </Card>

            <Card className="p-4 md:p-6 border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-800">
              <CardHeader className="flex items-center justify-between pb-2 md:pb-3">
                <CardTitle className="text-xs md:text-sm text-orange-700 dark:text-orange-300 font-medium">
                  In Progress
                </CardTitle>
                <Clock className="h-4 w-4 md:h-5 md:w-5 text-orange-600" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl md:text-3xl font-bold text-orange-800 dark:text-orange-200">
                  {totals.inProgress}
                </div>
                <p className="text-xs md:text-sm text-orange-600 dark:text-orange-400 mt-1">
                  Currently being handled
                </p>
              </CardContent>
            </Card>

            <Card className="p-4 md:p-6 border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-800">
              <CardHeader className="flex items-center justify-between pb-2 md:pb-3">
                <CardTitle className="text-xs md:text-sm text-red-700 dark:text-red-300 font-medium">
                  Overdue
                </CardTitle>
                <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-red-600" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl md:text-3xl font-bold text-red-800 dark:text-red-200">
                  {totals.overdue}
                </div>
                <p className="text-xs md:text-sm text-red-600 dark:text-red-400 mt-1">
                  Past deadline
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="p-4 md:p-6">
            <CardHeader className="pb-3 md:pb-4">
              <CardTitle className="text-base md:text-lg">
                Filters & Sorting
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs md:text-sm text-muted-foreground font-medium">
                    Department
                  </label>
                  <Select
                    value={departmentFilter}
                    onValueChange={(v: string | "All") =>
                      setDepartmentFilter(v)
                    }
                  >
                    <SelectTrigger className="w-full h-10 md:h-11">
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Departments</SelectItem>
                      {departmentOptions.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs md:text-sm text-muted-foreground font-medium">
                    From Date
                  </label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full h-10 md:h-11"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs md:text-sm text-muted-foreground font-medium">
                    To Date
                  </label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full h-10 md:h-11"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs md:text-sm text-muted-foreground font-medium">
                    Sort By
                  </label>
                  <Select
                    value={sortBy}
                    onValueChange={(v) => setSortBy(v as SortKey)}
                  >
                    <SelectTrigger className="w-full h-10 md:h-11">
                      <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="successRate">Success Rate</SelectItem>
                      <SelectItem value="total">Total Assigned</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="inProgress">In Progress</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Charts moved below table per request */}

          {/* Performance Breakdown Table */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Mobile: cards per department */}
              <div className="md:hidden space-y-3">
                {sorted.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    No data
                  </div>
                ) : (
                  sorted.map((d) => (
                    <div
                      key={d.department}
                      className="border rounded-lg p-4 bg-card cursor-pointer hover:bg-accent/50"
                      onClick={() => setSelectedDept(d.department)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-base">
                            {d.department}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Success Rate
                          </p>
                        </div>
                        <Badge
                          className={
                            d.successRate >= 80
                              ? "bg-green-100 text-green-800"
                              : d.successRate >= 50
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }
                        >
                          {d.successRate}%
                        </Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">
                            Total Assigned
                          </p>
                          <p className="font-medium">{d.total}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">
                            Resolved by HoD
                          </p>
                          <p className="font-medium">{d.resolvedHoD}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">
                            Resolved by Staff
                          </p>
                          <p className="font-medium">{d.resolvedStaff}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">In Progress</p>
                          <p className="font-medium">{d.inProgress}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Overdue</p>
                          <p className="font-medium">{d.overdue}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop/Tablet: table with responsive columns */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Department</TableHead>
                      <TableHead>Total Assigned</TableHead>
                      <TableHead className="hidden lg:table-cell">
                        Resolved by HoD
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        Resolved by Staff
                      </TableHead>
                      <TableHead>Pending/In Progress</TableHead>
                      <TableHead>Overdue</TableHead>
                      <TableHead>Success Rate (%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sorted.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center text-muted-foreground py-8"
                        >
                          No data
                        </TableCell>
                      </TableRow>
                    ) : (
                      sorted.map((d) => (
                        <TableRow
                          key={d.department}
                          className="cursor-pointer hover:bg-accent/50"
                          onClick={() => setSelectedDept(d.department)}
                        >
                          <TableCell className="font-medium">
                            {d.department}
                          </TableCell>
                          <TableCell>{d.total}</TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {d.resolvedHoD}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {d.resolvedStaff}
                          </TableCell>
                          <TableCell>{d.inProgress}</TableCell>
                          <TableCell>{d.overdue}</TableCell>
                          <TableCell>
                            <Badge
                              className={
                                d.successRate >= 80
                                  ? "bg-green-100 text-green-800"
                                  : d.successRate >= 50
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                              }
                            >
                              {d.successRate}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Resolved by Department Chart */}
          <Card className="p-4 md:p-6">
            <CardHeader className="pb-3 md:pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4">
                <CardTitle className="text-base md:text-lg flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 md:h-5 md:w-5" />
                  Resolved by Department
                </CardTitle>
                <div className="flex flex-col sm:flex-row gap-2 md:gap-3 w-full sm:w-auto">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground font-medium">
                      From Date
                    </label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full h-9 md:h-10"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground font-medium">
                      To Date
                    </label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full h-9 md:h-10"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="w-full overflow-x-auto">
                <ChartContainer
                  config={{ Resolved: { label: "Resolved", color: "#16a34a" } }}
                  className="h-[280px] md:h-[320px] lg:h-[360px] min-w-[400px] md:min-w-full"
                >
                  <BarChart
                    data={barData}
                    margin={{ top: 20, right: 20, left: 10, bottom: 60 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="opacity-30"
                    />
                    <XAxis
                      dataKey="name"
                      fontSize={11}
                      tick={{ fontSize: 10 }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis
                      allowDecimals={false}
                      fontSize={11}
                      tick={{ fontSize: 10 }}
                      width={40}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      cursor={{ fill: "rgba(0, 0, 0, 0.1)" }}
                    />
                    <Bar
                      dataKey="Resolved"
                      fill="var(--color-Resolved)"
                      radius={[3, 3, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          {/* Detail Modal */}
          <Dialog
            open={!!selectedDetails}
            onOpenChange={(open) => !open && setSelectedDept(null)}
          >
            <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[90vh] md:max-h-[85vh] p-4 md:p-6">
              <DialogHeader className="pb-3 md:pb-4">
                <DialogTitle className="text-lg md:text-xl flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 md:h-5 md:w-5" />
                  {selectedDetails?.department} - Complaints
                </DialogTitle>
                <DialogDescription className="text-sm md:text-base">
                  Detailed list of complaints and resolution timeline
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto max-h-[60vh] md:max-h-[65vh] pr-1">
                {/* Mobile modal cards */}
                <div className="md:hidden space-y-3">
                  {detailsLoading && (
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                      Loading complaints...
                    </div>
                  )}
                  {!detailsLoading && deptComplaints?.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground border rounded-lg">
                      No complaints found for this department
                    </div>
                  )}
                  {deptComplaints?.map((c) => (
                    <div
                      key={c.id}
                      className="border rounded-lg p-3 md:p-4 bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm md:text-base leading-tight mb-1">
                            {c.title}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            ID: {c.code || c.id.slice(-8)}
                          </p>
                        </div>
                        <Badge
                          className={`text-xs px-2 py-1 flex-shrink-0 ${
                            c.status === "Resolved"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : c.status === "Overdue"
                              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          }`}
                        >
                          {c.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 gap-2 text-xs md:text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Assigned To:
                          </span>
                          <span className="font-medium text-right">
                            {c.assignedTo?.name
                              ? `${c.assignedTo.name}${
                                  c.assignedTo.role
                                    ? ` (${c.assignedTo.role})`
                                    : ""
                                }`
                              : "Unassigned"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Deadline:
                          </span>
                          <span className="font-medium">
                            {c.deadline
                              ? new Date(c.deadline).toLocaleDateString()
                              : "No deadline"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Resolved By:
                          </span>
                          <span className="font-medium">
                            {c.resolvedBy || "Not resolved"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Resolved At:
                          </span>
                          <span className="font-medium">
                            {c.resolvedAt
                              ? new Date(c.resolvedAt).toLocaleDateString()
                              : "Not resolved"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop modal table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold">Title</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">
                          Assigned To
                        </TableHead>
                        <TableHead className="font-semibold">
                          Deadline
                        </TableHead>
                        <TableHead className="font-semibold">
                          Resolved By
                        </TableHead>
                        <TableHead className="font-semibold">
                          Resolved At
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailsLoading && (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center text-muted-foreground py-8"
                          >
                            <div className="flex items-center justify-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                              Loading complaints...
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      {!detailsLoading && deptComplaints?.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center text-muted-foreground py-8"
                          >
                            No complaints found for this department
                          </TableCell>
                        </TableRow>
                      )}
                      {deptComplaints?.map((c) => (
                        <TableRow key={c.id} className="hover:bg-accent/50">
                          <TableCell className="font-medium">
                            <div>
                              <div className="font-medium">{c.title}</div>
                              <div className="text-xs text-muted-foreground">
                                ID: {c.code || c.id.slice(-8)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                c.status === "Resolved"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                  : c.status === "Overdue"
                                  ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                  : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                              }
                            >
                              {c.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {c.assignedTo?.name
                              ? `${c.assignedTo.name}${
                                  c.assignedTo.role
                                    ? ` (${c.assignedTo.role})`
                                    : ""
                                }`
                              : "Unassigned"}
                          </TableCell>
                          <TableCell>
                            {c.deadline
                              ? new Date(c.deadline).toLocaleDateString()
                              : "No deadline"}
                          </TableCell>
                          <TableCell>
                            {c.resolvedBy || "Not resolved"}
                          </TableCell>
                          <TableCell>
                            {c.resolvedAt
                              ? new Date(c.resolvedAt).toLocaleDateString()
                              : "Not resolved"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
