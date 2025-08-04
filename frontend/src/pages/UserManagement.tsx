import { useState } from "react";
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

interface Student {
  id: string;
  name: string;
  email: string;
  department: string;
  joinedDate: Date;
  status: "Active" | "Inactive";
  complaintsCount: number;
  lastActivity: Date;
}

// Mock data for students
const mockStudents: Student[] = [
  {
    id: "STU-001",
    name: "John Doe",
    email: "john.doe@student.uog.edu.et",
    department: "Computer Science",
    joinedDate: new Date("2023-09-01"),
    status: "Active",
    complaintsCount: 3,
    lastActivity: new Date("2024-01-20"),
  },
  {
    id: "STU-002",
    name: "Jane Smith",
    email: "jane.smith@student.uog.edu.et",
    department: "Business Administration",
    joinedDate: new Date("2023-09-01"),
    status: "Active",
    complaintsCount: 1,
    lastActivity: new Date("2024-01-18"),
  },
  {
    id: "STU-003",
    name: "Mike Johnson",
    email: "mike.johnson@student.uog.edu.et",
    department: "Engineering",
    joinedDate: new Date("2023-09-01"),
    status: "Inactive",
    complaintsCount: 0,
    lastActivity: new Date("2023-12-15"),
  },
  {
    id: "STU-004",
    name: "Sarah Wilson",
    email: "sarah.wilson@student.uog.edu.et",
    department: "Medicine",
    joinedDate: new Date("2023-09-01"),
    status: "Active",
    complaintsCount: 2,
    lastActivity: new Date("2024-01-22"),
  },
  {
    id: "STU-005",
    name: "David Brown",
    email: "david.brown@student.uog.edu.et",
    department: "Law",
    joinedDate: new Date("2022-09-01"),
    status: "Active",
    complaintsCount: 5,
    lastActivity: new Date("2024-01-25"),
  },
  {
    id: "STU-006",
    name: "Emma Davis",
    email: "emma.davis@student.uog.edu.et",
    department: "Economics",
    joinedDate: new Date("2023-09-01"),
    status: "Inactive",
    complaintsCount: 1,
    lastActivity: new Date("2023-11-30"),
  },
];

export function UserManagement() {
  const [students, setStudents] = useState<Student[]>(mockStudents);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [departmentFilter, setDepartmentFilter] = useState("All");

  const handlePromoteToStaff = (studentId: string, studentName: string) => {
    toast({
      title: "Promotion Request",
      description: `${studentName} has been promoted to staff. They will receive an email notification.`,
    });
  };

  const handleDeactivate = (studentId: string, studentName: string) => {
    setStudents((prev) =>
      prev.map((student) =>
        student.id === studentId
          ? { ...student, status: "Inactive" as const }
          : student
      )
    );

    toast({
      title: "Student Deactivated",
      description: `${studentName} has been deactivated.`,
    });
  };

  const handleActivate = (studentId: string, studentName: string) => {
    setStudents((prev) =>
      prev.map((student) =>
        student.id === studentId
          ? { ...student, status: "Active" as const }
          : student
      )
    );

    toast({
      title: "Student Activated",
      description: `${studentName} has been activated.`,
    });
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
    const matchesDepartment =
      departmentFilter === "All" || student.department === departmentFilter;

    return matchesSearch && matchesStatus && matchesDepartment;
  });

  const departments = Array.from(new Set(students.map((s) => s.department)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">User Management</h1>
        <p className="text-muted-foreground">
          Manage student users and their permissions
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
              <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
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
            <Users className="h-5 w-5" />
            Student Directory ({filteredStudents.length})
          </CardTitle>

          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or department..."
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

              <Select
                value={departmentFilter}
                onValueChange={setDepartmentFilter}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Departments</SelectItem>
                  {departments.map((department) => (
                    <SelectItem key={department} value={department}>
                      {department}
                    </SelectItem>
                  ))}
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
                  <TableHead>Status</TableHead>
                  <TableHead>Joined Date</TableHead>
                  <TableHead>Complaints</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {searchTerm ||
                      statusFilter !== "All" ||
                      departmentFilter !== "All"
                        ? "No students match your search criteria"
                        : "No students found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student) => (
                    <TableRow key={student.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="font-medium">{student.name}</div>
                        <div className="text-sm text-muted-foreground">
                          ID: {student.id}
                        </div>
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
                          {student.joinedDate.toLocaleDateString()}
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
                        {student.lastActivity.toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handlePromoteToStaff(student.id, student.name)
                            }
                            className="hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            Promote
                          </Button>
                          {student.status === "Active" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleDeactivate(student.id, student.name)
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
                                handleActivate(student.id, student.name)
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
            {filteredStudents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ||
                statusFilter !== "All" ||
                departmentFilter !== "All"
                  ? "No students match your search criteria"
                  : "No students found"}
              </div>
            ) : (
              filteredStudents.map((student) => (
                <Card key={student.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium">{student.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          ID: {student.id}
                        </p>
                      </div>
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
                          Joined: {student.joinedDate.toLocaleDateString()}
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handlePromoteToStaff(student.id, student.name)
                        }
                        className="flex-1 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Promote
                      </Button>
                      {student.status === "Active" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleDeactivate(student.id, student.name)
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
                            handleActivate(student.id, student.name)
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
    </div>
  );
}
