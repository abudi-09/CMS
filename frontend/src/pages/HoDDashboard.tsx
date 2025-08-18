import { useState } from "react";
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
  const department = user?.department || "Unknown";
  const complaints = [
    // ...fetch department-specific complaints here...
  ];
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null
  );
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Head of Department Dashboard ({department})</CardTitle>
        </CardHeader>
        <CardContent>
          <ComplaintTable
            complaints={complaints}
            onStatusClick={() => setShowStatusModal(true)}
            onAssignClick={() => setShowAssignModal(true)}
          />
        </CardContent>
      </Card>

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
            throw new Error("Function not implemented.");
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
            throw new Error("Function not implemented.");
          }}
        />
      )}
    </div>
  );
}
