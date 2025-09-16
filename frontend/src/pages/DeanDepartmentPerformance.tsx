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
    <div className="space-y-6 p-4 md:p-6">
      <h1 className="text-3xl font-bold">Department Performance</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Total Assigned
            </CardTitle>
            <BarChart3 className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totals.total}</div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardHeader className="flex items-center justify-between pb-2">
            <CardTitle className="text-sm text-green-700 dark:text-green-300">
              Resolved (HoD + Staff)
            </CardTitle>
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-800 dark:text-green-200">
              {totals.resolved}
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader className="flex items-center justify-between pb-2">
            <CardTitle className="text-sm text-orange-700 dark:text-orange-300">
              In Progress
            </CardTitle>
            <Clock className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-800 dark:text-orange-200">
              {totals.inProgress}
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardHeader className="flex items-center justify-between pb-2">
            <CardTitle className="text-sm text-red-700 dark:text-red-300">
              Overdue
            </CardTitle>
            <AlertCircle className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-800 dark:text-red-200">
              {totals.overdue}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">
                Department
              </label>
              <Select
                value={departmentFilter}
                onValueChange={(v: string | "All") => setDepartmentFilter(v)}
              >
                <SelectTrigger className="w-full sm:w-56 h-11">
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
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">From</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full sm:w-auto h-11"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">To</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full sm:w-auto h-11"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Sort By</label>
              <Select
                value={sortBy}
                onValueChange={(v) => setSortBy(v as SortKey)}
              >
                <SelectTrigger className="w-full sm:w-56 h-11">
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
                      <p className="font-medium text-base">{d.department}</p>
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
                      <p className="text-muted-foreground">Total Assigned</p>
                      <p className="font-medium">{d.total}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Resolved by HoD</p>
                      <p className="font-medium">{d.resolvedHoD}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Resolved by Staff</p>
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

      {/* Resolved by Department (below table) with its own From/To */}
      <Card>
        <CardHeader>
          <div className="flex items-end justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Resolved by Department
            </CardTitle>
            <div className="flex gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">From</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">To</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{ Resolved: { label: "Resolved", color: "#16a34a" } }}
          >
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="Resolved"
                fill="var(--color-Resolved)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog
        open={!!selectedDetails}
        onOpenChange={(open) => !open && setSelectedDept(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selectedDetails?.department} - Complaints
            </DialogTitle>
            <DialogDescription>
              Complaints list and resolution timeline
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {/* Mobile modal list as cards */}
            <div className="md:hidden space-y-3">
              {detailsLoading && (
                <div className="text-center py-6 text-muted-foreground">
                  Loading…
                </div>
              )}
              {deptComplaints?.map((c) => (
                <div key={c.id} className="border rounded-lg p-4 bg-card">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">{c.title}</div>
                    <Badge
                      className={
                        c.status === "Resolved"
                          ? "bg-green-100 text-green-800"
                          : c.status === "Overdue"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }
                    >
                      {c.status}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Assigned To</p>
                      <p className="font-medium">
                        {c.assignedTo?.name
                          ? `${c.assignedTo.name} (${c.assignedTo.role || ""})`
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Deadline</p>
                      <p className="font-medium">
                        {c.deadline
                          ? new Date(c.deadline).toLocaleDateString()
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Resolved By</p>
                      <p className="font-medium">{c.resolvedBy || "-"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Resolved At</p>
                      <p className="font-medium">
                        {c.resolvedAt
                          ? new Date(c.resolvedAt).toLocaleDateString()
                          : "-"}
                      </p>
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
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Resolved By</TableHead>
                    <TableHead>Resolved At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailsLoading && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground"
                      >
                        Loading…
                      </TableCell>
                    </TableRow>
                  )}
                  {deptComplaints?.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.title}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            c.status === "Resolved"
                              ? "bg-green-100 text-green-800"
                              : c.status === "Overdue"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }
                        >
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {c.assignedTo?.name
                          ? `${c.assignedTo.name} (${c.assignedTo.role || ""})`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {c.deadline
                          ? new Date(c.deadline).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell>{c.resolvedBy || "-"}</TableCell>
                      <TableCell>
                        {c.resolvedAt
                          ? new Date(c.resolvedAt).toLocaleDateString()
                          : "-"}
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
  );
}
