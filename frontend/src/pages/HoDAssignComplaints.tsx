import { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, UserPlus } from "lucide-react";
import { RoleBasedComplaintModal } from "@/components/RoleBasedComplaintModal";
import { useAuth } from "@/components/auth/AuthContext";
import { toast } from "@/hooks/use-toast";
import { assignComplaintApi } from "@/lib/api";
import { useState as useReactState } from "react";
import { Complaint as ComplaintType } from "@/components/ComplaintCard";
// Use ComplaintType for all references to Complaint

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

const statusColors = {
  Pending: "bg-yellow-100 text-yellow-800",
  "In Progress": "bg-blue-100 text-blue-800",
  Resolved: "bg-green-100 text-green-800",
  Closed: "bg-gray-100 text-gray-800",
  Delayed: "bg-red-100 text-red-800",
};

export function HoDAssignComplaints() {
  // State for deadline during assignment
  const [assigningDeadline, setAssigningDeadline] = useState<string>("");
  // Diverse mock complaints for demo/testing
  // At least half of complaints are overdue (deadline in the past)
  const now = new Date();
  const demoComplaints: ComplaintType[] = [
    {
      id: "HOD-001",
      title: "Lab equipment request overdue",
      description: "Requested equipment for lab is overdue.",
      category: "Academic",
      priority: "High",
      status: "Pending",
      submittedBy: "Dept Head",
      assignedStaff: undefined,
      submittedDate: new Date("2024-01-10"),
      lastUpdated: new Date("2024-01-15"),
      deadline: new Date(now.getTime() - 2 * 86400000), // overdue
    },
    {
      id: "HOD-002",
      title: "Faculty leave request delayed",
      description: "Leave request for faculty not processed in time.",
      category: "HR",
      priority: "Medium",
      status: "In Progress",
      submittedBy: "Faculty Member",
      assignedStaff: "HR Manager",
      submittedDate: new Date("2024-02-01"),
      lastUpdated: new Date("2024-02-05"),
      deadline: new Date(now.getTime() + 3 * 86400000), // not overdue
    },
    {
      id: "HOD-003",
      title: "Lab safety equipment missing",
      description: "Safety goggles and gloves missing from chemistry lab.",
      category: "Facility",
      priority: "Critical",
      status: "Pending",
      submittedBy: "Lab Assistant",
      assignedStaff: undefined,
      submittedDate: new Date("2024-03-10"),
      lastUpdated: new Date("2024-03-12"),
      deadline: new Date(now.getTime() - 5 * 86400000), // overdue
    },
    {
      id: "HOD-004",
      title: "Student feedback on course content",
      description: "Students report outdated syllabus in core course.",
      category: "Academic",
      priority: "Low",
      status: "Closed",
      submittedBy: "Student Council",
      assignedStaff: "Course Coordinator",
      submittedDate: new Date("2024-04-01"),
      lastUpdated: new Date("2024-04-10"),
      deadline: new Date(now.getTime() + 10 * 86400000), // not overdue
    },
    {
      id: "HOD-005",
      title: "Unassigned complaint test",
      description: "This complaint has not yet been assigned to any staff.",
      category: "General",
      priority: "Medium",
      status: "Unassigned",
      submittedBy: "Test User",
      assignedStaff: undefined,
      submittedDate: new Date("2024-05-12"),
      lastUpdated: new Date("2024-05-12"),
      deadline: new Date(now.getTime() - 1 * 86400000), // overdue
    },
    {
      id: "HOD-006",
      title: "Departmental budget approval delayed",
      description: "Budget approval for new equipment is overdue.",
      category: "Finance",
      priority: "High",
      status: "Pending",
      submittedBy: "Dept Admin",
      assignedStaff: undefined,
      submittedDate: new Date("2024-06-01"),
      lastUpdated: new Date("2024-06-05"),
      deadline: new Date(now.getTime() - 7 * 86400000), // overdue
    },
    {
      id: "HOD-007",
      title: "Edge case: No description",
      description: "",
      category: "Other",
      priority: "Low",
      status: "Pending",
      submittedBy: "Edge Case",
      assignedStaff: "Support",
      submittedDate: new Date("2024-07-18"),
      lastUpdated: new Date("2024-07-18"),
      deadline: new Date(now.getTime() + 10 * 86400000), // not overdue
    },
    {
      id: "HOD-008",
      title: "Edge case: No assigned staff, no feedback",
      description: "Complaint submitted but not yet processed.",
      category: "General",
      priority: "Medium",
      status: "Pending",
      submittedBy: "Edge Case 2",
      assignedStaff: undefined,
      submittedDate: new Date("2024-07-19"),
      lastUpdated: new Date("2024-07-19"),
      deadline: new Date(now.getTime() + 3 * 86400000), // not overdue
    },
    {
      id: "HOD-009",
      title: "Faculty training session overdue",
      description: "Mandatory training session for faculty not scheduled.",
      category: "HR",
      priority: "High",
      status: "Pending",
      submittedBy: "HR Dept",
      assignedStaff: "Training Coordinator",
      submittedDate: new Date("2024-08-01"),
      lastUpdated: new Date("2024-08-03"),
      deadline: new Date(now.getTime() - 4 * 86400000), // overdue
    },
    {
      id: "HOD-010",
      title: "Printer out of service",
      description: "Printer in HOD's office is out of service.",
      category: "IT & Technology",
      priority: "Low",
      status: "Pending",
      submittedBy: "Office Staff",
      assignedStaff: "IT Support Team",
      submittedDate: new Date("2024-08-05"),
      lastUpdated: new Date("2024-08-06"),
      deadline: new Date(now.getTime() + 8 * 86400000), // not overdue
    },
  ];
  const [complaints, setComplaints] =
    useReactState<ComplaintType[]>(demoComplaints);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [assignmentFilter, setAssignmentFilter] = useState<string>("all");
  const [overdueFilter, setOverdueFilter] = useState<string>("all");
  const [selectedComplaint, setSelectedComplaint] =
    useState<ComplaintType | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [assigningStaffId, setAssigningStaffId] = useState<string>("");
  const [reassigningRow, setReassigningRow] = useState<string | null>(null);
  const auth = useAuth();
  const getAllStaff = auth.getAllStaff;
  const handleAssignClick = (complaint: ComplaintType) => {
    setReassigningRow(complaint.id);
    setAssigningStaffId("");
  };

  const handleViewDetail = (complaint: ComplaintType) => {
    setSelectedComplaint(complaint);
    setShowDetailModal(true);
    setAssigningStaffId("");
    setReassigningRow(null);
  };
  const handleStaffAssignment = async (
    complaintId: string,
    staffId: string
  ) => {
    const staff = getAllStaff().find((s) => s.id === staffId);
    try {
      const updatedComplaint = await assignComplaintApi(
        complaintId,
        staffId,
        assigningDeadline || undefined
      );
      setComplaints((prev) =>
        prev.map((c) =>
          c.id === complaintId
            ? {
                ...c,
                assignedStaff: staff?.fullName || staff?.name || "Unknown",
                lastUpdated: new Date(),
                deadline: assigningDeadline
                  ? new Date(assigningDeadline)
                  : undefined,
                status: updatedComplaint.status || "Assigned",
              }
            : c
        )
      );
      toast({
        title: "Staff Assigned",
        description: `Complaint has been assigned to ${
          staff?.fullName || staff?.name
        }${
          assigningDeadline
            ? ` with deadline ${new Date(
                assigningDeadline
              ).toLocaleDateString()}`
            : ""
        }`,
      });
    } catch (error) {
      toast({
        title: "Assignment Failed",
        description: "Could not assign staff. Please try again.",
        variant: "destructive",
      });
    } finally {
      setReassigningRow(null);
      setAssigningStaffId("");
      setAssigningDeadline("");
    }
  };

  const isOverdue = (complaint: ComplaintType) => {
    if (!complaint.deadline) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(complaint.deadline);
    deadline.setHours(0, 0, 0, 0);
    return (
      deadline < today &&
      complaint.status !== "Closed" &&
      complaint.status !== "Resolved"
    );
  };

  // ...existing code for filtering, summary cards, table, and modal...
}
