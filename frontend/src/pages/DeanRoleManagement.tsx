import React, { useMemo, useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Search, UserCheck, UserMinus, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import UserProfileModal from "@/components/UserProfileModal";
import {
  approveDeanApi,
  rejectDeanApi,
  getPendingDeansApi,
  getActiveDeansApi,
  deactivateDeanApi,
  reactivateDeanApi,
} from "@/lib/api";

type Dean = {
  _id: string;
  name: string;
  email: string;
  role: "dean";
  department?: string;
  workingPlace?: string;
  isApproved: boolean;
  isActive: boolean;
};

export default function DeanRoleManagement() {
  const { user: authUser } = useAuth();
  const canManage = authUser?.role === "admin";
  const { toast } = useToast();
  const [activeDeans, setActiveDeans] = useState<Dean[]>([]);
  const [pendingDeans, setPendingDeans] = useState<Dean[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "All" | "Active" | "Inactive"
  >("All");
  const [deptFilter, setDeptFilter] = useState<"All" | string>("All");
  const [page, setPage] = useState(1);
  const pageSize = 5;
  useEffect(() => setPage(1), [search, statusFilter, deptFilter]);

  const departments = useMemo(() => {
    const set = new Set(
      activeDeans.map((u) => u.department || "").filter(Boolean)
    );
    return ["All", ...Array.from(set)] as ("All" | string)[];
  }, [activeDeans]);

  // Derived lists
  const approved = activeDeans;
  const filteredApproved = useMemo(() => {
    return approved.filter((u) => {
      const matchesStatus =
        statusFilter === "All"
          ? true
          : (u.isActive ? "Active" : "Inactive") === statusFilter;
      const matchesDept =
        deptFilter === "All" ? true : (u.department || "") === deptFilter;
      const q = search.toLowerCase();
      const matchesSearch =
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      return matchesStatus && matchesDept && matchesSearch;
    });
  }, [approved, statusFilter, deptFilter, search]);
  const totalPages = Math.ceil(filteredApproved.length / pageSize);
  // Clamp page within bounds when total pages change
  useEffect(() => {
    setPage((prev) => {
      const maxPages = Math.max(1, totalPages);
      return Math.min(Math.max(1, prev), maxPages);
    });
  }, [totalPages]);

  // Summary
  const totalDeans = approved.length;
  const activeCount = approved.filter((u) => u.isActive).length;
  const inactiveCount = approved.filter((u) => !u.isActive).length;

  // Actions
  const approveDean = async (id: string) => {
    if (!canManage) return;
    try {
      await approveDeanApi(id);
      toast({ title: "Dean approved" });
      await loadData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Approve failed";
      toast({ variant: "destructive", title: msg });
    }
  };
  const rejectDean = async (id: string) => {
    if (!canManage) return;
    try {
      await rejectDeanApi(id);
      toast({ title: "Dean rejected" });
      await loadData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Reject failed";
      toast({ variant: "destructive", title: msg });
    }
  };

  const loadData = async () => {
    if (!canManage) return;
    setLoading(true);
    try {
      const [pendingRes, activeRes] = (await Promise.all([
        getPendingDeansApi(),
        getActiveDeansApi(),
      ])) as [Dean[], Dean[]];
      setPendingDeans(pendingRes);
      setActiveDeans(activeRes);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage]);

  return (
    <div className="space-y-4 md:space-y-6 px-4 md:px-6 lg:px-8">
      <div className="pt-4 md:pt-6">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">
          Dean Role Management
        </h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
          Promote, deactivate, or reassign deans dynamically.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        <Card className="p-4 md:p-6">
          <CardHeader className="pb-2 md:pb-3">
            <CardTitle className="flex items-center gap-2 text-sm md:text-base">
              <Users className="h-4 w-4 md:h-5 md:w-5" /> Total Deans
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl md:text-2xl font-bold">{totalDeans}</div>
          </CardContent>
        </Card>
        <Card className="p-4 md:p-6">
          <CardHeader className="pb-2 md:pb-3">
            <CardTitle className="flex items-center gap-2 text-sm md:text-base">
              <UserCheck className="h-4 w-4 md:h-5 md:w-5" /> Active Deans
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl md:text-2xl font-bold">{activeCount}</div>
          </CardContent>
        </Card>
        <Card className="p-4 md:p-6">
          <CardHeader className="pb-2 md:pb-3">
            <CardTitle className="flex items-center gap-2 text-sm md:text-base">
              <UserMinus className="h-4 w-4 md:h-5 md:w-5" /> Inactive/Rejected
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl md:text-2xl font-bold">{inactiveCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="shadow-lg rounded-2xl">
        <CardHeader className="pb-4 md:pb-6">
          {!canManage && (
            <Alert className="mt-3">
              <AlertDescription className="text-sm">
                Admins only. Sign in as admin to manage deans.
              </AlertDescription>
            </Alert>
          )}
          <div className="pt-3 md:pt-4 space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
              <Input
                className="pl-10 md:pl-12 h-11 md:h-12 text-sm md:text-base"
                placeholder="Search by name or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Select
                value={statusFilter}
                onValueChange={(v: "All" | "Active" | "Inactive") =>
                  setStatusFilter(v)
                }
              >
                <SelectTrigger className="w-full sm:w-[160px] h-11 md:h-12">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={deptFilter}
                onValueChange={(v: string) => setDeptFilter(v)}
              >
                <SelectTrigger className="w-full sm:w-[180px] h-11 md:h-12">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto rounded-md border bg-transparent">
            <Table className="bg-transparent min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Name</TableHead>
                  <TableHead className="min-w-[200px]">Email</TableHead>
                  <TableHead className="min-w-[180px]">
                    Working Position
                  </TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                  <TableHead className="text-right min-w-[250px]">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApproved.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No records found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredApproved
                    .slice((page - 1) * pageSize, page * pageSize)
                    .map((u) => (
                      <TableRow key={u._id}>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell className="break-all">{u.email}</TableCell>
                        <TableCell>{u.workingPlace || "-"}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              u.isActive
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                            }
                          >
                            {u.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            {canManage &&
                              (u.isActive ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    try {
                                      await deactivateDeanApi(u._id);
                                      toast({ title: "Dean deactivated" });
                                      await loadData();
                                    } catch (e: unknown) {
                                      const msg =
                                        e instanceof Error
                                          ? e.message
                                          : "Deactivate failed";
                                      toast({
                                        variant: "destructive",
                                        title: msg,
                                      });
                                    }
                                  }}
                                  className="whitespace-nowrap"
                                >
                                  <UserMinus className="h-4 w-4 mr-1" />{" "}
                                  Deactivate
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    try {
                                      await reactivateDeanApi(u._id);
                                      toast({ title: "Dean reactivated" });
                                      await loadData();
                                    } catch (e: unknown) {
                                      const msg =
                                        e instanceof Error
                                          ? e.message
                                          : "Reactivate failed";
                                      toast({
                                        variant: "destructive",
                                        title: msg,
                                      });
                                    }
                                  }}
                                  className="whitespace-nowrap"
                                >
                                  <UserCheck className="h-4 w-4 mr-1" />{" "}
                                  Reactivate
                                </Button>
                              ))}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setProfileUserId(u._id)}
                              className="whitespace-nowrap"
                            >
                              <Users className="h-4 w-4 mr-1" /> View Profile
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-4">
            {filteredApproved.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No records found
              </div>
            ) : (
              filteredApproved
                .slice((page - 1) * pageSize, page * pageSize)
                .map((u) => (
                  <Card key={u._id} className="p-4 md:p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-base md:text-lg mb-1">
                          {u.name}
                        </div>
                        <div className="text-sm text-muted-foreground break-all mb-1">
                          {u.email}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Position: {u.workingPlace || "-"}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge
                          className={`text-xs px-2 py-1 ${
                            u.isActive
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                          }`}
                        >
                          {u.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setProfileUserId(u._id)}
                          className="text-xs px-2 py-1 h-7 min-w-[80px]"
                        >
                          <Users className="h-3 w-3 mr-1" /> View Profile
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {/* Primary Action Button */}
                      <div className="flex gap-3">
                        {canManage &&
                          (u.isActive ? (
                            <Button
                              className="flex-1 min-h-[44px] text-sm"
                              variant="outline"
                              onClick={async () => {
                                try {
                                  await deactivateDeanApi(u._id);
                                  toast({ title: "Dean deactivated" });
                                  await loadData();
                                } catch (e: unknown) {
                                  const msg =
                                    e instanceof Error
                                      ? e.message
                                      : "Deactivate failed";
                                  toast({
                                    variant: "destructive",
                                    title: msg,
                                  });
                                }
                              }}
                            >
                              <UserMinus className="h-4 w-4 mr-2" /> Deactivate
                            </Button>
                          ) : (
                            <Button
                              className="flex-1 min-h-[44px] text-sm"
                              variant="default"
                              onClick={async () => {
                                try {
                                  await reactivateDeanApi(u._id);
                                  toast({ title: "Dean reactivated" });
                                  await loadData();
                                } catch (e: unknown) {
                                  const msg =
                                    e instanceof Error
                                      ? e.message
                                      : "Reactivate failed";
                                  toast({
                                    variant: "destructive",
                                    title: msg,
                                  });
                                }
                              }}
                            >
                              <UserCheck className="h-4 w-4 mr-2" /> Reactivate
                            </Button>
                          ))}
                      </div>
                    </div>
                  </Card>
                ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pt-6 md:pt-8">
              <Pagination>
                <PaginationContent className="flex-wrap gap-1 md:gap-2">
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setPage((p) => Math.max(1, p - 1));
                      }}
                      className={`min-h-[44px] px-3 md:px-4 text-sm ${
                        page === 1 ? "pointer-events-none opacity-50" : ""
                      }`}
                    />
                  </PaginationItem>
                  {(() => {
                    const windowSize = window.innerWidth < 640 ? 3 : 5; // Fewer pages on mobile
                    let start = Math.max(1, page - Math.floor(windowSize / 2));
                    const end = Math.min(totalPages, start + windowSize - 1);
                    if (end - start + 1 < windowSize) {
                      start = Math.max(1, end - windowSize + 1);
                    }
                    const pages: number[] = [];
                    for (let i = start; i <= end; i++) pages.push(i);
                    return (
                      <>
                        {pages[0] !== 1 && (
                          <>
                            <PaginationItem>
                              <PaginationLink
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setPage(1);
                                }}
                                className="min-h-[44px] min-w-[44px] px-3 md:px-4 text-sm"
                              >
                                1
                              </PaginationLink>
                            </PaginationItem>
                            <PaginationItem>
                              <PaginationEllipsis />
                            </PaginationItem>
                          </>
                        )}
                        {pages.map((p) => (
                          <PaginationItem key={p}>
                            <PaginationLink
                              href="#"
                              isActive={p === page}
                              onClick={(e) => {
                                e.preventDefault();
                                setPage(p);
                              }}
                              className="min-h-[44px] min-w-[44px] px-3 md:px-4 text-sm"
                            >
                              {p}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                        {pages[pages.length - 1] !== totalPages && (
                          <>
                            <PaginationItem>
                              <PaginationEllipsis />
                            </PaginationItem>
                            <PaginationItem>
                              <PaginationLink
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setPage(totalPages);
                                }}
                                className="min-h-[44px] min-w-[44px] px-3 md:px-4 text-sm"
                              >
                                {totalPages}
                              </PaginationLink>
                            </PaginationItem>
                          </>
                        )}
                      </>
                    );
                  })()}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setPage((p) => Math.min(totalPages, p + 1));
                      }}
                      className={`min-h-[44px] px-3 md:px-4 text-sm ${
                        page === totalPages
                          ? "pointer-events-none opacity-50"
                          : ""
                      }`}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
              <div className="text-center text-sm text-muted-foreground mt-3">
                Page {page} of {totalPages} ({filteredApproved.length} total
                deans)
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Dean Sign-ups */}
      <Card className="mt-6 md:mt-8">
        <CardHeader className="pb-4 md:pb-6">
          <CardTitle className="text-lg md:text-xl">
            Pending Dean Sign-ups
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="text-sm text-muted-foreground mb-4">Loading…</div>
          )}
          <div className="hidden lg:block overflow-x-auto rounded-md border bg-transparent">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Name</TableHead>
                  <TableHead className="min-w-[200px]">Email</TableHead>
                  <TableHead className="min-w-[180px]">
                    Working Position
                  </TableHead>
                  <TableHead className="text-right min-w-[200px]">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingDeans.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No pending dean sign-ups
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingDeans.map((u) => (
                    <TableRow key={u._id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="break-all">{u.email}</TableCell>
                      <TableCell>{u.workingPlace || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!canManage}
                            onClick={() => approveDean(u._id)}
                            className="whitespace-nowrap"
                          >
                            <UserCheck className="h-4 w-4 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!canManage}
                            onClick={() => rejectDean(u._id)}
                            className="whitespace-nowrap"
                          >
                            <UserMinus className="h-4 w-4 mr-1" /> Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards for pending */}
          <div className="lg:hidden space-y-4">
            {pendingDeans.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No pending dean sign-ups
              </div>
            ) : (
              pendingDeans.map((u) => (
                <Card key={u._id} className="p-4 md:p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-base md:text-lg mb-1">
                        {u.name}
                      </div>
                      <div className="text-sm text-muted-foreground break-all mb-1">
                        {u.email}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Position: {u.workingPlace || "-"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs px-2 py-1">
                        Pending
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {/* Primary Action Buttons */}
                    <div className="flex gap-3">
                      <Button
                        className="flex-1 min-h-[44px] text-sm"
                        variant="default"
                        disabled={!canManage}
                        onClick={() => approveDean(u._id)}
                      >
                        <UserCheck className="h-4 w-4 mr-2" /> Approve
                      </Button>
                      <Button
                        className="flex-1 min-h-[44px] text-sm"
                        variant="outline"
                        disabled={!canManage}
                        onClick={() => rejectDean(u._id)}
                      >
                        <UserMinus className="h-4 w-4 mr-2" /> Reject
                      </Button>
                    </div>

                    {/* Secondary Action Button */}
                    <Button
                      className="w-full min-h-[44px] text-sm"
                      variant="outline"
                      onClick={() => setProfileUserId(u._id)}
                    >
                      <Users className="h-4 w-4 mr-2" /> View Profile
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      <UserProfileModal
        userId={profileUserId || ""}
        open={!!profileUserId}
        onOpenChange={(o) => !o && setProfileUserId(null)}
      />
    </div>
  );
}
