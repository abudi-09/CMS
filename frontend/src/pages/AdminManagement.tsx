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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/components/auth/AuthContext";
import { getAllUsersApi, UserDto } from "@/lib/api";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { toast } from "@/hooks/use-toast";
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
  role: string; // backend role: student|user, staff, hod|headOfDepartment, dean, admin
  isActive?: boolean;
  department?: string;
  workingPlace?: string;
  username?: string;
  isApproved?: boolean;
  isRejected?: boolean;
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
  const [roleTab, setRoleTab] = useState<string>("All");

  const statusLabel = (u: AdminRow) => {
    if (
      u.role === "staff" ||
      u.role === "headOfDepartment" ||
      u.role === "dean"
    ) {
      // staff/HOD/dean may be pending approval
      if (u.isApproved === false) return "Pending Approval";
    }
    return u.isActive ? "Active" : "Inactive";
  };
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
      case "student":
        return "Student";
      case "staff":
        return "Staff";
      case "headOfDepartment":
      case "hod":
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
      // Tab filter
      const matchesTab = roleTab === "All" ? true : roleLabel === roleTab;
      const matchesStatus =
        statusView === "All"
          ? true
          : (u.isActive ? "Active" : "Inactive") === statusView;
      const matchesDept = (() => {
        if (departmentFilter === "All") return true;
        if (["Student", "Staff", "HOD"].includes(roleLabel)) {
          return (u.department || "") === departmentFilter;
        }
        return true;
      })();
      const q = search.toLowerCase();
      const matchesSearch =
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.username || "").toLowerCase().includes(q) ||
        (u.department || "").toLowerCase().includes(q) ||
        (u.workingPlace || "").toLowerCase().includes(q) ||
        roleLabel.toLowerCase().includes(q);
      return matchesTab && matchesStatus && matchesDept && matchesSearch;
    });
  }, [users, search, statusView, departmentFilter, roleTab]);
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

  // Actions via API
  const promoteToAdmin = async (id: string) => {
    if (!canManage) return;
    try {
      const res = await fetch(`/api/users/${id}/promote?role=admin`, {
        method: "PATCH",
        credentials: "include",
      });
      const text = await res.text();
      const body = text
        ? (() => {
            try {
              return JSON.parse(text);
            } catch {
              return { message: text };
            }
          })()
        : undefined;
      if (!res.ok) {
        toast({
          title: "Error",
          description:
            body?.error ||
            body?.message ||
            "Failed to promote user. Please try again.",
        });
        return;
      }
      setUsers((prev) =>
        prev.map((u) =>
          u._id === id ? { ...u, role: "admin", isActive: true } : u
        )
      );
      toast({
        title: "Success",
        description: "User promoted to admin successfully.",
      });
      const target = users.find((u) => u._id === id);
      logAudit("Promote to Admin", target ? target.email : id);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      toast({
        title: "Error",
        description: message || "Failed to promote user.",
      });
    }
  };

  // Confirm dialog statecls

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmWarning, setConfirmWarning] = useState<string | undefined>(
    undefined
  );
  const [pendingAction, setPendingAction] = useState<
    { type: "activate" | "deactivate"; userId: string } | undefined
  >(undefined);
  const handleActionConfirm = async () => {
    if (!pendingAction) return;
    const { type, userId } = pendingAction;
    try {
      // As required: PATCH /api/users/:id/activate|deactivate
      const url = `/api/users/${userId}/${
        type === "activate" ? "activate" : "deactivate"
      }`;
      const res = await fetch(url, {
        method: "PATCH",
        credentials: "include",
      });
      // Safely parse response body: server may return empty response which makes res.json() throw
      const text = await res.text();
      let body: { error?: string; message?: string } | undefined = undefined;
      if (text) {
        try {
          body = JSON.parse(text);
        } catch (e) {
          // Not JSON, fall back to raw text
          body = { message: text };
        }
      }
      if (!res.ok) {
        const fallback =
          type === "activate"
            ? "Failed to reactivate user. Please try again."
            : "Failed to deactivate user. Please try again.";
        toast({
          title: "Error",
          description: body?.error || body?.message || fallback,
        });
        return;
      }
      // Update table immediately
      setUsers((prev) =>
        prev.map((u) =>
          u._id === userId ? { ...u, isActive: type === "activate" } : u
        )
      );
      if (type === "activate") {
        toast({
          title: "Success",
          description: "User reactivated successfully",
        });
        logAudit("Activate User", userId);
      } else {
        toast({
          title: "Success",
          description: "User deactivated successfully",
        });
        logAudit("Deactivate User", userId);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: "Error", description: message || "Request failed" });
    } finally {
      setPendingAction(undefined);
      setConfirmOpen(false);
    }
  };

  const promptActivate = (userId: string) => {
    setConfirmTitle("Are you sure you want to activate this user?");
    setConfirmWarning(undefined);
    setPendingAction({ type: "activate", userId });
    setConfirmOpen(true);
  };

  const promptDeactivate = (userId: string) => {
    setConfirmTitle("Are you sure you want to deactivate this user?");
    setConfirmWarning("They will not be able to access the system.");
    setPendingAction({ type: "deactivate", userId });
    setConfirmOpen(true);
  };

  // Load all users from backend once
  useEffect(() => {
    (async () => {
      try {
        const data = await getAllUsersApi();
        // Include all users (including HODs) so admins can view and manage HOD accounts as requested.
        // Filter out pending staff/HOD accounts: these should not appear on Admin page
        const mapped = data
          .map((u: UserDto) => ({
            _id: u._id,
            name: u.fullName || u.name || u.username || u.email,
            email: u.email,
            role: u.role,
            isActive: u.isActive,
            isApproved: (u as unknown as { isApproved?: boolean }).isApproved,
            isRejected: (u as unknown as { isRejected?: boolean }).isRejected,
            department: u.department,
            workingPlace: (u as unknown as Record<string, unknown>)[
              "workingPlace"
            ] as string | undefined,
            username: u.username,
          }))
          .filter((row) => {
            // If staff/HOD and explicitly not approved and not rejected => pending -> exclude
            const role = row.role;
            const isStaffOrHod =
              role === "staff" || role === "headOfDepartment" || role === "hod";
            if (
              isStaffOrHod &&
              row.isApproved === false &&
              row.isRejected !== true
            ) {
              return false;
            }
            return true;
          });
        setUsers(mapped);
      } catch (e) {
        console.error("Failed to load users", e);
      }
    })();
  }, []);

  // Refresh when HoDs are updated elsewhere (Dean actions)
  useEffect(() => {
    const handler = async () => {
      try {
        const data = await getAllUsersApi();
        const mapped = data
          .map((u: UserDto) => ({
            _id: u._id,
            name: u.fullName || u.name || u.username || u.email,
            email: u.email,
            role: u.role,
            isActive: u.isActive,
            isApproved: (u as unknown as { isApproved?: boolean }).isApproved,
            isRejected: (u as unknown as { isRejected?: boolean }).isRejected,
            department: u.department,
            workingPlace: (u as unknown as Record<string, unknown>)[
              "workingPlace"
            ] as string | undefined,
            username: u.username,
          }))
          .filter((row) => {
            const role = row.role;
            const isStaffOrHod =
              role === "staff" || role === "headOfDepartment" || role === "hod";
            if (
              isStaffOrHod &&
              row.isApproved === false &&
              row.isRejected !== true
            ) {
              return false;
            }
            return true;
          });
        setUsers(mapped);
      } catch (err) {
        console.error("Failed to refresh users on hod:updated", err);
      }
    };
    window.addEventListener("hod:updated", handler as EventListener);
    return () =>
      window.removeEventListener("hod:updated", handler as EventListener);
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
            <div className="mb-3 w-full">
              <Tabs
                defaultValue="All"
                value={roleTab}
                onValueChange={(v: string) => setRoleTab(v)}
              >
                <TabsList>
                  <TabsTrigger value="All">All</TabsTrigger>
                  <TabsTrigger value="Student">Student</TabsTrigger>
                  <TabsTrigger value="Staff">Staff</TabsTrigger>
                  <TabsTrigger value="HOD">Head of Department</TabsTrigger>
                  <TabsTrigger value="Dean">Dean</TabsTrigger>
                  <TabsTrigger value="Admin">Admin</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 lg:left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 lg:h-6 lg:w-6 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, username or department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 lg:pl-16 rounded-lg h-12 text-lg lg:w-96"
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
                  <TableHead>Role</TableHead>
                  <TableHead>Department / Working Position</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
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
                      const dept =
                        roleLabel === "Dean"
                          ? user.workingPlace || "N/A"
                          : ["Student", "Staff", "HOD"].includes(roleLabel)
                          ? user.department || "N/A"
                          : "N/A";
                      return (
                        <TableRow key={user._id}>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
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
                                onClick={() => promptDeactivate(user._id)}
                              >
                                <UserMinus className="h-4 w-4 mr-1" />{" "}
                                Deactivate
                              </Button>
                            )}
                            {!user.isActive && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => promptActivate(user._id)}
                              >
                                <UserCheck className="h-4 w-4 mr-1" /> Activate
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
                      <div className="text-xs mt-2">
                        {roleLabel === "Dean"
                          ? "Working Position: "
                          : "Department: "}
                        {dept}
                      </div>
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {u.isActive ? (
                          <Button
                            className="w-full min-h-11"
                            variant="outline"
                            onClick={() => promptDeactivate(u._id)}
                          >
                            <UserMinus className="h-4 w-4 mr-2" /> Deactivate
                          </Button>
                        ) : (
                          <Button
                            className="w-full min-h-11"
                            variant="outline"
                            onClick={() => promptActivate(u._id)}
                          >
                            <UserCheck className="h-4 w-4 mr-2" /> Activate
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
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmTitle}
        warning={confirmWarning}
        onConfirm={handleActionConfirm}
        onCancel={() => {
          setPendingAction(undefined);
          setConfirmOpen(false);
        }}
        confirmText={
          pendingAction?.type === "activate" ? "Activate" : "Deactivate"
        }
        cancelText="Cancel"
      />
    </div>
  );
}
