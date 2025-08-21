import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

type DepartmentName =
  | "Computer Science"
  | "IT"
  | "Information System"
  | "Information Science";

type ComplaintStatus = "resolved" | "in-progress" | "pending" | "overdue";
type AssignedTo = "HoD" | "Staff";

interface ComplaintItem {
  id: string;
  title: string;
  status: ComplaintStatus;
  assignedTo: AssignedTo;
  createdAt: string; // ISO date
  deadline: string; // ISO date
  resolvedBy?: AssignedTo;
  resolvedAt?: string; // ISO date
}

interface DepartmentData {
  id: string;
  department: DepartmentName;
  complaints: ComplaintItem[];
}

const DEPARTMENTS: DepartmentName[] = [
  "Computer Science",
  "IT",
  "Information System",
  "Information Science",
];

// Mock helper to create dates in 2025
function d(dateStr: string) {
  return new Date(dateStr).toISOString();
}

const MOCK_DATA: DepartmentData[] = [
  {
    id: "cs",
    department: "Computer Science",
    complaints: [
      {
        id: "CS-101",
        title: "Lab PCs not working",
        status: "resolved",
        assignedTo: "Staff",
        createdAt: d("2025-01-05"),
        deadline: d("2025-01-10"),
        resolvedBy: "Staff",
        resolvedAt: d("2025-01-09"),
      },
      {
        id: "CS-102",
        title: "WiFi issues",
        status: "in-progress",
        assignedTo: "HoD",
        createdAt: d("2025-02-01"),
        deadline: d("2025-02-05"),
      },
      {
        id: "CS-103",
        title: "Projector broken",
        status: "overdue",
        assignedTo: "Staff",
        createdAt: d("2025-02-12"),
        deadline: d("2025-02-20"),
      },
      {
        id: "CS-104",
        title: "Course portal access",
        status: "resolved",
        assignedTo: "HoD",
        createdAt: d("2025-03-03"),
        deadline: d("2025-03-06"),
        resolvedBy: "HoD",
        resolvedAt: d("2025-03-05"),
      },
    ],
  },
  {
    id: "it",
    department: "IT",
    complaints: [
      {
        id: "IT-201",
        title: "Server downtime",
        status: "resolved",
        assignedTo: "Staff",
        createdAt: d("2025-01-14"),
        deadline: d("2025-01-18"),
        resolvedBy: "Staff",
        resolvedAt: d("2025-01-17"),
      },
      {
        id: "IT-202",
        title: "Account locked",
        status: "pending",
        assignedTo: "Staff",
        createdAt: d("2025-03-10"),
        deadline: d("2025-03-12"),
      },
      {
        id: "IT-203",
        title: "Email delivery failure",
        status: "resolved",
        assignedTo: "HoD",
        createdAt: d("2025-04-02"),
        deadline: d("2025-04-05"),
        resolvedBy: "HoD",
        resolvedAt: d("2025-04-04"),
      },
    ],
  },
  {
    id: "is",
    department: "Information System",
    complaints: [
      {
        id: "IS-301",
        title: "ERP slow",
        status: "resolved",
        assignedTo: "Staff",
        createdAt: d("2025-02-05"),
        deadline: d("2025-02-10"),
        resolvedBy: "Staff",
        resolvedAt: d("2025-02-09"),
      },
      {
        id: "IS-302",
        title: "Report generation bug",
        status: "overdue",
        assignedTo: "HoD",
        createdAt: d("2025-03-20"),
        deadline: d("2025-03-28"),
      },
      {
        id: "IS-303",
        title: "Data sync issue",
        status: "in-progress",
        assignedTo: "Staff",
        createdAt: d("2025-04-08"),
        deadline: d("2025-04-12"),
      },
    ],
  },
  {
    id: "isc",
    department: "Information Science",
    complaints: [
      {
        id: "ISC-401",
        title: "Library system access",
        status: "resolved",
        assignedTo: "Staff",
        createdAt: d("2025-01-22"),
        deadline: d("2025-01-27"),
        resolvedBy: "Staff",
        resolvedAt: d("2025-01-26"),
      },
      {
        id: "ISC-402",
        title: "Thesis submission portal",
        status: "pending",
        assignedTo: "HoD",
        createdAt: d("2025-04-15"),
        deadline: d("2025-04-20"),
      },
    ],
  },
];

