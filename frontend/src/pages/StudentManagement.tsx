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
import UserProfileModal from "@/components/UserProfileModal";

interface Student {
  _id: string;
  name: string;
  email: string;
  department: string;
  role?: "student"; // only students on this page
  createdAt: string;
  status: "Active" | "Inactive";
  complaintsCount?: number;
  lastActivity?: string;
}

function StudentManagement() {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState<"All" | "student">("All");
  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 5;

  // Modal state
  const [promoteModalOpen, setPromoteModalOpen] = useState(false);
  const [promoteTarget, setPromoteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [selectedRole, setSelectedRole] = useState<"Staff" | "">("");
  const [workingPlace, setWorkingPlace] = useState("");

  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  const openPromoteModal = (studentId: string, studentName: string) => {
    setPromoteTarget({ id: studentId, name: studentName });
    setSelectedRole("");
    setPromoteModalOpen(true);
  };

  const closePromoteModal = () => {
    setPromoteModalOpen(false);
    setPromoteTarget(null);
    setSelectedRole("");
    setWorkingPlace("");
  };

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
        // keep only students
        const onlyStudents: Student[] = (users as RawUser[])
          .filter((u) => !u.role || u.role === "student")
          .map((u) => ({
            _id: u._id,
            name: u.name || u.fullName || u.username || u.email,
            email: u.email,
            department: u.department,
            role: "student",
            createdAt: u.createdAt,
            status: (u.isActive ? "Active" : "Inactive") as Student["status"],
            complaintsCount: u.complaintsCount || 0,
            lastActivity: u.lastActivity || u.updatedAt || u.createdAt,
          }));
        setStudents(onlyStudents);
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

  const handleDeactivate = async (studentId: string, studentName: string) => {
    try {
      await hodDeactivateUserApi(studentId);
      setStudents((prev) =>
        prev.map((s) =>
          s._id === studentId ? { ...s, status: "Inactive" } : s
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

  const handleActivate = async (studentId: string, studentName: string) => {
    try {
      await hodActivateUserApi(studentId);
      setStudents((prev) =>
        prev.map((s) => (s._id === studentId ? { ...s, status: "Active" } : s))
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
        if (!workingPlace || workingPlace.trim() === "") {
          toast({ title: "Error", description: "Working position required." });
          return;
        }
        try {
          const data = await hodPromoteUserApi(
            promoteTarget.id,
            workingPlace.trim()
          );
          // server returns the updated user under data.user
          const promoted = data?.user;
          // remove from students list
          setStudents((prev) => prev.filter((s) => s._id !== promoteTarget.id));

          // dispatch the canonical user object so HODStaffManagement can insert it
          const event = new CustomEvent("hod:staff-promoted", {
            detail: {
              user: promoted,
              status: promoted ? "approved" : "approved",
            },
          });
          window.dispatchEvent(event);

          toast({
            title: "Promotion Successful",
            description: `${
              promoteTarget.name
            } has been promoted to staff (working position: ${workingPlace.trim()}) and added to HOD Staff Management (approved).`,
          });
          setWorkingPlace("");
          closePromoteModal();
        } catch (e) {
          toast({
            title: "Error",
            description: (e as Error).message,
            variant: "destructive",
          });
        }
      }
    }
  };

  const stats = {
    total: students.length,
    active: students.filter((s) => s.status === "Active").length,
    inactive: students.filter((s) => s.status === "Inactive").length,
    complaints: students.reduce((sum, s) => sum + (s.complaintsCount || 0), 0),
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      (student.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.department || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "All" || student.status === statusFilter;
    const matchesRole =
      roleFilter === "All" || (student.role || "student") === roleFilter;
    return matchesSearch && matchesStatus && matchesRole;
  });

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, roleFilter]);

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

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 lg:space-y-8">
      {/* Promote Modal */}
      <Dialog open={promoteModalOpen} onOpenChange={setPromoteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">
              Promote Student
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="role-select" className="text-sm md:text-base">
                Select new role for{" "}
                <span className="font-semibold">{promoteTarget?.name}</span>:
              </Label>
              <Select
                value={selectedRole}
                onValueChange={(v) => setSelectedRole(v as "Staff")}
              >
                <SelectTrigger
                  id="role-select"
                  className="mt-2 w-full h-9 md:h-10"
                >
                  <SelectValue placeholder="Choose role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Staff">Promote to Staff</SelectItem>
                </SelectContent>
              </Select>

              {selectedRole === "Staff" && (
                <div className="mt-3">
                  <Label
                    htmlFor="working-place"
                    className="text-sm md:text-base"
                  >
                    Working position
                  </Label>
                  <Input
                    id="working-place"
                    placeholder="e.g., Lecturer, Lab Assistant"
                    value={workingPlace}
                    onChange={(e) => setWorkingPlace(e.target.value)}
                    className="mt-2 w-full h-9 md:h-10"
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={closePromoteModal}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePromoteConfirm}
              disabled={
                !selectedRole ||
                (selectedRole === "Staff" && !workingPlace.trim())
              }
              className="w-full sm:w-auto"
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-2">
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight">
          Student Management
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Manage student accounts and permissions
        </p>
      </div>

      {/* Stats summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center space-x-2 md:space-x-3">
              <div className="bg-blue-50 p-1.5 md:p-2 rounded-lg dark:bg-blue-900/20 flex-shrink-0">
                <Users className="h-4 w-4 md:h-5 md:w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">
                  Total Students
                </p>
                <p className="text-lg md:text-2xl font-bold text-blue-600">
                  {stats.total}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center space-x-2 md:space-x-3">
              <div className="bg-green-50 p-1.5 md:p-2 rounded-lg dark:bg-green-900/20 flex-shrink-0">
                <UserCheck className="h-4 w-4 md:h-5 md:w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">
                  Active
                </p>
                <p className="text-lg md:text-2xl font-bold text-green-600">
                  {stats.active}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center space-x-2 md:space-x-3">
              <div className="bg-red-50 p-1.5 md:p-2 rounded-lg dark:bg-red-900/20 flex-shrink-0">
                <UserX className="h-4 w-4 md:h-5 md:w-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">
                  Inactive
                </p>
                <p className="text-lg md:text-2xl font-bold text-red-600">
                  {stats.inactive}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center space-x-2 md:space-x-3">
              <div className="bg-orange-50 p-1.5 md:p-2 rounded-lg dark:bg-orange-900/20 flex-shrink-0">
                <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">
                  Total Complaints
                </p>
                <p className="text-lg md:text-2xl font-bold text-orange-600">
                  {stats.complaints}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="p-3 md:p-6">
        <CardHeader className="p-0 pb-3 md:pb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9 md:h-10 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 md:h-10 text-sm">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Status</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Select
                  value={roleFilter}
                  onValueChange={(v) => setRoleFilter(v as "All" | "student")}
                >
                  <SelectTrigger className="h-9 md:h-10 text-sm">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Roles</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-3 md:p-6 pt-0">
          {/* Desktop Table */}
          <div className="hidden lg:block rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px] md:w-[200px] text-sm">
                    Name
                  </TableHead>
                  <TableHead className="text-sm">Email</TableHead>
                  <TableHead className="text-sm">Department</TableHead>
                  <TableHead className="text-sm">Role</TableHead>
                  <TableHead className="text-sm">Status</TableHead>
                  <TableHead className="text-sm">Joined Date</TableHead>
                  <TableHead className="text-sm">Complaints</TableHead>
                  <TableHead className="text-sm">Last Activity</TableHead>
                  <TableHead className="text-right text-sm">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedStudents.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center py-8 text-muted-foreground text-sm md:text-base"
                    >
                      {totalItems === 0
                        ? searchTerm ||
                          statusFilter !== "All" ||
                          roleFilter !== "All"
                          ? "No users match your search criteria"
                          : "No users found"
                        : null}
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedStudents.map((student) => (
                    <TableRow key={student._id} className="hover:bg-muted/50">
                      <TableCell className="font-medium text-sm">
                        <div className="max-w-[150px] md:max-w-[200px] truncate">
                          {student.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="truncate max-w-[200px]">
                            {student.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <Badge
                            variant="secondary"
                            className="text-xs truncate max-w-[120px]"
                          >
                            {student.department}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          STUDENT
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
                          <Calendar className="h-4 w-4 flex-shrink-0" />
                          <span className="whitespace-nowrap">
                            {new Date(student.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium">
                            {student.complaintsCount}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {student.lastActivity
                          ? new Date(student.lastActivity).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 md:gap-2 justify-end flex-wrap">
                          {student.status === "Active" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openPromoteModal(student._id, student.name)
                              }
                              className="hover:bg-blue-50 dark:hover:bg-blue-900/20 text-xs h-8 px-2 md:px-3"
                            >
                              <UserPlus className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                              <span className="hidden sm:inline">Promote</span>
                            </Button>
                          )}
                          {student.status === "Active" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleDeactivate(student._id, student.name)
                              }
                              className="hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 text-xs h-8 px-2 md:px-3"
                            >
                              <UserX className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                              <span className="hidden sm:inline">
                                Deactivate
                              </span>
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleActivate(student._id, student.name)
                              }
                              className="hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 text-xs h-8 px-2 md:px-3"
                            >
                              <UserCheck className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                              <span className="hidden sm:inline">Activate</span>
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setProfileUserId(student._id)}
                            className="hover:bg-gray-50 dark:hover:bg-gray-900/20 text-xs h-8 px-2 md:px-3"
                          >
                            <Users className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                            <span className="hidden sm:inline">
                              View Profile
                            </span>
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
          <div className="lg:hidden space-y-3 md:space-y-4">
            {pagedStudents.length === 0 ? (
              <div className="text-center py-8 md:py-12 text-muted-foreground text-sm md:text-base">
                {totalItems === 0
                  ? searchTerm || statusFilter !== "All" || roleFilter !== "All"
                    ? "No users match your search criteria"
                    : "No users found"
                  : null}
              </div>
            ) : (
              pagedStudents.map((student) => (
                <Card
                  key={student._id}
                  className="p-3 md:p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="space-y-3 md:space-y-4">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm md:text-base leading-tight line-clamp-2">
                          {student.name}
                        </h3>
                        <div className="flex items-center gap-1 mt-1">
                          <Badge variant="outline" className="text-xs">
                            STUDENT
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
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate text-xs md:text-sm">
                          {student.email}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <Badge
                          variant="secondary"
                          className="text-xs truncate max-w-[150px]"
                        >
                          {student.department}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs md:text-sm whitespace-nowrap">
                          Joined:{" "}
                          {new Date(student.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs md:text-sm">
                          {student.complaintsCount} complaints submitted
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-2 border-t">
                      {student.status === "Active" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            openPromoteModal(student._id, student.name)
                          }
                          className="hover:bg-blue-50 dark:hover:bg-blue-900/20 text-xs h-8"
                        >
                          <UserPlus className="h-3 w-3 mr-1" />
                          Promote
                        </Button>
                      )}
                      {student.status === "Active" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleDeactivate(student._id, student.name)
                          }
                          className="hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 text-xs h-8"
                        >
                          <UserX className="h-3 w-3 mr-1" />
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleActivate(student._id, student.name)
                          }
                          className="hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 text-xs h-8"
                        >
                          <UserCheck className="h-3 w-3 mr-1" />
                          Activate
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setProfileUserId(student._id)}
                        className="hover:bg-gray-50 dark:hover:bg-gray-900/20 text-xs h-8"
                      >
                        <Users className="h-3 w-3 mr-1" />
                        View Profile
                      </Button>
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
        <div className="px-3 md:px-0">
          <Pagination>
            <PaginationContent className="flex-wrap gap-1 md:gap-2">
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    goToPage(page - 1);
                  }}
                  className={`${
                    page === 1 ? "pointer-events-none opacity-50" : ""
                  } h-8 md:h-10 px-2 md:px-3 text-xs md:text-sm`}
                />
              </PaginationItem>

              {/* Mobile: Show current page indicator */}
              <PaginationItem className="sm:hidden">
                <span className="px-3 py-2 text-sm text-muted-foreground">
                  {page} of {totalPages}
                </span>
              </PaginationItem>

              {/* Desktop: Show page numbers */}
              {getVisiblePages()[0] !== 1 && (
                <>
                  <PaginationItem className="hidden sm:list-item">
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        goToPage(1);
                      }}
                      className="h-8 md:h-10 px-2 md:px-3 text-xs md:text-sm"
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
                    className="h-8 md:h-10 px-2 md:px-3 text-xs md:text-sm"
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
                      className="h-8 md:h-10 px-2 md:px-3 text-xs md:text-sm"
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
                  className={`${
                    page === totalPages ? "pointer-events-none opacity-50" : ""
                  } h-8 md:h-10 px-2 md:px-3 text-xs md:text-sm`}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Append User Profile Modal */}
      <UserProfileModal
        userId={profileUserId || ""}
        open={!!profileUserId}
        onOpenChange={(o) => !o && setProfileUserId(null)}
      />
    </div>
  );
}

export default StudentManagement;
