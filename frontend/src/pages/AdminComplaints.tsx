import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComplaintTable } from "@/components/ComplaintTable";
import { Complaint } from "@/components/ComplaintCard";
import { useNavigate } from "react-router-dom";
import { RoleBasedComplaintModal } from "@/components/RoleBasedComplaintModal";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AdminComplaints() {
  // Mock complaints data for demo/testing
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
            complaints={complaintsForTable}
            userRole="admin"
            showOverdueColumn
            isOverdueFn={isOverdue}
            onView={(complaint) => {
              setSelectedComplaint(complaint);
              setModalOpen(true);
            }}
            onStatusUpdate={(complaint) => {
              setSelectedComplaint(complaint);
              setModalOpen(true);
            }}
          />
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
