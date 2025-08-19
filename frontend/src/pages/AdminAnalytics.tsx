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

// Mock data for charts
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

// Department performance mock data
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

export default function AdminAnalytics() {
  const [timeframe, setTimeframe] = useState("all");

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
            <div className="text-2xl font-bold text-success">89.2%</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +2.1% from last month
            </p>
            <Progress value={89.2} className="mt-2" />
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
            <div className="text-2xl font-bold text-info">3.2 days</div>
            <p className="text-xs text-muted-foreground">
              -0.5 days from last month
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
            <div className="text-2xl font-bold text-warning">4.6/5</div>
            <p className="text-xs text-muted-foreground">
              Based on 156 reviews
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
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name} (${value}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}%`, "Percentage"]} />
              </PieChart>
            </ResponsiveContainer>
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
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="priority" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8">
                  {priorityData.map((entry, index) => (
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
              <BarChart data={statusData}>
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
              <LineChart data={monthlyTrendData}>
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
              <Users className="h-5 w-5" />
              Department Performance Overview
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {departmentPerformance.map((dept, index) => (
              <div
                key={dept.department}
                className="p-4 border rounded-lg flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{dept.department}</h3>
                  <p className="text-sm text-muted-foreground">
                    Staff: {dept.staff.join(", ")}
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
                        dept.successRate >= 90
                          ? "border-success text-success"
                          : dept.successRate >= 80
                          ? "border-warning text-warning"
                          : "border-destructive text-destructive"
                      }`}
                    >
                      {dept.successRate.toFixed(1)}%
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
