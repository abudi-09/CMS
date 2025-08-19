import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";

// Mock data - replace with real data from your backend
const performanceData = {
  totalAssigned: 45,
  totalResolved: 38,
  pending: 7,
  averageResolutionTime: "2.3 days",
  averageRating: 4.2,
  timelinessScore: 85,
};

const categoryData = [
  { name: "Academic", value: 15, color: "#8884d8" },
  { name: "IT Support", value: 12, color: "#82ca9d" },
  { name: "Facility", value: 8, color: "#ffc658" },
  { name: "Administrative", value: 10, color: "#ff7300" },
];

const trendData = [
  { month: "Jan", resolved: 8 },
  { month: "Feb", resolved: 12 },
  { month: "Mar", resolved: 10 },
  { month: "Apr", resolved: 15 },
  { month: "May", resolved: 18 },
  { month: "Jun", resolved: 14 },
];

const statusData = [
  { name: "Resolved", value: 38, color: "#10b981" },
  { name: "In Progress", value: 5, color: "#f59e0b" },
  { name: "Overdue", value: 2, color: "#ef4444" },
];

const recentActivity = [
  {
    id: "CMP-001",
    title: "Network connectivity issue in Lab 3",
    status: "Resolved",
    dateAssigned: "2024-01-15",
    dateResolved: "2024-01-17",
    rating: 5,
  },
  {
    id: "CMP-002",
    title: "Projector not working in Room 205",
    status: "In Progress",
    dateAssigned: "2024-01-18",
    dateResolved: "-",
    rating: null,
  },
  {
    id: "CMP-003",
    title: "Air conditioning problem in Library",
    status: "Resolved",
    dateAssigned: "2024-01-12",
    dateResolved: "2024-01-14",
    rating: 4,
  },
];

export default function MyPerformance() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Activity className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold">My Performance Dashboard</h1>
      </div>

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
              {performanceData.totalAssigned}
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
              {performanceData.totalResolved}
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
              {performanceData.pending}
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
              {performanceData.averageResolutionTime}
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
              {performanceData.averageRating}/5
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
              {performanceData.timelinessScore}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Complaints by Category */}
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
                    <Cell key={`cell-${index}`} fill={entry.color} />
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
            {recentActivity.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="text-sm font-semibold">#{c.id}</div>
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
                <div className="mt-1 text-sm text-foreground line-clamp-2">
                  {c.title}
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
                  <TableHead>Complaint ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date Assigned</TableHead>
                  <TableHead>Date Resolved</TableHead>
                  <TableHead>Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivity.map((complaint) => (
                  <TableRow key={complaint.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      {complaint.id}
                    </TableCell>
                    <TableCell>{complaint.title}</TableCell>
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
