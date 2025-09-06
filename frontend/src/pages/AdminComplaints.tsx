import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComplaintTable } from "@/components/ComplaintTable";
import { Complaint } from "@/components/ComplaintCard";
import { useNavigate } from "react-router-dom";
import { RoleBasedComplaintModal } from "@/components/RoleBasedComplaintModal";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  getAdminInboxApi,
  approveComplaintApi,
  updateComplaintStatusApi,
} from "@/lib/api";

// Minimal shape for Admin list mapping
type AdminListItem = {
  id: string;
  title?: string;
  category?: string;
  status?: string;
  priority?: string;
  submittedBy?: string;
  assignedTo?: string;
  submittedDate?: string | Date;
  lastUpdated?: string | Date;
  deadline?: string | Date | null;
  sourceRole?: string;
  assignedByRole?: string;
  assignmentPath?: string[];
  submittedTo?: string | null;
  department?: string | null;
};
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/AuthContext";
import {
  getAdminAnalyticsSummaryApi,
  getAdminStatusDistributionApi,
} from "@/lib/api";

// Small server-driven stats row component (computes counts from server-scoped complaints)
function ServerStatsRow({ complaints }: { complaints: Complaint[] }) {
  const total = complaints.length;
  const pending = complaints.filter((c) => c.status === "Pending").length;
  // user requested: Accepted should NOT include "In Progress"
  const accepted = complaints.filter((c) => c.status === "Accepted").length;
  const resolved = complaints.filter((c) => c.status === "Resolved").length;
  const rejected = complaints.filter((c) => c.status === "Closed").length;

  const cards = [
    { title: "Direct Complaints", value: total },
    { title: "Pending", value: pending },
    { title: "Accepted", value: accepted },
    { title: "Resolved", value: resolved },
    { title: "Rejected", value: rejected },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-6">
      {cards.map((c) => (
        <div
          key={c.title}
          className="p-4 bg-white rounded shadow flex flex-col justify-between"
        >
          <div className="text-xs text-muted-foreground">{c.title}</div>
          <div className="text-2xl font-bold">{c.value}</div>
        </div>
      ))}
    </div>
  );
}

