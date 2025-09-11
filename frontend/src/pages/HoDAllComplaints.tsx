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
    const pending = items.filter((c) => c.status === "Pending").length;
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
            submittedBy: submittedBy || "Anonymous",
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
        const resolvedArr: HodAllResponse["accepted"] = Array.isArray(
          (data as unknown as { resolved?: unknown }).resolved
        )
          ? (data as unknown as { resolved: HodAllResponse["accepted"] })
              .resolved || []
          : [];
        const merged = [
          ...data.pending.map(toComp),
          ...data.accepted.map(toComp),
          ...data.assigned.map(toComp),
          ...resolvedArr.map(toComp),
          ...data.rejected.map(toComp),
        ];
        const byId = new Map<string, ComplaintType>();
        for (const c of merged) byId.set(c.id, c);
        const mergedItems = Array.from(byId.values());
        // Enforce department scoping: only show complaints for this HoD's department
        const normalize = (v?: string) =>
          (v || "").toString().trim().toLowerCase();
        if (user && user.department) {
          const myDept = normalize(user.department);
          setItems(
            mergedItems.filter((m) => normalize(m.department) === myDept)
          );
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
              submittedBy: submittedBy || "Anonymous",
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
              submittedBy: submittedBy || "Anonymous",
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
          const mergedItems = Array.from(byId.values());
          const normalize = (v?: string) =>
            (v || "").toString().trim().toLowerCase();
          if (user && user.department) {
            const myDept = normalize(user.department);
            setItems(
              mergedItems.filter((m) => normalize(m.department) === myDept)
            );
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
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold">All Complaints (HoD)</h1>
      </div>

      {/* Summary cards - match dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm text-muted-foreground">
              Total Complaints
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-semibold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm text-muted-foreground">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-semibold">{pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm text-muted-foreground">
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-semibold">{inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm text-muted-foreground">
              Resolved
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-semibold">{resolved}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title, submitter, assignee, category..."
            />
            <Select
              onValueChange={(v) => setStatusFilter(v)}
              value={statusFilter}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
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
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Complaints</CardTitle>
            <div className="text-sm text-muted-foreground">
              {filtered.length} item{filtered.length === 1 ? "" : "s"}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Timeline</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{c.title}</span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {c.category || "-"}
                    </TableCell>
                    <TableCell>{c.submittedBy || "Anonymous"}</TableCell>
                    <TableCell>
                      {c.status === "Closed"
                        ? "Rejected"
                        : c.assignedStaff || "Not Assigned"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`text-xs ${
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
                      >
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {pageItems.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-8"
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
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setPage(Math.max(1, page - 1));
                      }}
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
