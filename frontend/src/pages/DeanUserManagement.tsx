import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserCheck,
  UserX,
  UserPlus,
  Search,
  Filter,
  TrendingUp,
  RefreshCcw,
} from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { toast } from "@/hooks/use-toast";
import {
  deanGetUsersApi,
  deanActivateUserApi,
  deanDeactivateUserApi,
  deanPromoteUserApi,
} from "@/lib/api";

interface Student {
  id: string;
  name: string;
  email: string;
  status: "Active" | "Inactive";
  role: "student";
  joinedDate: Date;
  complaintsCount: number;
  lastActivity: Date;
}

type RawUser = {
  _id: string;
  name?: string;
  fullName?: string;
  username?: string;
  email: string;
  department?: string;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
  complaintsCount?: number;
};

function mapStudent(u: RawUser): Student {
  return {
    id: u._id,
    name: u.name || u.fullName || u.username || u.email,
    email: u.email,
    status: u.isActive ? "Active" : "Inactive",
    role: "student",
    joinedDate: u.createdAt ? new Date(u.createdAt) : new Date(),
    complaintsCount: u.complaintsCount || 0,
    lastActivity: u.updatedAt
      ? new Date(u.updatedAt)
      : u.createdAt
      ? new Date(u.createdAt)
      : new Date(),
  };
}

