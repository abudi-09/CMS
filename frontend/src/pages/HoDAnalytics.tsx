import { useState } from "react";
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

// Mock data for charts (HOD-specific or filtered for department)
const categoryData = [
  { name: "IT Support", value: 8, count: 10 },
  { name: "Academic", value: 6, count: 8 },
  { name: "Facility", value: 4, count: 6 },
  { name: "Finance", value: 2, count: 3 },
];

const priorityData = [
  { priority: "Critical", count: 1, color: "#ef4444" },
  { priority: "High", count: 4, color: "#f97316" },
  { priority: "Medium", count: 7, color: "#eab308" },
  { priority: "Low", count: 9, color: "#22c55e" },
];

const statusData = [
  { status: "Pending", count: 3 },
  { status: "In Progress", count: 5 },
  { status: "Resolved", count: 12 },
  { status: "Rejected", count: 1 },
];

const monthlyTrendData = [
  { month: "Jan", submitted: 6, resolved: 5 },
  { month: "Feb", submitted: 7, resolved: 6 },
  { month: "Mar", submitted: 8, resolved: 7 },
  { month: "Apr", submitted: 9, resolved: 8 },
  { month: "May", submitted: 10, resolved: 9 },
  { month: "Jun", submitted: 11, resolved: 10 },
];

const staffPerformance = [
  {
    id: "1",
    name: "Mr. Alex Turner",
    department: "IT Support",
    totalAssigned: 10,
    resolved: 8,
    pending: 1,
    inProgress: 1,
    successRate: 80.0,
  },
  {
    id: "2",
    name: "Ms. Linda Green",
    department: "Academic Affairs",
    totalAssigned: 8,
    resolved: 7,
    pending: 0,
    inProgress: 1,
    successRate: 87.5,
  },
  {
    id: "3",
    name: "Mr. Brian Lee",
    department: "Facility Management",
    totalAssigned: 6,
    resolved: 5,
    pending: 1,
    inProgress: 0,
    successRate: 83.3,
  },
];

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#8dd1e1"];

export default function HoDAnalytics() {
  const [timeframe, setTimeframe] = useState("all");
  const [sortBy, setSortBy] = useState("successRate");

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
            <span className="text-2xl font-bold">80</span>
            <span className="text-muted-foreground">Total Students</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <Users className="h-8 w-8 text-primary mb-2" />
            <span className="text-2xl font-bold">10</span>
            <span className="text-muted-foreground">Total Staff</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <FileText className="h-8 w-8 text-primary mb-2" />
            <span className="text-2xl font-bold">22</span>
            <span className="text-muted-foreground">Total Complaints</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <CheckCircle className="h-8 w-8 text-green-600 mb-2" />
            <span className="text-2xl font-bold">16</span>
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
                  data={categoryData}
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
