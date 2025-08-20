import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { Search, UserPlus, UserMinus, UserCheck, Users } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Mock user/admin data for demo (replace with backend data later)
type AdminRow = {
  id: string;
  name: string;
  email: string;
  role: "Student" | "Staff" | "HoD" | "Dean" | "Admin" | "SuperAdmin";
  status: "Active" | "Inactive";
};

const mockUsers: AdminRow[] = [
  {
    id: "1",
    name: "Alice Smith",
    email: "alice@college.edu",
    role: "Admin",
    status: "Active",
  },
  {
    id: "2",
    name: "Bob Johnson",
    email: "bob@college.edu",
    role: "Admin",
    status: "Inactive",
  },
  {
    id: "3",
    name: "Priya Patel",
    email: "priya@college.edu",
    role: "Staff",
    status: "Active",
  },
  {
    id: "4",
    name: "Super Admin",
    email: "superadmin@college.edu",
    role: "SuperAdmin",
    status: "Active",
  },
  {
    id: "5",
    name: "John Doe",
    email: "john@college.edu",
    role: "Student",
    status: "Active",
  },
];

export default function AdminManagement() {
  const { user: authUser } = useAuth();
  const canManage = authUser?.role === "admin"; // Only admins can manage

  const [users, setUsers] = useState<AdminRow[]>(mockUsers);
  const [search, setSearch] = useState("");
  const [roleView, setRoleView] = useState<"All" | "Admins" | "NonAdmins">(
    "All"
  );
  const [statusView, setStatusView] = useState<"All" | "Active" | "Inactive">(
    "All"
  );
  const [page, setPage] = useState(1);
  const pageSize = 5;
  useEffect(() => setPage(1), [search, roleView, statusView]);

  // Simple audit log (front-end only; wire to backend later)
  type Audit = { ts: Date; actor: string; action: string; target: string };
  const [audit, setAudit] = useState<Audit[]>([]);
  const logAudit = (action: string, target: string) => {
    const actor = authUser?.email || "unknown";
    setAudit((prev) =>
      [{ ts: new Date(), actor, action, target }, ...prev].slice(0, 20)
    );
  };

  // Filter/search logic
  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchesRoleView =
        roleView === "All"
          ? true
          : roleView === "Admins"
          ? u.role === "Admin" || u.role === "SuperAdmin"
          : !(u.role === "Admin" || u.role === "SuperAdmin");
      const matchesStatus =
        statusView === "All" ? true : u.status === statusView;
      const matchesSearch =
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      return matchesRoleView && matchesStatus && matchesSearch;
    });
  }, [users, search, roleView, statusView]);
  const totalPages = Math.ceil(filtered.length / pageSize);

  // Summary metrics
  const totalAdmins = users.filter(
    (u) => u.role === "Admin" || u.role === "SuperAdmin"
  ).length;
  const activeAdmins = users.filter(
    (u) =>
      (u.role === "Admin" || u.role === "SuperAdmin") && u.status === "Active"
  ).length;
  const inactiveAdmins = users.filter(
    (u) =>
      (u.role === "Admin" || u.role === "SuperAdmin") && u.status === "Inactive"
  ).length;

  // Actions
  const promoteToAdmin = (id: string) => {
    if (!canManage) return;
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, role: "Admin", status: "Active" } : u
      )
    );
    const target = users.find((u) => u.id === id);
    logAudit("Promote to Admin", target ? target.email : id);
  };
  const deactivateAdmin = (id: string) => {
    if (!canManage) return;
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status: "Inactive" } : u))
    );
    const target = users.find((u) => u.id === id);
    logAudit("Deactivate Admin", target ? target.email : id);
  };
  const reactivateAdmin = (id: string) => {
    if (!canManage) return;
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status: "Active" } : u))
    );
    const target = users.find((u) => u.id === id);
    logAudit("Reactivate Admin", target ? target.email : id);
  };

  // Responsive summary cards
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Management</h1>
        <p className="text-muted-foreground">
          Manage admin accounts for Informatics College
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Total Admins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAdmins}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" /> Active Admins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeAdmins}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserMinus className="h-5 w-5" /> Inactive Admins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inactiveAdmins}</div>
          </CardContent>
        </Card>
      </div>
      <Card className="shadow-lg rounded-2xl bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Admin List</CardTitle>
          {!canManage && (
            <Alert className="mt-2">
              <AlertDescription>
                You don't have permission to manage admins. Please sign in as an
                admin.
              </AlertDescription>
            </Alert>
          )}
          <div className="pt-2 flex flex-col lg:flex-row gap-3 lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 rounded-lg"
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={roleView}
                onValueChange={(v: "All" | "Admins" | "NonAdmins") =>
                  setRoleView(v)
                }
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Users</SelectItem>
                  <SelectItem value="Admins">Admins Only</SelectItem>
                  <SelectItem value="NonAdmins">Non-Admins</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={statusView}
                onValueChange={(v: "All" | "Active" | "Inactive") =>
                  setStatusView(v)
                }
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
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
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No admins found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered
                  
                    .slice((page - 1) * pageSize, page * pageSize)
                    .map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              user.role === "SuperAdmin"
                                ? "outline"
                                : "secondary"
                            }
                          >
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              user.status === "Active"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }
                          >
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {user.role !== "SuperAdmin" &&
                            user.role === "Admin" &&
                            user.status === "Active" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deactivateAdmin(user.id)}
                              >
                                <UserMinus className="h-4 w-4 mr-1" />{" "}
                                Deactivate
                              </Button>
                            )}
                          {user.role !== "SuperAdmin" &&
                            user.role === "Admin" &&
                            user.status === "Inactive" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => reactivateAdmin(user.id)}
                              >
                                <UserCheck className="h-4 w-4 mr-1" />{" "}
                                Reactivate
                              </Button>
                            )}
                          {user.role !== "SuperAdmin" &&
                            user.role !== "Admin" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => promoteToAdmin(user.id)}
                              >
                                <UserPlus className="h-4 w-4 mr-1" /> Promote to
                                Admin
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
            {filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No admins found
              </div>
            ) : (
              filtered
                .slice((page - 1) * pageSize, page * pageSize)
                .map((u) => (
                  <Card key={u.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{u.name}</div>
                        <div className="text-xs text-muted-foreground break-all">
                          {u.email}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            u.role === "SuperAdmin" ? "outline" : "secondary"
                          }
                          className="text-xs"
                        >
                          {u.role}
                        </Badge>
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
                      {u.role !== "SuperAdmin" &&
                        u.role === "Admin" &&
                        u.status === "Active" && (
                          <Button
                            className="w-full min-h-11"
                            variant="outline"
                            onClick={() => deactivateAdmin(u.id)}
                          >
                            <UserMinus className="h-4 w-4 mr-2" /> Deactivate
                          </Button>
                        )}
                      {u.role !== "SuperAdmin" &&
                        u.role === "Admin" &&
                        u.status === "Inactive" && (
                          <Button
                            className="w-full min-h-11"
                            variant="outline"
                            onClick={() => reactivateAdmin(u.id)}
                          >
                            <UserCheck className="h-4 w-4 mr-2" /> Reactivate
                          </Button>
                        )}
                      {u.role !== "SuperAdmin" && u.role !== "Admin" && (
                        <Button
                          className="w-full min-h-11"
                          variant="outline"
                          onClick={() => promoteToAdmin(u.id)}
                        >
                          <UserPlus className="h-4 w-4 mr-2" /> Promote to Admin
                        </Button>
                      )}
                    </div>
                  </Card>
                ))
            )}
          </div>
          {/* Pagination Controls */}
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
                              >
                                1
                              </PaginationLink>
                            </PaginationItem>
                            <PaginationItem>
                              <PaginationEllipsis />
                            </PaginationItem>

                            {/* Mobile Cards */}
                            <div className="lg:hidden space-y-3">
                              {filtered.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                  No admins found
                                </div>
                              ) : (
                                filtered
                                  .slice((page - 1) * pageSize, page * pageSize)
                                  .map((u) => (
                                    <Card key={u.id} className="p-4">
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                          <div className="font-medium text-sm">
                                            {u.name}
                                          </div>
                                          <div className="text-xs text-muted-foreground break-all">
                                            {u.email}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Badge
                                            variant={
                                              u.role === "SuperAdmin"
                                                ? "outline"
                                                : "secondary"
                                            }
                                            className="text-xs"
                                          >
                                            {u.role}
                                          </Badge>
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
                                        {u.role !== "SuperAdmin" &&
                                          u.role === "Admin" &&
                                          u.status === "Active" && (
                                            <Button
                                              className="w-full min-h-11"
                                              variant="outline"
                                              onClick={() =>
                                                deactivateAdmin(u.id)
                                              }
                                            >
                                              <UserMinus className="h-4 w-4 mr-2" />{" "}
                                              Deactivate
                                            </Button>
                                          )}
                                        {u.role !== "SuperAdmin" &&
                                          u.role === "Admin" &&
                                          u.status === "Inactive" && (
                                            <Button
                                              className="w-full min-h-11"
                                              variant="outline"
                                              onClick={() =>
                                                reactivateAdmin(u.id)
                                              }
                                            >
                                              <UserCheck className="h-4 w-4 mr-2" />{" "}
                                              Reactivate
                                            </Button>
                                          )}
                                        {u.role !== "SuperAdmin" &&
                                          u.role !== "Admin" && (
                                            <Button
                                              className="w-full min-h-11"
                                              variant="outline"
                                              onClick={() =>
                                                promoteToAdmin(u.id)
                                              }
                                            >
                                              <UserPlus className="h-4 w-4 mr-2" />{" "}
                                              Promote to Admin
                                            </Button>
                                          )}
                                      </div>
                                    </Card>
                                  ))
                              )}
                            </div>
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

          {/* Audit Trail (simple front-end log) */}
          {audit.length > 0 && (
            <div className="pt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Audit Trail (latest 20)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {audit.map((a, idx) => (
                      <div
                        key={idx}
                        className="flex flex-wrap justify-between border-b pb-2 last:border-b-0"
                      >
                        <span className="text-muted-foreground">
                          {a.ts.toLocaleString()}
                        </span>
                        <span>
                          <strong>{a.actor}</strong> — {a.action} —{" "}
                          <em>{a.target}</em>
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
