import { useEffect, useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Search, UserPlus } from "lucide-react";
import { RoleBasedComplaintModal } from "@/components/RoleBasedComplaintModal";
import { useAuth } from "@/components/auth/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useState as useReactState } from "react";
import { Complaint as ComplaintType } from "@/components/ComplaintCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
// Use ComplaintType for all references to Complaint

const statusColors = {
  Pending: "bg-yellow-100 text-yellow-800",
  "In Progress": "bg-blue-100 text-blue-800",
  Resolved: "bg-green-100 text-green-800",
  Closed: "bg-gray-100 text-gray-800",
  Delayed: "bg-red-100 text-red-800",
};

export function HoDAssignComplaints() {
  // State for deadline during assignment
  const [assigningDeadline, setAssigningDeadline] = useState<string>("");
  const { getAllStaff, user } = useAuth();
  // Pagination state
  const [page, setPage] = useState(1);
  const pageSize = 5;
  // Real complaints loaded from backend and scoped to this HOD
  const [complaints, setComplaints] = useReactState<ComplaintType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchComplaints() {
      try {
        const res = await fetch("http://localhost:5000/api/complaints", {
          credentials: "include",
        });
        const data = await res.json();
        if (!Array.isArray(data)) {
          setComplaints([]);
          setLoading(false);
          return;
        }
        const staffList = getAllStaff();
        const mapped = (data as Array<Record<string, unknown>>).map((obj) => {
          const id = String(obj["_id"] ?? obj["id"] ?? "");
          const title = String(obj["title"] ?? "");
          const category = String(obj["category"] ?? "General");
          const priority = String(
            obj["priority"] ?? "Medium"
          ) as ComplaintType["priority"];
          const status = String(
            obj["status"] ?? "Pending"
          ) as ComplaintType["status"];
          const department = obj["department"]
            ? String(obj["department"])
            : undefined;
          let submittedBy = "Unknown";
          const sb = obj["submittedBy"];
          if (sb) {
            if (typeof sb === "string") submittedBy = sb;
            else if (typeof sb === "object") {
              const sbo = sb as Record<string, unknown>;
              submittedBy = String(
                sbo["name"] ?? sbo["fullName"] ?? sbo["email"] ?? "User"
              );
            }
          }
          const submittedTo = obj["submittedTo"]
            ? String(obj["submittedTo"])
            : undefined;
          const assignedToRaw = obj["assignedTo"] ?? obj["assignedStaff"];
          let assignedStaff: string | undefined = undefined;
          if (submittedTo) assignedStaff = submittedTo;
          else if (typeof assignedToRaw === "string") {
            const staff = staffList.find((s) => s.id === assignedToRaw);
            if (staff) assignedStaff = staff.fullName || staff.name;
            else assignedStaff = assignedToRaw;
          }
          const createdAt = obj["createdAt"]
            ? new Date(String(obj["createdAt"]))
            : new Date();
          const lastUpdated = obj["updatedAt"]
            ? new Date(String(obj["updatedAt"]))
            : createdAt;
          const deadline = obj["deadline"]
            ? new Date(String(obj["deadline"]))
            : undefined;

          return {
            id,
            title,
            description: String(obj["description"] ?? ""),
            category,
            priority,
            status,
            submittedBy,
            assignedStaff,
            assignedStaffRole: obj["assignedStaffRole"]
              ? (String(
                  obj["assignedStaffRole"]
                ) as ComplaintType["assignedStaffRole"])
              : undefined,
            assignedByRole: obj["assignedByRole"]
              ? (String(
                  obj["assignedByRole"]
                ) as ComplaintType["assignedByRole"])
              : undefined,
            assignmentPath: Array.isArray(obj["assignmentPath"])
              ? (obj["assignmentPath"] as string[])
              : [],
            submittedDate: createdAt,
            lastUpdated,
            assignedDate: obj["assignedAt"]
              ? new Date(String(obj["assignedAt"]))
              : undefined,
            deadline,
            evidence: obj["evidenceFile"]
              ? String(obj["evidenceFile"])
              : undefined,
            resolutionNote: obj["resolutionNote"]
              ? String(obj["resolutionNote"])
              : undefined,
            feedback: obj["feedback"] as unknown as ComplaintType["feedback"],
            department,
          } as ComplaintType;
        });

        // Scope complaints to this HOD's department or to items routed to HOD
        type MinimalUserLocal = { department?: string; workingPlace?: string };
        const u = (user || {}) as MinimalUserLocal;
        const uDept = u.department || u.workingPlace || "";
        const deptLower = String(uDept).toLowerCase();
        const visible = mapped.filter((c) => {
          if (
            c.department &&
            deptLower &&
            String(c.department).toLowerCase() === deptLower
          )
            return true;
          if (
            c.submittedTo &&
            String(c.submittedTo).toLowerCase().includes("hod")
          )
            return true;
          if (
            Array.isArray(c.assignmentPath) &&
            c.assignmentPath.map((p) => String(p).toLowerCase()).includes("hod")
          )
            return true;
          return false;
        });

        if (!cancelled) setComplaints(visible);
      } catch (err) {
        setComplaints([]);
      } finally {
        setLoading(false);
      }
    }
    fetchComplaints();
    return () => {
      cancelled = true;
    };
  }, [getAllStaff, user, setComplaints]);
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [overdueFilter, setOverdueFilter] = useState<string>("all");
  const [selectedComplaint, setSelectedComplaint] =
    useState<ComplaintType | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [assigningStaffId, setAssigningStaffId] = useState<string>("");
  const [reassigningRow, setReassigningRow] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "Pending" | "Accepted" | "Assigned" | "Rejected"
  >("Pending");
  // Reset page when filters/tab change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, priorityFilter, overdueFilter, activeTab]);
  const handleAssignClick = (complaint: ComplaintType) => {
    setReassigningRow(complaint.id);
    setAssigningStaffId("");
  };

  const handleViewDetail = (complaint: ComplaintType) => {
    setSelectedComplaint(complaint);
    setShowDetailModal(true);
    setAssigningStaffId("");
    setReassigningRow(null);
  };
  const handleStaffAssignment = (complaintId: string, staffId: string) => {
    const staff = getAllStaff().find((s) => s.id === staffId);
    setComplaints((prev) =>
      prev.map((c) =>
        c.id === complaintId
          ? {
              ...c,
              assignedStaff: staff?.fullName || staff?.name || "Unknown",
              assignedStaffRole: "staff",
              assignedByRole: "headOfDepartment",
              assignmentPath: Array.isArray(c.assignmentPath)
                ? Array.from(
                    new Set([
                      ...(c.assignmentPath || []),
                      "headOfDepartment",
                      "staff",
                    ])
                  )
                : ["headOfDepartment", "staff"],
              lastUpdated: new Date(),
              deadline: assigningDeadline
                ? new Date(assigningDeadline)
                : c.deadline,
              status:
                c.status === "Unassigned" || c.status === "Pending"
                  ? "In Progress"
                  : c.status,
            }
          : c
      )
    );
    toast({
      title: "Assigned",
      description: `Assigned to ${staff?.fullName || staff?.name}${
        assigningDeadline
          ? `, deadline ${new Date(assigningDeadline).toLocaleDateString()}`
          : ""
      }`,
    });
    setReassigningRow(null);
    setAssigningStaffId("");
    setAssigningDeadline("");
  };

  const handleResolve = (complaintId: string) => {
    setComplaints((prev) =>
      prev.map((c) =>
        c.id === complaintId
          ? { ...c, status: "Resolved", lastUpdated: new Date() }
          : c
      )
    );
    toast({ title: "Resolved", description: "Complaint marked as resolved." });
  };

  const handleReject = (complaintId: string) => {
    setComplaints((prev) =>
      prev.map((c) =>
        c.id === complaintId
          ? { ...c, status: "Closed", lastUpdated: new Date() }
          : c
      )
    );
    toast({ title: "Rejected", description: "Complaint rejected and closed." });
  };

  const handleReapprove = (complaintId: string) => {
    const assignee =
      (user?.fullName as string) ||
      (user?.name as string) ||
      (user?.email as string) ||
      "Head of Department";
    setComplaints((prev) =>
      prev.map((c) =>
        c.id === complaintId
          ? {
              ...c,
              status: "In Progress",
              assignedStaff: assignee,
              assignedStaffRole: "headOfDepartment",
              lastUpdated: new Date(),
            }
          : c
      )
    );
    toast({
      title: "Re-approved",
      description: "Complaint moved back to Accepted.",
    });
  };

  const isOverdue = (complaint: ComplaintType) => {
    // Pending or Unassigned items with no assignee should not be marked overdue
    if (
      (complaint.status === "Pending" || complaint.status === "Unassigned") &&
      !complaint.assignedStaff &&
      !complaint.assignedStaffRole
    ) {
      return false;
    }
    if (!complaint.deadline) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(complaint.deadline);
    deadline.setHours(0, 0, 0, 0);
    return (
      deadline < today &&
      complaint.status !== "Closed" &&
      complaint.status !== "Resolved"
    );
  };

  // Calculate summary stats
  const unassignedCount = complaints.filter((c) => !c.assignedStaff).length;
  const assignedCount = complaints.filter((c) => c.assignedStaff).length;
  const priorityColors = {
    Low: "bg-gray-200 text-gray-700 border-gray-300",
    Medium: "bg-blue-100 text-blue-800 border-blue-200",
    High: "bg-orange-100 text-orange-800 border-orange-200",
    Critical: "bg-red-100 text-red-800 border-red-200 font-bold border-2",
  };

  const matchesTab = (c: ComplaintType) => {
    if (activeTab === "Pending")
      // Show all pending or unassigned complaints for HOD (include ones routed to HOD)
      return c.status === "Pending" || c.status === "Unassigned";
    if (activeTab === "Accepted")
      return (
        c.status === "In Progress" && c.assignedStaffRole === "headOfDepartment"
      );
    if (activeTab === "Assigned")
      return (
        (c.status === "In Progress" || c.status === "Assigned") &&
        c.assignedStaffRole === "staff"
      );
    if (activeTab === "Rejected") return c.status === "Closed";
    return false;
  };

  const filteredComplaints = complaints
    .filter(matchesTab)
    .filter((c) => c.status !== "Resolved")
    .filter((c) =>
      [c.title, c.category, c.submittedBy]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    )
    .filter((c) =>
      priorityFilter === "all"
        ? true
        : (c.priority || "Medium") === priorityFilter
    )
    .filter((c) =>
      overdueFilter === "all"
        ? true
        : overdueFilter === "overdue"
        ? isOverdue(c)
        : !isOverdue(c)
    );

  // Pagination calculations
  const totalItems = filteredComplaints.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (page - 1) * pageSize;
  const paginatedComplaints = filteredComplaints.slice(
    startIndex,
    startIndex + pageSize
  );

  // Clamp page if filtered size shrinks
  useEffect(() => {
    const newTotal = Math.max(
      1,
      Math.ceil(filteredComplaints.length / pageSize)
    );
    if (page > newTotal) setPage(newTotal);
  }, [filteredComplaints.length, page]);

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
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Assign & Reassign Complaints (HOD)</h1>
      <p className="text-muted-foreground">
        Manage staff assignments for complaints in your department
      </p>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Complaints
            </CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{complaints.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
            <div className="h-4 w-4 rounded-full bg-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {unassignedCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned</CardTitle>
            <div className="h-4 w-4 rounded-full bg-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {assignedCount}
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Search & Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 sm:gap-4 w-full">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, department, or submitter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Select value={overdueFilter} onValueChange={setOverdueFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by overdue" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All complaints</SelectItem>
                <SelectItem value="overdue">Overdue Only</SelectItem>
                <SelectItem value="notOverdue">Not Overdue Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      {/* Complaints Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle>Complaints</CardTitle>
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as typeof activeTab)}
            >
              <TabsList>
                <TabsTrigger value="Pending">Pending</TabsTrigger>
                <TabsTrigger value="Accepted">Accepted</TabsTrigger>
                <TabsTrigger value="Assigned">Assigned</TabsTrigger>
                <TabsTrigger value="Rejected">Rejected</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <CardDescription>
            {filteredComplaints.length} complaint
            {filteredComplaints.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredComplaints.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                No complaints found
              </div>
            ) : (
              paginatedComplaints.map((complaint) => (
                <Card key={complaint.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="text-xs text-muted-foreground">
                        #{complaint.id}
                      </div>
                      <div className="font-medium text-sm">
                        {complaint.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Category: {complaint.category}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Badge
                          className={`text-xs ${
                            statusColors[
                              complaint.status as keyof typeof statusColors
                            ]
                          }`}
                        >
                          {complaint.status}
                        </Badge>
                        <Badge
                          className={`${
                            priorityColors[complaint.priority || "Medium"]
                          } text-xs`}
                        >
                          {complaint.priority || "Medium"}
                        </Badge>
                        {isOverdue(complaint) ? (
                          <Badge
                            className="text-xs bg-red-100 text-red-800 border-red-200"
                            variant="outline"
                          >
                            Overdue
                          </Badge>
                        ) : (
                          <Badge
                            className="text-xs bg-green-100 text-green-800 border-green-200"
                            variant="outline"
                          >
                            On Time
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Assignee:{" "}
                        {complaint.assignedStaff || "Not Yet Assigned"}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 [&>button]:w-full">
                    <Button
                      size="sm"
                      variant="outline"
                      className="col-span-2"
                      onClick={() => handleViewDetail(complaint)}
                    >
                      View Detail
                    </Button>
                    {(complaint.status === "Pending" ||
                      complaint.status === "Unassigned") &&
                      !complaint.assignedStaffRole && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            const assignee =
                              (user?.fullName as string) ||
                              (user?.name as string) ||
                              (user?.email as string) ||
                              "Head of Department";
                            setComplaints((prev) =>
                              prev.map((c) =>
                                c.id === complaint.id
                                  ? {
                                      ...c,
                                      status: "In Progress",
                                      assignedStaff: assignee,
                                      assignedStaffRole: "headOfDepartment",
                                      lastUpdated: new Date(),
                                    }
                                  : c
                              )
                            );
                            toast({
                              title: "Accepted",
                              description:
                                "Complaint set In Progress and assigned to you.",
                            });
                          }}
                        >
                          Accept
                        </Button>
                      )}
                    {activeTab === "Rejected" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleReapprove(complaint.id)}
                      >
                        Re-approve
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(complaint.id)}
                      >
                        Reject
                      </Button>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-sm">Title</TableHead>
                  <TableHead className="text-sm">Category</TableHead>
                  <TableHead className="text-sm">Priority</TableHead>
                  <TableHead className="text-sm">Status</TableHead>
                  <TableHead className="text-sm">Assignee</TableHead>
                  <TableHead className="text-sm">Overdue</TableHead>
                  <TableHead className="text-sm">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedComplaints.map((complaint) => (
                  <TableRow key={complaint.id}>
                    <TableCell className="font-medium text-sm">
                      {complaint.title}
                    </TableCell>
                    <TableCell className="text-sm">
                      {complaint.category}
                    </TableCell>
                    <TableCell className="text-sm">
                      <Badge
                        className={
                          priorityColors[complaint.priority || "Medium"]
                        }
                      >
                        {complaint.priority || "Medium"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`text-xs ${
                          statusColors[
                            complaint.status as keyof typeof statusColors
                          ]
                        }`}
                      >
                        {complaint.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {complaint.assignedStaff ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-medium">
                          {complaint.assignedStaff}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs font-medium">
                          Not Yet Assigned
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isOverdue(complaint) ? (
                        <Badge
                          className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 text-xs"
                          variant="outline"
                        >
                          Overdue
                        </Badge>
                      ) : (
                        <Badge
                          className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 text-xs"
                          variant="outline"
                        >
                          Not Overdue
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 items-center flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetail(complaint)}
                          className="text-xs dark:hover:text-blue-400"
                        >
                          View Detail
                        </Button>
                        {/* HoD can accept to handle, resolve/reject, and assign to staff */}
                        {(complaint.status === "Pending" ||
                          complaint.status === "Unassigned") &&
                          !complaint.assignedStaffRole && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="text-xs"
                              onClick={() => {
                                const assignee =
                                  (user?.fullName as string) ||
                                  (user?.name as string) ||
                                  (user?.email as string) ||
                                  "Head of Department";
                                setComplaints((prev) =>
                                  prev.map((c) =>
                                    c.id === complaint.id
                                      ? {
                                          ...c,
                                          status: "In Progress",
                                          assignedStaff: assignee,
                                          assignedStaffRole: "headOfDepartment",
                                          lastUpdated: new Date(),
                                        }
                                      : c
                                  )
                                );
                                toast({
                                  title: "Accepted",
                                  description:
                                    "Complaint set In Progress and assigned to you.",
                                });
                              }}
                            >
                              Accept
                            </Button>
                          )}
                        {/* Resolve action removed: resolved complaints should not be managed here */}
                        {activeTab === "Rejected" ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="text-xs"
                            onClick={() => handleReapprove(complaint.id)}
                          >
                            Re-approve
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="text-xs"
                            onClick={() => handleReject(complaint.id)}
                          >
                            Reject
                          </Button>
                        )}
                        {reassigningRow === complaint.id ? (
                          <div className="flex gap-2 items-center">
                            <Select
                              value={assigningStaffId}
                              onValueChange={setAssigningStaffId}
                            >
                              <SelectTrigger className="w-40 text-xs">
                                <SelectValue placeholder="Select staff" />
                              </SelectTrigger>
                              <SelectContent>
                                {getAllStaff()
                                  .filter((s) => s.role === "staff")
                                  .filter((s) => {
                                    const deptPref = (
                                      user?.department || "IT"
                                    ).toLowerCase();
                                    return (s.department || "")
                                      .toLowerCase()
                                      .includes(deptPref);
                                  })
                                  .map((staff) => (
                                    <SelectItem key={staff.id} value={staff.id}>
                                      {staff.fullName || staff.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <Input
                              type="date"
                              className="w-36 text-xs"
                              value={assigningDeadline}
                              onChange={(e) =>
                                setAssigningDeadline(e.target.value)
                              }
                              required
                            />
                            <Button
                              size="sm"
                              variant="default"
                              className="text-xs"
                              disabled={!assigningStaffId || !assigningDeadline}
                              onClick={() =>
                                handleStaffAssignment(
                                  complaint.id,
                                  assigningStaffId
                                )
                              }
                            >
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs"
                              onClick={() => {
                                setReassigningRow(null);
                                setAssigningStaffId("");
                                setAssigningDeadline("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          (!complaint.assignedStaff ||
                            isOverdue(complaint)) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs dark:hover:text-blue-400"
                              onClick={() => handleAssignClick(complaint)}
                            >
                              {complaint.assignedStaff ? "Reassign" : "Assign"}
                            </Button>
                          )
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {/* Pagination Controls - aligned with AllComplaints */}
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
      {/* Role-based Complaint Modal for View Detail */}
      {selectedComplaint && (
        <RoleBasedComplaintModal
          complaint={selectedComplaint}
          open={showDetailModal}
          onOpenChange={setShowDetailModal}
        />
      )}
    </div>
  );
}
