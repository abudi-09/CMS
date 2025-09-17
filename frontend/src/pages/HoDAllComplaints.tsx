import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Search, Eye } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RoleBasedComplaintModal } from "@/components/RoleBasedComplaintModal";
import { Complaint as ComplaintType } from "@/components/ComplaintCard";
import {
  getHodAllApi,
  getHodInboxApi,
  getHodManagedComplaintsApi,
  type HodAllResponse,
  type InboxComplaint,
} from "@/lib/api";

const statusColors: Partial<Record<ComplaintType["status"], string>> = {
  Pending: "bg-yellow-100 text-yellow-800",
  "In Progress": "bg-blue-100 text-blue-800",
  Resolved: "bg-green-100 text-green-800",
  Closed: "bg-gray-100 text-gray-800",
  Overdue: "bg-red-100 text-red-800",
  Assigned: "bg-blue-100 text-blue-800",
};

function labelFromAssigned(assignedTo: unknown): string | undefined {
  if (!assignedTo) return undefined;
  if (typeof assignedTo === "string") {
    const looksLikeObjectId = /^[a-fA-F0-9]{24}$/.test(assignedTo);
    return looksLikeObjectId ? undefined : assignedTo;
  }
  if (typeof assignedTo === "object") {
    const at = assignedTo as { name?: string; email?: string };
    return at.name || at.email || undefined;
  }
  return undefined;
}

function labelFromSubmitter(sb: unknown): string | undefined {
  if (!sb) return undefined;
  if (typeof sb === "string") return sb;
  if (typeof sb === "object") {
    const o = sb as { name?: string; email?: string };
    return o.name || o.email || undefined;
  }
  return undefined;
}

