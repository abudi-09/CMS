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
import UserProfileModal from "@/components/UserProfileModal";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/components/auth/AuthContext";
import { useNavigate } from "react-router-dom";
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
  previousRole?: string;
};

export default function AdminManagement() {
  const { user: authUser, logout } = useAuth();
  const navigate = useNavigate();
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
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const pageSize = 5;
  useEffect(() => setPage(1), [search, statusView, departmentFilter]);

  // Note: Role edits via generic selector were removed per policy.

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
      // Set previousRole to the user's current role so Revert appears immediately
      setUsers((prev) =>
        prev.map((u) =>
          u._id === id
            ? { ...u, previousRole: u.role, role: "admin", isActive: true }
            : u
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

  // Change role (promote/demote/revert)
  const setUserRole = async (userId: string, newRole?: string) => {
    if (!canManage) return;
    if (!newRole) {
      toast({ title: "Role Required", description: "Select a role to apply." });
      return;
    }
    try {
      const res = await fetch(
        `/api/users/${userId}/promote?role=${encodeURIComponent(newRole)}`,
        {
          method: "PATCH",
          credentials: "include",
        }
      );
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
        // If backend returns the allowed previousRole, auto-retry once using that
        const suggested = (body as { previousRole?: string } | undefined)
          ?.previousRole;
        if (suggested && suggested !== newRole) {
          return await setUserRole(userId, suggested);
        }
        toast({
          title: "Error",
          description: body?.error || body?.message || "Failed to update role.",
        });
        return;
      }
      // Update local table
      const prev = users.find((u) => u._id === userId)?.role || "";
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u._id === userId ? { ...u, role: newRole } : u))
      );
      toast({
        title: "Success",
        description: `Role updated to ${mapRoleLabel(newRole)}.`,
      });
      const target = users.find((u) => u._id === userId);
      logAudit(
        `Set Role: ${prev} -> ${newRole}`,
        target ? target.email : userId
      );
      // If admin changed their own role to non-admin, end session immediately
      if (authUser?.id === userId && newRole !== "admin") {
        const evt = new CustomEvent("auth:logout-with-reason", {
          detail: { reason: "👉 Your role has been updated by Admin." },
        });
        window.dispatchEvent(evt);
        logout();
        navigate("/login", { replace: true });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      toast({
        title: "Error",
        description: message || "Failed to update role.",
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
      if (res.status === 403 && body?.error === "inactive-account") {
        // If the acting user has been deactivated, force logout and redirect
        toast({
          title: "Access Revoked",
          description: body?.message || "Account Deactivated by the admin",
          variant: "destructive",
        });
        logout();
        navigate("/login");
        return;
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
        if (authUser?.id === userId) {
          // If admin deactivated themselves, end session
          logout();
          navigate("/login");
        }
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
        // Include all users (including HODs and Deans) so admins can view and manage accounts as requested.
        // Filter out pending staff/HOD/Dean accounts: these should not appear on Admin page
        const mapped = data
          .map((u: UserDto) => ({
            _id: u._id,
            name: u.fullName || u.name || u.username || u.email,
            email: u.email,
            role: u.role,
            previousRole: u.previousRole,
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
            // If staff/HOD/Dean and explicitly not approved and not rejected => pending -> exclude
            const role = row.role;
            const isStaffOrHodOrDean =
              role === "staff" ||
              role === "headOfDepartment" ||
              role === "hod" ||
              role === "dean";
            if (
              isStaffOrHodOrDean &&
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
            previousRole: u.previousRole,
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
            const isStaffOrHodOrDean =
              role === "staff" ||
              role === "headOfDepartment" ||
              role === "hod" ||
              role === "dean";
            if (
              isStaffOrHodOrDean &&
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
    <div className="space-y-4 md:space-y-6 px-4 md:px-6 lg:px-8">
      <div className="pt-4 md:pt-6">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">
          Admin Management
        </h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
          Manage admin accounts for Informatics College
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        <Card className="p-4 md:p-6">
          <CardHeader className="pb-2 md:pb-3">
            <CardTitle className="flex items-center gap-2 text-sm md:text-base">
              <Users className="h-4 w-4 md:h-5 md:w-5" /> Total Admins
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl md:text-2xl font-bold">{totalAdmins}</div>
          </CardContent>
        </Card>
        <Card className="p-4 md:p-6">
          <CardHeader className="pb-2 md:pb-3">
            <CardTitle className="flex items-center gap-2 text-sm md:text-base">
              <UserCheck className="h-4 w-4 md:h-5 md:w-5" /> Active Admins
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl md:text-2xl font-bold">{activeAdmins}</div>
          </CardContent>
        </Card>
        <Card className="p-4 md:p-6">
          <CardHeader className="pb-2 md:pb-3">
            <CardTitle className="flex items-center gap-2 text-sm md:text-base">
              <UserMinus className="h-4 w-4 md:h-5 md:w-5" /> Inactive Admins
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl md:text-2xl font-bold">
              {inactiveAdmins}
            </div>
          </CardContent>
        </Card>
      </div>
      <Card className="shadow-lg rounded-2xl">
        <CardHeader className="pb-4 md:pb-6">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            Admin List
          </CardTitle>
          {!canManage && (
            <Alert className="mt-3">
              <AlertDescription className="text-sm">
                You don't have permission to manage admins. Please sign in as an
                admin.
              </AlertDescription>
            </Alert>
          )}
          <div className="pt-3 md:pt-4 space-y-4">
            {/* Mobile-first tabs */}
            <div className="w-full overflow-x-auto">
              <Tabs
                defaultValue="All"
                value={roleTab}
                onValueChange={(v: string) => setRoleTab(v)}
              >
                <TabsList className="w-full h-auto p-1 grid grid-cols-3 md:grid-cols-6 gap-1 min-h-[44px]">
                  <TabsTrigger
                    value="All"
                    className="text-xs md:text-sm px-2 md:px-3 py-2 md:py-2.5 min-h-[40px]"
                  >
                    All
                  </TabsTrigger>
                  <TabsTrigger
                    value="Student"
                    className="text-xs md:text-sm px-2 md:px-3 py-2 md:py-2.5 min-h-[40px]"
                  >
                    Student
                  </TabsTrigger>
                  <TabsTrigger
                    value="Staff"
                    className="text-xs md:text-sm px-2 md:px-3 py-2 md:py-2.5 min-h-[40px]"
                  >
                    Staff
                  </TabsTrigger>
                  <TabsTrigger
                    value="HOD"
                    className="text-xs md:text-sm px-2 md:px-3 py-2 md:py-2.5 min-h-[40px]"
                  >
                    HOD
                  </TabsTrigger>
                  <TabsTrigger
                    value="Dean"
                    className="text-xs md:text-sm px-2 md:px-3 py-2 md:py-2.5 min-h-[40px]"
                  >
                    Dean
                  </TabsTrigger>
                  <TabsTrigger
                    value="Admin"
                    className="text-xs md:text-sm px-2 md:px-3 py-2 md:py-2.5 min-h-[40px]"
                  >
                    Admin
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, username or department..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 md:pl-12 h-11 md:h-12 text-sm md:text-base w-full"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Select
                  value={departmentFilter}
                  onValueChange={(v) => setDepartmentFilter(v)}
                >
                  <SelectTrigger className="w-full sm:w-[200px] h-11 md:h-12">
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
                  <SelectTrigger className="w-full sm:w-[150px] h-11 md:h-12">
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
          </div>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto rounded-md border bg-transparent">
            <Table className="bg-transparent min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Full Name</TableHead>
                  <TableHead className="min-w-[200px]">Email</TableHead>
                  <TableHead className="min-w-[100px]">Role</TableHead>
                  <TableHead className="min-w-[180px]">
                    Department / Working Position
                  </TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                  <TableHead className="text-right min-w-[300px]">
                    Actions
                  </TableHead>
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
                          <TableCell className="font-medium">
                            {user.name}
                          </TableCell>
                          <TableCell className="break-all">
                            {user.email}
                          </TableCell>
                          <TableCell>
                            <Badge>{roleLabel}</Badge>
                          </TableCell>
                          <TableCell>{dept}</TableCell>
                          <TableCell>
                            <Badge
                              className={
                                user.isActive
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                  : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                              }
                            >
                              {user.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              {user.isActive && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => promptDeactivate(user._id)}
                                  className="whitespace-nowrap"
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
                                  className="whitespace-nowrap"
                                >
                                  <UserCheck className="h-4 w-4 mr-1" />{" "}
                                  Activate
                                </Button>
                              )}
                              {roleLabel !== "Admin" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => promoteToAdmin(user._id)}
                                  className="whitespace-nowrap"
                                >
                                  <UserPlus className="h-4 w-4 mr-1" /> Promote
                                  to Admin
                                </Button>
                              )}
                              {user.role === "admin" && user.previousRole && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setUserRole(user._id, user.previousRole)
                                  }
                                  className="whitespace-nowrap"
                                >
                                  Revert to Previous
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setProfileUserId(user._id)}
                                className="whitespace-nowrap"
                              >
                                <Users className="h-4 w-4 mr-1" /> View Profile
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-4">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
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
                    <Card key={u._id} className="p-4 md:p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-base md:text-lg mb-1">
                            {u.name}
                          </div>
                          <div className="text-sm text-muted-foreground break-all mb-1">
                            {u.email}
                          </div>
                          {u.username && (
                            <div className="text-xs text-muted-foreground break-all">
                              @{u.username}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge
                            variant="secondary"
                            className="text-xs px-2 py-1"
                          >
                            {roleLabel}
                          </Badge>
                          <Badge
                            className={`text-xs px-2 py-1 ${
                              u.isActive
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                            }`}
                          >
                            {u.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground mb-4">
                        {roleLabel === "Dean"
                          ? `Working Position: ${u.workingPlace || dept}`
                          : `Department: ${dept}`}
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {/* Primary Action Button */}
                        <div className="flex gap-3">
                          {u.isActive ? (
                            <Button
                              className="flex-1 min-h-[44px] text-sm"
                              variant="outline"
                              onClick={() => promptDeactivate(u._id)}
                            >
                              <UserMinus className="h-4 w-4 mr-2" /> Deactivate
                            </Button>
                          ) : (
                            <Button
                              className="flex-1 min-h-[44px] text-sm"
                              variant="default"
                              onClick={() => promptActivate(u._id)}
                            >
                              <UserCheck className="h-4 w-4 mr-2" /> Activate
                            </Button>
                          )}
                        </div>

                        {/* Secondary Action Buttons */}
                        <div className="flex flex-col gap-2">
                          <Button
                            className="w-full min-h-[44px] text-sm"
                            variant="outline"
                            onClick={() => setProfileUserId(u._id)}
                          >
                            <Users className="h-4 w-4 mr-2" /> View Profile
                          </Button>
                          {roleLabel !== "Admin" && (
                            <Button
                              className="w-full min-h-[44px] text-sm"
                              variant="outline"
                              onClick={() => promoteToAdmin(u._id)}
                            >
                              <UserPlus className="h-4 w-4 mr-2" /> Promote to
                              Admin
                            </Button>
                          )}
                          {u.role === "admin" && u.previousRole && (
                            <Button
                              className="w-full min-h-[44px] text-sm"
                              variant="outline"
                              onClick={() => setUserRole(u._id, u.previousRole)}
                            >
                              Revert to Previous Role
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })
            )}
          </div>
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
                    return pages.map((p) => (
                      <PaginationItem key={p}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setPage(p);
                          }}
                          aria-current={p === page ? "page" : undefined}
                          className="min-h-[44px] min-w-[44px] px-3 md:px-4 text-sm"
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
                Page {page} of {totalPages} ({filtered.length} total users)
              </div>
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
      <UserProfileModal
        userId={profileUserId || ""}
        open={!!profileUserId}
        onOpenChange={(o) => !o && setProfileUserId(null)}
      />
    </div>
  );
}
