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
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 lg:space-y-8">
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight">
              Staff Performance
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Monitor staff performance metrics and efficiency
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant={viewMode === "cards" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("cards")}
              className="text-xs md:text-sm h-8 md:h-9 px-3 md:px-4"
            >
              Cards
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="text-xs md:text-sm h-8 md:h-9 px-3 md:px-4"
            >
              Table
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-3 md:p-6">
        <CardHeader className="p-0 pb-3 md:pb-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Search className="h-4 w-4 md:h-5 md:w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-3 md:space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search staff by name, email, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9 md:h-10 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              <Select
                value={departmentFilter}
                onValueChange={setDepartmentFilter}
              >
                <SelectTrigger className="h-9 md:h-10 text-sm">
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
                <SelectTrigger className="h-9 md:h-10 text-sm">
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
                <SelectTrigger className="h-9 md:h-10 text-sm">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="successRate">Success Rate</SelectItem>
                  <SelectItem value="averageRating">Rating</SelectItem>
                  <SelectItem value="resolved">Resolved Count</SelectItem>
                  <SelectItem value="avgResolutionTime">
                    Resolution Time student{" "}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center space-x-2 md:space-x-3">
              <div className="bg-green-50 p-1.5 md:p-2 rounded-lg dark:bg-green-900/20 flex-shrink-0">
                <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">
                  Avg Success Rate
                </p>
                <p className="text-lg md:text-2xl font-bold text-green-600">
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

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center space-x-2 md:space-x-3">
              <div className="bg-yellow-50 p-1.5 md:p-2 rounded-lg dark:bg-yellow-900/20 flex-shrink-0">
                <Star className="h-4 w-4 md:h-5 md:w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">
                  Avg Rating
                </p>
                <p className="text-lg md:text-2xl font-bold">
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

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center space-x-2 md:space-x-3">
              <div className="bg-blue-50 p-1.5 md:p-2 rounded-lg dark:bg-blue-900/20 flex-shrink-0">
                <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">
                  Total Resolved
                </p>
                <p className="text-lg md:text-2xl font-bold">
                  {filteredAndSortedStaff.reduce(
                    (acc, staff) => acc + staff.resolved,
                    0
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center space-x-2 md:space-x-3">
              <div className="bg-orange-50 p-1.5 md:p-2 rounded-lg dark:bg-orange-900/20 flex-shrink-0">
                <Clock className="h-4 w-4 md:h-5 md:w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">
                  Avg Resolution Time
                </p>
                <p className="text-lg md:text-2xl font-bold">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredAndSortedStaff.map((staff) => (
            <Card
              key={staff.id}
              className="hover:shadow-lg transition-all duration-300"
            >
              <CardHeader className="text-center p-4 md:p-6">
                <Avatar className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-3 md:mb-4">
                  <AvatarImage src={staff.profilePicture} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm md:text-lg">
                    {staff.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <CardTitle className="text-base md:text-lg leading-tight">
                  {staff.name}
                </CardTitle>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  {staff.department}
                </p>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0 space-y-3 md:space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs md:text-sm">Success Rate</span>
                  <Badge
                    className={`${getSuccessRateBadgeVariant(
                      staff.successRate
                    )} text-xs px-2 py-1`}
                  >
                    {staff.successRate.toFixed(1)}%
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs md:text-sm">Rating</span>
                  <div className="flex items-center gap-1">
                    <div className="flex">
                      {getRatingStars(staff.averageRating)}
                    </div>
                    <span className="text-xs md:text-sm ml-1">
                      {staff.averageRating}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 md:p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                    <p className="text-sm md:text-lg font-bold text-green-600">
                      {staff.resolved}
                    </p>
                    <p className="text-xs text-muted-foreground">Resolved</p>
                  </div>
                  <div className="p-2 md:p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <p className="text-sm md:text-lg font-bold text-blue-600">
                      {staff.inProgress}
                    </p>
                    <p className="text-xs text-muted-foreground">In Progress</p>
                  </div>
                  <div className="p-2 md:p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                    <p className="text-sm md:text-lg font-bold text-red-600">
                      {staff.pending}
                    </p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-xs md:text-sm">Avg Resolution</span>
                  <span className="text-xs md:text-sm font-medium">
                    {staff.avgResolutionTime}h
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader className="p-3 md:p-6">
            <CardTitle className="text-base md:text-lg">
              Staff Performance Table
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {filteredAndSortedStaff.length} staff member
              {filteredAndSortedStaff.length !== 1 ? "s" : ""} found
            </p>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px] md:w-[250px] text-sm">
                      Staff Member
                    </TableHead>
                    <TableHead className="text-sm">Department</TableHead>
                    <TableHead className="text-sm">Success Rate</TableHead>
                    <TableHead className="text-sm">Rating</TableHead>
                    <TableHead className="text-sm">Resolved</TableHead>
                    <TableHead className="text-sm">Pending</TableHead>
                    <TableHead className="text-sm">In Progress</TableHead>
                    <TableHead className="text-sm">Avg Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedStaff.map((staff) => (
                    <TableRow key={staff.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2 md:gap-3">
                          <Avatar className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0">
                            <AvatarImage src={staff.profilePicture} />
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                              {staff.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-sm md:text-base leading-tight truncate">
                              {staff.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {staff.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="max-w-[100px] md:max-w-none truncate">
                          {staff.department}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${getSuccessRateBadgeVariant(
                            staff.successRate
                          )} text-xs px-2 py-1`}
                        >
                          {staff.successRate.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <div className="flex">
                            {getRatingStars(staff.averageRating)}
                          </div>
                          <span className="text-xs md:text-sm ml-1">
                            {staff.averageRating}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-green-600 font-medium text-sm md:text-base">
                          {staff.resolved}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-red-600 font-medium text-sm md:text-base">
                          {staff.pending}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-blue-600 font-medium text-sm md:text-base">
                          {staff.inProgress}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm md:text-base">
                        {staff.avgResolutionTime}h
                      </TableCell>
                    </TableRow>
                  ))}
                  {pagedStaff.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center text-muted-foreground py-8 text-sm md:text-base"
                      >
                        No staff members found matching your criteria
                      </TableCell>
                    </TableRow>
                  )}
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
                  className={`text-sm px-3 py-2 h-9 ${
                    page === 1 ? "pointer-events-none opacity-50" : ""
                  }`}
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
                      className="text-sm h-9 w-9"
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
                    className="text-sm h-9 w-9"
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
                      className="text-sm h-9 w-9"
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
                  className={`text-sm px-3 py-2 h-9 ${
                    page === totalPages ? "pointer-events-none opacity-50" : ""
                  }`}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {filteredAndSortedStaff.length === 0 && (
        <Card>
          <CardContent className="text-center py-8 md:py-12">
            <AlertCircle className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground mx-auto mb-3 md:mb-4" />
            <h3 className="text-base md:text-lg font-medium mb-2">
              No staff members found
            </h3>
            <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto">
              Try adjusting your search criteria or filters to see staff
              performance data
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
