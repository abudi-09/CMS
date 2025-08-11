import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SummaryCards } from "@/components/SummaryCards";
import { ComplaintTable } from "@/components/ComplaintTable";
import { RoleBasedComplaintModal } from "@/components/RoleBasedComplaintModal";
import { Complaint } from "@/components/ComplaintCard";

// Mock data for demo
const now = new Date();
const mockComplaints: Complaint[] = [
  {
    id: "d1",
    title: "Lab PC not working",
    status: "Pending",
    priority: "High",
    deadline: new Date(now.getTime() - 2 * 86400000), // overdue
    submittedBy: "Student A",
    assignedStaff: "Staff X",
    category: "IT",
    description: "PC in Lab 1 is not booting.",
    submittedDate: new Date(now.getTime() - 3 * 86400000),
    assignedDate: new Date(now.getTime() - 2 * 86400000),
    lastUpdated: new Date(now.getTime() - 1 * 86400000),
  },
  {
    id: "d2",
    title: "Projector issue",
    status: "In Progress",
    priority: "Medium",
    deadline: new Date(now.getTime() + 2 * 86400000), // not overdue
    submittedBy: "Student B",
    assignedStaff: "Staff Y",
    category: "Facilities",
    description: "Projector in Room 204 flickers.",
    submittedDate: new Date(now.getTime() - 2 * 86400000),
    assignedDate: new Date(now.getTime() - 1 * 86400000),
    lastUpdated: new Date(now.getTime() - 1 * 43200000),
  },
];

export function DeanDashboard() {
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null
  );
  const [showDetailModal, setShowDetailModal] = useState(false);

  const handleViewComplaint = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setShowDetailModal(true);
  };

  // Department summary cards mock
  const summaryData = [
    { label: "Total Students", value: 120 },
    { label: "Total Staff", value: 15 },
    { label: "Total Complaints", value: 8 },
    { label: "Overdue Complaints", value: 2 },
    { label: "Resolved Complaints", value: 4 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dean Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your department's staff, students, and complaints
        </p>
      </div>
      {/* Department Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryData.map((card) => (
          <Card key={card.label}>
            <CardHeader>
              <CardTitle>{card.value}</CardTitle>
              <CardDescription>{card.label}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
      {/* Complaints Table */}
      <ComplaintTable
        complaints={mockComplaints}
        onView={handleViewComplaint}
        userRole="admin" // TODO: update ComplaintTable to support 'dean' role
        title="Department Complaints"
        showOverdueColumn
        isOverdueFn={(c) =>
          new Date(c.deadline) < now && c.status !== "Resolved"
        }
        actionLabel="View Detail"
      />
      {/* Modal */}
      <RoleBasedComplaintModal
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        complaint={selectedComplaint}
      />
    </div>
  );
}
