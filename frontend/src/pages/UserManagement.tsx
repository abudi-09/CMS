import { useEffect, useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  UserCheck,
  UserX,
  Search,
  Filter,
  UserPlus,
  Calendar,
  Mail,
  GraduationCap,
  TrendingUp,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  hodGetUsersApi,
  hodActivateUserApi,
  hodDeactivateUserApi,
  hodPromoteUserApi,
  hodDeactivateStaffApi,
  hodReactivateStaffApi,
} from "@/lib/api";

interface DeptUser {
  _id: string;
  name: string;
  email: string;
  department: string;
  role?: "student" | "staff"; // default to student when absent
  createdAt: string;
  status: "Active" | "Inactive";
  complaintsCount?: number;
  lastActivity?: string;
}

function UserManagement() {
  const [students, setStudents] = useState<DeptUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  // Department filter removed
  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 5;

  // Modal state
  const [promoteModalOpen, setPromoteModalOpen] = useState(false);
  const [promoteTarget, setPromoteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [selectedRole, setSelectedRole] = useState<"Staff" | "Admin" | "">("");

  const openPromoteModal = (studentId: string, studentName: string) => {
    setPromoteTarget({ id: studentId, name: studentName });
    setSelectedRole("");
    setPromoteModalOpen(true);
  };

  const closePromoteModal = () => {
    setPromoteModalOpen(false);
    setPromoteTarget(null);
    setSelectedRole("");
  };

  // Fetch students from backend
  useEffect(() => {
    async function fetchUsers() {
      try {
        const users = await hodGetUsersApi();
        type RawUser = {
          _id: string;
          name?: string;
          fullName?: string;
          username?: string;
          email: string;
          department: string;
          role?: string;
          createdAt: string;
          updatedAt?: string;
          isActive?: boolean;
          complaintsCount?: number;
          lastActivity?: string;
        };
        setStudents(
          (users as RawUser[]).map((u) => ({
            _id: u._id,
            name: u.name || u.fullName || u.username || u.email,
            email: u.email,
            department: u.department,
            role:
              u.role === "staff" || u.role === "student"
                ? (u.role as "student" | "staff")
                : "student",
            createdAt: u.createdAt,
            status: u.isActive ? "Active" : "Inactive",
            complaintsCount: u.complaintsCount || 0,
            lastActivity: u.lastActivity || u.updatedAt || u.createdAt,
          }))
        );
      } catch (e) {
        toast({
          title: "Error",
          description: (e as Error).message,
          variant: "destructive",
        });
      }
    }
    fetchUsers();
  }, []);

  const handleDeactivate = async (
    studentId: string,
    studentName: string,
    role: "student" | "staff" | undefined
  ) => {
    try {
      if (role === "staff") {
        await hodDeactivateStaffApi(studentId);
      } else {
        await hodDeactivateUserApi(studentId);
      }
      setStudents((prev) =>
        prev.map((student) =>
          student._id === studentId
            ? { ...student, status: "Inactive" }
            : student
        )
      );
      toast({
        title: "User Deactivated",
        description: `${studentName} has been deactivated.`,
      });
    } catch (e) {
      toast({
        title: "Error",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleActivate = async (
    studentId: string,
    studentName: string,
    role: "student" | "staff" | undefined
  ) => {
    try {
      if (role === "staff") {
        await hodReactivateStaffApi(studentId);
      } else {
        await hodActivateUserApi(studentId);
      }
      setStudents((prev) =>
        prev.map((student) =>
          student._id === studentId ? { ...student, status: "Active" } : student
        )
      );
      toast({
        title: "User Activated",
        description: `${studentName} has been activated.`,
      });
    } catch (e) {
      toast({
        title: "Error",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  };

  const handlePromoteConfirm = async () => {
    if (promoteTarget && selectedRole) {
      if (selectedRole === "Staff") {
        // Prompt for working position
        const workingPlace = window.prompt("Enter working position for staff:");
        if (!workingPlace) {
          toast({ title: "Error", description: "Working position required." });
          return;
        }
        try {
          await hodPromoteUserApi(promoteTarget.id, workingPlace);
          toast({
            title: "Promotion Request",
            description: `${promoteTarget.name} has been promoted to staff. Awaiting approval by HoD.`,
          });
          closePromoteModal();
        } catch (e) {
          toast({
            title: "Error",
            description: (e as Error).message,
            variant: "destructive",
          });
        }
      } else if (selectedRole === "Admin") {
        toast({
          title: "Not Supported",
          description: "Promotion to Admin is not supported via this page.",
        });
        closePromoteModal();
      }
    }
  };

  // Calculate summary stats
  const stats = {
    total: students.length,
    active: students.filter((s) => s.status === "Active").length,
    inactive: students.filter((s) => s.status === "Inactive").length,
  };

  // Filter students
  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "All" || student.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Reset page on filter/search changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter]);

  // Pagination calculations
  const totalItems = filteredStudents.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (page - 1) * pageSize;
  const pagedStudents = filteredStudents.slice(
    startIndex,
    startIndex + pageSize
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

  const departments = Array.from(new Set(students.map((s) => s.department)));

  return (
    <div className="space-y-6">
      {/* Promote Modal */}
      <Dialog open={promoteModalOpen} onOpenChange={setPromoteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promote Student</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="role-select">
                Select new role for{" "}
                <span className="font-semibold">{promoteTarget?.name}</span>:
              </Label>
              <Select
                value={selectedRole}
                onValueChange={(v) => setSelectedRole(v as "Staff" | "Admin")}
              >
                <SelectTrigger id="role-select" className="mt-2 w-full">
                  <SelectValue placeholder="Choose role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Staff">Promote to Staff</SelectItem>
                  <SelectItem value="Admin">Promote to Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closePromoteModal}>
              Cancel
            </Button>
            <Button onClick={handlePromoteConfirm} disabled={!selectedRole}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div>
        <h1 className="text-3xl font-bold text-foreground">User Management</h1>
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

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
        </CardHeader>

        <CardContent>
          {/* Desktop Table */}
          <div className="hidden lg:block rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined Date</TableHead>
                  <TableHead>Complaints</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedStudents.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {totalItems === 0
                        ? searchTerm || statusFilter !== "All"
                          ? "No users match your search criteria"
                          : "No users found"
                        : null}
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedStudents.map((student) => (
                    <TableRow key={student._id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="font-medium">{student.name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{student.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-muted-foreground" />
                          <Badge variant="secondary" className="text-xs">
                            {student.department}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {(student.role || "student").toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`text-xs ${
                            student.status === "Active"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                              : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                          }`}
                          variant="outline"
                        >
                          {student.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {new Date(student.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {student.complaintsCount}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {student.lastActivity
                          ? new Date(student.lastActivity).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          {student.status === "Active" &&
                            (student.role || "student") === "student" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  openPromoteModal(student._id, student.name)
                                }
                                className="hover:bg-blue-50 dark:hover:bg-blue-900/20"
                              >
                                <UserPlus className="h-4 w-4 mr-1" />
                                Promote
                              </Button>
                            )}
                          {student.status === "Active" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleDeactivate(
                                  student._id,
                                  student.name,
                                  student.role
                                )
                              }
                              className="hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600"
                            >
                              <UserX className="h-4 w-4 mr-1" />
                              Deactivate
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleActivate(
                                  student._id,
                                  student.name,
                                  student.role
                                )
                              }
                              className="hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600"
                            >
                              <UserCheck className="h-4 w-4 mr-1" />
                              Activate
                            </Button>
                          )}
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
            {pagedStudents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {totalItems === 0
                  ? searchTerm || statusFilter !== "All"
                    ? "No users match your search criteria"
                    : "No users found"
                  : null}
              </div>
            ) : (
              pagedStudents.map((student) => (
                <Card key={student._id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium">{student.name}</h3>
                      </div>
                      <Badge variant="outline" className="text-xs mr-2">
                        {(student.role || "student").toUpperCase()}
                      </Badge>
                      <Badge
                        className={`text-xs ${
                          student.status === "Active"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                            : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                        }`}
                        variant="outline"
                      >
                        {student.status}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{student.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                        <span>{student.department}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          Joined:{" "}
                          {new Date(student.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {student.complaintsCount} complaints submitted
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {(student.role || "student") === "student" &&
                        student.status === "Active" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              openPromoteModal(student._id, student.name)
                            }
                            className="flex-1 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            Promote
                          </Button>
                        )}
                      {student.status === "Active" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleDeactivate(
                              student._id,
                              student.name,
                              student.role
                            )
                          }
                          className="flex-1 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600"
                        >
                          <UserX className="h-4 w-4 mr-1" />
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleActivate(
                              student._id,
                              student.name,
                              student.role
                            )
                          }
                          className="flex-1 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600"
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          Activate
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pagination Controls */}
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

export default UserManagement;
