import { useState } from "react";
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
import {
  Search,
  Star,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  department: string;
  workPlace: string;
  totalAssigned: number;
  resolved: number;
  pending: number;
  inProgress: number;
  averageRating: number;
  successRate: number;
  avgResolutionTime: number; // in hours
  profilePicture?: string;
}

const mockStaffData: StaffMember[] = [
  {
    id: "1",
    name: "Dr. Sarah Johnson",
    email: "sarah.johnson@university.edu",
    department: "IT Services",
    workPlace: "Technology Center",
    totalAssigned: 45,
    resolved: 42,
    pending: 2,
    inProgress: 1,
    averageRating: 4.8,
    successRate: 93.3,
    avgResolutionTime: 18,
  },
  {
    id: "2",
    name: "Mark Thompson",
    email: "mark.thompson@university.edu",
    department: "Academic Affairs",
    workPlace: "Administration Building",
    totalAssigned: 38,
    resolved: 35,
    pending: 3,
    inProgress: 0,
    averageRating: 4.5,
    successRate: 92.1,
    avgResolutionTime: 24,
  },
  {
    id: "3",
    name: "Lisa Chen",
    email: "lisa.chen@university.edu",
    department: "Facilities",
    workPlace: "Maintenance Office",
    totalAssigned: 52,
    resolved: 47,
    pending: 4,
    inProgress: 1,
    averageRating: 4.6,
    successRate: 90.4,
    avgResolutionTime: 30,
  },
  {
    id: "4",
    name: "James Wilson",
    email: "james.wilson@university.edu",
    department: "Student Services",
    workPlace: "Student Center",
    totalAssigned: 29,
    resolved: 24,
    pending: 3,
    inProgress: 2,
    averageRating: 4.2,
    successRate: 82.8,
    avgResolutionTime: 36,
  },
  // Additional mock staff
  {
    id: "5",
    name: "Priya Patel",
    email: "priya.patel@university.edu",
    department: "Library Services",
    workPlace: "Main Library",
    totalAssigned: 22,
    resolved: 20,
    pending: 1,
    inProgress: 1,
    averageRating: 4.7,
    successRate: 90.9,
    avgResolutionTime: 15,
  },
  {
    id: "6",
    name: "Ahmed Al-Farsi",
    email: "ahmed.alfarsi@university.edu",
    department: "Security",
    workPlace: "Security Office",
    totalAssigned: 33,
    resolved: 30,
    pending: 2,
    inProgress: 1,
    averageRating: 4.3,
    successRate: 87.5,
    avgResolutionTime: 22,
  },
  {
    id: "7",
    name: "Maria Gomez",
    email: "maria.gomez@university.edu",
    department: "Cafeteria",
    workPlace: "Dining Hall",
    totalAssigned: 27,
    resolved: 25,
    pending: 1,
    inProgress: 1,
    averageRating: 4.1,
    successRate: 92.6,
    avgResolutionTime: 19,
  },
  {
    id: "8",
    name: "John Smith",
    email: "john.smith@university.edu",
    department: "Transport",
    workPlace: "Transport Office",
    totalAssigned: 18,
    resolved: 15,
    pending: 2,
    inProgress: 1,
    averageRating: 3.9,
    successRate: 83.3,
    avgResolutionTime: 28,
  },
];