type SortKey = "successRate" | "total" | "resolved" | "overdue" | "inProgress";

export default function DeanDepartmentPerformance() {
  const [departmentFilter, setDepartmentFilter] = useState<
    "All" | DepartmentName
  >("All");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortKey>("successRate");
  const [selectedDept, setSelectedDept] = useState<DepartmentName | null>(null);

  const dateInRange = useMemo(
    () => (dateISO: string) => {
      if (!dateFrom && !dateTo) return true;
      const t = new Date(dateISO).getTime();
      if (dateFrom && t < new Date(dateFrom).getTime()) return false;
      if (dateTo && t > new Date(dateTo).getTime()) return false;
      return true;
    },
    [dateFrom, dateTo]
  );

  // Filter complaints by department and date range
  const filtered = useMemo(() => {
    const base =
      departmentFilter === "All"
        ? MOCK_DATA
        : MOCK_DATA.filter((d) => d.department === departmentFilter);
    return base.map((d) => ({
      ...d,
      complaints: d.complaints.filter((c) => dateInRange(c.createdAt)),
    }));
  }, [departmentFilter, dateInRange]);

  // Aggregate per-department metrics
  const perDept = useMemo(() => {
    return filtered.map((d) => {
      const total = d.complaints.length;
      const resolvedHoD = d.complaints.filter(
        (c) => c.status === "resolved" && c.resolvedBy === "HoD"
      ).length;
      const resolvedStaff = d.complaints.filter(
        (c) => c.status === "resolved" && c.resolvedBy === "Staff"
      ).length;
      const inProgress = d.complaints.filter(
        (c) => c.status === "in-progress" || c.status === "pending"
      ).length;
      const overdue = d.complaints.filter((c) => c.status === "overdue").length;
      const resolved = resolvedHoD + resolvedStaff;
      const successRate = total ? Math.round((resolved / total) * 100) : 0;
      return {
        department: d.department,
        total,
        resolvedHoD,
        resolvedStaff,
        inProgress,
        overdue,
        resolved,
        successRate,
      };
    });
  }, [filtered]);

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

  // Chart data
  const barData = perDept.map((d) => ({
    name: d.department,
    Resolved: d.resolved,
  }));

  // Modal selection
  const selectedDetails = useMemo(() => {
    if (!selectedDept) return null;
    const dept = filtered.find((d) => d.department === selectedDept);
    return dept || null;
  }, [selectedDept, filtered]);

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
                onValueChange={(v: DepartmentName | "All") =>
                  setDepartmentFilter(v)
                }
              >
                <SelectTrigger className="w-full sm:w-56 h-11">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Departments</SelectItem>
                  {DEPARTMENTS.map((d) => (
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
                  onClick={() =>
                    setSelectedDept(d.department as DepartmentName)
                  }
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
                      onClick={() =>
                        setSelectedDept(d.department as DepartmentName)
                      }
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

          <div className="space-y-4">
            {/* Mobile modal list as cards */}
            <div className="md:hidden space-y-3">
              {selectedDetails?.complaints.map((c) => (
                <div key={c.id} className="border rounded-lg p-4 bg-card">
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-sm font-semibold">
                      {c.id}
                    </div>
                    <Badge
                      className={
                        c.status === "resolved"
                          ? "bg-green-100 text-green-800"
                          : c.status === "overdue"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }
                    >
                      {c.status}
                    </Badge>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {c.title}
                  </div>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Assigned To</p>
                      <p className="font-medium">{c.assignedTo}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Deadline</p>
                      <p className="font-medium">
                        {new Date(c.deadline).toLocaleDateString()}
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
                    <TableHead>ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Resolved By</TableHead>
                    <TableHead>Resolved At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedDetails?.complaints.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">
                        {c.id}
                      </TableCell>
                      <TableCell>{c.title}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            c.status === "resolved"
                              ? "bg-green-100 text-green-800"
                              : c.status === "overdue"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }
                        >
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{c.assignedTo}</TableCell>
                      <TableCell>
                        {new Date(c.deadline).toLocaleDateString()}
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
