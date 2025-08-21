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
} from "@/components/ui/pagination";
import { Search, UserPlus, UserMinus, UserCheck, Users } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import { getAllUsersApi, UserDto } from "@/lib/api";
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
  _id: string;
  name: string;
  email: string;
  role: string; // backend role: user, staff, headOfDepartment, dean, admin
  isActive?: boolean;
  department?: string;
  username?: string;
};

export default function AdminManagement() {
  const { user: authUser } = useAuth();
  const canManage = authUser?.role === "admin"; // Only admins can manage

  const [users, setUsers] = useState<AdminRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusView, setStatusView] = useState<"All" | "Active" | "Inactive">(
    "All"
  );
  const [departmentFilter, setDepartmentFilter] = useState<string>("All");
  const [page, setPage] = useState(1);
  const pageSize = 5;
  useEffect(() => setPage(1), [search, statusView, departmentFilter]);

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
  // Map backend role -> UI label helper
  const mapRoleLabel = (role: string) => {
    if (!role) return "Unknown";
    switch (role) {
      case "user":
        return "Student";
      case "staff":
        return "Staff";
      case "headOfDepartment":
        return "HOD";
      case "dean":
        return "Dean";
      case "admin":
        return "Admin";
      default:
        return role;
    }
  };

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const roleLabel = mapRoleLabel(u.role);
      const matchesStatus =
        statusView === "All"
          ? true
          : (u.isActive ? "Active" : "Inactive") === statusView;
      const matchesDept = (() => {
        if (departmentFilter === "All") return true;
        // Apply department filter only to Student, Staff, HOD
        if (["Student", "Staff", "HOD"].includes(roleLabel)) {
          return (u.department || "") === departmentFilter;
        }
        return true; // Dean/Admin unaffected by dept filter
      })();
      const q = search.toLowerCase();
      const matchesSearch =
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.username || "").toLowerCase().includes(q) ||
        (u.department || "").toLowerCase().includes(q) ||
        roleLabel.toLowerCase().includes(q);
      return matchesStatus && matchesDept && matchesSearch;
    });
  }, [users, search, statusView, departmentFilter]);
  const totalPages = Math.ceil(filtered.length / pageSize);
  // Clamp page within bounds when total pages change
  useEffect(() => {
    setPage((prev) => {
      const maxPages = Math.max(1, totalPages);
      return Math.min(Math.max(1, prev), maxPages);
    });
  }, [totalPages]);

  const totalAdmins = users.filter((u) => u.role === "admin").length;
  const activeAdmins = users.filter(
    (u) => u.role === "admin" && u.isActive
  ).length;
  const inactiveAdmins = users.filter(
    (u) => u.role === "admin" && !u.isActive
  ).length;

  // Departments (from loaded users)
  const departments = Array.from(
    new Set(users.map((u) => u.department).filter(Boolean))
  ) as string[];

  // Actions
  const promoteToAdmin = (id: string) => {
    if (!canManage) return;
    setUsers((prev) =>
      prev.map((u) =>
        u._id === id ? { ...u, role: "admin", isActive: true } : u
      )
    );
    const target = users.find((u) => u._id === id);
    logAudit("Promote to Admin", target ? target.email : id);
  };
  const deactivateUser = (id: string) => {
    if (!canManage) return;
    setUsers((prev) =>
      prev.map((u) => (u._id === id ? { ...u, isActive: false } : u))
    );
    const target = users.find((u) => u._id === id);
    logAudit("Deactivate User", target ? target.email : id);
  };
  const reactivateUser = (id: string) => {
    if (!canManage) return;
    setUsers((prev) =>
      prev.map((u) => (u._id === id ? { ...u, isActive: true } : u))
    );
    const target = users.find((u) => u._id === id);
    logAudit("Reactivate User", target ? target.email : id);
  };

  // Load all users from backend once
  useEffect(() => {
    (async () => {
      try {
        const data = await getAllUsersApi();
        const mapped = data.map((u: UserDto) => ({
          _id: u._id,
          name: u.fullName || u.name || u.username || u.email,
          email: u.email,
          role: u.role,
          isActive: u.isActive,
          department: u.department,
          username: u.username,
        }));
        setUsers(mapped);
      } catch (e) {
        console.error("Failed to load users", e);
      }
    })();
  }, []);

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
                placeholder="Search by name, email, username or department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 rounded-lg"
              />
            </div>
            <div className="flex gap-2 items-center">
              <Select
                value={departmentFilter}
                onValueChange={(v) => setDepartmentFilter(v)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Departments</SelectItem>
                  <SelectItem value="Computer Science">
                    Computer Science
                  </SelectItem>
                  <SelectItem value="Information Systems">
                    Information Systems
                  </SelectItem>
                  <SelectItem value="Information Science">
                    Information Science
                  </SelectItem>
                  <SelectItem value="Information Technology">
                    Information Technology
                  </SelectItem>
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
                  <TableHead>Full Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered
                    .slice((page - 1) * pageSize, page * pageSize)
                    .map((user) => {
                      const roleLabel = mapRoleLabel(user.role);
                      const dept = ["Student", "Staff", "HOD"].includes(
                        roleLabel
                      )
                        ? user.department || "N/A"
                        : "N/A";
                      return (
                        <TableRow key={user._id}>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.username || ""}</TableCell>
                          <TableCell>
                            <Badge>{roleLabel}</Badge>
                          </TableCell>
                          <TableCell>{dept}</TableCell>
                          <TableCell>
                            <Badge
                              className={
                                user.isActive
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }
                            >
                              {user.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            {user.isActive && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deactivateUser(user._id)}
                              >
                                <UserMinus className="h-4 w-4 mr-1" />{" "}
                                Deactivate
                              </Button>
                            )}
                            {!user.isActive && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => reactivateUser(user._id)}
                              >
                                <UserCheck className="h-4 w-4 mr-1" />{" "}
                                Reactivate
                              </Button>
                            )}
                            {roleLabel !== "Admin" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => promoteToAdmin(user._id)}
                              >
                                <UserPlus className="h-4 w-4 mr-1" /> Promote to
                                Admin
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No users found
              </div>
            ) : (
              filtered
                .slice((page - 1) * pageSize, page * pageSize)
                .map((u) => {
                  const roleLabel = mapRoleLabel(u.role);
                  const dept = ["Student", "Staff", "HOD"].includes(roleLabel)
                    ? u.department || "N/A"
                    : "N/A";
                  return (
                    <Card key={u._id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{u.name}</div>
                          <div className="text-xs text-muted-foreground break-all">
                            {u.email}
                          </div>
                          <div className="text-xs text-muted-foreground break-all">
                            {u.username || ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {roleLabel}
                          </Badge>
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
                      <div className="text-xs mt-2">Department: {dept}</div>
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {u.isActive ? (
                          <Button
                            className="w-full min-h-11"
                            variant="outline"
                            onClick={() => deactivateUser(u._id)}
                          >
                            <UserMinus className="h-4 w-4 mr-2" /> Deactivate
                          </Button>
                        ) : (
                          <Button
                            className="w-full min-h-11"
                            variant="outline"
                            onClick={() => reactivateUser(u._id)}
                          >
                            <UserCheck className="h-4 w-4 mr-2" /> Reactivate
                          </Button>
                        )}
                        {roleLabel !== "Admin" && (
                          <Button
                            className="w-full min-h-11"
                            variant="outline"
                            onClick={() => promoteToAdmin(u._id)}
                          >
                            <UserPlus className="h-4 w-4 mr-2" /> Promote to
                            Admin
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })
            )}
          </div>
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
                    const windowSize = 5;
                    let start = Math.max(1, page - Math.floor(windowSize / 2));
                    const end = Math.min(totalPages, start + windowSize - 1);
                    if (end - start + 1 < windowSize) {
                      start = Math.max(1, end - windowSize + 1);
                    }
                    const pages: number[] = [];
                    for (let i = start; i <= end; i++) pages.push(i);
                    return pages.map((p) => (
                      <PaginationItem key={p}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setPage(p);
                          }}
                          aria-current={p === page ? "page" : undefined}
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    ));
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
    </div>
  );
}