export default function DeanUserManagement() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const [promoteModalOpen, setPromoteModalOpen] = useState(false);
  const [promoteTarget, setPromoteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [workingPlace, setWorkingPlace] = useState("");

  const loadStudents = async () => {
    setLoading(true);
    try {
      const users = await deanGetUsersApi();
      const onlyStudents = (Array.isArray(users) ? users : [])
        .filter((u) => !u.role || u.role === "student")
        .map((u) => mapStudent(u as RawUser));
      setStudents(onlyStudents);
    } catch (e) {
      toast({
        title: "Failed to load students",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const openPromoteModal = (studentId: string, studentName: string) => {
    setPromoteTarget({ id: studentId, name: studentName });
    setWorkingPlace("");
    setPromoteModalOpen(true);
  };

  const closePromoteModal = () => {
    setPromoteModalOpen(false);
    setPromoteTarget(null);
    setWorkingPlace("");
  };

  const handlePromoteConfirm = async () => {
    if (!promoteTarget) return;
    if (!workingPlace.trim()) {
      toast({
        title: "Working position required",
        description: "Enter a working position before promoting to staff.",
        variant: "destructive",
      });
      return;
    }
    setProcessingId(promoteTarget.id);
    try {
      const data = await deanPromoteUserApi(
        promoteTarget.id,
        workingPlace.trim()
      );
      setStudents((prev) => prev.filter((s) => s.id !== promoteTarget.id));
      window.dispatchEvent(
        new CustomEvent("dean:staff-promoted", {
          detail: { user: data?.user, status: "approved" },
        })
      );
      toast({
        title: "Promotion successful",
        description: `${promoteTarget.name} has been promoted to staff.`,
      });
      closePromoteModal();
    } catch (e) {
      toast({
        title: "Promotion failed",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeactivate = async (studentId: string, studentName: string) => {
    setProcessingId(studentId);
    try {
      await deanDeactivateUserApi(studentId);
      setStudents((prev) =>
        prev.map((s) =>
          s.id === studentId ? { ...s, status: "Inactive" } : s
        )
      );
      toast({
        title: "User deactivated",
        description: `${studentName} has been deactivated.`,
      });
    } catch (e) {
      toast({
        title: "Action failed",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleActivate = async (studentId: string, studentName: string) => {
    setProcessingId(studentId);
    try {
      await deanActivateUserApi(studentId);
      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, status: "Active" } : s))
      );
      toast({
        title: "User activated",
        description: `${studentName} has been activated.`,
      });
    } catch (e) {
      toast({
        title: "Action failed",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const stats = {
    total: students.length,
    active: students.filter((s) => s.status === "Active").length,
    inactive: students.filter((s) => s.status === "Inactive").length,
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "All" || student.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter]);

  const totalItems = filteredStudents.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (page - 1) * pageSize;
  const pagedStudents = useMemo(
    () => filteredStudents.slice(startIndex, startIndex + pageSize),
    [filteredStudents, startIndex]
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

  return (
    <div className="space-y-6">
      <Dialog open={promoteModalOpen} onOpenChange={setPromoteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promote Student to Staff</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Promote{" "}
              <span className="font-semibold text-foreground">
                {promoteTarget?.name}
              </span>{" "}
              to staff in your department.
            </p>
            <div>
              <Label htmlFor="working-place">Working position</Label>
              <Input
                id="working-place"
                value={workingPlace}
                onChange={(e) => setWorkingPlace(e.target.value)}
                placeholder="e.g. IT Support Officer"
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closePromoteModal}>
              Cancel
            </Button>
            <Button
              onClick={handlePromoteConfirm}
              disabled={processingId === promoteTarget?.id}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            User Management (Students)
          </h1>
          <p className="text-muted-foreground">
            Manage students in your department
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadStudents}
          disabled={loading}
        >
          <RefreshCcw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Students
            </CardTitle>
            <div className="bg-blue-50 p-2 rounded-lg dark:bg-blue-900/20">
              <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Registered users</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Students
            </CardTitle>
            <div className="bg-green-50 p-2 rounded-lg dark:bg-green-900/20">
              <UserCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Inactive Students
            </CardTitle>
            <div className="bg-red-50 p-2 rounded-lg dark:bg-red-900/20">
              <UserX className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inactive}</div>
            <p className="text-xs text-muted-foreground">
              Deactivated accounts
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Student Directory ({filteredStudents.length})
          </CardTitle>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
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
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Loading students...
            </p>
          ) : (
            <>
              <div className="lg:hidden space-y-3">
                {pagedStudents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    No students found
                  </div>
                ) : (
                  pagedStudents.map((s) => (
                    <div key={s.id} className="border rounded-lg p-4 bg-card">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-base">{s.name}</p>
                          <p className="text-xs text-muted-foreground break-all">
                            {s.email}
                          </p>
                        </div>
                        <Badge
                          className={
                            s.status === "Active"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-200 text-gray-600"
                          }
                        >
                          {s.status}
                        </Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Joined</p>
                          <p className="font-medium">
                            {s.joinedDate.toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Complaints</p>
                          <p className="font-medium">{s.complaintsCount}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">
                            Last Activity
                          </p>
                          <p className="font-medium">
                            {s.lastActivity.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-col sm:flex-row gap-2">
                        {s.status === "Active" && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={processingId === s.id}
                            onClick={() => handleDeactivate(s.id, s.name)}
                            className="w-full hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600"
                          >
                            <UserX className="h-4 w-4 mr-1" /> Deactivate
                          </Button>
                        )}
                        {s.status === "Inactive" && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={processingId === s.id}
                            onClick={() => handleActivate(s.id, s.name)}
                            className="w-full hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600"
                          >
                            <UserCheck className="h-4 w-4 mr-1" /> Activate
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={processingId === s.id}
                          onClick={() => openPromoteModal(s.id, s.name)}
                          className="w-full hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          <UserPlus className="h-4 w-4 mr-1" /> Promote
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="hidden md:block rounded-md border overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Name</th>
                      <th className="text-left py-2 px-2">Email</th>
                      <th className="text-left py-2 px-2">Status</th>
                      <th className="text-left py-2 px-2">Joined Date</th>
                      <th className="text-left py-2 px-2">Complaints</th>
                      <th className="text-left py-2 px-2">Last Activity</th>
                      <th className="py-2 px-2 text-middle">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedStudents.length === 0 ? (
                      <tr>
                        <td className="py-8 px-2 text-center text-muted-foreground" colSpan={7}>
                          No students found
                        </td>
                      </tr>
                    ) : (
                      pagedStudents.map((s) => (
                        <tr key={s.id} className="border-b">
                          <td className="py-2 px-2">{s.name}</td>
                          <td className="py-2 px-2">{s.email}</td>
                          <td className="py-2 px-2">
                            <Badge
                              className={
                                s.status === "Active"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-200 text-gray-600"
                              }
                            >
                              {s.status}
                            </Badge>
                          </td>
                          <td className="py-2 px-2">
                            {s.joinedDate.toLocaleDateString()}
                          </td>
                          <td className="py-2 px-2">{s.complaintsCount}</td>
                          <td className="py-2 px-2">
                            {s.lastActivity.toLocaleDateString()}
                          </td>
                          <td className="py-2 px-2 text-right">
                            <div className="flex gap-2 justify-end">
                              {s.status === "Active" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={processingId === s.id}
                                  onClick={() => handleDeactivate(s.id, s.name)}
                                  className="hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600"
                                >
                                  <UserX className="h-4 w-4 mr-1" />
                                  Deactivate
                                </Button>
                              )}
                              {s.status === "Inactive" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={processingId === s.id}
                                  onClick={() => handleActivate(s.id, s.name)}
                                  className="hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600"
                                >
                                  <UserCheck className="h-4 w-4 mr-1" />
                                  Activate
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={processingId === s.id}
                                onClick={() => openPromoteModal(s.id, s.name)}
                                className="hover:bg-blue-50 dark:hover:bg-blue-900/20"
                              >
                                <UserPlus className="h-4 w-4 mr-1" />
                                Promote
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
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
    </div>
  );
}
