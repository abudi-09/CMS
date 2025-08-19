import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Badge } from "@/components/ui/badge";
import { Clock, MessageSquare, UserCheck, Users } from "lucide-react";

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

// Mock pending dean approvals
const pendingStaff = [
  { id: "s1", fullName: "Dr. Alan Turing", department: "Computer Science" },
  { id: "s2", fullName: "Ms. Ada Lovelace", department: "IT" },
  {
    id: "s3",
    fullName: "Prof. Michael Chen",
    department: "Information System",
  },
  { id: "s4", fullName: "Ms. Grace Hopper", department: "Information Science" },
];

export function DeanDashboard() {
  const navigate = useNavigate();
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
      {/* Pending Dean Notifications - should be above the table */}
      {pendingStaff.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Clock className="h-5 w-5" />
              Pending HOD Approvals
            </CardTitle>
            <CardDescription className="text-orange-700">
              {pendingStaff.length} HOD{pendingStaff.length > 1 ? "s" : ""}{" "}
              waiting for approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                {pendingStaff.slice(0, 3).map((staff) => (
                  <div key={staff.id} className="text-sm text-orange-800">
                    • {staff.fullName} ({staff.department})
                  </div>
                ))}
                {pendingStaff.length > 3 && (
                  <div className="text-sm text-orange-700">
                    +{pendingStaff.length - 3} more...
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => navigate("/dean-staff-management")}
                className="text-orange-700 border-orange-300 hover:bg-orange-100"
              >
                Review Applications
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Quick Actions - should be above the table */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => navigate("/dean-staff-management")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Staff Management
              {pendingStaff.length > 0 && (
                <Badge className="bg-orange-100 text-orange-800 ml-auto">
                  {pendingStaff.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Approve staff and manage roles</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Manage Staff
            </Button>
          </CardContent>
        </Card>

        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => navigate("/all-complaints")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              All Complaints
            </CardTitle>
            <CardDescription>Review user feedback and ratings</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              View Complaints
            </Button>
          </CardContent>
        </Card>

        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => navigate("/dean/assign-complaints")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Assign & Reassign
            </CardTitle>
            <CardDescription>
              {mockComplaints.filter((c) => !c.assignedStaff).length} unassigned
              complaints
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Assign Complaints
            </Button>
          </CardContent>
        </Card>
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
