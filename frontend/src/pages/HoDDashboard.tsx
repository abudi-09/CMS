import { useState } from "react";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ComplaintTable } from "@/components/ComplaintTable";
import { RoleBasedComplaintModal } from "@/components/RoleBasedComplaintModal";
import { AssignStaffModal } from "@/components/AssignStaffModal";
import { StatusUpdateModal } from "@/components/StatusUpdateModal";
import { Complaint } from "@/components/ComplaintCard";
import { useComplaints } from "@/context/ComplaintContext";
import { useAuth } from "@/components/auth/AuthContext";
import { toast } from "@/hooks/use-toast";

export function HoDDashboard() {
  // Mock data for demo
  const { user } = useAuth();
  const department = user?.department || "Biology";
  // Mock complaints for demo
  const allComplaints = [
    {
      id: "c1",
      title: "Lab equipment malfunction",
      description: "Microscope in Lab 2 is not working.",
      category: "Lab",
      priority: "High",
      status: "Pending",
      submittedBy: "Student A",
      submittedDate: new Date(),
      assignedStaff: "Staff X",
      assignedDate: new Date(),
      lastUpdated: new Date(),
      deadline: new Date(Date.now() + 2 * 86400000),
      evidenceFile: null,
      resolutionNote: "Checked, needs replacement part.",
      feedback: null,
      department: "Biology",
    },
    {
      id: "c2",
      title: "Classroom projector issue",
      description: "Projector in Room 101 is flickering.",
      category: "Classroom",
      priority: "Medium",
      status: "In Progress",
      submittedBy: "Student B",
      submittedDate: new Date(),
      assignedStaff: "Staff Y",
      assignedDate: new Date(),
      lastUpdated: new Date(),
      deadline: new Date(Date.now() + 3 * 86400000),
      evidenceFile: null,
      resolutionNote: "Ordered new bulb.",
      feedback: null,
      department: "Physics",
    },
    {
      id: "c3",
      title: "Broken window in office",
      description: "Window in HOD office is broken.",
      category: "Maintenance",
      priority: "Low",
      status: "Resolved",
      submittedBy: "Staff Z",
      submittedDate: new Date(),
      assignedStaff: "Staff W",
      assignedDate: new Date(),
      lastUpdated: new Date(),
      deadline: new Date(Date.now() + 1 * 86400000),
      evidenceFile: null,
      resolutionNote: "Repaired by maintenance team.",
      feedback: { rating: 5, comment: "Quick fix!" },
      department: "Biology",
    },
  ];
  // Filter by department
  const complaints = allComplaints.filter((c) => c.department === department);

  // Mock: total students in department
  const totalStudents = 120;

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [staffFilter, setStaffFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("");

  // Filtered complaints
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      let ok = true;
      if (statusFilter && c.status !== statusFilter) ok = false;
      if (staffFilter && c.assignedStaff !== staffFilter) ok = false;
      if (
        dateFilter &&
        c.submittedDate &&
        new Date(c.submittedDate).toLocaleDateString() !== dateFilter
      )
        ok = false;
      return ok;
    });
  }, [complaints, statusFilter, staffFilter, dateFilter]);

  // Summary counts
  const totalComplaints = complaints.length;
  const pendingCount = complaints.filter((c) => c.status === "Pending").length;
  const inProgressCount = complaints.filter(
    (c) => c.status === "In Progress"
  ).length;
  const resolvedCount = complaints.filter(
    (c) => c.status === "Resolved"
  ).length;
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null
  );
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-6">
      <h1 className="text-2xl font-bold mb-4">
        Head of Department Dashboard ({department})
      </h1>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent>
            <div className="text-lg font-semibold">Students</div>
            <div className="text-2xl">{totalStudents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="text-lg font-semibold">Total Complaints</div>
            <div className="text-2xl">{totalComplaints}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="text-lg font-semibold">Pending</div>
            <div className="text-2xl">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="text-lg font-semibold">In Progress</div>
            <div className="text-2xl">{inProgressCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="text-lg font-semibold">Resolved</div>
            <div className="text-2xl">{resolvedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="">All Status</option>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
        </select>
        <input
          value={staffFilter}
          onChange={(e) => setStaffFilter(e.target.value)}
          className="border rounded px-3 py-2"
          placeholder="Filter by Staff"
        />
        <input
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="border rounded px-3 py-2"
          placeholder="Filter by Date (MM/DD/YYYY)"
        />
      </div>

      {/* Recent Complaints Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Complaints</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2">ID</th>
                <th>Category</th>
                <th>Submitted By</th>
                <th>Status</th>
                <th>Deadline</th>
                <th>Assigned To</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredComplaints.map((c) => (
                <tr key={c.id} className="border-b hover:bg-muted/50">
                  <td className="py-2">{c.id}</td>
                  <td>{c.category}</td>
                  <td>{c.submittedBy}</td>
                  <td>
                    <Badge>{c.status}</Badge>
                  </td>
                  <td>
                    {c.deadline
                      ? new Date(c.deadline).toLocaleDateString()
                      : ""}
                  </td>
                  <td>{c.assignedStaff}</td>
                  <td className="space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedComplaint(c);
                        setShowDetailModal(true);
                      }}
                    >
                      View
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedComplaint(c);
                        setShowAssignModal(true);
                      }}
                    >
                      Assign
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedComplaint(c);
                        setShowStatusModal(true);
                      }}
                    >
                      Update
                    </Button>
                    {c.status !== "Resolved" && (
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => {
                          /* Mark as resolved logic */
                        }}
                      >
                        Mark Resolved
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Modals */}
      {selectedComplaint && (
        <RoleBasedComplaintModal
          complaint={selectedComplaint}
          open={showDetailModal}
          onOpenChange={setShowDetailModal}
        />
      )}
      {showStatusModal && selectedComplaint && (
        <StatusUpdateModal
          complaint={selectedComplaint}
          open={showStatusModal}
          onOpenChange={setShowStatusModal}
          onUpdate={function (
            complaintId: string,
            newStatus: string,
            notes: string
          ): void {
            // Implement status update logic here
          }}
        />
      )}
      {showAssignModal && selectedComplaint && (
        <AssignStaffModal
          complaint={selectedComplaint}
          open={showAssignModal}
          onOpenChange={setShowAssignModal}
          onAssign={function (
            complaintId: string,
            staffId: string,
            notes: string
          ): void {
            // Implement assign logic here
          }}
        />
      )}
    </div>
  );
}
