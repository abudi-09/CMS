import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComplaintTable } from "@/components/ComplaintTable";
import { Complaint } from "@/components/ComplaintCard";
import { useComplaints } from "@/context/ComplaintContext";
import { useNavigate } from "react-router-dom";
import { RoleBasedComplaintModal } from "@/components/RoleBasedComplaintModal";

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
      isEscalated: false,
      evidenceFile: "",
      feedback: { rating: 4, comment: "Resolved quickly, thanks!" },
    },
  ];
  const navigate = useNavigate();
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");

  const handleStatusUpdate = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setModalOpen(true);
  };

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>All Admin Complaints</CardTitle>
        </CardHeader>
        <CardContent>
          <ComplaintTable
            complaints={mockComplaints}
            userRole="admin"
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
      />
    </div>
  );
}
export default AdminComplaints;
