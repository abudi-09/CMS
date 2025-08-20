import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserCheck, UserX, Clock, Users, Mail, Building } from "lucide-react";
import { StaffStatus } from "@/components/auth/AuthContext";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type Staff = {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  registeredDate: Date;
  status: string;
};

const mockStaff: Staff[] = [
  {
    id: "staff1",
    name: "John Doe",
    email: "john@university.edu",
    department: "Engineering",
    position: "Lab Technician",
    registeredDate: new Date("2023-09-01"),
    status: "pending",
  },
  {
    id: "staff2",
    name: "Jane Smith",
    email: "jane@university.edu",
    department: "Science",
    position: "Research Assistant",
    registeredDate: new Date("2023-08-15"),
    status: "approved",
  },
  {
    id: "staff3",
    name: "Mike Brown",
    email: "mike@university.edu",
    department: "Business",
    position: "Office Clerk",
    registeredDate: new Date("2023-07-10"),
    status: "rejected",
  },
  {
    id: "staff4",
    name: "Lisa White",
    email: "lisa@university.edu",
    department: "Arts",
    position: "Studio Assistant",
    registeredDate: new Date("2023-09-10"),
    status: "approved",
  },
  {
    id: "staff5",
    name: "Tom Green",
    email: "tom@university.edu",
    department: "Law",
    position: "Legal Secretary",
    registeredDate: new Date("2023-06-20"),
    status: "pending",
  },
  {
    id: "staff6",
    name: "Sara Black",
    email: "sara@university.edu",
    department: "Medicine",
    position: "Nurse",
    registeredDate: new Date("2023-05-05"),
    status: "approved",
  },
];

export interface StaffManagementProps {
  initialStaff?: Staff[];
  showDepartmentColumn?: boolean; // controls visibility of Department column
}

export default function StaffManagement({
  initialStaff,
  showDepartmentColumn = true,
}: StaffManagementProps) {
  const [staff, setStaff] = useState(initialStaff ?? mockStaff);
  const [searchTerm, setSearchTerm] = useState("");
  const [tab, setTab] = useState("approved");
  // Pagination per tab
  const [page, setPage] = useState(1);
  const pageSize = 5;
  useEffect(() => {
    setPage(1);
  }, [searchTerm, tab]);

  const filteredStaff = staff.filter(
    (s) =>
      (s.department.toLowerCase() === "information technology" ||
        s.department.toLowerCase() === "it") &&
      (s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const approvedStaff = filteredStaff.filter((s) => s.status === "approved");
  const pendingStaff = filteredStaff.filter((s) => s.status === "pending");
  const rejectedStaff = filteredStaff.filter((s) => s.status === "rejected");

  // Select active dataset
  const activeData = useMemo(() => {
    if (tab === "pending") return pendingStaff;
    if (tab === "rejected") return rejectedStaff;
    return approvedStaff;
  }, [tab, approvedStaff, pendingStaff, rejectedStaff]);

  // Pagination helpers
  const totalItems = activeData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (page - 1) * pageSize;
  const pagedActive = activeData.slice(startIndex, startIndex + pageSize);
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

  const handleApprove = (id: string) => {
    setStaff((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "approved" } : s))
    );
  };
  const handleReject = (id: string) => {
    setStaff((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "rejected" } : s))
    );
  };
  const handleDeactivate = (id: string) => {
    setStaff((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "deactivated" } : s))
    );
  };

  const StaffTable = ({
    data,
    actions,
  }: {
    data: Staff[];
    actions: (s: Staff) => JSX.Element;
  }) => (
    <div>
      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {data.slice(startIndex, startIndex + pageSize).length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            No staff found
          </div>
        ) : (
          data.slice(startIndex, startIndex + pageSize).map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-semibold">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.email}</div>
                  {showDepartmentColumn && (
                    <div className="text-xs text-muted-foreground">
                      Dept: {s.department}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Position: {s.position}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Registered: {s.registeredDate.toLocaleDateString()}
                  </div>
                </div>
                <Badge
                  className={
                    s.status === "approved"
                      ? "bg-green-100 text-green-800"
                      : s.status === "pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                  }
                >
                  {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                </Badge>
              </div>
              <div className="mt-3 flex flex-col gap-2 [&>button]:w-full">
                {actions(s)}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Position</TableHead>
              {showDepartmentColumn && <TableHead>Department</TableHead>}
              <TableHead>Registration Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.slice(startIndex, startIndex + pageSize).length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showDepartmentColumn ? 7 : 6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No staff found
                </TableCell>
              </TableRow>
            ) : (
              data.slice(startIndex, startIndex + pageSize).map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.email}</TableCell>
                  <TableCell>{s.position}</TableCell>
                  {showDepartmentColumn && (
                    <TableCell>{s.department}</TableCell>
                  )}
                  <TableCell>{s.registeredDate.toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        s.status === "approved"
                          ? "bg-green-100 text-green-800"
                          : s.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }
                    >
                      {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{actions(s)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Staff Management</h1>
        <p className="text-muted-foreground">Manage staff in your university</p>
      </div>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Staff Directory</CardTitle>
          <div className="flex flex-wrap gap-2 mt-4">
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-md text-base md:text-lg py-2 md:py-3 px-4 transition-all"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>
            <TabsContent value="approved">
              <StaffTable
                data={approvedStaff}
                actions={(s) => (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeactivate(s.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <UserX className="h-4 w-4" /> Deactivate
                    </Button>
                  </>
                )}
              />
            </TabsContent>
            <TabsContent value="pending">
              <StaffTable
                data={pendingStaff}
                actions={(s) => (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApprove(s.id)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <UserCheck className="h-4 w-4" /> Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(s.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <UserX className="h-4 w-4" /> Reject
                    </Button>
                  </>
                )}
              />
            </TabsContent>
            <TabsContent value="rejected">
              <StaffTable
                data={rejectedStaff}
                actions={(s) => (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleApprove(s.id)}
                    className="text-green-600 hover:text-green-700"
                  >
                    <UserCheck className="h-4 w-4" /> Re-approve
                  </Button>
                )}
              />
            </TabsContent>
          </Tabs>
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
