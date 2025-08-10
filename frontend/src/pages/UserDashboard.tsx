import { useState } from "react";
import { useComplaints } from "@/context/ComplaintContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle, FileText, MessageSquare, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SummaryCards } from "@/components/SummaryCards";
import { ComplaintTable } from "@/components/ComplaintTable";
import { RoleBasedComplaintModal } from "@/components/RoleBasedComplaintModal";
import { Complaint } from "@/components/ComplaintCard";
import { useEffect } from "react";
import { getMyComplaintsApi } from "@/lib/api";

export function UserDashboard() {
  const { complaints, updateComplaint } = useComplaints();
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null
  );
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [prioritySort, setPrioritySort] = useState<"asc" | "desc">("desc");
  const navigate = useNavigate();

  const handleViewComplaint = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setShowDetailModal(true);
  };

  const handleUpdate = (complaintId: string, updates: Partial<Complaint>) => {
    updateComplaint(complaintId, updates);
  };

  // Filter and sort complaints (only those submitted by the current user)
  // TODO: Replace 'Current User' with real user context if available
  const myComplaints = complaints.filter(
    (c) => c.submittedBy === "Current User"
  );
  const filteredComplaints = myComplaints.filter((complaint) => {
    return priorityFilter === "all" || complaint.priority === priorityFilter;
  });
  const sortedComplaints = [...filteredComplaints].sort((a, b) => {
    const priorityOrder = { Critical: 4, High: 3, Medium: 2, Low: 1 };
    const aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
    const bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
    return prioritySort === "desc" ? bValue - aValue : aValue - bValue;
  });
  const recentComplaints = sortedComplaints.slice(0, 3);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">My Dashboard</h1>
        <p className="text-muted-foreground">
          Track and manage your complaints
        </p>
      </div>

      {/* Summary Cards */}
      <SummaryCards complaints={myComplaints} userRole="user" />

      {/* Quick Actions */}
      <div className="w-full overflow-x-auto pb-2">
        <div className="flex gap-4 min-w-[340px] sm:grid sm:grid-cols-2 sm:gap-6">
          <Card className="hover:shadow-md transition-shadow min-w-[260px] flex-1">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <PlusCircle className="h-5 w-5" />
                Submit Complaint
              </CardTitle>
              <CardDescription>
                Report an issue or concern quickly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full hover:bg-primary/90 dark:hover:bg-hover-blue"
                onClick={() => navigate("/submit-complaint")}
              >
                Submit New Complaint
              </Button>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow min-w-[260px] flex-1">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                View Complaints
              </CardTitle>
              <CardDescription>
                Track status of all your complaints
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full hover:bg-muted dark:hover:bg-hover-blue/10"
                onClick={() => navigate("/my-complaints")}
              >
                My Complaints
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Complaints */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl md:text-2xl font-semibold">
            Recent Complaints
          </h2>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/my-complaints")}
              aria-label="View all complaints"
            >
              View All
            </Button>
          </div>
        </div>
        <div className="w-full overflow-x-auto">
          <div className="min-w-[700px] block w-full max-w-full">
            <ComplaintTable
              complaints={recentComplaints}
              onView={handleViewComplaint}
              userRole="user"
              title="My Recent Complaints"
              actionLabel="View"
            />
          </div>
        </div>
      </div>

      {/* Modal */}
      <RoleBasedComplaintModal
        complaint={selectedComplaint}
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
