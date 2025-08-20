import { useState } from "react";
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

export function AdminComplaints() {
  
  const mockComplaints: Complaint[] = [
    {
      id: "C1001",
      title: "Leaking faucet in restroom",
      description: "The faucet in the main restroom is leaking.",
      category: "Facilities",
      priority: "High",
      status: "Pending",
      submittedBy: "John Doe",
      assignedStaff: "Staff A",
      submittedDate: new Date(Date.now() - 86400000 * 2),
      lastUpdated: new Date(Date.now() - 86400000 * 1),
      deadline: new Date(Date.now() - 86400000 * 1),
      isEscalated: false,
      evidenceFile: "",
      feedback: null,
    },
    {
      id: "C1002",
      title: "WiFi not working",
      description: "WiFi is down in the library area.",
      category: "IT",
      priority: "Medium",
      status: "In Progress",
      submittedBy: "Jane Smith",
      assignedStaff: "Staff B",
      submittedDate: new Date(Date.now() - 86400000 * 3),
      lastUpdated: new Date(Date.now() - 86400000 * 2),
      deadline: new Date(Date.now() + 86400000 * 2),
      isEscalated: true,
      evidenceFile: "",
      feedback: null,
    },
    {
      id: "C1003",
      title: "Library AC not working",
      description: "AC in library is broken since last week.",
      category: "Facilities",
      priority: "Critical",
      status: "Resolved",
      submittedBy: "Alice Brown",
      assignedStaff: "Staff C",
      submittedDate: new Date(Date.now() - 86400000 * 7),
      lastUpdated: new Date(Date.now() - 86400000 * 1),
      deadline: new Date(Date.now() - 86400000 * 5),
      isEscalated: false,
      evidenceFile: "",
      feedback: { rating: 4, comment: "Resolved quickly, thanks!" },
    },
  ];
  const navigate = useNavigate();
  // Keep complaints in local state so updates reflect in the table
  const [complaints, setComplaints] = useState<Complaint[]>(mockComplaints);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");
  const [statusTab, setStatusTab] = useState<string>("all");

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

  // Tab counts
  const counts = {
    all: complaints.length,
    Pending: complaints.filter((c) => c.status === "Pending").length,
    "In Progress": complaints.filter((c) => c.status === "In Progress").length,
    Resolved: complaints.filter((c) => c.status === "Resolved").length,
    Closed: complaints.filter((c) => c.status === "Closed").length,
    Overdue: complaints.filter((c) => isOverdue(c)).length,
  } as const;

  // Apply tab filter before passing to the table
  const complaintsForTable = complaints.filter((c) =>
    statusTab === "all"
      ? true
      : statusTab === "Overdue"
      ? isOverdue(c)
      : c.status === statusTab
  );
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

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>All Admin Complaints</CardTitle>
          <div className="mt-2">
            <Tabs value={statusTab} onValueChange={setStatusTab}>
              <TabsList className="flex flex-wrap gap-1">
                <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
                <TabsTrigger value="Pending">
                  Pending ({counts["Pending"]})
                </TabsTrigger>
                <TabsTrigger value="In Progress">
                  In Progress ({counts["In Progress"]})
                </TabsTrigger>
                <TabsTrigger value="Resolved">
                  Resolved ({counts["Resolved"]})
                </TabsTrigger>
                <TabsTrigger value="Closed">
                  Closed ({counts["Closed"]})
                </TabsTrigger>
                <TabsTrigger value="Overdue">
                  Overdue ({counts["Overdue"]})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <ComplaintTable
            complaints={pagedComplaints}
            userRole="admin"
            showOverdueColumn
            isOverdueFn={isOverdue}
            actionLabel="View Detail"
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
    </div>
  );
}
export default AdminComplaints;
