import { useEffect, useMemo, useState } from "react";
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
import { getFeedbackByRoleApi, markFeedbackReviewedApi } from "@/lib/api";
import { useAuth } from "@/components/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

function getRatingColor(rating: number) {
  if (rating >= 4) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  if (rating >= 3) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
  return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
}

function renderStars(rating: number) {
  return (
    <div className="flex items-center text-yellow-500">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className="h-4 w-4"
          strokeWidth={1.5}
          color={i < rating ? "#eab308" : "#a1a1aa"}
          fill={i < rating ? "#eab308" : "none"}
        />
      ))}
    </div>
  );
}

export function FeedbackReview() {
  const { user } = useAuth();
  const [staffFilter, setStaffFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [items, setItems] = useState<Array<{
    complaintId: string;
    title: string;
    complaintCode?: string;
    submittedBy?: { name?: string; email?: string };
    assignedTo?: { name?: string; email?: string; role?: string; department?: string };
    feedback: { rating: number; comment?: string; reviewed?: boolean; submittedAt?: string | Date };
    resolvedAt?: string | Date;
    submittedAt?: string | Date;
    category?: string;
    department?: string;
    submittedTo?: string | null;
  }>>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getFeedbackByRoleApi();
        if (mounted) setItems(data || []);
      } catch (e) {
        // surface a toast once, but don't spam
        toast({ title: "Failed to load feedback", variant: "destructive" });
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredFeedback = useMemo(() => {
    return items.filter((f) => {
      const staffName = f.assignedTo?.name || f.assignedTo?.email || "";
      const matchesStaff = staffFilter === "all" || staffName === staffFilter;
      const rating = f.feedback?.rating || 0;
      const matchesRating =
        ratingFilter === "all" ||
        (ratingFilter === "5" && rating === 5) ||
        (ratingFilter === "4+" && rating >= 4) ||
        (ratingFilter === "3+" && rating >= 3) ||
        (ratingFilter === "2+" && rating >= 2) ||
        (ratingFilter === "1+" && rating >= 1);
      return matchesStaff && matchesRating;
    });
  }, [items, staffFilter, ratingFilter]);

  const uniqueStaff = useMemo(
    () =>
      Array.from(
        new Set(
          items.map((f) => f.assignedTo?.name || f.assignedTo?.email || "")
        )
      ).filter(Boolean),
    [items]
  );

  const averageRating = useMemo(() => {
    const arr = items.map((f) => f.feedback?.rating || 0);
    return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  }, [items]);
  const totalFeedback = items.length;
  const positiveRating = items.filter((f) => (f.feedback?.rating || 0) >= 4).length;

  const canAdminMarkReviewed = (f: (typeof items)[number]) => {
    if (!user) return false;
    const role = String(user.role || "").toLowerCase();
    if (role !== "admin") return false;
    const to = String(f.submittedTo || "").toLowerCase();
    const assignedByAdmin = String(f.assignedTo?.role || "").toLowerCase() === "admin";
    return to === "admin" || assignedByAdmin;
  };

  const handleMarkReviewed = async (complaintId: string) => {
    try {
      await markFeedbackReviewedApi(complaintId);
      setItems((prev) =>
        prev.map((it) =>
          it.complaintId === complaintId
            ? { ...it, feedback: { ...it.feedback, reviewed: true } }
            : it
        )
      );
      toast({ title: "Marked as Reviewed" });
    } catch (e: unknown) {
      toast({
        title: "Failed",
        description: e instanceof Error ? e.message : "Could not mark reviewed",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Feedback Review</h1>
        <p className="text-muted-foreground">Monitor user satisfaction and staff performance</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Feedback</CardTitle>
            <div className="bg-blue-50 p-2 rounded-lg dark:bg-blue-900/30">
              <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFeedback}</div>
            <p className="text-xs text-muted-foreground">Completed reviews</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Rating</CardTitle>
            <div className="bg-yellow-50 p-2 rounded-lg dark:bg-yellow-900/30">
              <Star className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageRating.toFixed(1)}</div>
            <div className="flex items-center gap-1 mt-1">{renderStars(Math.round(averageRating))}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Positive Rating</CardTitle>
            <div className="bg-green-50 p-2 rounded-lg dark:bg-green-900/30">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{positiveRating}</div>
            <p className="text-xs text-muted-foreground">4+ star ratings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Satisfaction Rate</CardTitle>
            <div className="bg-purple-50 p-2 rounded-lg dark:bg-purple-900/30">
              <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalFeedback ? Math.round((positiveRating / totalFeedback) * 100) : 0}%
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
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4+">4 Stars & Up</SelectItem>
                <SelectItem value="3+">3 Stars & Up</SelectItem>
                <SelectItem value="2+">2 Stars & Up</SelectItem>
                <SelectItem value="1+">1 Star & Up</SelectItem>
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
                  <TableHead className="min-w-[300px] text-sm">Comment</TableHead>
                  <TableHead className="text-right text-sm">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFeedback.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No feedback found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFeedback.map((feedback) => (
                    <TableRow key={String(feedback.complaintId)} className="dark:hover:bg-accent/10">
                      <TableCell className="text-sm">
                        <div>
                          <div className="font-medium">{feedback.title}</div>
                          <div className="text-xs text-muted-foreground">#{feedback.complaintId}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {feedback.submittedBy?.name || feedback.submittedBy?.email}
                      </TableCell>
                      <TableCell className="text-sm">
                        {feedback.assignedTo?.name || feedback.assignedTo?.email}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center">{renderStars(feedback.feedback?.rating || 0)}</div>
                          <Badge className={`text-xs ${getRatingColor(feedback.feedback?.rating || 0)}`}>
                            {(feedback.feedback?.rating || 0).toFixed(1)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {feedback.submittedAt ? new Date(String(feedback.submittedAt)).toLocaleDateString() : ""}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="text-sm">{feedback.feedback?.comment}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {user?.role === "admin" && canAdminMarkReviewed(feedback) && !feedback.feedback?.reviewed && (
                          <Button size="sm" variant="outline" onClick={() => handleMarkReviewed(String(feedback.complaintId))}>
                            Mark as Reviewed
                          </Button>
                        )}
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
              <div className="text-center py-8 text-muted-foreground">No feedback found matching your criteria</div>
            ) : (
              filteredFeedback.map((feedback) => (
                <Card key={String(feedback.complaintId)} className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-sm">{feedback.title}</h3>
                        <p className="text-xs text-muted-foreground">#{feedback.complaintId}</p>
                        <p className="text-xs text-muted-foreground mt-1">By: {feedback.submittedBy?.name || feedback.submittedBy?.email}</p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">{renderStars(feedback.feedback?.rating || 0)}</div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Assigned Staff:</span>
                        <span className="font-medium ml-2">{feedback.assignedTo?.name || feedback.assignedTo?.email}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Date:</span>
                        <span className="font-medium ml-2">
                          {feedback.submittedAt ? new Date(String(feedback.submittedAt)).toLocaleDateString() : ""}
                        </span>
                      </div>
                    </div>

                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-sm italic">"{feedback.feedback?.comment}"</p>
                    </div>

                    <Badge className={`text-xs ${getRatingColor(feedback.feedback?.rating || 0)} self-start`}>
                      {(feedback.feedback?.rating || 0).toFixed(1)} / 5.0
                    </Badge>

                    {user?.role === "admin" && canAdminMarkReviewed(feedback) && !feedback.feedback?.reviewed && (
                      <Button className="w-full mt-2" variant="outline" onClick={() => handleMarkReviewed(String(feedback.complaintId))}>
                        Mark as Reviewed
                      </Button>
                    )}
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
