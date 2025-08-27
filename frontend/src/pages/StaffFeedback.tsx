import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, FileText, Star, Clock } from "lucide-react";
import { getFeedbackByRoleApi, markFeedbackReviewedApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type StaffFeedbackItem = {
  complaintId: string;
  title: string;
  complaintCode?: string;
  submittedBy?: { name?: string; email?: string };
  feedback: {
    rating: number;
    comment?: string;
    reviewed?: boolean;
    submittedAt?: string | Date;
  };
  resolvedAt?: string | Date;
  submittedAt?: string | Date; // complaint createdAt
  avgResolutionMs?: number;
  category?: string;
  department?: string;
};

export function StaffFeedback() {
  const { toast } = useToast();
  const [items, setItems] = useState<StaffFeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewFilter, setReviewFilter] = useState<
    "all" | "reviewed" | "unreviewed"
  >("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getFeedbackByRoleApi();
        if (!cancelled) setItems(data as StaffFeedbackItem[]);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const avgRating = items.length
    ? items.reduce((sum, it) => sum + (it.feedback?.rating || 0), 0) /
      items.length
    : 0;

  const durations = items
    .map((it) =>
      typeof it.avgResolutionMs === "number"
        ? it.avgResolutionMs
        : it.resolvedAt && it.submittedAt
        ? new Date(it.resolvedAt).getTime() - new Date(it.submittedAt).getTime()
        : 0
    )
    .filter((v) => v > 0);
  const avgResolutionMs = durations.length
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : 0;

  const formatDuration = (ms: number) => {
    if (!ms || ms < 1000) return "< 1s";
    const sec = Math.floor(ms / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    const d = Math.floor(hr / 24);
    if (d > 0) return `${d}d ${hr % 24}h`;
    if (hr > 0) return `${hr}h ${min % 60}m`;
    if (min > 0) return `${min}m ${sec % 60}s`;
    return `${sec}s`;
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
      toast({ title: "Marked reviewed" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to mark reviewed";
      toast({ variant: "destructive", title: "Error", description: msg });
    }
  };

  const filteredItems = useMemo(() => {
    if (reviewFilter === "reviewed")
      return items.filter((it) => !!it.feedback?.reviewed);
    if (reviewFilter === "unreviewed")
      return items.filter((it) => !it.feedback?.reviewed);
    return items;
  }, [items, reviewFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Student Feedback</h1>
        <p className="text-muted-foreground">
          Review feedback from students on resolved complaints
        </p>
        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <div className="text-2xl font-bold">{items.length}</div>
            <p className="text-xs text-muted-foreground">Entries</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Rating
            </CardTitle>
            <div className="bg-yellow-50 p-2 rounded-lg">
              <Star className="h-4 w-4 text-yellow-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgRating.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Out of 5</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Resolution Time
            </CardTitle>
            <div className="bg-emerald-50 p-2 rounded-lg">
              <Clock className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(avgResolutionMs)}
            </div>
            <p className="text-xs text-muted-foreground">
              Submission → Resolution
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-lg">
              Feedback ({filteredItems.length}
              {items.length !== filteredItems.length
                ? ` of ${items.length}`
                : ""}
              )
            </CardTitle>
            <CardDescription>
              All feedback submitted by students for your resolved complaints
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Show</span>
            <Select
              value={reviewFilter}
              onValueChange={(v) =>
                setReviewFilter(v as "all" | "reviewed" | "unreviewed")
              }
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="unreviewed">Not Reviewed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {loading ? "Loading..." : "No feedback found."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredItems.map((it) => (
                <Card key={String(it.complaintId)} className="p-4 md:p-6">
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <div className="flex-1">
                        <h3 className="font-medium text-sm md:text-base flex items-center gap-2">
                          <FileText className="h-4 w-4" /> {it.title}
                          {it.complaintCode && (
                            <Badge variant="outline" className="text-xs">
                              {it.complaintCode}
                            </Badge>
                          )}
                          {it.feedback?.reviewed && (
                            <Badge variant="secondary" className="text-xs">
                              Reviewed
                            </Badge>
                          )}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <p className="text-xs md:text-sm text-muted-foreground">
                            ID: {String(it.complaintId)}
                          </p>
                          <span className="text-muted-foreground">•</span>
                          <p className="text-xs md:text-sm text-muted-foreground">
                            By:{" "}
                            {it.submittedBy?.name ||
                              it.submittedBy?.email ||
                              "Unknown"}
                          </p>
                          <span className="text-muted-foreground">•</span>
                          <p className="text-xs md:text-sm text-muted-foreground">
                            {it.category || ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < (it.feedback?.rating || 0)
                                ? "text-yellow-400 fill-current"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                        <span className="text-xs text-muted-foreground ml-2">
                          ({it.feedback?.rating}/5)
                        </span>
                      </div>
                    </div>

                    {it.feedback?.comment && (
                      <div className="bg-muted/50 p-3 md:p-4 rounded-lg">
                        <p className="text-sm md:text-base italic">
                          "{it.feedback.comment}"
                        </p>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                      {it.resolvedAt && (
                        <p className="text-xs md:text-sm text-muted-foreground">
                          Resolved: {new Date(it.resolvedAt).toLocaleString()}
                        </p>
                      )}
                      {it.feedback?.submittedAt && (
                        <p className="text-xs md:text-sm text-muted-foreground">
                          Feedback:{" "}
                          {new Date(it.feedback.submittedAt).toLocaleString()}
                        </p>
                      )}
                      <div className="flex-1" />
                      {!it.feedback?.reviewed && (
                        <Button
                          size="sm"
                          onClick={() =>
                            handleMarkReviewed(String(it.complaintId))
                          }
                        >
                          Mark Reviewed
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
