import { getHodStaffPerformanceApi } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useAuth } from "@/components/auth/AuthContext";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  department?: string;
  totalAssigned: number;
  resolved: number;
  pending: number;
  inProgress: number;
  averageRating: number; // mapped from avgRating
  successRate: number;
  avgResolutionTime: number; // hours
  profilePicture?: string;
}

export default function StaffPerformance() {
  const { user } = useAuth();
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("successRate");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [page, setPage] = useState(1);
  const pageSize = 5;

  // Fetch aggregated staff performance (HoD scope). If user isn't HoD/admin, fallback shows empty list.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        // Accept both 'hod' and 'headOfDepartment' role keys
        const rawRole = user?.role?.toLowerCase();
        const normalizedRole = rawRole === "headofdepartment" ? "hod" : rawRole;
        if (
          !normalizedRole ||
          !["hod", "admin", "dean"].includes(normalizedRole)
        ) {
          setStaffMembers([]);
          return;
        }
        const data = await getHodStaffPerformanceApi();
        if (cancelled) return;
        const mapped: StaffMember[] = (data.staff || []).map((s) => ({
          id: s.staffId,
          name: s.name,
          email: s.email,
          department: s.department,
          totalAssigned: s.totalAssigned,
          resolved: s.resolved,
          pending: s.pending,
          inProgress: s.inProgress,
          averageRating: s.avgRating,
          successRate: s.successRate,
          avgResolutionTime: s.avgResolutionHours,
        }));
        setStaffMembers(mapped);
      } catch (err) {
        if (!cancelled) setStaffMembers([]);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const departments = Array.from(
    new Set(staffMembers.map((s) => s.department || ""))
  ).filter(Boolean);

  const filteredAndSortedStaff = staffMembers
    .filter((staff) => {
      const matchesSearch =
        (staff.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (staff.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (staff.department || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

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

  // Reset page when filters, sorting, or view changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm, departmentFilter, ratingFilter, sortBy, viewMode]);

  // Pagination helpers for table view
  const totalItems = filteredAndSortedStaff.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (page - 1) * pageSize;
  const pagedStaff = useMemo(
    () => filteredAndSortedStaff.slice(startIndex, startIndex + pageSize),
    [filteredAndSortedStaff, startIndex]
  );
  const goToPage = (p: number) => setPage(Math.min(Math.max(1, p), totalPages));
  const getVisiblePages = () => {
    const maxToShow = 5;
    if (totalPages <= maxToShow)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: number[] = [];
    const left = Math.max(1, page - 2);
    const right = Math.min(totalPages, left + maxToShow - 1);
    for (let p = left; p <= right; p++) pages.push(p);
    return pages;
  };

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
                  {filteredAndSortedStaff.length
                    ? (
                        filteredAndSortedStaff.reduce(
                          (acc, staff) => acc + staff.successRate,
                          0
                        ) / filteredAndSortedStaff.length
                      ).toFixed(1)
                    : "0.0"}
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
                  {filteredAndSortedStaff.length
                    ? (
                        filteredAndSortedStaff.reduce(
                          (acc, staff) => acc + staff.averageRating,
                          0
                        ) / filteredAndSortedStaff.length
                      ).toFixed(1)
                    : "0.0"}
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
                  {filteredAndSortedStaff.length
                    ? (
                        filteredAndSortedStaff.reduce(
                          (acc, staff) => acc + staff.avgResolutionTime,
                          0
                        ) / filteredAndSortedStaff.length
                      ).toFixed(0)
                    : "0"}
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
                {/* Removed workplace (not provided by aggregated endpoint) */}
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
                    {/* workplace removed */}
                    <TableHead>Success Rate</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Resolved</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead>In Progress</TableHead>
                    <TableHead>Avg Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedStaff.map((staff) => (
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
                      {/* workplace cell removed */}
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

      {viewMode === "table" && totalPages > 1 && (
        <div className="px-4 md:px-0">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    goToPage(page - 1);
                  }}
                  className={page === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              {getVisiblePages()[0] !== 1 && (
                <>
                  <PaginationItem className="hidden sm:list-item">
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        goToPage(1);
                      }}
                    >
                      1
                    </PaginationLink>
                  </PaginationItem>
                  <PaginationItem className="hidden sm:list-item">
                    <PaginationEllipsis />
                  </PaginationItem>
                </>
              )}
              {getVisiblePages().map((p) => (
                <PaginationItem key={p} className="hidden sm:list-item">
                  <PaginationLink
                    href="#"
                    isActive={p === page}
                    onClick={(e) => {
                      e.preventDefault();
                      goToPage(p);
                    }}
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ))}
              {getVisiblePages().slice(-1)[0] !== totalPages && (
                <>
                  <PaginationItem className="hidden sm:list-item">
                    <PaginationEllipsis />
                  </PaginationItem>
                  <PaginationItem className="hidden sm:list-item">
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        goToPage(totalPages);
                      }}
                    >
                      {totalPages}
                    </PaginationLink>
                  </PaginationItem>
                </>
              )}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    goToPage(page + 1);
                  }}
                  className={
                    page === totalPages ? "pointer-events-none opacity-50" : ""
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
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
