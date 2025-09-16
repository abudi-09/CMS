import { useEffect, useState } from "react";
import { getMyComplaintsApi } from "@/lib/api";
import { useComplaints } from "@/context/ComplaintContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SummaryCards } from "@/components/SummaryCards";
import { ComplaintTable } from "@/components/ComplaintTable";
import { RoleBasedComplaintModal } from "@/components/RoleBasedComplaintModal";
import { Complaint } from "@/components/ComplaintCard";
// Note: API hooks available but not used in this mock-driven demo

export function UserDashboard() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const now = new Date();

  const loadComplaints = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyComplaintsApi();
      interface DTO {
        id?: string;
        _id?: string;
        complaintCode?: string;
        title?: string;
        subject?: string;
        description?: string;
        category?: string;
        department?: string;
        status?: string;
        priority?: string;
        submittedBy?: string | { fullName?: string; name?: string } | null;
        assignedTo?: { fullName?: string; name?: string; role?: string } | null;
        assignedByRole?: string | null;
        assignmentPath?: string[];
        assignedAt?: string;
        createdAt?: string;
        updatedAt?: string;
        deadline?: string;
        feedback?: { rating: number; comment: string } | null;
        resolutionNote?: string;
        evidenceFile?: string;
        isEscalated?: boolean;
        sourceRole?: string;
        submittedTo?: string;
        isAnonymous?: boolean;
      }
      const arr: DTO[] = Array.isArray(data) ? (data as DTO[]) : [];
      const mapped: Complaint[] = arr.map((c: DTO) => ({
        id: c.id || c._id || c.complaintCode || "",
        title: c.title || c.subject || "Untitled Complaint",
        description: c.description || "No description provided",
        category: c.category || c.department || "General",
        status: (c.status || "Pending") as Complaint["status"],
        priority: (c.priority || "Medium") as Complaint["priority"],
        submittedBy:
          typeof c.submittedBy === "string"
            ? c.submittedBy
            : c.submittedBy?.fullName ||
              c.submittedBy?.name ||
              (c.isAnonymous ? "Anonymous" : "You"),
        assignedStaff: c.assignedTo?.fullName || c.assignedTo?.name || "",
        assignedStaffRole:
          c.assignedTo?.role &&
          ["dean", "headOfDepartment", "staff", "admin"].includes(
            c.assignedTo.role
          )
            ? ((c.assignedTo.role === "headOfDepartment"
                ? "hod"
                : c.assignedTo.role) as "dean" | "hod" | "staff" | "admin")
            : undefined,
        assignedByRole:
          c.assignedByRole &&
          ["student", "headOfDepartment", "dean", "admin"].includes(
            c.assignedByRole
          )
            ? ((c.assignedByRole === "headOfDepartment"
                ? "hod"
                : c.assignedByRole) as "student" | "hod" | "dean" | "admin")
            : undefined,
        assignmentPath: Array.isArray(c.assignmentPath)
          ? (c.assignmentPath
              .map((r) => (r === "headOfDepartment" ? "hod" : r))
              .filter(
                (r): r is "student" | "hod" | "dean" | "admin" | "staff" =>
                  ["student", "hod", "dean", "admin", "staff"].includes(r)
              ) as Array<"student" | "hod" | "dean" | "admin" | "staff">)
          : [],
        submittedDate: c.createdAt ? new Date(c.createdAt) : new Date(),
        lastUpdated: c.updatedAt ? new Date(c.updatedAt) : new Date(),
        assignedDate: c.assignedAt ? new Date(c.assignedAt) : undefined,
        deadline: c.deadline ? new Date(c.deadline) : undefined,
        feedback: c.feedback
          ? { rating: c.feedback.rating, comment: c.feedback.comment }
          : undefined,
        resolutionNote: c.resolutionNote,
        evidenceFile: c.evidenceFile,
        isEscalated: !!c.isEscalated,
        sourceRole:
          c.sourceRole === "student" ||
          c.sourceRole === "staff" ||
          c.sourceRole === "headOfDepartment" ||
          c.sourceRole === "dean" ||
          c.sourceRole === "admin"
            ? ((c.sourceRole === "headOfDepartment" ? "hod" : c.sourceRole) as
                | "student"
                | "staff"
                | "hod"
                | "dean"
                | "admin")
            : undefined,
        submittedTo: c.submittedTo,
        department: c.department,
      }));

      setComplaints(mapped);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || "Failed to load complaints");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, []);
  const { updateComplaint } = useComplaints();
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null
  );
  const [showDetailModal, setShowDetailModal] = useState(false);
  const navigate = useNavigate();

  const handleViewComplaint = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setShowDetailModal(true);
  };

  const handleUpdate = (complaintId: string, updates: Partial<Complaint>) => {
    updateComplaint(complaintId, updates);
  };

  const myComplaints = complaints; // already user-specific from backend
  function isOverdue(complaint: Complaint) {
    if (!complaint.deadline) return false;
    return (
      new Date(complaint.deadline) < now &&
      complaint.status !== "Resolved" &&
      complaint.status !== "Closed"
    );
  }
  const recentComplaints = [...myComplaints]
    .sort(
      (a, b) =>
        new Date(b.submittedDate).getTime() -
        new Date(a.submittedDate).getTime()
    )
    .slice(0, 3);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">My Dashboard</h1>
        <p className="text-muted-foreground">
          Track and manage your complaints
        </p>
      </div>

      {/* Loading / Error */}
      {loading && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Loading complaints...</CardTitle>
            <CardDescription>Please wait while we fetch data.</CardDescription>
          </CardHeader>
        </Card>
      )}
      {error && !loading && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive">Failed to load</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={loadComplaints}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}
      {!loading && !error && (
        <SummaryCards complaints={myComplaints} userRole="user" />
      )}

      {/* Quick Actions */}
      <div className="w-full pb-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
                className="w-full min-h-11 hover:bg-primary/90 dark:hover:bg-hover-blue"
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
                className="w-full min-h-11 hover:bg-muted dark:hover:bg-hover-blue/10"
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
          <div className="flex gap-2 flex-wrap justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={loadComplaints}
              aria-label="Refresh complaints"
              className="min-h-11"
            >
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/my-complaints")}
              aria-label="View all complaints"
              className="min-h-11"
            >
              View All
            </Button>
          </div>
        </div>
        <div className="w-full overflow-x-auto">
          <div className="block w-full max-w-full">
            <ComplaintTable
              complaints={!loading && !error ? recentComplaints : []}
              onView={handleViewComplaint}
              userRole="user"
              title="My Recent Complaints"
              actionLabel="View"
              showOverdueColumn
              isOverdueFn={isOverdue}
              hideIdColumn
            />
            {!loading && !error && recentComplaints.length === 0 && (
              <p className="text-sm text-muted-foreground mt-4 px-2">
                You haven't submitted any complaints yet.
              </p>
            )}
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