export default function StaffPerformance() {
  const [staffMembers, setStaffMembers] =
    useState<StaffMember[]>(mockStaffData);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("successRate");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  const departments = Array.from(
    new Set(staffMembers.map((s) => s.department))
  );

  const filteredAndSortedStaff = staffMembers
    .filter((staff) => {
      const matchesSearch =
        staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.department.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDepartment =
        departmentFilter === "all" || staff.department === departmentFilter;

      const matchesRating =
        ratingFilter === "all" ||
        (ratingFilter === "high" && staff.averageRating >= 4.5) ||
        (ratingFilter === "medium" &&
          staff.averageRating >= 3.5 &&
          staff.averageRating < 4.5) ||
        (ratingFilter === "low" && staff.averageRating < 3.5);

      return matchesSearch && matchesDepartment && matchesRating;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "successRate":
          return b.successRate - a.successRate;
        case "averageRating":
          return b.averageRating - a.averageRating;
        case "resolved":
          return b.resolved - a.resolved;
        case "avgResolutionTime":
          return a.avgResolutionTime - b.avgResolutionTime;
        default:
          return 0;
      }
    });

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 90) return "text-success";
    if (rate >= 75) return "text-primary";
    return "text-destructive";
  };

  const getSuccessRateBadgeVariant = (rate: number) => {
    if (rate >= 90) return "bg-success text-success-foreground";
    if (rate >= 75) return "bg-primary text-primary-foreground";
    return "bg-destructive text-destructive-foreground";
  };

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating)
            ? "fill-yellow-400 text-yellow-400"
            : "text-muted-foreground"
        }`}
      />
    ));
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Staff Performance
          </h1>
          <p className="text-muted-foreground">
            Monitor staff performance metrics and efficiency
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "cards" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("cards")}
          >
            Cards
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("table")}
          >
            Table
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search staff by name, email, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Select
                value={departmentFilter}
                onValueChange={setDepartmentFilter}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all"> All staff </SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={ratingFilter} onValueChange={setRatingFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="high">High (4.5+)</SelectItem>
                  <SelectItem value="medium">Medium (3.5-4.5)</SelectItem>
                  <SelectItem value="low">Low (&lt;3.5)</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="successRate">Success Rate</SelectItem>
                  <SelectItem value="averageRating">Rating</SelectItem>
                  <SelectItem value="resolved">Resolved Count</SelectItem>
                  <SelectItem value="avgResolutionTime">
                    Resolution Time
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <div>
                <p className="text-sm font-medium">Avg Success Rate</p>
                <p className="text-2xl font-bold text-success">
                  {(
                    filteredAndSortedStaff.reduce(
                      (acc, staff) => acc + staff.successRate,
                      0
                    ) / filteredAndSortedStaff.length
                  ).toFixed(1)}
                  %
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Star className="h-5 w-5 text-yellow-400" />
              <div>
                <p className="text-sm font-medium">Avg Rating</p>
                <p className="text-2xl font-bold">
                  {(
                    filteredAndSortedStaff.reduce(
                      (acc, staff) => acc + staff.averageRating,
                      0
                    ) / filteredAndSortedStaff.length
                  ).toFixed(1)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Total Resolved</p>
                <p className="text-2xl font-bold">
                  {filteredAndSortedStaff.reduce(
                    (acc, staff) => acc + staff.resolved,
                    0
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-accent" />
              <div>
                <p className="text-sm font-medium">Avg Resolution Time</p>
                <p className="text-2xl font-bold">
                  {(
                    filteredAndSortedStaff.reduce(
                      (acc, staff) => acc + staff.avgResolutionTime,
                      0
                    ) / filteredAndSortedStaff.length
                  ).toFixed(0)}
                  h
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staff Display */}
      {viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedStaff.map((staff) => (
            <Card
              key={staff.id}
              className="hover:shadow-elegant transition-all duration-300"
            >
              <CardHeader className="text-center">
                <Avatar className="h-16 w-16 mx-auto mb-4">
                  <AvatarImage src={staff.profilePicture} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                    {staff.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <CardTitle className="text-lg">{staff.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {staff.department}
                </p>
                <p className="text-xs text-muted-foreground">
                  {staff.workPlace}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Success Rate</span>
                  <Badge
                    className={getSuccessRateBadgeVariant(staff.successRate)}
                  >
                    {staff.successRate.toFixed(1)}%
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Rating</span>
                  <div className="flex items-center gap-1">
                    {getRatingStars(staff.averageRating)}
                    <span className="text-sm ml-1">{staff.averageRating}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold text-success">
                      {staff.resolved}
                    </p>
                    <p className="text-xs text-muted-foreground">Resolved</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-primary">
                      {staff.inProgress}
                    </p>
                    <p className="text-xs text-muted-foreground">In Progress</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-destructive">
                      {staff.pending}
                    </p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm">Avg Resolution</span>
                  <span className="text-sm font-medium">
                    {staff.avgResolutionTime}h
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Workplace</TableHead>
                    <TableHead>Success Rate</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Resolved</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead>In Progress</TableHead>
                    <TableHead>Avg Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedStaff.map((staff) => (
                    <TableRow key={staff.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={staff.profilePicture} />
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                              {staff.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{staff.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {staff.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{staff.department}</TableCell>
                      <TableCell>{staff.workPlace}</TableCell>
                      <TableCell>
                        <Badge
                          className={getSuccessRateBadgeVariant(
                            staff.successRate
                          )}
                        >
                          {staff.successRate.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getRatingStars(staff.averageRating)}
                          <span className="text-sm ml-1">
                            {staff.averageRating}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-success font-medium">
                          {staff.resolved}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-destructive font-medium">
                          {staff.pending}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-primary font-medium">
                          {staff.inProgress}
                        </span>
                      </TableCell>
                      <TableCell>{staff.avgResolutionTime}h</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {filteredAndSortedStaff.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No staff members found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search criteria or filters
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
