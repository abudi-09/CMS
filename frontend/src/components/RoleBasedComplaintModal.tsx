// For development/testing, use mockComplaint from "@/lib/mockComplaint"

import { useState, useEffect } from "react";
import { getComplaintApi } from "@/lib/getComplaintApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// import { Separator } from "@/components/ui/separator"; // not used
import {
  FileText,
  User,
  Calendar,
  Flag,
  CheckCircle,
  X,
  MessageSquare,
  Download,
  Star,
  Clock,
  UserCheck,
  Settings,
} from "lucide-react";
import { Complaint } from "@/components/ComplaintCard";
import { getActivityLogsForComplaint } from "@/lib/activityLogApi";
import {
  submitComplaintFeedbackApi,
  updateComplaintStatusApi,
  approveComplaintApi,
} from "@/lib/api";
import type { ActivityLog } from "@/components/ActivityLogTable";
import { useToast } from "@/hooks/use-toast";
// import { formatTimelineDescription } from "@/utils/timelineUtils"; // not used
import { useAuth } from "@/components/auth/AuthContext";

interface RoleBasedComplaintModalProps {
  complaint: Complaint | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: (complaintId: string, updates: Partial<Complaint>) => void;
  children?: React.ReactNode;
  // If false, do not fetch from backend; use provided complaint only
  fetchLatest?: boolean;
}

