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
  listAllComplaintsApi,
  approveComplaintApi,
  updateComplaintStatusApi,
} from "@/lib/api";
import { toast } from "@/hooks/use-toast";

export function AdminComplaints() {
  const navigate = useNavigate();
  // Keep complaints in local state so updates reflect in the table
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null
  );
  const [modalOpen, setModalOpen] = useState(false);
  // Updates will be handled inside the View Detail modal (RoleBasedComplaintModal)
  // Tabs: Pending (status Pending), Accepted (status In Progress), Rejected (Closed with Rejected: note)
  const [statusTab, setStatusTab] = useState<string>("Pending");
  // No separate updatingComplaint; use selectedComplaint in the detail modal

  // Load from backend
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const raw = await listAllComplaintsApi();
        if (cancelled) return;
        const mapped: Complaint[] = (raw || []).map((c) => ({
          id: c.id,
          title: c.title || "Complaint",
          description: "",
          category: c.category || "General",
          status: (c.status as Complaint["status"]) || "Pending",
          priority: (c.priority as Complaint["priority"]) || "Medium",
          submittedBy: c.submittedBy || "",
          assignedStaff: c.assignedTo || undefined,
          submittedDate: c.submittedDate
            ? new Date(c.submittedDate)
            : new Date(),
          lastUpdated: c.lastUpdated ? new Date(c.lastUpdated) : new Date(),
          deadline: c.deadline ? new Date(c.deadline) : undefined,
          sourceRole: (c.sourceRole as Complaint["sourceRole"]) || undefined,
          assignedByRole:
            (c.assignedByRole as Complaint["assignedByRole"]) || undefined,
          assignmentPath: Array.isArray(c.assignmentPath)
            ? (c.assignmentPath as Complaint["assignmentPath"])
            : [],
          submittedTo: c.submittedTo || undefined,
          department: c.department || undefined,
        }));
        setComplaints(mapped);
      } catch {
        // stay empty on failure
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
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
  };

  // Overdue helper (deadline passed and not Resolved/Closed)
  const isOverdue = (c: Complaint) =>
    !!c.deadline &&
    new Date() > new Date(c.deadline) &&
    c.status !== "Resolved" &&
    c.status !== "Closed";

  // Scope this page to complaints sent directly to Admin by students
  const isDirectToAdmin = (c: Complaint) => {
    const submittedTo = (c.submittedTo || "").toLowerCase();
    const src = (c.sourceRole || "").toLowerCase();
    const assignedBy = (c.assignedByRole || "").toLowerCase();
    return (
      submittedTo === "admin" || (src === "student" && assignedBy === "admin")
    );
  };
  const adminInbox = complaints.filter(isDirectToAdmin);

  // Helper: detect rejected (Closed with Rejected: prefix)
  // Backend models rejections as status Closed with a note. Without note access here,
  // approximate: treat Closed items in Admin inbox as Rejected for tab grouping.
  const isRejected = (c: Complaint) => c.status === "Closed";

  // Tab counts (only direct-to-admin set), mapped to requested groups
  const counts = {
    Pending: adminInbox.filter((c) => c.status === "Pending").length,
    Accepted: adminInbox.filter((c) => c.status === "In Progress").length,
    Rejected: adminInbox.filter((c) => isRejected(c)).length,
  } as const;

  // Apply tab filter before passing to the table
  // Apply tab grouping to determine which complaints to show
  const complaintsForTable = adminInbox.filter((c) => {
    if (statusTab === "Pending") return c.status === "Pending";
    if (statusTab === "Accepted") return c.status === "In Progress";
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
      await approveComplaintApi(c.id);
      setComplaints((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, status: "In Progress" } : x))
      );
      window.dispatchEvent(
        new CustomEvent("complaint:status-changed", { detail: { id: c.id } })
      );
      toast({ title: "Accepted", description: "Moved to In Progress." });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to accept";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const rejectComplaint = async (c: Complaint) => {
    const reason = window.prompt("Enter reason for rejection (required):", "");
    if (!reason || !reason.trim()) {
      toast({
        title: "Reason required",
        description: "Please enter a reason to reject.",
        variant: "destructive",
      });
      return;
    }
    try {
      await updateComplaintStatusApi(
        c.id,
        "Closed",
        `Rejected: ${reason.trim()}`
      );
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
    const note = window.prompt(
      "Enter a note/description for re-approval (required):",
      ""
    );
    if (!note || !note.trim()) {
      toast({
        title: "Note required",
        description: "Please provide a brief note for re-approval.",
        variant: "destructive",
      });
      return;
    }
    try {
      await approveComplaintApi(c.id, { note: note.trim() });
      setComplaints((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, status: "In Progress" } : x))
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
