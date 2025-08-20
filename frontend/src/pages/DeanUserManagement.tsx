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
  Calendar,
  TrendingUp,
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

// Mock student data
const mockStudents = [
  {
    id: "s1",
    name: "Alice Johnson",
    email: "alice@univ.edu",
    status: "Active",
    role: "student",
    joinedDate: new Date("2023-09-01"),
    complaintsCount: 3,
    lastActivity: new Date("2024-01-20"),
  },
  {
    id: "s2",
    name: "Bob Lee",
    email: "bob@univ.edu",
    status: "Inactive",
    role: "student",
    joinedDate: new Date("2023-09-01"),
    complaintsCount: 1,
    lastActivity: new Date("2024-01-18"),
  },
  {
    id: "s3",
    name: "Carol King",
    email: "carol@univ.edu",
    status: "Active",
    role: "student",
    joinedDate: new Date("2023-09-01"),
    complaintsCount: 0,
    lastActivity: new Date("2023-12-15"),
  },
  {
    id: "s4",
    name: "David Kim",
    email: "david@univ.edu",
    status: "Inactive",
    role: "student",
    joinedDate: new Date("2023-09-01"),
    complaintsCount: 2,
    lastActivity: new Date("2024-01-22"),
  },
  {
    id: "s5",
    name: "Eve Lin",
    email: "eve@univ.edu",
    status: "Active",
    role: "student",
    joinedDate: new Date("2022-09-01"),
    complaintsCount: 5,
    lastActivity: new Date("2024-01-25"),
  },
];

export default function DeanUserManagement() {
  const [students, setStudents] = useState(mockStudents);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const pageSize = 5;
  // Modal state
  const [promoteModalOpen, setPromoteModalOpen] = useState(false);
  const [promoteTarget, setPromoteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const openPromoteModal = (studentId: string, studentName: string) => {
    setPromoteTarget({ id: studentId, name: studentName });
    setPromoteModalOpen(true);
  };
  const closePromoteModal = () => {
    setPromoteModalOpen(false);
    setPromoteTarget(null);
  };
  const handlePromoteConfirm = () => {
    if (promoteTarget) {
      setStudents((prev) => prev.filter((s) => s.id !== promoteTarget.id));
      closePromoteModal();
    }
  };
  const handleDeactivate = (studentId: string, studentName: string) => {
    setStudents((prev) =>
      prev.map((student) =>
        student.id === studentId ? { ...student, status: "Inactive" } : student
      )
    );
  };
  const handleActivate = (studentId: string, studentName: string) => {
    setStudents((prev) =>
      prev.map((student) =>
        student.id === studentId ? { ...student, status: "Active" } : student
      )
    );
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
      student.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "All" || student.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Reset page on filter/search changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter]);

  // Pagination helpers
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
      {/* Promote Modal */}
      <Dialog open={promoteModalOpen} onOpenChange={setPromoteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promote Student</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="role-select">
                Promote{" "}
                <span className="font-semibold">{promoteTarget?.name}</span> to
                Staff?
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closePromoteModal}>
              Cancel
            </Button>
            <Button onClick={handlePromoteConfirm}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          User Management (Students)
        </h1>
        <p className="text-muted-foreground">
          Manage students in your department
        </p>
      </div>

      {/* Summary Cards */}
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

      {/* Student List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Student Directory ({filteredStudents.length})
          </CardTitle>
          {/* Search and Filters */}
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
          {/* Mobile: cards */}
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
                      <p className="text-muted-foreground">Last Activity</p>
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
                        onClick={() => handleActivate(s.id, s.name)}
                        className="w-full hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600"
                      >
                        <UserCheck className="h-4 w-4 mr-1" /> Activate
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
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

          {/* Desktop Table */}
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
                    <td className="py-2 px-2" colSpan={7}>
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
