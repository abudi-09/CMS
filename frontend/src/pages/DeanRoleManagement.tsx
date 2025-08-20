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

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "student" | "staff" | "headOfDepartment" | "dean" | "admin";
  department?: string | null;
  status: "Active" | "Inactive";
};

// Mock data for demo (replace with real API calls)
const mockUsers: UserRow[] = [
  {
    id: "1",
    name: "Dr. A",
    email: "a@college.edu",
    role: "dean",
    department: "Informatics",
    status: "Active",
  },
  {
    id: "2",
    name: "Dr. B",
    email: "b@college.edu",
    role: "staff",
    department: "Informatics",
    status: "Active",
  },
  {
    id: "3",
    name: "Dr. C",
    email: "c@college.edu",
    role: "dean",
    department: "Informatics",
    status: "Inactive",
  },
  {
    id: "4",
    name: "Alice",
    email: "alice@college.edu",
    role: "staff",
    department: "Informatics",
    status: "Active",
  },
];

export default function DeanRoleManagement() {
  const { user: authUser } = useAuth();
  const canManage = authUser?.role === "admin";

  const [users, setUsers] = useState<UserRow[]>(mockUsers);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "All" | "Active" | "Inactive"
  >("All");
  const [deptFilter, setDeptFilter] = useState<"All" | string>("All");
  const [page, setPage] = useState(1);
  const pageSize = 5;
  useEffect(() => setPage(1), [search, statusFilter, deptFilter]);

  const departments = useMemo(() => {
    const set = new Set(users.map((u) => u.department || "").filter(Boolean));
    return ["All", ...Array.from(set)] as ("All" | string)[];
  }, [users]);

  // Derived lists
  const pending = users.filter(
    (u) => u.role !== "dean" && u.status === "Active"
  );
  const approved = users.filter((u) => u.role === "dean");
  const filteredApproved = useMemo(() => {
    return approved.filter((u) => {
      const matchesStatus =
        statusFilter === "All" ? true : u.status === statusFilter;
      const matchesDept =
        deptFilter === "All" ? true : (u.department || "") === deptFilter;
      const q = search.toLowerCase();
      const matchesSearch =
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      return matchesStatus && matchesDept && matchesSearch;
    });
  }, [approved, statusFilter, deptFilter, search]);
  const totalPages = Math.ceil(filteredApproved.length / pageSize);

  // Summary
  const totalDeans = approved.length;
  const activeDeans = approved.filter((u) => u.status === "Active").length;
  const inactiveDeans = approved.filter((u) => u.status === "Inactive").length;

  // Actions
  const promoteToDean = (id: string) => {
    if (!canManage) return;
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, role: "dean", status: "Active" } : u
      )
    );
  };
  const deactivateDean = (id: string) => {
    if (!canManage) return;
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status: "Inactive" } : u))
    );
  };
  const reactivateDean = (id: string) => {
    if (!canManage) return;
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status: "Active" } : u))
    );
  };

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
            <div className="text-2xl font-bold">{activeDeans}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserMinus className="h-5 w-5" /> Inactive/Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inactiveDeans}</div>
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
                  <TableHead>Department</TableHead>
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
                      <TableRow key={u.id}>
                        <TableCell>{u.name}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>{u.department || "-"}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              u.status === "Active"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }
                          >
                            {u.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {u.status === "Active" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!canManage}
                              onClick={() => deactivateDean(u.id)}
                            >
                              <UserMinus className="h-4 w-4 mr-1" /> Deactivate
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!canManage}
                              onClick={() => reactivateDean(u.id)}
                            >
                              <UserCheck className="h-4 w-4 mr-1" /> Re-approve
                            </Button>
                          )}
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
                  <Card key={u.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{u.name}</div>
                        <div className="text-xs text-muted-foreground break-all">
                          {u.email}
                        </div>
                        <div className="text-xs mt-1">
                          Dept: {u.department || "-"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            u.status === "Active"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }
                        >
                          {u.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {u.status === "Active" ? (
                        <Button
                          className="w-full min-h-11"
                          variant="outline"
                          disabled={!canManage}
                          onClick={() => deactivateDean(u.id)}
                        >
                          <UserMinus className="h-4 w-4 mr-2" /> Deactivate
                        </Button>
                      ) : (
                        <Button
                          className="w-full min-h-11"
                          variant="outline"
                          disabled={!canManage}
                          onClick={() => reactivateDean(u.id)}
                        >
                          <UserCheck className="h-4 w-4 mr-2" /> Re-approve
                        </Button>
                      )}
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

      {/* Pending Nominations (optional list for visibility) */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Requests (Candidates)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="lg:hidden text-sm text-muted-foreground mb-2">
            Tap Promote to Dean to approve
          </div>
          <div className="hidden lg:block overflow-x-auto rounded-md border bg-transparent">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-6 text-muted-foreground"
                    >
                      No pending candidates
                    </TableCell>
                  </TableRow>
                ) : (
                  pending.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{u.department || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!canManage}
                          onClick={() => promoteToDean(u.id)}
                        >
                          <UserCheck className="h-4 w-4 mr-1" /> Promote to Dean
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
            {pending.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                No pending candidates
              </div>
            ) : (
              pending.map((u) => (
                <Card key={u.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-sm">{u.name}</div>
                      <div className="text-xs text-muted-foreground break-all">
                        {u.email}
                      </div>
                      <div className="text-xs mt-1">
                        Dept: {u.department || "-"}
                      </div>
                    </div>
                    <Button
                      className="min-h-11"
                      size="sm"
                      variant="outline"
                      disabled={!canManage}
                      onClick={() => promoteToDean(u.id)}
                    >
                      <UserCheck className="h-4 w-4 mr-2" /> Promote to Dean
                    </Button>
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
