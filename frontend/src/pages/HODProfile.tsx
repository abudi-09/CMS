import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getProfileStatsApi } from "@/lib/api.profile.stats";
import UserProfileModal from "@/components/UserProfileModal";
import { Users } from "lucide-react";

export default function HODProfile() {
  const [stats, setStats] = useState({
    submitted: 0,
    resolved: 0,
    inProgress: 0,
    successRate: 0,
  });
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const data = await getProfileStatsApi();
        if (!ignore) {
          const total =
            data.totalComplaints ?? data.submittedTotal ?? data.total ?? 0;
          const resolved =
            data.resolvedComplaints ??
            data.resolvedSubmitted ??
            data.resolved ??
            0;
          const inProg = data.inProgressComplaints ?? data.inProgress ?? 0;
          const success =
            data.successRate ??
            (total ? Number(((resolved / total) * 100).toFixed(2)) : 0);

          setStats({
            submitted: Number(total) || 0,
            resolved: Number(resolved) || 0,
            inProgress: Number(inProg) || 0,
            successRate: Number(success) || 0,
          });
        }
      } catch (err) {
        // Log but don't surface to user UI
        // This helps diagnostics while keeping UI stable
        console.warn("Failed to load HOD profile stats:", err);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-2">
        Head of Department Profile
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Account Statistics</CardTitle>
          <div className="text-muted-foreground">Your activity summary</div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <div className="rounded-lg border bg-card p-4 shadow-sm flex flex-col items-start">
              <span className="text-xs text-muted-foreground uppercase">
                Submitted
              </span>
              <span className="mt-2 text-2xl font-bold text-primary">
                {stats.submitted}
              </span>
            </div>
            <div className="rounded-lg border bg-card p-4 shadow-sm flex flex-col items-start">
              <span className="text-xs text-muted-foreground uppercase">
                Resolved
              </span>
              <span className="mt-2 text-2xl font-bold text-green-600">
                {stats.resolved}
              </span>
            </div>
            <div className="rounded-lg border bg-card p-4 shadow-sm flex flex-col items-start">
              <span className="text-xs text-muted-foreground uppercase">
                In Progress
              </span>
              <span className="mt-2 text-2xl font-bold text-yellow-600">
                {stats.inProgress}
              </span>
            </div>
            <div className="rounded-lg border bg-card p-4 shadow-sm flex flex-col items-start">
              <span className="text-xs text-muted-foreground uppercase">
                Success Rate
              </span>
              <span className="mt-2 text-2xl font-bold text-purple-600">
                {stats.successRate}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Example: View Profile modal trigger for HOD (can be reused for Dean/Admin) */}
      <div className="pt-6">
        <button
          className="inline-flex items-center gap-2 px-4 py-2 rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
          onClick={() => setProfileUserId("me")}
        >
          <Users className="h-5 w-5" /> View My Profile
        </button>
        <UserProfileModal
          userId={profileUserId || ""}
          open={!!profileUserId}
          onOpenChange={(o) => !o && setProfileUserId(null)}
        />
      </div>
    </div>
  );
}
