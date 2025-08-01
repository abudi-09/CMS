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
} from "lucide-react";

export interface Complaint {
  id: string;
  title: string;
  description: string;
  department: string;
  status: "Pending" | "In Progress" | "Resolved" | "Closed";
  submittedBy: string;
  assignedStaff?: string;
  submittedDate: Date;
  lastUpdated: Date;
  priority?: "Low" | "Medium" | "High" | "Critical";
  feedback?: {
    rating: number;
    comment: string;
  };
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
  "In Progress": "bg-blue-100 text-blue-800 border-blue-200",
  Resolved: "bg-green-100 text-green-800 border-green-200",
  Closed: "bg-gray-100 text-gray-800 border-gray-200",
};

const statusIcons = {
  Pending: Clock,
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

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg line-clamp-1">
              {complaint.title}
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
          Department: {complaint.department}
        </div>

        {showActions && (
          <div className="flex gap-2 pt-2">
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
