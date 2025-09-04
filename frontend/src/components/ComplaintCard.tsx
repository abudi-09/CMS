import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  User,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  List,
} from "lucide-react";
import { useState } from "react";
import { ActivityLogTable } from "@/components/ActivityLogTable";
import { getActivityLogsForComplaint } from "@/lib/activityLogApi";

export interface Complaint {
  id: string;
  title: string;
  description: string;
  category: string;
  status:
    | "Unassigned"
    | "Assigned"
    | "Accepted"
    | "In Progress"
    | "Resolved"
    | "Closed"
    | "Overdue"
    | "Pending";
  submittedBy: string;
  // Who originally created/submitted the complaint (role perspective)
  sourceRole?: "student" | "staff" | "hod" | "dean" | "admin";
  assignedStaff?: string;
  assignedStaffRole?: "dean" | "hod" | "staff" | "admin";
  // Who assigned this complaint to the current assignee (role perspective)
  assignedByRole?: "student" | "hod" | "dean" | "admin";
  // Trace of roles that handed-off the complaint before it reached the current assignee
  assignmentPath?: Array<"student" | "hod" | "dean" | "admin" | "staff">;
  assignedDate?: Date;
  submittedDate: Date;
  deadline?: Date;
  lastUpdated: Date;
  priority?: "Low" | "Medium" | "High" | "Critical";
  feedback?: {
    rating: number;
    comment: string;
  };
  resolutionNote?: string;
  evidenceFile?: string; // Optional fields for feedback;
  isEscalated?: boolean; // Indicates if the complaint is escalated
  submittedTo?: string; // Add this field for tracking who complaint was submitted to
  department?: string; // Add department for routing
  // Stores the latest action note (e.g., "Rejected: ..." or accept note) for lightweight list rendering
  lastNote?: string;
}

interface ComplaintCardProps {
  complaint: Complaint;
  onView: (complaint: Complaint) => void;
  onStatusUpdate?: (complaint: Complaint) => void;
  onFeedback?: (complaint: Complaint) => void;
  showActions?: boolean;
  userRole?: "user" | "staff" | "admin";
}

const statusColors = {
  Pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Accepted: "bg-sky-100 text-sky-800 border-sky-200",
  "In Progress": "bg-blue-100 text-blue-800 border-blue-200",
  Resolved: "bg-green-100 text-green-800 border-green-200",
  Closed: "bg-gray-100 text-gray-800 border-gray-200",
};

const statusIcons = {
  Pending: Clock,
  Accepted: AlertCircle,
  "In Progress": AlertCircle,
  Resolved: CheckCircle,
  Closed: XCircle,
};

export function ComplaintCard({
  complaint,
  onView,
  onStatusUpdate,
  onFeedback,
  showActions = true,
  userRole = "user",
}: ComplaintCardProps) {
  const StatusIcon = statusIcons[complaint.status];
  const [showLogModal, setShowLogModal] = useState(false);
  const [logs, setLogs] = useState([]);

  const handleViewLogs = async () => {
    setShowLogModal(true);
    try {
      const data = await getActivityLogsForComplaint(complaint.id);
      setLogs(data);
    } catch (err) {
      setLogs([]);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      {/* Activity Log Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              onClick={() => setShowLogModal(false)}
            >
              ✖
            </button>
            <h3 className="text-lg font-semibold mb-4">Activity Log</h3>
            <ActivityLogTable logs={logs} />
          </div>
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg line-clamp-1">
              {complaint.title}
              {complaint.isEscalated && (
                <span title="Escalated" className="ml-2 text-red-500 text-lg">
                  &#x1F53A;
                </span>
              )}
            </CardTitle>
            <div className="text-sm text-muted-foreground">#{complaint.id}</div>
          </div>
          <Badge
            className={`${
              statusColors[complaint.status]
            } flex items-center gap-1`}
          >
            <StatusIcon className="h-3 w-3" />
            {complaint.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {complaint.description}
        </p>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{complaint.submittedDate.toLocaleDateString()}</span>
          </div>

          {complaint.assignedStaff && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{complaint.assignedStaff}</span>
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          Department: {complaint.category}
        </div>

        {showActions && (
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewLogs}
              title="View Activity Log"
            >
              <List className="h-4 w-4 mr-1" /> Activity Log
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onView(complaint)}
              className="flex-1"
            >
              View Details
            </Button>

            {userRole === "staff" && onStatusUpdate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStatusUpdate(complaint)}
              >
                Update Status
              </Button>
            )}

            {userRole === "user" &&
              complaint.status === "Resolved" &&
              onFeedback &&
              !complaint.feedback && (
                <Button
                  size="sm"
                  onClick={() => onFeedback(complaint)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Give Feedback
                </Button>
              )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
