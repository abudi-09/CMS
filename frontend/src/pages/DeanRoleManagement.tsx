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
      const [pending, active] = await Promise.all([
        getPendingDeansApi(),
        getActiveDeansApi(),
      ]);
      setPendingDeans(pending);
      setActiveDeans(active);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dean Role Management</h1>
        <p className="text-muted-foreground">
          Promote, deactivate, or reassign deans dynamically.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Total Deans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDeans}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" /> Active Deans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserMinus className="h-5 w-5" /> Inactive/Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inactiveCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="shadow-lg rounded-2xl bg-white dark:bg-gray-800">
        <CardHeader>
          {!canManage && (
            <Alert>
              <AlertDescription>
                Admins only. Sign in as admin to manage deans.
              </AlertDescription>
            </Alert>
          )}
          <div className="pt-2 flex flex-col lg:flex-row gap-3 lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Search by name or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full lg:w-auto">
              <Select
                value={statusFilter}
                onValueChange={(v: "All" | "Active" | "Inactive") =>
                  setStatusFilter(v)
                }
              >
                <SelectTrigger className="w-full sm:w-[160px]">
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
                <SelectTrigger className="w-full sm:w-[180px]">
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
            <Table className="bg-transparent">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Working Position</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                        <TableCell>{u.name}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>{u.workingPlace || "-"}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              u.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }
                          >
                            {u.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
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
                              >
                                <UserCheck className="h-4 w-4 mr-1" />{" "}
                                Reactivate
                              </Button>
                            ))}
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {filteredApproved.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No records found
              </div>
            ) : (
              filteredApproved
                .slice((page - 1) * pageSize, page * pageSize)
                .map((u) => (
                  <Card key={u._id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{u.name}</div>
                        <div className="text-xs text-muted-foreground break-all">
                          {u.email}
                        </div>
                        <div className="text-xs mt-1">
                          Position: {u.workingPlace || "-"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            u.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }
                        >
                          {u.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {canManage &&
                        (u.isActive ? (
                          <Button
                            className="w-full min-h-11"
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
                                toast({ variant: "destructive", title: msg });
                              }
                            }}
                          >
                            <UserMinus className="h-4 w-4 mr-2" /> Deactivate
                          </Button>
                        ) : (
                          <Button
                            className="w-full min-h-11"
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
                                toast({ variant: "destructive", title: msg });
                              }
                            }}
                          >
                            <UserCheck className="h-4 w-4 mr-2" /> Reactivate
                          </Button>
                        ))}
                    </div>
                  </Card>
                ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setPage((p) => Math.max(1, p - 1));
                      }}
                      className={
                        page === 1 ? "pointer-events-none opacity-50" : ""
                      }
                    />
                  </PaginationItem>
                  {(() => {
                    const windowSize = 3;
                    let start = Math.max(1, page - 1);
                    const end = Math.min(totalPages, start + windowSize - 1);
                    if (end - start + 1 < windowSize)
                      start = Math.max(1, end - windowSize + 1);
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
                      className={
                        page === totalPages
                          ? "pointer-events-none opacity-50"
                          : ""
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Dean Sign-ups */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Dean Sign-ups</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="text-sm text-muted-foreground mb-2">Loading…</div>
          )}
          <div className="hidden lg:block overflow-x-auto rounded-md border bg-transparent">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Working Position</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingDeans.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-6 text-muted-foreground"
                    >
                      No pending dean sign-ups
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingDeans.map((u) => (
                    <TableRow key={u._id}>
                      <TableCell>{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{u.workingPlace || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!canManage}
                          onClick={() => approveDean(u._id)}
                        >
                          <UserCheck className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="ml-2"
                          disabled={!canManage}
                          onClick={() => rejectDean(u._id)}
                        >
                          <UserMinus className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards for pending */}
          <div className="lg:hidden space-y-3">
            {pendingDeans.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                No pending dean sign-ups
              </div>
            ) : (
              pendingDeans.map((u) => (
                <Card key={u._id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-sm">{u.name}</div>
                      <div className="text-xs text-muted-foreground break-all">
                        {u.email}
                      </div>
                      <div className="text-xs mt-1">
                        Position: {u.workingPlace || "-"}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        className="min-h-11"
                        size="sm"
                        variant="outline"
                        disabled={!canManage}
                        onClick={() => approveDean(u._id)}
                      >
                        <UserCheck className="h-4 w-4 mr-2" /> Approve
                      </Button>
                      <Button
                        className="min-h-11"
                        size="sm"
                        variant="outline"
                        disabled={!canManage}
                        onClick={() => rejectDean(u._id)}
                      >
                        <UserMinus className="h-4 w-4 mr-2" /> Reject
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
