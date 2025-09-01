import {
  listMyDepartmentActiveStaffApi,
  listAllComplaintsApi,
  getMyComplaintsApi,
  listMyAssignedComplaintsApi,
} from "@/lib/api";
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

type StaffMemberWithAcc = StaffMember & {
  _ratings?: number[];
  _resTimes?: number[];
};

export default function StaffPerformance() {
  const { getApprovedStaff, getAllStaff, user } = useAuth();
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("successRate");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [page, setPage] = useState(1);
  const pageSize = 5;

  // Load approved/active staff from context; fallback to all staff and then to department API
  useEffect(() => {
    let cancelled = false;
    async function loadApprovedOnly() {
      try {
        const isApprovedRec = (rec: Record<string, unknown>) => {
          const status = String(rec["status"] ?? "").toLowerCase();
          if (status === "approved" || status === "active") return true;
          if (rec["isApproved"] === true) return true;
          if (rec["approved"] === true) return true;
          if (rec["isActive"] === true) return true;
          return false;
        };

        const rawApproved =
          typeof getApprovedStaff === "function"
            ? await Promise.resolve(getApprovedStaff())
            : [];
        let approvedArr: Record<string, unknown>[] = Array.isArray(rawApproved)
          ? (rawApproved as unknown as Record<string, unknown>[])
          : [];

        if (approvedArr.length === 0) {
          const rawAll =
            typeof getAllStaff === "function"
              ? await Promise.resolve(getAllStaff())
              : [];
          const allArr: Record<string, unknown>[] = Array.isArray(rawAll)
            ? (rawAll as unknown as Record<string, unknown>[])
            : [];
          approvedArr = allArr.filter(isApprovedRec);

          if (approvedArr.length === 0) {
            try {
              const deptRes = await listMyDepartmentActiveStaffApi().catch(
                () => []
              );
              const deptArr: Record<string, unknown>[] = Array.isArray(deptRes)
                ? (deptRes as Record<string, unknown>[])
                : [];
              if (deptArr.length > 0) approvedArr = deptArr;
            } catch (err) {
              // ignore
            }
          }
        }

        if (!cancelled) {
          if (approvedArr.length === 0) {
            setStaffMembers([]);
          } else {
            const mapped = approvedArr.map((r, idx) => {
              const id = String(
                r["_id"] ?? r["id"] ?? r["email"] ?? `approved-${idx}`
              );
              return {
                id,
                name: String(r["fullName"] ?? r["name"] ?? r["email"] ?? ""),
                email: String(r["email"] ?? ""),
                department: String(r["department"] ?? r["dept"] ?? ""),
                workPlace: String(r["workPlace"] ?? r["position"] ?? ""),
                totalAssigned: 0,
                resolved: 0,
                pending: 0,
                inProgress: 0,
                averageRating: 0,
                successRate: 0,
                avgResolutionTime: 0,
                profilePicture: String(
                  r["profilePicture"] ?? r["avatar"] ?? ""
                ),
              } as StaffMember;
            });
            setStaffMembers(mapped);
          }
        }
      } catch (e) {
        // ignore
      }
    }
    loadApprovedOnly();
    return () => {
      cancelled = true;
    };
  }, [getApprovedStaff, getAllStaff]);

  // When staffMembers are present, fetch complaints and compute real metrics
  useEffect(() => {
    if (!staffMembers || staffMembers.length === 0) return;
    let cancelled = false;
    async function loadAndAggregate() {
      try {
        let complaints: Array<Record<string, unknown>> = [];

        // Only call admin endpoint for admin/dean users to avoid 403
        const role = (user && (user.role as string)) || "";
        if (role === "admin" || role === "dean") {
          try {
            const all = await listAllComplaintsApi();
            if (Array.isArray(all))
              complaints = all as Array<Record<string, unknown>>;
          } catch (e) {
            // fallback to other endpoints below
            complaints = [];
          }
        }

        // If not admin/dean, or admin call failed, try non-admin endpoints
        if (complaints.length === 0) {
          // Try HoD/user scoped complaints
          try {
            const mine = await getMyComplaintsApi().catch(() => []);
            if (Array.isArray(mine) && mine.length > 0)
              complaints = mine as Array<Record<string, unknown>>;
          } catch (_) {
            // ignore
          }
        }

        if (complaints.length === 0) {
          try {
            // only call assigned endpoint for staff users to avoid 403 for other roles
            const roleStr = (user && (user.role as string)) || "";
            if (roleStr === "staff") {
              const assigned = await listMyAssignedComplaintsApi().catch(
                () => []
              );
              if (Array.isArray(assigned) && assigned.length > 0)
                complaints = assigned as Array<Record<string, unknown>>;
            }
          } catch (_) {
            // ignore
          }
        }

        // final fallback to public /api/complaints
        if (complaints.length === 0) {
          try {
            const res = await fetch("/api/complaints", {
              credentials: "include",
            }).catch(() => null);
            if (res && res.ok) {
              const ct = res.headers.get("content-type") || "";
              if (ct.includes("application/json"))
                complaints = (await res.json()) as Array<
                  Record<string, unknown>
                >;
            }
          } catch (err) {
            complaints = [];
          }
        }

        if (cancelled) return;

        const byId = new Map<string, number>();
        const byEmail = new Map<string, number>();
        const members: StaffMemberWithAcc[] = staffMembers.map(
          (s) => ({ ...s } as StaffMemberWithAcc)
        );
        members.forEach((m, idx) => {
          byId.set(String(m.id), idx);
          if (m.email) byEmail.set(m.email.toLowerCase(), idx);
        });

        members.forEach((m) => {
          m._ratings = [] as number[];
          m._resTimes = [] as number[];
          m.totalAssigned = 0;
          m.resolved = 0;
          m.pending = 0;
          m.inProgress = 0;
        });

        complaints.forEach((c) => {
          const assignedRaw =
            c["assignedTo"] ?? c["assignedStaff"] ?? c["assigned"] ?? null;
          const assignedEmail =
            typeof assignedRaw === "string" && String(assignedRaw).includes("@")
              ? String(assignedRaw).toLowerCase()
              : undefined;
          const assignedId =
            typeof assignedRaw === "string" && !assignedEmail
              ? String(assignedRaw)
              : undefined;
          const assignedName =
            c["assignedToName"] ??
            c["submittedTo"] ??
            c["assignedName"] ??
            null;

          let idx = undefined as number | undefined;
          if (assignedId && byId.has(assignedId)) idx = byId.get(assignedId);
          else if (assignedEmail && byEmail.has(assignedEmail))
            idx = byEmail.get(assignedEmail);
          else if (assignedName) {
            const an = String(assignedName).toLowerCase();
            const found = members.findIndex((m) =>
              m.name ? an.includes(m.name.toLowerCase().split(" ")[0]) : false
            );
            if (found >= 0) idx = found;
          }

          if (idx === undefined || idx === -1) return;
          const target = members[idx];
          target.totalAssigned = (target.totalAssigned || 0) + 1;
          const status = String(c["status"] ?? "").toLowerCase();
          if (status === "resolved" || status === "closed")
            target.resolved += 1;
          else if (status === "pending" || status === "unassigned")
            target.pending += 1;
          else target.inProgress += 1;

          const fb = c["feedback"] as Record<string, unknown> | undefined;
          if (fb && fb["rating"]) {
            const r =
              typeof fb["rating"] === "number"
                ? fb["rating"]
                : Number(fb["rating"]);
            if (!Number.isNaN(r))
              (target as StaffMemberWithAcc)._ratings!.push(r);
          }

          if (c["resolvedAt"]) {
            const created = c["createdAt"]
              ? new Date(String(c["createdAt"]))
              : new Date();
            const resolved = new Date(String(c["resolvedAt"]));
            const hours = Math.max(
              0,
              (resolved.getTime() - created.getTime()) / (1000 * 60 * 60)
            );
            (target as StaffMemberWithAcc)._resTimes!.push(hours);
          }
        });

        const updated = members.map((m) => {
          const accRatings = (m as StaffMemberWithAcc)._ratings || [];
          const accTimes = (m as StaffMemberWithAcc)._resTimes || [];
          const avgRating = accRatings.length
            ? Number(
                (
                  accRatings.reduce((a, b) => a + b, 0) / accRatings.length
                ).toFixed(2)
              )
            : 0;
          const avgRes = accTimes.length
            ? Math.round(accTimes.reduce((a, b) => a + b, 0) / accTimes.length)
            : 0;
          const successRate = m.totalAssigned
            ? Number(((m.resolved / m.totalAssigned) * 100).toFixed(1))
            : 0;
          delete (m as StaffMemberWithAcc)._ratings;
          delete (m as StaffMemberWithAcc)._resTimes;
          return {
            ...m,
            averageRating: avgRating,
            avgResolutionTime: avgRes,
            successRate,
          } as StaffMember;
        });

        if (!cancelled) setStaffMembers(updated);
      } catch (e) {
        // ignore
      }
    }
    loadAndAggregate();
    return () => {
      cancelled = true;
    };
  }, [staffMembers, user]);

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