export function RoleBasedComplaintModal({
  complaint,
  open,
  onOpenChange,
  onUpdate,
  children: _children,
  fetchLatest = true,
}: RoleBasedComplaintModalProps) {
  // Local state for live backend complaint (initialized with incoming complaint)
  const [liveComplaint, setLiveComplaint] = useState<Complaint | null>(
    complaint
  );
  // Helper for type-safe user display
  function getUserDisplay(user: unknown): string {
    if (!user) return "Unknown";
    if (typeof user === "string") return user;
    if (typeof user === "object" && user !== null) {
      // @ts-expect-error: user may be an object with name/email, but TS can't infer this from unknown
      return user.name || user.email || "Unknown";
    }
    return "Unknown";
  }
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const [staffUpdate, setStaffUpdate] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [feedback, setFeedback] = useState({ rating: 0, comment: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [locallyAccepted, setLocallyAccepted] = useState(false);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  // HoD acceptance/rejection inputs (Pending state)
  const [hodNote, setHodNote] = useState("");
  const [hodRejectReason, setHodRejectReason] = useState("");
  // Dean acceptance/rejection inputs (Pending state)
  const [deanNote, setDeanNote] = useState("");
  const [deanRejectReason, setDeanRejectReason] = useState("");
  // HoD/Dean in-progress note inputs (decoupled from backend resolutionNote history)
  const [hodStatusNote, setHodStatusNote] = useState("");
  const [deanStatusNote, setDeanStatusNote] = useState("");

  // Helper for type-safe staff display (string or object)
  function getStaffDisplay(staff: unknown): string {
    if (!staff) return "Unassigned";
    if (typeof staff === "string") return staff;
    if (typeof staff === "object" && staff !== null) {
      // @ts-expect-error: staff may be an object with name/email
      return staff.name || staff.email || "Unassigned";
    }
    return "Unassigned";
  }

  // Helper: Normalize a backend complaint payload into our client Complaint shape
  function mapToClientComplaint(
    input: unknown,
    fallback?: Complaint | null
  ): Complaint | null {
    if (!input || typeof input !== "object") return fallback ?? null;
    const obj = input as Record<string, unknown>;
    const submittedBy = (obj.submittedBy as Record<string, unknown>) || {};
    const assignedTo = (obj.assignedTo as Record<string, unknown>) || {};
    const id = (obj._id as string) || (obj.id as string) || fallback?.id || "";
    const title = (obj.title as string) || fallback?.title || "";
    const description =
      (obj.description as string) || fallback?.description || "";
    const category = (obj.category as string) || fallback?.category || "";
    const status =
      (obj.status as Complaint["status"]) || fallback?.status || "Pending";
    const priority =
      (obj.priority as Complaint["priority"]) || fallback?.priority || "Medium";
    const submittedByName =
      (submittedBy.name as string) ||
      (submittedBy.email as string) ||
      fallback?.submittedBy ||
      "User";
    const assignedStaffName =
      (assignedTo.name as string) ||
      (assignedTo.email as string) ||
      fallback?.assignedStaff;
    const assignedAt = obj.assignedAt
      ? new Date(String(obj.assignedAt))
      : fallback?.assignedDate;
    const createdAt = obj.createdAt
      ? new Date(String(obj.createdAt))
      : fallback?.submittedDate || new Date();
    const updatedAt = obj.updatedAt
      ? new Date(String(obj.updatedAt))
      : fallback?.lastUpdated || new Date();
    const deadline = obj.deadline
      ? new Date(String(obj.deadline))
      : fallback?.deadline;
    const resolutionNote =
      (obj.resolutionNote as string) || fallback?.resolutionNote;
    const fb = (obj.feedback as Complaint["feedback"]) || fallback?.feedback;
    const sourceRole =
      (obj.sourceRole as Complaint["sourceRole"]) || fallback?.sourceRole;
    const assignedByRole =
      (obj.assignedByRole as Complaint["assignedByRole"]) ||
      fallback?.assignedByRole;
    const assignmentPath = Array.isArray(obj.assignmentPath)
      ? (obj.assignmentPath as Array<
          "student" | "headOfDepartment" | "dean" | "admin" | "staff"
        >)
      : fallback?.assignmentPath || [];
    const evidenceFile = (obj.evidenceFile as string) || fallback?.evidenceFile;
    const isEscalated = Boolean(
      obj.isEscalated ?? fallback?.isEscalated ?? false
    );
    const submittedTo = (obj.submittedTo as string) || fallback?.submittedTo;

    return {
      id,
      title,
      description,
      category,
      status,
      submittedBy: submittedByName,
      sourceRole,
      assignedStaff: assignedStaffName,
      assignedStaffRole: fallback?.assignedStaffRole,
      assignedByRole,
      assignmentPath,
      assignedDate: assignedAt,
      submittedDate: createdAt,
      deadline,
      lastUpdated: updatedAt,
      priority,
      feedback: fb,
      resolutionNote,
      evidenceFile,
      isEscalated,
      submittedTo,
      department: fallback?.department,
    };
  }

  useEffect(() => {
    let ignore = false;
    async function fetchComplaint() {
      if (!fetchLatest) {
        setLiveComplaint(complaint);
        return;
      }
      if (open && complaint?.id) {
        setLoading(true);
        try {
          const data = await getComplaintApi(complaint.id);
          const mapped = mapToClientComplaint(data, complaint);
          if (!ignore) setLiveComplaint(mapped);
        } catch (e) {
          if (!ignore) setLiveComplaint(complaint); // fallback
        } finally {
          if (!ignore) setLoading(false);
        }
      } else {
        // Ensure baseline mapping for initial complaint too, so dates render reliably
        const mapped = mapToClientComplaint(complaint || {}, complaint);
        setLiveComplaint(mapped);
      }
    }
    fetchComplaint();
    return () => {
      ignore = true;
    };
  }, [open, complaint, fetchLatest]);

  // Realtime refresh: when modal is open, periodically refetch complaint + logs and listen to cross-view events
  useEffect(() => {
    let timer: number | undefined;
    let cancelled = false;
    async function loadLogsAndLatest() {
      if (!open || !complaint?.id) return;
      try {
        const [fresh, logData] = await Promise.all([
          fetchLatest ? getComplaintApi(complaint.id) : Promise.resolve(null),
          getActivityLogsForComplaint(complaint.id),
        ]);
        if (cancelled) return;
        if (fresh) {
          // Non-destructive merge to preserve any transient local fields
          setLiveComplaint((prev) =>
            mapToClientComplaint(fresh, prev || complaint)
          );
        }
        setLogs(logData as ActivityLog[]);
      } catch {
        // ignore transient errors during polling
      }
    }
    if (open && complaint?.id) {
      // Initial fetch
      loadLogsAndLatest();
      // Poll every 3s while open (snappier updates for cross-view changes)
      timer = window.setInterval(loadLogsAndLatest, 3000) as unknown as number;
    }
    const onStatusEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail as { id?: string } | undefined;
      if (detail?.id && detail.id === complaint?.id) {
        loadLogsAndLatest();
      }
    };
    window.addEventListener(
      "complaint:status-changed",
      onStatusEvent as EventListener
    );
    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
      window.removeEventListener(
        "complaint:status-changed",
        onStatusEvent as EventListener
      );
    };
  }, [open, complaint, complaint?.id, fetchLatest]);

  useEffect(() => {
    if (liveComplaint && liveComplaint.feedback) {
      setFeedback(liveComplaint.feedback);
    } else {
      setFeedback({ rating: 0, comment: "" });
    }
  }, [liveComplaint]);

  // Load local acceptance state (synced from My Assigned / Dashboard quick actions)
  useEffect(() => {
    try {
      const id = complaint?.id;
      if (!id) {
        setLocallyAccepted(false);
        return;
      }
      const raw =
        typeof window !== "undefined"
          ? localStorage.getItem("myAssignedAccepted")
          : null;
      if (!raw) {
        setLocallyAccepted(false);
        return;
      }
      const setArr: string[] = JSON.parse(raw);
      setLocallyAccepted(Array.isArray(setArr) && setArr.includes(id));
    } catch {
      setLocallyAccepted(false);
    }
  }, [open, complaint?.id]);

  const handleApprove = async () => {
    if (!complaint) return;

    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      onUpdate?.(complaint.id, { status: "In Progress" });
      toast({
        title: "Complaint Approved",
        description: "Complaint status updated to In Progress",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve complaint",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!complaint) return;

    if (!rejectReason.trim()) {
      toast({
        title: "Reason required",
        description: "Please enter a reason for rejection.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      onUpdate?.(complaint.id, {
        status: "Closed",
        resolutionNote: `Rejected: ${rejectReason}`,
      });
      toast({
        title: "Complaint Rejected",
        description: "Complaint has been rejected and closed",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject complaint",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!complaint) return;
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      // If there's a pending staff update, treat it as the optional resolution description
      const note = staffUpdate.trim();
      onUpdate?.(
        complaint.id,
        note
          ? { status: "Resolved", resolutionNote: note }
          : { status: "Resolved" }
      );
      if (note) setStaffUpdate("");
      toast({ title: "Resolved", description: "Complaint marked resolved." });
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUpdate = async () => {
    if (!complaint || !staffUpdate.trim()) return;

    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const ts = new Date();
      const prefix = ts.toLocaleString();
      const existing = liveComplaint?.resolutionNote?.trim();
      const safeNote = staffUpdate.trim().slice(0, 1000);
      const newEntry = `• ${prefix}: ${safeNote}`;
      const combined = existing ? `${existing}\n${newEntry}` : newEntry;
      // Update local UI to reflect appended note history immediately
      setLiveComplaint((prev) =>
        prev
          ? {
              ...prev,
              resolutionNote: combined,
              lastUpdated: ts,
            }
          : prev
      );
      // Send only the new note to backend as description via parent onUpdate handler
      onUpdate?.(complaint.id, {
        resolutionNote: safeNote,
        status: liveComplaint?.status || "In Progress",
        lastUpdated: ts,
      });
      toast({
        title: "Update Added",
        description: "Your update has been added to the complaint",
      });
      setStaffUpdate("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add update",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!complaint || feedback.rating === 0) return;

    setIsLoading(true);
    try {
      await submitComplaintFeedbackApi(complaint.id, feedback);
      const updated = { ...(liveComplaint as Complaint), feedback };
      setLiveComplaint(updated);
      onUpdate?.(complaint.id, { feedback });
      // Broadcast so other views (e.g., staff All Complaints) can reflect feedback
      window.dispatchEvent(
        new CustomEvent("complaint:upsert", { detail: { complaint: updated } })
      );
      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback!",
      });
      // Broadcast change
      window.dispatchEvent(
        new CustomEvent("complaint:status-changed", {
          detail: { id: complaint.id },
        })
      );
      onOpenChange(false);
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Failed to submit feedback";
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "critical":
        return "border-destructive text-destructive";
      case "high":
        return "border-orange-500 text-orange-600";
      case "medium":
        return "border-warning text-warning";
      case "low":
        return "border-success text-success";
      default:
        return "border-muted-foreground text-muted-foreground";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "border-warning text-warning";
      case "In Progress":
        return "border-info text-info";
      case "Resolved":
        return "border-success text-success";
      case "Closed":
        return "border-muted-foreground text-muted-foreground";
      default:
        return "border-muted-foreground text-muted-foreground";
    }
  };

  if (!liveComplaint || !user) return null;

  // Role-based View Detail button (not used in current UI)
  // const showViewDetailButton =
  //   (user.role === "admin" || user.role === "staff") && liveComplaint;

  // Debug logging removed to reduce console noise in production

  // Robust check for assignment: true if assignedStaff is a non-empty string or a non-null object
  const isAssigned = !!(
    liveComplaint.assignedStaff &&
    ((typeof liveComplaint.assignedStaff === "string" &&
      liveComplaint.assignedStaff.trim() !== "") ||
      (typeof liveComplaint.assignedStaff === "object" &&
        liveComplaint.assignedStaff !== null))
  );

  // Build timeline with dynamic messages based on routing flow and actions and activity logs
  const submittedByName = liveComplaint.submittedBy || "Student";
  const staffName = getStaffDisplay(liveComplaint.assignedStaff);
  const roleLower = (liveComplaint.assignedByRole || "").toLowerCase();
  const path = Array.isArray(liveComplaint.assignmentPath)
    ? liveComplaint.assignmentPath.map((r) => String(r).toLowerCase())
    : [];
  const viaHod =
    roleLower === "headofdepartment" ||
    roleLower === "hod" ||
    path.includes("headofdepartment") ||
    path.includes("hod");
  const assignedByAdmin = roleLower === "admin";
  const directToStaff =
    (liveComplaint.sourceRole || "student") === "student" &&
    (!liveComplaint.assignedByRole ||
      liveComplaint.assignedByRole === "student");

  const submittedDesc = (() => {
    if (directToStaff && liveComplaint.assignedStaff) {
      return `Complaint submitted by ${submittedByName} directly to ${staffName}`;
    }
    if (viaHod) {
      return `Complaint submitted by ${submittedByName} to HOD`;
    }
    return `Complaint submitted by ${submittedByName}`;
  })();

  // Build timeline as individual entries; dedupe by stable key; chronological order
  type TimelineEntry = {
    key: string; // stable key to dedupe identical updates within a render
    label:
      | "Submitted"
      | "Assigned"
      | "Accepted"
      | "Pending"
      | "In Progress"
      | "Resolved"
      | "Closed";
    role: string;
    icon: JSX.Element;
    time?: Date;
    desc: string; // optional description (may be empty)
  };

  const timelineEntries: TimelineEntry[] = [];

  // Submitted
  timelineEntries.push({
    key: `submitted|${
      liveComplaint.submittedDate
        ? new Date(liveComplaint.submittedDate).toISOString()
        : ""
    }`,
    label: "Submitted",
    role: "student",
    icon: <User className="h-4 w-4" />,
    time: liveComplaint.submittedDate,
    desc: submittedDesc,
  });

  // Assigned
  if (liveComplaint.assignedStaff) {
    let assignDesc = `Assigned to ${staffName}`;
    if (directToStaff) assignDesc = `Sent directly to ${staffName}`;
    else if (viaHod) assignDesc = `Assigned by HOD to ${staffName}`;
    else if (assignedByAdmin) assignDesc = `Assigned by Admin to ${staffName}`;
    const assignedTime =
      liveComplaint.assignedDate || liveComplaint.submittedDate;
    const assignedIso = assignedTime
      ? new Date(assignedTime).toISOString()
      : "";
    timelineEntries.push({
      key: `assigned|${assignedIso}|${staffName}`,
      label: "Assigned",
      role: viaHod ? "hod" : assignedByAdmin ? "admin" : "system",
      icon: <UserCheck className="h-4 w-4" />,
      time: assignedTime,
      desc: assignDesc,
    });
  }

  // Map action to status label and icon
  const statusIcon = (status: string) => {
    switch (status) {
      case "In Progress":
        return <Settings className="h-4 w-4" />;
      case "Resolved":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "Closed":
        return <X className="h-4 w-4 text-destructive" />;
      case "Pending":
        return <Clock className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  // Extract staff updates and consolidate to a single entry per status
  const sortedLogs = [...logs].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  type Consolidated = {
    lastTime?: Date;
    role?: string;
    descs: string[];
  };
  const byStatus = new Map<TimelineEntry["label"], Consolidated>();
  const normalizeStatus = (s: string): TimelineEntry["label"] => {
    const norm = s.toLowerCase();
    if (norm === "in progress") return "In Progress";
    if (norm === "resolved") return "Resolved";
    if (norm === "closed") return "Closed";
    if (norm === "pending") return "Pending";
    return (s.charAt(0).toUpperCase() + s.slice(1)) as TimelineEntry["label"];
  };

  for (const log of sortedLogs) {
    // Explicitly add an "Accepted" step when HoD/Dean approve a complaint
    if (/^complaint approved$/i.test(log.action || "")) {
      const roleNorm = String(log.role || "").toLowerCase();
      if (
        roleNorm === "hod" ||
        roleNorm === "headofdepartment" ||
        roleNorm === "dean"
      ) {
        const time = new Date(log.timestamp);
        const details = (log.details || {}) as Record<string, unknown>;
        const approverNote =
          typeof details.description === "string"
            ? String(details.description)
            : typeof details.note === "string"
            ? String(details.note)
            : "";
        timelineEntries.push({
          key: `accepted|${time.toISOString()}`,
          label: "Accepted",
          role: log.role || "hod",
          icon: <CheckCircle className="h-4 w-4 text-success" />,
          time,
          desc: approverNote,
        });
      }
    }

    const m = (log.action || "").match(/status updated to\s+(.+)/i);
    if (!m) continue;
    const status = normalizeStatus((m[1] || "").trim());
    const time = new Date(log.timestamp);
    const details = (log.details || {}) as Record<string, unknown>;
    const rawDesc =
      typeof details.description === "string" ? details.description.trim() : "";
    const parts = rawDesc ? rawDesc.split("\n").filter(Boolean) : [];

    const cur = byStatus.get(status) || ({ descs: [] } as Consolidated);
    if (!cur.lastTime || time > cur.lastTime) cur.lastTime = time;
    cur.role = cur.role || log.role || "staff";
    cur.descs.push(...parts);
    byStatus.set(status, cur);
  }

  for (const [status, grp] of byStatus.entries()) {
    const cleaned = grp.descs
      .map((d) => d.replace(/^\[.*?\]\s*/, "").trim())
      .filter(Boolean);
    const finalDesc = cleaned.length
      ? cleaned.map((d, i) => `${i + 1}. ${d}`).join("\n")
      : "";
    timelineEntries.push({
      key: `status|${status}`,
      label: status,
      role: grp.role || "staff",
      icon: statusIcon(status),
      time: grp.lastTime,
      desc: finalDesc,
    });
  }

  // Optional: if current status has no corresponding log, add a synthetic entry at lastUpdated
  if (liveComplaint.lastUpdated && liveComplaint.status) {
    const lastUpdatedDate = new Date(liveComplaint.lastUpdated);
    const hasNearbyStatus = timelineEntries.some((e) => {
      if (
        e.label !== (liveComplaint.status as TimelineEntry["label"]) ||
        !e.time
      )
        return false;
      const delta = Math.abs(e.time.getTime() - lastUpdatedDate.getTime());
      return delta <= 5000; // within 5 seconds considered the same event
    });
    if (!hasNearbyStatus) {
      const secondEpoch = Math.floor(lastUpdatedDate.getTime() / 1000);
      timelineEntries.push({
        key: `synthetic|${liveComplaint.status}|${secondEpoch}`,
        label: liveComplaint.status as TimelineEntry["label"],
        role: "staff",
        icon: statusIcon(liveComplaint.status),
        time: lastUpdatedDate,
        desc: "",
      });
    }
  }

  // Ensure one entry per status, chronologically sorted
  const seen = new Set<string>();
  const timelineSteps = timelineEntries
    .filter((e) => {
      const key = e.key || `${e.label}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (a.time?.getTime?.() || 0) - (b.time?.getTime?.() || 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Complaint Details
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="p-8 text-center flex flex-col items-center justify-center">
            <span className="relative inline-block h-12 w-12">
              <span className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></span>
              <span className="absolute inset-2 rounded-full border-2 border-muted animate-pulse"></span>
              <span className="absolute inset-4 rounded-full bg-primary/20"></span>
            </span>
            <div className="mt-4 text-lg font-semibold text-primary">
              Loading complaint details...
            </div>
          </div>
        ) : (
          <>
            {/* Complaint Information Section (always shown) */}
            <Card>
              <CardHeader>
                <CardTitle>Complaint Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold mb-3">
                    {liveComplaint.title}
                  </h3>
                  <div className="flex gap-2 mb-4">
                    <Badge
                      variant="outline"
                      className={getPriorityColor(liveComplaint.priority || "")}
                    >
                      <Flag className="h-3 w-3 mr-1" />
                      {liveComplaint.priority}
                    </Badge>
                    {isAssigned && (
                      <Badge
                        variant="outline"
                        className={getStatusColor(liveComplaint.status)}
                      >
                        {liveComplaint.status}
                      </Badge>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <div className="mt-1 p-3 bg-muted/50 rounded-lg text-sm">
                    {liveComplaint.description}
                  </div>
                </div>

                {liveComplaint.evidenceFile && (
                  <div>
                    <Label className="text-sm font-medium">Evidence</Label>
                    <div className="mt-2 space-y-2">
                      {/* Attempt inline preview if image */}
                      {/(png|jpe?g|gif|webp|svg)$/i.test(
                        liveComplaint.evidenceFile
                          .split("?")[0]
                          .split(".")
                          .pop() || ""
                      ) ? (
                        <div className="border rounded p-2 bg-muted/30">
                          <img
                            src={liveComplaint.evidenceFile}
                            alt="Evidence"
                            className="max-h-60 object-contain mx-auto rounded"
                            loading="lazy"
                          />
                        </div>
                      ) : null}
                      <div className="flex gap-2">
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          <a
                            href={liveComplaint.evidenceFile}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="h-4 w-4 mr-1" /> View /
                            Download
                          </a>
                        </Button>
                        <Input
                          readOnly
                          value={liveComplaint.evidenceFile}
                          className="text-xs"
                          onFocus={(e) => e.currentTarget.select()}
                        />
                      </div>
                    </div>
                  </div>
                )}
                {/* Staff Update section removed as per request */}

                {liveComplaint.feedback && user.role !== "user" && (
                  <div>
                    <Label className="text-sm font-medium">
                      Student Feedback
                    </Label>
                    <div className="mt-2 flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < (liveComplaint.feedback!.rating || 0)
                              ? "text-warning fill-current"
                              : "text-muted-foreground"
                          }`}
                        />
                      ))}
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({liveComplaint.feedback.rating}/5)
                      </span>
                    </div>
                    {liveComplaint.feedback.comment && (
                      <div className="mt-1 p-3 bg-muted/50 rounded-lg text-sm">
                        {liveComplaint.feedback.comment}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submission Information Section (always shown) */}
            {/* ...existing code, replace all complaint. with liveComplaint. ... */}
          </>
        )}

        {/* HoD: Pending actions (visible even if not assigned) */}
        {user.role === "headOfDepartment" &&
          liveComplaint.status === "Pending" && (
            <Card>
              <CardHeader>
                <CardTitle>HoD Review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="mb-2">Optional note to student</Label>
                  <Textarea
                    className="w-full border rounded px-3 py-2"
                    placeholder="Add an optional note visible to the student..."
                    value={hodNote}
                    onChange={(e) => setHodNote(e.target.value.slice(0, 1000))}
                    rows={3}
                  />
                  <div className="text-xs text-muted-foreground mt-1 text-right">
                    {hodNote.length}/1000
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button
                    variant="default"
                    disabled={isLoading}
                    onClick={() => {
                      if (!liveComplaint) return;
                      setIsLoading(true);
                      approveComplaintApi(liveComplaint.id, {
                        note: hodNote.trim() || undefined,
                      })
                        .then(() => {
                          toast({
                            title: "Accepted",
                            description: "Complaint moved to In Progress.",
                          });
                          setHodNote("");
                          window.dispatchEvent(
                            new CustomEvent("complaint:status-changed", {
                              detail: { id: liveComplaint.id },
                            })
                          );
                          onOpenChange(false);
                        })
                        .finally(() => setIsLoading(false));
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" /> Accept
                  </Button>
                  <div>
                    <Label className="mb-2 block">Reject reason</Label>
                    <Textarea
                      className="w-full border rounded px-3 py-2"
                      placeholder="Provide a reason for rejection..."
                      value={hodRejectReason}
                      onChange={(e) =>
                        setHodRejectReason(e.target.value.slice(0, 1000))
                      }
                      rows={2}
                    />
                    <div className="text-xs text-muted-foreground mt-1 text-right">
                      {hodRejectReason.length}/1000
                    </div>
                    <Button
                      variant="destructive"
                      disabled={isLoading}
                      className="mt-2 w-full"
                      onClick={() => {
                        if (!liveComplaint) return;
                        if (!hodRejectReason.trim()) {
                          toast({
                            title: "Reason required",
                            description: "Please enter a reason to reject.",
                            variant: "destructive",
                          });
                          return;
                        }
                        setIsLoading(true);
                        updateComplaintStatusApi(
                          liveComplaint.id,
                          "Closed",
                          `Rejected: ${hodRejectReason.trim()}`
                        )
                          .then(() => {
                            toast({
                              title: "Rejected",
                              description: "Complaint has been rejected.",
                            });
                            setHodRejectReason("");
                            window.dispatchEvent(
                              new CustomEvent("complaint:status-changed", {
                                detail: { id: liveComplaint.id },
                              })
                            );
                            onOpenChange(false);
                          })
                          .finally(() => setIsLoading(false));
                      }}
                    >
                      <X className="h-4 w-4 mr-2" /> Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

        {/* Dean: Pending actions (visible even if not assigned) */}
        {user.role === "dean" && liveComplaint.status === "Pending" && (
          <Card>
            <CardHeader>
              <CardTitle>Dean Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="mb-2">Optional note to student</Label>
                <Textarea
                  className="w-full border rounded px-3 py-2"
                  placeholder="Add an optional note visible to the student..."
                  value={deanNote}
                  onChange={(e) => setDeanNote(e.target.value.slice(0, 1000))}
                  rows={3}
                />
                <div className="text-xs text-muted-foreground mt-1 text-right">
                  {deanNote.length}/1000
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button
                  variant="default"
                  disabled={isLoading}
                  onClick={() => {
                    if (!liveComplaint) return;
                    setIsLoading(true);
                    approveComplaintApi(liveComplaint.id, {
                      note: deanNote.trim() || undefined,
                    })
                      .then(() => {
                        toast({
                          title: "Accepted",
                          description: "Complaint moved to In Progress.",
                        });
                        setDeanNote("");
                        window.dispatchEvent(
                          new CustomEvent("complaint:status-changed", {
                            detail: { id: liveComplaint.id },
                          })
                        );
                        onOpenChange(false);
                      })
                      .finally(() => setIsLoading(false));
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" /> Accept
                </Button>
                <div>
                  <Label className="mb-2 block">Reject reason</Label>
                  <Textarea
                    className="w-full border rounded px-3 py-2"
                    placeholder="Provide a reason for rejection..."
                    value={deanRejectReason}
                    onChange={(e) =>
                      setDeanRejectReason(e.target.value.slice(0, 1000))
                    }
                    rows={2}
                  />
                  <div className="text-xs text-muted-foreground mt-1 text-right">
                    {deanRejectReason.length}/1000
                  </div>
                  <Button
                    variant="destructive"
                    disabled={isLoading}
                    className="mt-2 w-full"
                    onClick={() => {
                      if (!liveComplaint) return;
                      if (!deanRejectReason.trim()) {
                        toast({
                          title: "Reason required",
                          description: "Please enter a reason to reject.",
                          variant: "destructive",
                        });
                        return;
                      }
                      setIsLoading(true);
                      updateComplaintStatusApi(
                        liveComplaint.id,
                        "Closed",
                        `Rejected: ${deanRejectReason.trim()}`
                      )
                        .then(() => {
                          toast({
                            title: "Rejected",
                            description: "Complaint has been rejected.",
                          });
                          setDeanRejectReason("");
                          window.dispatchEvent(
                            new CustomEvent("complaint:status-changed", {
                              detail: { id: liveComplaint.id },
                            })
                          );
                          onOpenChange(false);
                        })
                        .finally(() => setIsLoading(false));
                    }}
                  >
                    <X className="h-4 w-4 mr-2" /> Reject
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submission Information Section (always shown) */}
        <Card>
          <CardHeader>
            <CardTitle>Submission Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">
                  Student Name
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  <User className="h-4 w-4" />
                  <span className="font-medium">
                    {getUserDisplay(liveComplaint.submittedBy)}
                  </span>
                </div>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">
                  Category
                </Label>
                <Badge variant="secondary" className="mt-1">
                  {liveComplaint.category}
                </Badge>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">
                  Priority
                </Label>
                <Badge
                  variant="outline"
                  className={`mt-1 ${getPriorityColor(
                    liveComplaint.priority || ""
                  )}`}
                >
                  {liveComplaint.priority}
                </Badge>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">
                  Date Submitted
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">
                    {liveComplaint.submittedDate
                      ? new Date(
                          liveComplaint.submittedDate
                        ).toLocaleDateString()
                      : ""}
                  </span>
                </div>
              </div>

              {liveComplaint.deadline && (
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Deadline
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    {(() => {
                      const deadlineDate = new Date(liveComplaint.deadline);
                      const now = new Date();
                      const isOverdue =
                        now > deadlineDate &&
                        !["Resolved", "Closed"].includes(liveComplaint.status);
                      return (
                        <span
                          className={`text-sm font-semibold ${
                            isOverdue ? "text-red-600" : "text-blue-600"
                          }`}
                        >
                          {deadlineDate.toLocaleDateString()}
                          {isOverdue && (
                            <span className="ml-2 px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs font-bold">
                              Overdue
                            </span>
                          )}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              )}

              {isAssigned && (
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Assigned To
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <UserCheck className="h-4 w-4" />
                    <span className="text-sm">
                      {getStaffDisplay(liveComplaint.assignedStaff)}
                    </span>
                  </div>
                </div>
              )}

              {user.role === "staff" && (
                <div className="md:col-span-2 lg:col-span-3">
                  <Label className="text-sm text-muted-foreground">
                    Source Summary
                  </Label>
                  <div className="mt-1 p-3 rounded bg-muted/50 text-sm">
                    {(() => {
                      const src = liveComplaint.sourceRole || "student";
                      const assignedBy = liveComplaint.assignedByRole;
                      const path = Array.isArray(liveComplaint.assignmentPath)
                        ? liveComplaint.assignmentPath
                        : [];
                      // Case 1: Student -> Staff directly
                      if (src === "student" && assignedBy === "student") {
                        return "Complaint submitted directly by Student.";
                      }
                      // Case 2: Student -> HoD -> Staff
                      if (
                        src === "student" &&
                        (assignedBy === "headOfDepartment" ||
                          path.includes("headOfDepartment"))
                      ) {
                        return "Complaint submitted by Student, assigned by HoD.";
                      }
                      // Case 3: Student -> Dean -> HoD -> Staff
                      if (
                        src === "student" &&
                        path.includes("dean") &&
                        (assignedBy === "headOfDepartment" ||
                          path.includes("headOfDepartment"))
                      ) {
                        return "Complaint submitted by Student, passed down by Dean → HoD → assigned to you.";
                      }
                      // Admin or other flows
                      if (assignedBy === "admin") {
                        return "Complaint routed by Admin and assigned to you.";
                      }
                      // Fallback
                      return "Complaint routing information available.";
                    })()}
                  </div>
                </div>
              )}

              {isAssigned && (
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Last Updated
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">
                      {liveComplaint.lastUpdated
                        ? new Date(
                            liveComplaint.lastUpdated
                          ).toLocaleDateString()
                        : ""}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Complaint Timeline (always shown) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Complaint Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative pl-6 border-l-2 border-muted-foreground/20 space-y-8">
              {/* Timeline steps - always use liveComplaint for latest backend state */}
              {timelineSteps.map((step, idx) => (
                <div
                  key={
                    step.key ||
                    `${step.label}|${
                      step.time ? new Date(step.time).toISOString() : idx
                    }`
                  }
                  className="flex items-start gap-4 relative"
                >
                  <div className="absolute -left-6 top-0">
                    <div
                      className={`rounded-full bg-background border-2 border-primary flex items-center justify-center w-7 h-7 ${
                        idx === 0 ? "border-success" : ""
                      }`}
                    >
                      {step.icon}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{step.label}</span>
                      <Badge variant="outline" className="capitalize">
                        {String(step.role || "").toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {step.time ? new Date(step.time).toLocaleString() : ""}
                    </div>
                    <div className="text-sm mt-1 whitespace-pre-wrap break-words">
                      {step.desc ? (
                        step.desc.includes("\n") ? (
                          <div className="space-y-1">
                            {step.desc.split("\n").map((line, lineIdx) => (
                              <div key={lineIdx} className="text-sm">
                                {line}
                              </div>
                            ))}
                          </div>
                        ) : (
                          step.desc
                        )
                      ) : (
                        <span className="text-muted-foreground italic">
                          Status updated (No description given)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Only show these sections if assigned */}
        {isAssigned && (
          <>
            {/* Role-specific Actions */}
            {user.role === "user" && (
              <>
                {complaint.status === "Resolved" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Star className="h-5 w-5" />
                        Submit Feedback
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Rate your experience (1-5 stars)</Label>
                        <div className="flex gap-1 mt-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() =>
                                setFeedback({ ...feedback, rating: star })
                              }
                              className={`p-1 ${
                                star <= feedback.rating
                                  ? "text-warning"
                                  : "text-muted-foreground"
                              }`}
                            >
                              <Star className="h-5 w-5 fill-current" />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label>Comments (Optional)</Label>
                        <Textarea
                          placeholder="Share your feedback about the resolution..."
                          value={feedback.comment}
                          onChange={(e) =>
                            setFeedback({
                              ...feedback,
                              comment: e.target.value,
                            })
                          }
                          rows={3}
                        />
                      </div>

                      <Button
                        onClick={handleFeedbackSubmit}
                        disabled={isLoading || feedback.rating === 0}
                        className="w-full"
                      >
                        Submit Feedback
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {complaint.feedback && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Your Feedback</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < complaint.feedback!.rating
                                ? "text-warning fill-current"
                                : "text-muted-foreground"
                            }`}
                          />
                        ))}
                        <span className="ml-2 text-sm text-muted-foreground">
                          ({complaint.feedback.rating}/5)
                        </span>
                      </div>
                      {complaint.feedback.comment && (
                        <p className="text-sm">{complaint.feedback.comment}</p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {user.role === "staff" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Staff Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!(
                    liveComplaint.status === "In Progress" || locallyAccepted
                  ) && (
                    <div className="text-sm text-muted-foreground">
                      Accept this complaint from the main list to start working.
                      Once accepted, you can update progress or resolve it here.
                    </div>
                  )}

                  {(liveComplaint.status === "In Progress" ||
                    locallyAccepted) && (
                    <>
                      <div>
                        <Label className="mb-2">Update Status</Label>
                        <select
                          className="w-full border rounded px-3 py-2"
                          value={
                            liveComplaint.status === "In Progress"
                              ? "In Progress"
                              : liveComplaint.status
                          }
                          onChange={(e) =>
                            setLiveComplaint({
                              ...liveComplaint,
                              status: e.target.value as Complaint["status"],
                            })
                          }
                        >
                          <option value="In Progress">In Progress</option>
                          <option value="Resolved">Resolved</option>
                          <option value="Closed">Closed</option>
                        </select>
                        <Button
                          className="mt-2 w-full"
                          disabled={isLoading}
                          onClick={() => {
                            const newStatus = liveComplaint.status;
                            setIsLoading(true);
                            Promise.resolve(
                              onUpdate?.(liveComplaint.id, {
                                status: newStatus,
                                lastUpdated: new Date(),
                              })
                            )
                              .then(() => {
                                toast({
                                  title: "Status updated",
                                  description: `Updated to ${newStatus}.`,
                                });
                                window.dispatchEvent(
                                  new CustomEvent("complaint:status-changed", {
                                    detail: { id: liveComplaint.id },
                                  })
                                );
                              })
                              .finally(() => setIsLoading(false));
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Save Changes
                        </Button>
                      </div>

                      <div>
                        <Label>Add Progress Update</Label>
                        <Textarea
                          placeholder="Provide updates on the complaint progress..."
                          value={staffUpdate}
                          onChange={(e) =>
                            setStaffUpdate(e.target.value.slice(0, 1000))
                          }
                          rows={3}
                        />
                        <div className="text-xs text-muted-foreground mt-1 text-right">
                          {staffUpdate.length}/1000
                        </div>
                        <Button
                          onClick={handleAddUpdate}
                          disabled={isLoading || !staffUpdate.trim()}
                          className="mt-2 w-full"
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Add Update
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {user.role === "headOfDepartment" &&
              liveComplaint.status === "In Progress" && (
                <Card>
                  <CardHeader>
                    <CardTitle>HoD Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="mb-2">Update Status</Label>
                      <select
                        className="w-full border rounded px-3 py-2"
                        value={liveComplaint.status}
                        onChange={(e) =>
                          setLiveComplaint({
                            ...liveComplaint,
                            status: e.target.value as Complaint["status"],
                          })
                        }
                      >
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </div>
                    <div>
                      <Label className="mb-2">Note (optional)</Label>
                      <Textarea
                        className="w-full border rounded px-3 py-2"
                        placeholder="Add an optional note visible to the user..."
                        value={hodStatusNote}
                        onChange={(e) =>
                          setHodStatusNote(e.target.value.slice(0, 1000))
                        }
                        rows={3}
                      />
                      <div className="text-xs text-muted-foreground mt-1 text-right">
                        {hodStatusNote.length}/1000
                      </div>
                    </div>
                    <Button
                      className="mt-2 w-full"
                      disabled={isLoading}
                      onClick={() => {
                        if (!liveComplaint) return;
                        setIsLoading(true);
                        updateComplaintStatusApi(
                          liveComplaint.id,
                          liveComplaint.status as
                            | "Pending"
                            | "In Progress"
                            | "Resolved"
                            | "Closed",
                          hodStatusNote.trim() || undefined
                        )
                          .then(() => {
                            toast({
                              title: "Status updated",
                              description: `Updated to ${liveComplaint.status}.`,
                            });
                            // Clear HoD in-progress note input locally
                            setHodStatusNote("");
                            window.dispatchEvent(
                              new CustomEvent("complaint:status-changed", {
                                detail: { id: liveComplaint.id },
                              })
                            );
                          })
                          .finally(() => setIsLoading(false));
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </CardContent>
                </Card>
              )}

            {user.role === "dean" && liveComplaint.status === "In Progress" && (
              <Card>
                <CardHeader>
                  <CardTitle>Dean Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="mb-2">Update Status</Label>
                    <select
                      className="w-full border rounded px-3 py-2"
                      value={liveComplaint.status}
                      onChange={(e) =>
                        setLiveComplaint({
                          ...liveComplaint,
                          status: e.target.value as Complaint["status"],
                        })
                      }
                    >
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                  <div>
                    <Label className="mb-2">Note (optional)</Label>
                    <Textarea
                      className="w-full border rounded px-3 py-2"
                      placeholder="Add an optional note visible to the user..."
                      value={deanStatusNote}
                      onChange={(e) =>
                        setDeanStatusNote(e.target.value.slice(0, 1000))
                      }
                      rows={3}
                    />
                    <div className="text-xs text-muted-foreground mt-1 text-right">
                      {deanStatusNote.length}/1000
                    </div>
                  </div>
                  <Button
                    className="mt-2 w-full"
                    disabled={isLoading}
                    onClick={() => {
                      if (!liveComplaint) return;
                      setIsLoading(true);
                      updateComplaintStatusApi(
                        liveComplaint.id,
                        liveComplaint.status as
                          | "Pending"
                          | "In Progress"
                          | "Resolved"
                          | "Closed",
                        deanStatusNote.trim() || undefined
                      )
                        .then(() => {
                          toast({
                            title: "Status updated",
                            description: `Updated to ${liveComplaint.status}.`,
                          });
                          // Clear Dean in-progress note input locally
                          setDeanStatusNote("");
                          window.dispatchEvent(
                            new CustomEvent("complaint:status-changed", {
                              detail: { id: liveComplaint.id },
                            })
                          );
                        })
                        .finally(() => setIsLoading(false));
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Admin view: always show status update and resolution note fields */}
            {user.role === "admin" && (
              <Card>
                <CardHeader>
                  <CardTitle>Admin Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="mb-2">Update Status</Label>
                    <select
                      className="w-full border rounded px-3 py-2"
                      value={liveComplaint.status}
                      onChange={(e) =>
                        setLiveComplaint({
                          ...liveComplaint,
                          status: e.target.value as Complaint["status"],
                        })
                      }
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                  <div>
                    <Label className="mb-2">Resolution Note (optional)</Label>
                    <Textarea
                      className="w-full border rounded px-3 py-2"
                      placeholder="Add a description or resolution note..."
                      value={liveComplaint.resolutionNote || ""}
                      onChange={(e) =>
                        setLiveComplaint({
                          ...liveComplaint,
                          resolutionNote: e.target.value.slice(0, 1000),
                        })
                      }
                      rows={3}
                    />
                    <div className="text-xs text-muted-foreground mt-1 text-right">
                      {(liveComplaint.resolutionNote || "").length}/1000
                    </div>
                  </div>
                  <Button
                    className="mt-2 w-full"
                    disabled={isLoading}
                    onClick={() => {
                      if (!liveComplaint) return;
                      setIsLoading(true);
                      Promise.resolve(
                        onUpdate?.(liveComplaint.id, {
                          status: liveComplaint.status,
                          resolutionNote: liveComplaint.resolutionNote,
                        })
                      )
                        .then(() => {
                          window.dispatchEvent(
                            new CustomEvent("complaint:status-changed", {
                              detail: { id: liveComplaint.id },
                            })
                          );
                        })
                        .finally(() => setIsLoading(false));
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                  {complaint.feedback && (
                    <div className="mt-4">
                      <div className="font-semibold">Student Feedback</div>
                      <div className="flex items-center gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < complaint.feedback.rating
                                ? "text-warning fill-current"
                                : "text-muted-foreground"
                            }`}
                          />
                        ))}
                        <span className="ml-2 text-sm text-muted-foreground">
                          ({complaint.feedback.rating}/5)
                        </span>
                      </div>
                      {complaint.feedback.comment && (
                        <p className="text-sm">{complaint.feedback.comment}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
