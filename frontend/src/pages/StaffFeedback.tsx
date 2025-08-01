import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, MessageSquare, Check, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

interface Feedback {
  id: string;
  complaintId: string;
  complaintTitle: string;
  studentName: string;
  message: string;
  rating: number;
  status: "Reviewed" | "Unreviewed";
  submittedDate: Date;
  category: string;
}

// Mock data
const mockFeedback: Feedback[] = [
  {
    id: "FB-001",
    complaintId: "CMP-001",
    complaintTitle: "Library computers are slow and outdated",
    studentName: "John Doe",
    message: "Thank you for fixing the computers. They are much faster now and students can access resources without long wait times.",
    rating: 5,
    status: "Unreviewed",
    submittedDate: new Date("2024-01-20"),
    category: "IT & Technology"
  },
  {
    id: "FB-002",
    complaintId: "CMP-002",
    complaintTitle: "Cafeteria food quality concerns",
    studentName: "Jane Smith",
    message: "The food quality has improved significantly. No more health issues reported from students.",
    rating: 4,
    status: "Reviewed",
    submittedDate: new Date("2024-01-18"),
    category: "Student Services"
  },
  {
    id: "FB-003",
    complaintId: "CMP-005",
    complaintTitle: "Wi-Fi connectivity issues in dormitory",
    studentName: "Mike Johnson",
    message: "Wi-Fi is still having issues. The problem was not completely resolved. It still disconnects frequently.",
    rating: 2,
    status: "Unreviewed",
    submittedDate: new Date("2024-01-22"),
    category: "IT & Technology"
  }
];

export function StaffFeedback() {
  const [feedback, setFeedback] = useState<Feedback[]>(mockFeedback);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const handleMarkAsReviewed = (feedbackId: string) => {
    setFeedback(prev => 
      prev.map(f => 
        f.id === feedbackId 
          ? { ...f, status: "Reviewed" as const }
          : f
      )
    );
    
    toast({
      title: "Feedback Reviewed",
      description: "Feedback has been marked as reviewed.",
    });
  };

  // Filter feedback based on search and status
  const filteredFeedback = feedback.filter(item => {
    const matchesSearch = 
      item.complaintTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const unreviewed = feedback.filter(f => f.status === "Unreviewed").length;
  const reviewed = feedback.filter(f => f.status === "Reviewed").length;

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return "text-green-600";
    if (rating >= 3) return "text-yellow-600";
    return "text-red-600";
  };

  const getRatingBadge = (rating: number) => {
    if (rating >= 4) return "bg-green-100 text-green-800";
    if (rating >= 3) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Student Feedback</h1>
        <p className="text-muted-foreground">Review feedback from students on resolved complaints</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Feedback
            </CardTitle>
            <div className="bg-blue-50 p-2 rounded-lg">
              <MessageSquare className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{feedback.length}</div>
            <p className="text-xs text-muted-foreground">All feedback received</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Review
            </CardTitle>
            <div className="bg-yellow-50 p-2 rounded-lg">
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unreviewed}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Reviewed
            </CardTitle>
            <div className="bg-green-50 p-2 rounded-lg">
              <Check className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reviewed}</div>
            <p className="text-xs text-muted-foreground">Completed reviews</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Search & Filter
          </CardTitle>
          <CardDescription>
            Find specific feedback or filter by status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by complaint, student, or message..."
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
                <SelectItem value="Unreviewed">Unreviewed</SelectItem>
                <SelectItem value="Reviewed">Reviewed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Feedback List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Feedback ({filteredFeedback.length})</CardTitle>
          <CardDescription>
            {filteredFeedback.length === feedback.length 
              ? "All feedback entries" 
              : `Showing ${filteredFeedback.length} of ${feedback.length} feedback entries`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredFeedback.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No feedback found matching your criteria.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFeedback.map((item) => (
                <Card key={item.id} className="p-4 md:p-6">
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <div className="flex-1">
                        <h3 className="font-medium text-sm md:text-base">{item.complaintTitle}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <p className="text-xs md:text-sm text-muted-foreground">ID: {item.complaintId}</p>
                          <span className="text-muted-foreground">•</span>
                          <p className="text-xs md:text-sm text-muted-foreground">By: {item.studentName}</p>
                          <span className="text-muted-foreground">•</span>
                          <p className="text-xs md:text-sm text-muted-foreground">{item.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getRatingBadge(item.rating)}>
                          ⭐ {item.rating}/5
                        </Badge>
                        <Badge 
                          variant="outline"
                          className={item.status === "Reviewed" 
                            ? "bg-green-50 text-green-700 border-green-200" 
                            : "bg-yellow-50 text-yellow-700 border-yellow-200"
                          }
                        >
                          {item.status}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="bg-muted/50 p-3 md:p-4 rounded-lg">
                      <p className="text-sm md:text-base italic">"{item.message}"</p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                      <p className="text-xs md:text-sm text-muted-foreground">
                        Submitted: {item.submittedDate.toLocaleDateString()}
                      </p>
                      
                      {item.status === "Unreviewed" && (
                        <Button
                          size="sm"
                          onClick={() => handleMarkAsReviewed(item.id)}
                          className="self-start sm:self-auto dark:hover:bg-blue-400"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Mark as Reviewed
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}