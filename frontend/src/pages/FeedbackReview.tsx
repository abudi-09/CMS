import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Star, MessageSquare, Filter, TrendingUp } from "lucide-react";
import { Complaint } from "@/components/ComplaintCard";
import { getAllFeedbackApi } from "@/lib/feedbackApi";

// ...existing code...

type Feedback = {
  _id: string;
  complaintId: string;
  user: string;
  assignedStaff: string;
  rating: number;
  comment: string;
  submittedDate: string;
  category: string;
  title: string;
};

export function FeedbackReview() {
  const [feedbackData, setFeedbackData] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staffFilter, setStaffFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");

  useEffect(() => {
    setLoading(true);
    getAllFeedbackApi()
      .then((data) => {
        setFeedbackData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to fetch feedback");
        setLoading(false);
      });
  }, []);

  const filteredFeedback = feedbackData.filter((feedback) => {
    const matchesStaff =
      staffFilter === "all" || feedback.assignedStaff === staffFilter;
    const matchesRating =
      ratingFilter === "all" || feedback.rating.toString() === ratingFilter;
    return matchesStaff && matchesRating;
  });

  const uniqueStaff = Array.from(
    new Set(feedbackData.map((f) => f.assignedStaff))
  );
  const averageRating =
    feedbackData.length > 0
      ? feedbackData.reduce((sum, f) => sum + f.rating, 0) / feedbackData.length
      : 0;
  const totalFeedback = feedbackData.length;
  const positiveRating = feedbackData.filter((f) => f.rating >= 4).length;

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
        }`}
      />
    ));
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return "bg-green-100 text-green-800";
    if (rating >= 3) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <span className="text-lg text-muted-foreground">
          Loading feedback...
        </span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <span className="text-lg text-red-500">{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Feedback Review</h1>
        <p className="text-muted-foreground">
          Monitor user satisfaction and staff performance
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
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
            <div className="text-2xl font-bold">{totalFeedback}</div>
            <p className="text-xs text-muted-foreground">Completed reviews</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Rating
            </CardTitle>
            <div className="bg-yellow-50 p-2 rounded-lg">
              <Star className="h-4 w-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageRating.toFixed(1)}</div>
            <div className="flex items-center gap-1 mt-1">
              {renderStars(Math.round(averageRating))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Positive Rating
            </CardTitle>
            <div className="bg-green-50 p-2 rounded-lg">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{positiveRating}</div>
            <p className="text-xs text-muted-foreground">4+ star ratings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Satisfaction Rate
            </CardTitle>
            <div className="bg-purple-50 p-2 rounded-lg">
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalFeedback > 0
                ? Math.round((positiveRating / totalFeedback) * 100)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">User satisfaction</p>
          </CardContent>
        </Card>
      </div>

      {/* Feedback Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            User Feedback
          </CardTitle>
          <div className="flex gap-4">
            <Select value={staffFilter} onValueChange={setStaffFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by staff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Staff</SelectItem>
                {uniqueStaff.map((staff) => (
                  <SelectItem key={staff} value={staff}>
                    {staff}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
                <SelectItem value="2">2 Stars</SelectItem>
                <SelectItem value="1">1 Star</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-sm">Complaint</TableHead>
                  <TableHead className="text-sm">User</TableHead>
                  <TableHead className="text-sm">Assigned Staff</TableHead>
                  <TableHead className="text-sm">Rating</TableHead>
                  <TableHead className="text-sm">Date</TableHead>
                  <TableHead className="min-w-[300px] text-sm">
                    Comment
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFeedback.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No feedback found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFeedback.map((feedback) => (
                    <TableRow
                      key={feedback._id}
                      className="dark:hover:bg-accent/10"
                    >
                      <TableCell className="text-sm">
                        <div>
                          <div className="font-medium">{feedback.title}</div>
                          <div className="text-xs text-muted-foreground">
                            #{feedback.complaintId}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {feedback.user}
                      </TableCell>
                      <TableCell className="text-sm">
                        {feedback.assignedStaff}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center">
                            {renderStars(feedback.rating)}
                          </div>
                          <Badge
                            className={`text-xs ${getRatingColor(
                              feedback.rating
                            )}`}
                          >
                            {feedback.rating}.0
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(feedback.submittedDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="text-sm">{feedback.comment}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {filteredFeedback.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No feedback found matching your criteria
              </div>
            ) : (
              filteredFeedback.map((feedback) => (
                <Card key={feedback._id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-sm">
                          {feedback.title}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          #{feedback.complaintId}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          By: {feedback.user}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        {renderStars(feedback.rating)}
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          Assigned Staff:
                        </span>
                        <span className="font-medium ml-2">
                          {feedback.assignedStaff}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Date:</span>
                        <span className="font-medium ml-2">
                          {new Date(
                            feedback.submittedDate
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-sm italic">"{feedback.comment}"</p>
                    </div>
                    <Badge
                      className={`text-xs ${getRatingColor(
                        feedback.rating
                      )} self-start`}
                    >
                      {feedback.rating}.0 / 5.0
                    </Badge>
                  </div>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
