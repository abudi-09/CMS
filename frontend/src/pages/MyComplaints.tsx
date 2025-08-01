import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Eye, MessageSquare } from "lucide-react";
import { ComplaintDetailModal } from "@/components/ComplaintDetailModal";
import { FeedbackModal } from "@/components/FeedbackModal";
import { Complaint } from "@/components/ComplaintCard";
import { getMyComplaintsApi } from "@/lib/api";

// Mock data - replace with real data
const mockComplaints: Complaint[] = [
  {
    id: "CMP-001",
    title: "Library computers are slow and outdated",
    description:
      "The computers in the main library are extremely slow and need upgrading. Students are waiting long times to access resources.",
    category: "IT & Technology",
    status: "In Progress",
    submittedBy: "John Doe",
    assignedStaff: "IT Support Team",
    submittedDate: new Date("2024-01-15"),
    lastUpdated: new Date("2024-01-18"),
  },
  {
    id: "CMP-002",
    title: "Cafeteria food quality concerns",
    description:
      "The food quality in the main cafeteria has declined significantly. Many students are getting sick after eating there.",
    category: "Student Services",
    status: "Resolved",
    submittedBy: "John Doe",
    assignedStaff: "Food Services Manager",
    submittedDate: new Date("2024-01-10"),
    lastUpdated: new Date("2024-01-20"),
  },
  {
    id: "CMP-003",
    title: "Broken air conditioning in lecture hall",
    description:
      "The air conditioning in lecture hall B-204 has been broken for over a week. Classes are unbearable in this heat.",
    category: "Infrastructure & Facilities",
    status: "Pending",
    submittedBy: "John Doe",
    assignedStaff: undefined,
    submittedDate: new Date("2024-01-22"),
    lastUpdated: new Date("2024-01-22"),
  },
  {
    id: "CMP-004",
    title: "Wi-Fi connectivity issues in dormitory",
    description:
      "The Wi-Fi in Building A dormitory keeps disconnecting every few minutes, making it impossible to study online.",
    category: "IT & Technology",
    status: "Closed",
    submittedBy: "John Doe",
    assignedStaff: "Network Team",
    submittedDate: new Date("2024-01-05"),
    lastUpdated: new Date("2024-01-25"),
  },
];

const statusColors = {
  Pending: "bg-warning/10 text-warning border-warning/20",
  "In Progress": "bg-info/10 text-info border-info/20",
  Resolved: "bg-success/10 text-success border-success/20",
  Closed: "bg-muted/10 text-muted-foreground border-muted/20",
};

export function MyComplaints() {
  const [complaints, setComplaints] = useState<Complaint[]>([]); // Start with empty
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null
  );
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  useEffect(() => {
    async function fetchComplaints() {
      try {
        const data = await getMyComplaintsApi();
        // Map backend data to ComplaintCard format if needed
        setComplaints(
          data.map((c: any) => ({
            id: c._id,
            title: c.title,
            description: c.description,
            category: c.category,
            status: c.status,
            submittedBy: c.submittedBy?.name || "",
            assignedStaff: c.assignedTo?.name || "Not Assigned",
            submittedDate: new Date(c.createdAt),
            lastUpdated: new Date(c.updatedAt),
            feedback: c.feedback,
          }))
        );
      } catch (err) {
        // Optionally handle error
      }
    }
    fetchComplaints();
  }, []);

  const handleViewComplaint = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setShowDetailModal(true);
  };

  const handleFeedback = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setShowFeedbackModal(true);
  };

  const handleFeedbackSubmit = (
    complaintId: string,
    feedback: { rating: number; comment: string }
  ) => {
    setComplaints((prev) =>
      prev.map((c) => (c.id === complaintId ? { ...c, feedback } : c))
    );
  };

  // Filter complaints based on search and status
  const filteredComplaints = complaints.filter((complaint) => {
    const matchesSearch =
      complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || complaint.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Complaints</h1>
        <p className="text-muted-foreground">
          Track and manage all your submitted complaints
        </p>
      </div>

      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filter
          </CardTitle>
          <CardDescription>
            Find specific complaints or filter by status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, description, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Resolved">Resolved</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Complaints Table */}
      <Card>
        <CardHeader>
          <CardTitle>Complaints ({filteredComplaints.length})</CardTitle>
          <CardDescription>
            {filteredComplaints.length === complaints.length
              ? "All your complaints"
              : `Showing ${filteredComplaints.length} of ${complaints.length} complaints`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredComplaints.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No complaints found matching your criteria.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Title</th>
                      <th className="text-left p-3 font-medium">Category</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">
                        Assigned Staff
                      </th>
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-left p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredComplaints.map((complaint) => (
                      <tr
                        key={complaint.id}
                        className="border-b hover:bg-muted/5 dark:hover:bg-accent/10"
                      >
                        <td className="p-3">
                          <div className="font-medium">{complaint.title}</div>
                          <div className="text-sm text-muted-foreground">
                            ID: {complaint.id}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="text-sm">{complaint.category}</span>
                        </td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={
                              statusColors[
                                complaint.status as keyof typeof statusColors
                              ]
                            }
                          >
                            {complaint.status}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <span className="text-sm">
                            {complaint.assignedStaff || "Not Assigned"}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="text-sm">
                            {complaint.submittedDate.toLocaleDateString()}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewComplaint(complaint)}
                              className="dark:hover:text-blue-400"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            {complaint.status === "Resolved" && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleFeedback(complaint)}
                                className="dark:hover:bg-blue-400"
                              >
                                <MessageSquare className="h-4 w-4 mr-1" />
                                Give Feedback
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {filteredComplaints.map((complaint) => (
                  <Card key={complaint.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-medium text-sm leading-tight">
                            {complaint.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            ID: {complaint.id}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`ml-2 text-xs ${
                            statusColors[
                              complaint.status as keyof typeof statusColors
                            ]
                          }`}
                        >
                          {complaint.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">
                            Category:
                          </span>
                          <p className="font-medium">{complaint.category}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Date:</span>
                          <p className="font-medium">
                            {complaint.submittedDate.toLocaleDateString()}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">
                            Assigned Staff:
                          </span>
                          <p className="font-medium">
                            {complaint.assignedStaff || "Not Assigned"}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewComplaint(complaint)}
                          className="flex-1 text-xs dark:hover:text-blue-400"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        {complaint.status === "Resolved" && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleFeedback(complaint)}
                            className="flex-1 text-xs dark:hover:bg-blue-400"
                          >
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Feedback
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <ComplaintDetailModal
        complaint={selectedComplaint}
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
      />

      <FeedbackModal
        complaint={selectedComplaint}
        open={showFeedbackModal}
        onOpenChange={setShowFeedbackModal}
        onSubmit={handleFeedbackSubmit}
      />
    </div>
  );
}
