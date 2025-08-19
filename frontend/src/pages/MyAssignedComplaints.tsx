// For demo/testing: import mockComplaint
import { mockComplaint as baseMockComplaint } from "@/lib/mockComplaint";
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
  Eye,
  Settings,
  Clock,
  AlertCircle,
  CheckCircle,
  FileText,
  User,
  Search,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import { RoleBasedComplaintModal } from "@/components/RoleBasedComplaintModal";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Removed useComplaints to avoid requiring ComplaintProvider for this page's local mock state
import { useAuth } from "@/components/auth/AuthContext";
import { toast } from "@/hooks/use-toast";
import React from "react";

// Import the Complaint type from the context to ensure type compatibility
import type { Complaint } from "@/components/ComplaintCard";

export function MyAssignedComplaints() {
  // MOCK DATA ENABLED BY DEFAULT
  const { user } = useAuth();
  // Generate multiple mock complaints for demo
  // Demo data: mix of overdue and not overdue (expanded)
  const priorities: Complaint["priority"][] = [
    "High",
    "Critical",
    "Medium",
    "High",
    "Low",
    "Medium",
    "Critical",
    "Low",
    "High",
    "Medium",
  ];
  // Set deadlines: some in the past (overdue), some in the future (not overdue)
  const deadlines = [
    new Date(Date.now() - 2 * 86400000), // overdue
    new Date(Date.now() + 2 * 86400000), // not overdue
    new Date(Date.now() - 1 * 86400000), // overdue
    new Date(Date.now() + 5 * 86400000), // not overdue
    new Date(Date.now() - 3 * 86400000), // overdue
    new Date(Date.now() + 7 * 86400000), // not overdue
    new Date(Date.now() + 10 * 86400000), // not overdue
    new Date(Date.now() + 1 * 86400000), // not overdue
    new Date(Date.now() + 3 * 86400000), // not overdue
    new Date(Date.now() + 15 * 86400000), // not overdue
  ];
  const titles = [
    "WiFi not working in hostel",
    "Broken AC in Lecture Hall",
    "Projector not working",
    "Cafeteria food quality",
    "Library computers slow",
    "Leaking roof in dorm",
    "Elevator malfunction",
    "Printer out of service",
    "Noisy construction",
    "Lights flickering in corridor",
  ];
  const descriptions = [
    "The WiFi in hostel block B has been down for 3 days.",
    "The air conditioning in Hall A-101 is broken.",
    "Projector in Room 204 is not turning on.",
    "Food quality in cafeteria has declined.",
    "Library computers are extremely slow.",
    "There is a leak in the roof of Dorm 3.",
    "Elevator in Admin Block is stuck on 2nd floor.",
    "Printer in Lab 5 is out of service.",
    "Construction noise near library is disruptive.",
    "Corridor lights are flickering intermittently.",
  ];
  const statuses: Complaint["status"][] = [
    "Pending",
    "In Progress",
    "Resolved",
    "Pending",
    "Closed",
    "Pending",
    "Pending",
    "Pending",
    "In Progress",
    "Pending",
  ];
  const submitters = [
    "John Doe",
    "Alice Smith",
    "Bob Johnson",
    "Mary Lee",
    "Chris Evans",
    "Sara Kim",
    "David Park",
    "Linda Green",
    "Tom Hardy",
    "Priya Patel",
  ];
  const demoComplaints: Complaint[] = Array.from({ length: 10 }).map(
    (_, i) => ({
      ...baseMockComplaint,
      id: `mock${i + 1}`,
      title: titles[i],
      description: descriptions[i],
      priority: priorities[i],
      status: statuses[i],
      assignedStaff: user
        ? user.fullName || user.name
        : baseMockComplaint.assignedStaff,
      submittedBy: submitters[i],
      sourceRole: "student",
      assignedByRole: "student",
      assignmentPath: ["student", "staff"],
      submittedDate: new Date(Date.now() - (i + 1) * 86400000),
      assignedDate: new Date(Date.now() - (i + 1) * 86400000),
      lastUpdated: new Date(Date.now() - i * 43200000),
      deadline: deadlines[i],
    })
  );
  const [complaints, setComplaints] = useState<Complaint[]>(demoComplaints);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null
  );
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [overdueFilter, setOverdueFilter] = useState("All"); // New filter
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  // Sorting mode: default by date (newest first), or priority when toggled
  const [sortingMode, setSortingMode] = useState<"date" | "priority">("date");
  // Quick filter from summary cards
  const [quickFilter, setQuickFilter] = useState<
    "recent" | "inprogress" | "resolvedThisMonth" | "overdue" | null
  >(null);
  // Tabs state and handler
  type TabKey =
    | "All"
    | "Pending"
    | "In Progress"
    | "Resolved"
    | "Closed"
    | "Overdue";
  const [activeTab, setActiveTab] = useState<TabKey>("All");
  // Track opened complaints to hide NEW badge once viewed
  const [openedIds, setOpenedIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem("myAssignedOpened");
      const arr = raw ? (JSON.parse(raw) as string[]) : [];
      return new Set(arr);
    } catch (e) {
      // ignore JSON/Storage errors
      return new Set();
    }
  });
  // Local update function replacing context update for demo/mock state

  // Only show complaints assigned to the current staff user
  const myAssignedComplaints = complaints.filter(
    (c) =>
      c.assignedStaff &&
      user &&
      (c.assignedStaff === user.fullName || c.assignedStaff === user.name)
  );

  const handleViewComplaint = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setShowDetailModal(true);
    // Mark as opened to hide NEW badge
    setOpenedIds((prev) => {
      const next = new Set(prev);
      next.add(complaint.id);
      try {
        localStorage.setItem("myAssignedOpened", JSON.stringify([...next]));
      } catch (e) {
        // ignore storage errors
      }
      return next;
    });
  };

  const handleUpdate = (complaintId: string, updates: Partial<Complaint>) => {
    setComplaints((prev) =>
      prev.map((c) =>
        c.id === complaintId ? { ...c, ...updates, lastUpdated: new Date() } : c
      )
    );
    toast({
      title: "Complaint Updated",
      description: `Complaint #${complaintId} has been updated successfully`,
    });
  };

  const handleSortByPriority = () => {
    const priorityOrder = { Critical: 4, High: 3, Medium: 2, Low: 1 };
    setSortingMode("priority");
    setSortOrder(sortOrder === "desc" ? "asc" : "desc");
  };

  // Filter complaints based on search, status, priority, and overdue
  const [filtered, setFiltered] = useState(myAssignedComplaints);
  // Helper sorts
  const sortByAssignedDateDesc = (items: Complaint[]) => {
    return [...items].sort((a, b) => {
      const aDate = (a.assignedDate || a.submittedDate)?.valueOf?.() || 0;
      const bDate = (b.assignedDate || b.submittedDate)?.valueOf?.() || 0;
      return bDate - aDate;
    });
  };
  const sortByPriority = React.useCallback(
    (items: Complaint[]) => {
      const priorityOrder = {
        Critical: 4,
        High: 3,
        Medium: 2,
        Low: 1,
      } as const;
      return [...items].sort((a, b) => {
        const orderA =
          priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
        const orderB =
          priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
        return sortOrder === "desc" ? orderB - orderA : orderA - orderB;
      });
    },
    [sortOrder]
  );
  // NEW badge helper (assigned within last 48h and not opened yet)
  const isNew = (complaint: Complaint) => {
    const assigned = complaint.assignedDate || complaint.submittedDate;
    if (!assigned) return false;
    const diffMs = Date.now() - new Date(assigned).getTime();
    const twoDays = 48 * 60 * 60 * 1000;
    return diffMs <= twoDays && !openedIds.has(complaint.id);
  };

  React.useEffect(() => {
    let base = myAssignedComplaints.filter((complaint) => {
      const matchesSearch =
        complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "All" || complaint.status === statusFilter;
      const matchesPriority =
        priorityFilter === "All" || complaint.priority === priorityFilter;
      const matchesOverdue =
        overdueFilter === "All"
          ? true
          : overdueFilter === "Overdue"
          ? isOverdue(complaint)
          : !isOverdue(complaint);
      return (
        matchesSearch && matchesStatus && matchesPriority && matchesOverdue
      );
    });

    // Apply quick filters
    if (quickFilter === "recent") {
      base = sortByAssignedDateDesc(myAssignedComplaints).slice(0, 3);
    } else if (quickFilter === "resolvedThisMonth") {
      const now = new Date();
      const m = now.getMonth();
      const y = now.getFullYear();
      base = base.filter((c) => {
        const d = c.lastUpdated || c.submittedDate;
        const dt = new Date(d);
        return (
          c.status === "Resolved" &&
          dt.getMonth() === m &&
          dt.getFullYear() === y
        );
      });
    }

    // Apply sorting
    const sorted =
      sortingMode === "priority"
        ? sortByPriority(base)
        : sortByAssignedDateDesc(base);

    setFiltered(sorted);
  }, [
    myAssignedComplaints,
    searchTerm,
    statusFilter,
    priorityFilter,
    overdueFilter,
    sortingMode,
    sortOrder,
    quickFilter,
    openedIds,
    sortByPriority,
  ]);

  const statusColors = {
    Pending:
      "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400",
    "In Progress":
      "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400",
    Resolved:
      "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400",
    Closed:
      "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400",
  };

  const priorityColors = {
    Critical: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
    High: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400",
    Medium:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
    Low: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
  };

  // Memoize a lightweight dependency key for escalation effect
  const escalationKey = React.useMemo(
    () =>
      complaints
        .map((c) => `${c.id}|${c.deadline?.toString()}|${c.status}`)
        .join(";"),
    [complaints]
  );

  // Helper: check if complaint is overdue
  const isOverdue = (complaint: Complaint) => {
    if (!complaint.deadline) return false;
    const today = new Date();
    // Remove time for accurate comparison
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(complaint.deadline);
    deadline.setHours(0, 0, 0, 0);
    return (
      deadline < today &&
      complaint.status !== "Closed" &&
      complaint.status !== "Resolved"
    );
  };

  // Summary metrics (computed on myAssignedComplaints)
  const recentTop3 = React.useMemo(
    () => sortByAssignedDateDesc(myAssignedComplaints).slice(0, 3),
    [myAssignedComplaints]
  );
  const inProgressCount = myAssignedComplaints.filter(
    (c) => c.status === "In Progress"
  ).length;
  const resolvedThisMonthCount = React.useMemo(() => {
    const now = new Date();
    const m = now.getMonth();
    const y = now.getFullYear();
    return myAssignedComplaints.filter((c) => {
      if (c.status !== "Resolved") return false;
      const d = c.lastUpdated || c.submittedDate;
      const dt = new Date(d);
      return dt.getMonth() === m && dt.getFullYear() === y;
    }).length;
  }, [myAssignedComplaints]);
  const overdueCount = myAssignedComplaints.filter((c) => isOverdue(c)).length;
  const pendingCount = myAssignedComplaints.filter(
    (c) => c.status === "Pending"
  ).length;
  const resolvedCount = myAssignedComplaints.filter(
    (c) => c.status === "Resolved"
  ).length;
  const closedCount = myAssignedComplaints.filter(
    (c) => c.status === "Closed"
  ).length;

  // Card click helpers
  const applyRecentFilter = () => {
    setQuickFilter("recent");
    setSearchTerm("");
    setStatusFilter("All");
    setPriorityFilter("All");
    setOverdueFilter("All");
    setSortingMode("date");
  };
  const applyInProgressFilter = () => {
    setQuickFilter(null);
    setSearchTerm("");
    setStatusFilter("In Progress");
    setPriorityFilter("All");
    setOverdueFilter("All");
    setSortingMode("date");
  };
  const applyResolvedThisMonthFilter = () => {
    setQuickFilter("resolvedThisMonth");
    setSearchTerm("");
    setStatusFilter("All");
    setPriorityFilter("All");
    setOverdueFilter("All");
    setSortingMode("date");
  };
  const applyOverdueFilter = () => {
    setQuickFilter(null);
    setSearchTerm("");
    setStatusFilter("All");
    setPriorityFilter("All");
    setOverdueFilter("Overdue");
    setSortingMode("date");
  };
  const onTabChange = (v: string) => {
    const tab = v as TabKey;
    setActiveTab(tab);
    setQuickFilter(null);
    setSearchTerm("");
    setPriorityFilter("All");
    setSortingMode("date");
    if (tab === "All") {
      setStatusFilter("All");
      setOverdueFilter("All");
    } else if (tab === "Overdue") {
      setStatusFilter("All");
      setOverdueFilter("Overdue");
    } else {
      setStatusFilter(tab);
      setOverdueFilter("All");
    }
  };

  // Auto-escalate overdue items to HoD visibility on first render/filter run
  React.useEffect(() => {
    // Demo-only escalation: when overdue, escalate to HoD visibility so HoD can handle/reassign
    setComplaints((prev) =>
      prev.map((c) => {
        const isMine =
          c.assignedStaff &&
          user &&
          (c.assignedStaff === user.fullName || c.assignedStaff === user.name);
        if (
          isMine &&
          isOverdue(c) &&
          c.assignedStaffRole !== "headOfDepartment"
        ) {
          return {
            ...c,
            assignedStaffRole: "headOfDepartment",
            assignedStaff: "Head of Department",
            status:
              c.status === "Resolved" || c.status === "Closed"
                ? c.status
                : "In Progress",
            lastUpdated: new Date(),
          } as Complaint;
        }
        return c;
      })
    );
  }, [user, escalationKey]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          My Assigned Complaints
        </h1>
        <p className="text-muted-foreground">
          Manage complaints assigned specifically to you
        </p>
      </div>

      {/* Tabs: filter by status */}
      <Tabs value={activeTab} onValueChange={onTabChange}>
        <TabsList className="flex flex-wrap gap-2">
          <TabsTrigger value="All">
            All ({myAssignedComplaints.length})
          </TabsTrigger>
          <TabsTrigger value="Pending">Pending ({pendingCount})</TabsTrigger>
          <TabsTrigger value="In Progress">
            In Progress ({inProgressCount})
          </TabsTrigger>
          <TabsTrigger value="Resolved">Resolved ({resolvedCount})</TabsTrigger>
          <TabsTrigger value="Closed">Closed ({closedCount})</TabsTrigger>
          <TabsTrigger value="Overdue">Overdue ({overdueCount})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          onClick={applyRecentFilter}
          className="cursor-pointer hover:shadow"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Recently Assigned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentTop3.length}</div>
            <p className="text-xs text-muted-foreground">Top 3 newest</p>
          </CardContent>
        </Card>
        <Card
          onClick={applyInProgressFilter}
          className="cursor-pointer hover:shadow"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressCount}</div>
            <p className="text-xs text-muted-foreground">Working now</p>
          </CardContent>
        </Card>
        <Card
          onClick={applyResolvedThisMonthFilter}
          className="cursor-pointer hover:shadow"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Resolved This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resolvedThisMonthCount}</div>
            <p className="text-xs text-muted-foreground">This calendar month</p>
          </CardContent>
        </Card>
        <Card
          onClick={applyOverdueFilter}
          className="cursor-pointer hover:shadow"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overdueCount}</div>
            <p className="text-xs text-muted-foreground">Past deadline</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card className="shadow-lg rounded-2xl bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Assigned Complaints ({filtered.length})
          </CardTitle>

          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-lg"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex items-center gap-2 min-w-0 sm:min-w-[180px]">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Status</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="min-w-0 sm:min-w-[150px] rounded-lg">
                  <SelectValue placeholder="All Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Priority</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>

              {/* Overdue Filter */}
              <Select value={overdueFilter} onValueChange={setOverdueFilter}>
                <SelectTrigger className="min-w-0 sm:min-w-[140px] rounded-lg">
                  <SelectValue placeholder="Overdue" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                  <SelectItem value="NotOverdue">Not Overdue</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={handleSortByPriority}
                className="min-w-0 sm:min-w-[140px] rounded-lg hover:bg-muted"
              >
                <ArrowUpDown className="h-4 w-4 mr-2" />
                Sort Priority
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Desktop Table */}
          <div className="hidden lg:block rounded-md border overflow-x-auto bg-transparent">
            <Table className="bg-transparent">
              <style>{`
                .my-assigned-table tr,
                .my-assigned-table th,
                .my-assigned-table td {
                  background: transparent !important;
                }
              `}</style>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-sm">Title</TableHead>
                  <TableHead className="text-sm">category</TableHead>
                  <TableHead className="text-sm">Priority</TableHead>
                  <TableHead className="text-sm">Submitted By</TableHead>
                  <TableHead className="text-sm">Status</TableHead>
                  <TableHead className="text-sm">Overdue</TableHead>
                  <TableHead className="text-sm">Date Assigned</TableHead>
                  <TableHead className="text-sm">Deadline</TableHead>
                  <TableHead className="text-sm">Last Updated</TableHead>
                  <TableHead className="text-right text-sm">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {searchTerm ||
                      statusFilter !== "All" ||
                      priorityFilter !== "All"
                        ? "No complaints match your search criteria"
                        : "No complaints assigned to you yet"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((complaint) => (
                    <TableRow
                      key={complaint.id}
                      className="hover:bg-muted/50 dark:hover:bg-accent/10"
                    >
                      <TableCell className="max-w-xs">
                        <div className="font-medium truncate">
                          {complaint.title}
                          {isNew(complaint) && (
                            <Badge
                              className="ml-2 bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 text-[10px]"
                              variant="outline"
                            >
                              NEW
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {complaint.description.substring(0, 60)}...
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {complaint.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`text-xs ${
                            priorityColors[
                              complaint.priority as keyof typeof priorityColors
                            ]
                          }`}
                          variant="outline"
                        >
                          {complaint.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">
                            {complaint.submittedBy}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`text-xs ${
                            statusColors[complaint.status]
                          }`}
                          variant="outline"
                        >
                          {complaint.status}
                        </Badge>
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
                      <TableCell className="text-muted-foreground text-sm">
                        {(
                          complaint.assignedDate || complaint.submittedDate
                        ).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {complaint.deadline
                          ? complaint.deadline.toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {complaint.lastUpdated.toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewComplaint(complaint)}
                            className="hover:bg-primary/10 dark:hover:bg-hover-blue/10"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View & Update
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
          <div className="lg:hidden space-y-4">
            {filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ||
                statusFilter !== "All" ||
                priorityFilter !== "All"
                  ? "No complaints match your search criteria"
                  : "No complaints assigned to you yet"}
              </div>
            ) : (
              filtered.map((complaint) => (
                <Card key={complaint.id} className="p-4 shadow-md rounded-2xl">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-sm">
                          {complaint.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          #{complaint.id}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-2">
                        {isNew(complaint) && (
                          <Badge
                            className="text-xs bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400"
                            variant="outline"
                          >
                            NEW
                          </Badge>
                        )}
                        <Badge
                          className={`text-xs ${
                            priorityColors[
                              complaint.priority as keyof typeof priorityColors
                            ]
                          }`}
                          variant="outline"
                        >
                          {complaint.priority}
                        </Badge>
                        <Badge
                          className={`text-xs ${
                            statusColors[complaint.status]
                          }`}
                          variant="outline"
                        >
                          {complaint.status}
                        </Badge>
                        {isOverdue(complaint) && (
                          <Badge
                            className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 text-xs"
                            variant="outline"
                          >
                            Overdue
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          Department:
                        </span>
                        <span className="font-medium ml-2">
                          {complaint.category}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Submitted By:
                        </span>
                        <span className="font-medium ml-2">
                          {complaint.submittedBy}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Date Assigned:
                        </span>
                        <span className="font-medium ml-2">
                          {(
                            complaint.assignedDate || complaint.submittedDate
                          ).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Deadline:</span>
                        <span className="font-medium ml-2">
                          {complaint.deadline
                            ? complaint.deadline.toLocaleDateString()
                            : "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Overdue:</span>
                        {isOverdue(complaint) ? (
                          <Badge
                            className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 text-xs ml-2"
                            variant="outline"
                          >
                            Overdue
                          </Badge>
                        ) : (
                          <Badge
                            className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 text-xs ml-2"
                            variant="outline"
                          >
                            Not Overdue
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-sm">
                        {complaint.description.substring(0, 120)}...
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewComplaint(complaint)}
                        className="flex-1 hover:bg-primary/10 dark:hover:bg-hover-blue/10"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View & Update
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      <RoleBasedComplaintModal
        complaint={selectedComplaint}
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