function AdminComplaints() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [statusTab, setStatusTab] = useState<
    "Pending" | "Accepted" | "Resolved" | "Rejected"
  >("Pending");

  // Load admin-scoped inbox on mount
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await getAdminInboxApi();
        if (!alive) return;
        if (Array.isArray(data)) setComplaints(data as Complaint[]);
      } catch (e) {
        // ignore load error
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const handleStatusUpdate = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setModalOpen(true);
  };

  const handleModalUpdate = (id: string, updates: Partial<Complaint>) => {
    setComplaints((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              ...updates,
              lastUpdated: updates.lastUpdated ?? new Date(),
            }
          : c
      )
    );
    if (updates.status === "Resolved") {
      setStatusTab("Resolved");
    } else if (updates.status === "Closed") {
      setStatusTab("Rejected");
    } else if (updates.status === "Accepted") {
      setStatusTab("Accepted");
    }
  };

  // Overdue helper (deadline passed and not Resolved/Closed)
  const isOverdue = (c: Complaint) =>
    !!c.deadline &&
    new Date() > new Date(c.deadline) &&
    c.status !== "Resolved" &&
    c.status !== "Closed";

  // Complaints are already server-scoped to this admin; use full list
  const adminInbox = complaints;

  // Helper: detect rejected (Closed with Rejected: prefix)
  // Backend models rejections as status Closed with a note. Without note access here,
  // approximate: treat Closed items in Admin inbox as Rejected for tab grouping.
  const isRejected = (c: Complaint) => c.status === "Closed";

  // Tab counts (only direct-to-admin set), mapped to requested groups
  const counts = {
    Pending: adminInbox.filter((c) => c.status === "Pending").length,
    Accepted: adminInbox.filter((c) => c.status === "Accepted").length,
    Resolved: adminInbox.filter((c) => c.status === "Resolved").length,
    Rejected: adminInbox.filter((c) => isRejected(c)).length,
  } as const;

  // Apply tab filter before passing to the table
  // Apply tab grouping to determine which complaints to show
  const complaintsForTable = adminInbox.filter((c) => {
    if (statusTab === "Pending") return c.status === "Pending";
    if (statusTab === "Accepted") return c.status === "Accepted";
    if (statusTab === "Resolved") return c.status === "Resolved";
    if (statusTab === "Rejected") return isRejected(c);
    return false;
  });
  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const totalItems = complaintsForTable.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (page - 1) * pageSize;
  const pagedComplaints = complaintsForTable.slice(
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

  // Reset to first page when tab changes
  useEffect(() => {
    setPage(1);
  }, [statusTab]);

  // Clamp current page if total pages shrink
  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  // Admin actions: Accept / Reject
  const acceptComplaint = async (c: Complaint) => {
    try {
      await approveComplaintApi(c.id, { assignToSelf: true });
      const adminName = (user && (user.fullName || user.name)) || "Admin";
      setComplaints((prev) =>
        prev.map((x) =>
          x.id === c.id
            ? {
                ...x,
                status: "Accepted",
                assignedStaff: adminName,
                assignedStaffRole: "admin",
              }
            : x
        )
      );
      window.dispatchEvent(
        new CustomEvent("complaint:status-changed", { detail: { id: c.id } })
      );
      toast({ title: "Accepted", description: "Moved to Accepted." });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to accept";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const rejectComplaint = async (c: Complaint) => {
    // Admin can reject without a reason
    try {
      await updateComplaintStatusApi(c.id, "Closed");
      setComplaints((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, status: "Closed" } : x))
      );
      window.dispatchEvent(
        new CustomEvent("complaint:status-changed", { detail: { id: c.id } })
      );
      toast({ title: "Rejected", description: "Complaint rejected." });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to reject";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const reapproveComplaint = async (c: Complaint) => {
    try {
      // Admin can re-approve without a note; also assigns to self
      await approveComplaintApi(c.id, {
        assignToSelf: true,
      });
      const adminName = (user && (user.fullName || user.name)) || "Admin";
      setComplaints((prev) =>
        prev.map((x) =>
          x.id === c.id
            ? {
                ...x,
                status: "Accepted",
                assignedStaff: adminName,
                assignedStaffRole: "admin",
              }
            : x
        )
      );
      window.dispatchEvent(
        new CustomEvent("complaint:status-changed", { detail: { id: c.id } })
      );
      toast({ title: "Re-Approved", description: "Moved to Accepted." });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to re-approve";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-6">
      {/* Top summary counters (fetched from server): Total, Pending, Accepted, Resolved, Rejected */}
      <ServerStatsRow
        complaints={complaints}
        // fetch server-side counts on mount
      />

      <Card>
        <CardHeader>
          <CardTitle>Admin Complaints</CardTitle>
          <div className="mt-2">
            <Tabs value={statusTab} onValueChange={setStatusTab}>
              <TabsList className="flex flex-wrap gap-1">
                <TabsTrigger value="Pending">
                  Pending ({counts["Pending"]})
                </TabsTrigger>
                <TabsTrigger value="Accepted">
                  Accepted ({counts["Accepted"]})
                </TabsTrigger>
                <TabsTrigger value="Resolved">
                  Resolved ({counts["Resolved"]})
                </TabsTrigger>
                <TabsTrigger value="Rejected">
                  Rejected ({counts["Rejected"]})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <ComplaintTable
            complaints={pagedComplaints}
            userRole="admin"
            showOverdueColumn={false}
            actionLabel="View Detail"
            hideIdColumn
            onAccept={statusTab === "Pending" ? acceptComplaint : undefined}
            onReject={statusTab === "Pending" ? rejectComplaint : undefined}
            // Update action is available inside the View Detail modal
            onReapprove={
              statusTab === "Rejected" ? reapproveComplaint : undefined
            }
            onView={(complaint) => {
              setSelectedComplaint(complaint);
              setModalOpen(true);
            }}
          />
          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        goToPage(page - 1);
                      }}
                      className={
                        page === 1 ? "pointer-events-none opacity-50" : ""
                      }
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
                        page === totalPages
                          ? "pointer-events-none opacity-50"
                          : ""
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
      <button
        onClick={() => navigate("/admin-dashboard")}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
      >
        Back to Dashboard
      </button>

      <RoleBasedComplaintModal
        complaint={selectedComplaint}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onUpdate={handleModalUpdate}
      />

      {/** StatusUpdateModal removed; updates are handled within RoleBasedComplaintModal */}
    </div>
  );
}
export default AdminComplaints;