export default function HoDAllComplaints() {
  const { user } = useAuth();
  const [items, setItems] = useState<ComplaintType[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [selected, setSelected] = useState<ComplaintType | null>(null);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Summary metrics (align with dashboard: Total, Pending, In Progress, Resolved)
  const { total, pending, inProgress, resolved } = useMemo(() => {
    const total = items.length;
    // Pending should include explicit Pending and Unassigned to match analytics
    const pending = items.filter(
      (c) => c.status === "Pending" || c.status === "Unassigned"
    ).length;
    // Treat both "In Progress" and "Assigned" as in-progress work
    const inProgress = items.filter(
      (c) => c.status === "In Progress" || c.status === "Assigned"
    ).length;
    const resolved = items.filter((c) => c.status === "Resolved").length;
    return { total, pending, inProgress, resolved };
  }, [items]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data: HodAllResponse = await getHodAllApi();
        if (!mounted) return;
        type HodItem = HodAllResponse["pending"][number];
        const toComp = (raw: HodItem): ComplaintType => {
          const r = raw as Record<string, unknown>;
          const assignedStaff = labelFromAssigned(r["assignedTo"]);
          const submittedBy = labelFromSubmitter(r["submittedBy"]);
          const priority = r["priority"];
          const pr =
            priority === "Low" ||
            priority === "Medium" ||
            priority === "High" ||
            priority === "Critical"
              ? (priority as ComplaintType["priority"])
              : "Medium";
          return {
            id: String(r["id"] || r["_id"] || ""),
            title: String(r["title"] || "Untitled Complaint"),
            description: String(r["description"] || ""),
            category: String(r["category"] || "General"),
            status: (r["status"] as ComplaintType["status"]) || "Pending",
            submittedBy: submittedBy || "Unknown",
            assignedStaff,
            assignedStaffRole: undefined,
            submittedDate: r["submittedDate"]
              ? new Date(String(r["submittedDate"]))
              : new Date(),
            lastUpdated: r["lastUpdated"]
              ? new Date(String(r["lastUpdated"]))
              : new Date(),
            deadline: r["deadline"]
              ? new Date(String(r["deadline"]))
              : undefined,
            priority: pr,
            sourceRole: r["sourceRole"] as ComplaintType["sourceRole"],
            assignedByRole: r[
              "assignedByRole"
            ] as ComplaintType["assignedByRole"],
            assignmentPath: Array.isArray(r["assignmentPath"])
              ? (r["assignmentPath"] as ComplaintType["assignmentPath"])
              : [],
            submittedTo: (r["submittedTo"] as string | undefined) || undefined,
            department: (r["department"] as string | undefined) || undefined,
          };
        };
        // Support both legacy and new response shapes via user-defined type guard
        const isNewShape = (
          x: HodAllResponse
        ): x is import("@/lib/api").HodAllResponseNew =>
          (x as { inProgress?: unknown; unassigned?: unknown }).inProgress !==
            undefined ||
          (x as { unassigned?: unknown }).unassigned !== undefined ||
          (x as { total?: unknown }).total !== undefined;

        const pend = data.pending ?? [];
        const resolvedArr = (data as { resolved?: unknown }).resolved;
        const resolvedList = Array.isArray(resolvedArr) ? resolvedArr : [];
        const rejected = data.rejected ?? [];

        const inProg = isNewShape(data) ? data.inProgress ?? [] : [];
        const accepted = !isNewShape(data) ? data.accepted ?? [] : [];
        const assigned = !isNewShape(data) ? data.assigned ?? [] : [];
        const unassigned = isNewShape(data) ? data.unassigned ?? [] : [];

        const merged = [
          ...pend.map(toComp),
          ...(inProg.length ? inProg : [...accepted, ...assigned]).map(toComp),
          ...resolvedList.map(toComp),
          ...rejected.map(toComp),
          ...unassigned.map(toComp),
        ];
        const byId = new Map<string, ComplaintType>();
        for (const c of merged) byId.set(c.id, c);
        let mergedItems = Array.from(byId.values());
        // Enforce department scoping: only show complaints for this HoD's department and exclude dean/admin-directed-only
        const normalize = (v?: string) =>
          (v || "").toString().trim().toLowerCase();
        if (user && user.department) {
          const myDept = normalize(user.department);
          mergedItems = mergedItems.filter(
            (m) => normalize(m.department) === myDept
          );
          mergedItems = mergedItems.filter((m) => {
            const to = normalize(m.submittedTo);
            const by = normalize(m.assignedByRole);
            const src = normalize(m.sourceRole);
            const inPath = Array.isArray(m.assignmentPath)
              ? m.assignmentPath.some(
                  (r) =>
                    normalize(String(r)) === "admin" ||
                    normalize(String(r)) === "dean"
                )
              : false;
            if (to.includes("admin") || to.includes("dean")) return false;
            if (by === "admin" || by === "dean") return false;
            if (src === "admin" || src === "dean") return false;
            if (inPath) return false;
            return true;
          });
          setItems(mergedItems);
        } else {
          setItems([]);
        }
      } catch {
        try {
          const [inbox, managed] = await Promise.all([
            getHodInboxApi(),
            getHodManagedComplaintsApi(),
          ]);
          type ManagedItem = {
            id?: string;
            _id?: string;
            title?: string;
            category?: string;
            status?: ComplaintType["status"];
            priority?: ComplaintType["priority"];
            submittedDate?: string | Date;
            lastUpdated?: string | Date;
            assignedTo?: string | { name?: string; email?: string } | null;
            submittedBy?: string | { name?: string; email?: string } | null;
            deadline?: string | Date | null;
            assignedByRole?: string | null;
            assignmentPath?: string[];
            submittedTo?: string | null;
            sourceRole?: string | null;
            department?: string | null;
          };
          const toCompInbox = (raw: InboxComplaint): ComplaintType => {
            const assignedStaff = labelFromAssigned(raw.assignedTo as unknown);
            const submittedBy = labelFromSubmitter(raw.submittedBy as unknown);
            const pr =
              raw.priority === "Low" ||
              raw.priority === "Medium" ||
              raw.priority === "High" ||
              raw.priority === "Critical"
                ? raw.priority
                : "Medium";
            return {
              id: String(raw.id || ""),
              title: String(raw.title || "Untitled Complaint"),
              description: "",
              category: String(raw.category || "General"),
              status: (raw.status as ComplaintType["status"]) || "Pending",
              submittedBy: submittedBy || "Unknown",
              assignedStaff,
              assignedStaffRole: undefined,
              submittedDate: raw.submittedDate
                ? new Date(String(raw.submittedDate))
                : new Date(),
              lastUpdated: raw.lastUpdated
                ? new Date(String(raw.lastUpdated))
                : new Date(),
              deadline: raw.deadline
                ? new Date(String(raw.deadline))
                : undefined,
              priority: pr as ComplaintType["priority"],
              sourceRole: raw.sourceRole as ComplaintType["sourceRole"],
              assignedByRole:
                raw.assignedByRole as ComplaintType["assignedByRole"],
              assignmentPath: Array.isArray(raw.assignmentPath)
                ? (raw.assignmentPath as ComplaintType["assignmentPath"])
                : [],
              submittedTo: raw.submittedTo || undefined,
              department: undefined,
            };
          };
          const toCompManaged = (raw: ManagedItem): ComplaintType => {
            const assignedStaff = labelFromAssigned(raw.assignedTo as unknown);
            const submittedBy = labelFromSubmitter(raw.submittedBy as unknown);
            const pr =
              raw.priority === "Low" ||
              raw.priority === "Medium" ||
              raw.priority === "High" ||
              raw.priority === "Critical"
                ? raw.priority
                : "Medium";
            return {
              id: String(raw.id || raw._id || ""),
              title: String(raw.title || "Untitled Complaint"),
              description: "",
              category: String(raw.category || "General"),
              status: (raw.status as ComplaintType["status"]) || "Pending",
              submittedBy: submittedBy || "Unknown",
              assignedStaff,
              assignedStaffRole: undefined,
              submittedDate: raw.submittedDate
                ? new Date(String(raw.submittedDate))
                : new Date(),
              lastUpdated: raw.lastUpdated
                ? new Date(String(raw.lastUpdated))
                : new Date(),
              deadline: raw.deadline
                ? new Date(String(raw.deadline))
                : undefined,
              priority: (pr as ComplaintType["priority"]) || "Medium",
              sourceRole: raw.sourceRole as ComplaintType["sourceRole"],
              assignedByRole:
                raw.assignedByRole as ComplaintType["assignedByRole"],
              assignmentPath: Array.isArray(raw.assignmentPath)
                ? (raw.assignmentPath as ComplaintType["assignmentPath"])
                : [],
              submittedTo: raw.submittedTo || undefined,
              department: (raw.department as string | undefined) || undefined,
            };
          };
          const merged = [
            ...inbox.map(toCompInbox),
            ...(managed as ManagedItem[]).map(toCompManaged),
          ];
          const byId = new Map<string, ComplaintType>();
          for (const c of merged) byId.set(c.id, c);
          let mergedItems = Array.from(byId.values());
          const normalize = (v?: string) =>
            (v || "").toString().trim().toLowerCase();
          if (user && user.department) {
            const myDept = normalize(user.department);
            mergedItems = mergedItems.filter(
              (m) => normalize(m.department) === myDept
            );
            mergedItems = mergedItems.filter((m) => {
              const to = normalize(m.submittedTo);
              const by = normalize(m.assignedByRole);
              const src = normalize(m.sourceRole);
              const inPath = Array.isArray(m.assignmentPath)
                ? m.assignmentPath.some(
                    (r) =>
                      normalize(String(r)) === "admin" ||
                      normalize(String(r)) === "dean"
                  )
                : false;
              if (to.includes("admin") || to.includes("dean")) return false;
              if (by === "admin" || by === "dean") return false;
              if (src === "admin" || src === "dean") return false;
              if (inPath) return false;
              return true;
            });
            setItems(mergedItems);
          } else {
            setItems([]);
          }
        } catch {
          setItems([]);
        }
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [user]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const matchesStatus = (c: ComplaintType) => {
      if (!statusFilter || statusFilter === "All") return true;
      if (statusFilter === "Pending")
        return c.status === "Pending" || c.status === "Unassigned";
      if (statusFilter === "In Progress")
        return c.status === "In Progress" || c.status === "Assigned";
      if (statusFilter === "Assigned") return c.status === "Assigned";
      if (statusFilter === "Rejected")
        return c.status === "Closed" || c.assignedStaff === "Rejected";
      return c.status === statusFilter;
    };

    return items.filter((c) => {
      if (!matchesStatus(c)) return false;
      if (!q) return true;
      return [c.id, c.title, c.category, c.submittedBy, c.assignedStaff]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [items, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const start = (page - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 lg:space-y-8">
      <div className="space-y-2">
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold">
          All Complaints (HoD)
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          View all complaints in your department
        </p>
      </div>

      {/* Summary cards - match dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium">
              Total Complaints
            </CardTitle>
            <div className="bg-blue-50 p-1.5 md:p-2 rounded-lg dark:bg-blue-900/20 flex-shrink-0">
              <Search className="h-3 w-3 md:h-4 md:w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="text-lg md:text-2xl font-bold">{total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All department complaints
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium">
              Pending
            </CardTitle>
            <div className="bg-yellow-50 p-1.5 md:p-2 rounded-lg dark:bg-yellow-900/20 flex-shrink-0">
              <div className="h-3 w-3 md:h-4 md:w-4 rounded-full bg-yellow-500" />
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="text-lg md:text-2xl font-bold text-yellow-600">
              {pending}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting action
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium">
              In Progress
            </CardTitle>
            <div className="bg-blue-50 p-1.5 md:p-2 rounded-lg dark:bg-blue-900/20 flex-shrink-0">
              <div className="h-3 w-3 md:h-4 md:w-4 rounded-full bg-blue-500" />
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="text-lg md:text-2xl font-bold text-blue-600">
              {inProgress}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Being worked on
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium">
              Resolved
            </CardTitle>
            <div className="bg-green-50 p-1.5 md:p-2 rounded-lg dark:bg-green-900/20 flex-shrink-0">
              <div className="h-3 w-3 md:h-4 md:w-4 rounded-full bg-green-500" />
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="text-lg md:text-2xl font-bold text-green-600">
              {resolved}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Successfully completed
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="p-3 md:p-6">
        <CardHeader className="p-0 pb-3 md:pb-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Search className="h-4 w-4 md:h-5 md:w-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by title, submitter, assignee, category..."
                className="pl-10 h-9 md:h-10 text-sm"
              />
            </div>
            <Select
              onValueChange={(v) => setStatusFilter(v)}
              value={statusFilter}
            >
              <SelectTrigger className="h-9 md:h-10 text-sm">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Assigned">Assigned</SelectItem>
                <SelectItem value="Resolved">Resolved</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-2">
            <CardTitle className="text-base md:text-lg">Complaints</CardTitle>
            <div className="text-sm text-muted-foreground">
              {filtered.length} complaint{filtered.length !== 1 ? "s" : ""}{" "}
              found
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 md:p-6 pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px] md:w-[250px] text-sm">
                    Title
                  </TableHead>
                  <TableHead className="text-sm">Category</TableHead>
                  <TableHead className="text-sm">Submitted By</TableHead>
                  <TableHead className="text-sm">Assigned To</TableHead>
                  <TableHead className="text-sm">Status</TableHead>
                  <TableHead className="text-sm">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-sm">
                      <div className="max-w-[200px] md:max-w-[250px]">
                        <div className="font-medium leading-tight line-clamp-2">
                          {c.title}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          #{c.id}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {c.category || "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="max-w-[120px] md:max-w-none truncate">
                        {c.submittedBy || "Unknown"}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="max-w-[120px] md:max-w-none truncate">
                        {c.status === "Closed"
                          ? "Rejected"
                          : c.assignedStaff || "Unassigned"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`text-xs px-2 py-1 ${
                          statusColors[c.status] ?? "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelected(c);
                          setOpen(true);
                        }}
                        className="text-xs h-8 px-3"
                      >
                        <Eye className="h-3 w-3 mr-1" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {pageItems.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-8 text-sm md:text-base"
                    >
                      {statusFilter === "Pending" && "No pending complaints"}
                      {statusFilter === "In Progress" &&
                        "No in-progress complaints"}
                      {statusFilter === "Assigned" && "No assigned complaints"}
                      {statusFilter === "Resolved" && "No resolved complaints"}
                      {statusFilter === "Rejected" && "No rejected complaints"}
                      {statusFilter === "Closed" && "No closed complaints"}
                      {statusFilter === "All" && "No complaints found"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 md:mt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setPage(Math.max(1, page - 1));
                      }}
                      className={`text-sm px-3 py-2 h-9 ${
                        page === 1 ? "pointer-events-none opacity-50" : ""
                      }`}
                    />
                  </PaginationItem>
                  {Array.from(
                    { length: Math.min(totalPages, 5) },
                    (_, i) =>
                      i + Math.max(1, Math.min(page - 2, totalPages - 4))
                  ).map((p) => (
                    <PaginationItem key={p} className="hidden sm:list-item">
                      <PaginationLink
                        href="#"
                        isActive={p === page}
                        onClick={(e) => {
                          e.preventDefault();
                          setPage(p);
                        }}
                        className="text-sm h-9 w-9"
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setPage(Math.min(totalPages, page + 1));
                      }}
                      className={`text-sm px-3 py-2 h-9 ${
                        page === totalPages
                          ? "pointer-events-none opacity-50"
                          : ""
                      }`}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {selected && (
        <RoleBasedComplaintModal
          complaint={selected}
          open={open}
          onOpenChange={setOpen}
          hideHodActionsIfAssigned
          timelineFilterMode="summary"
        />
      )}
    </div>
  );
}
