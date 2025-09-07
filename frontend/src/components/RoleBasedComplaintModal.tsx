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
  // When true (HoD only): hide Accept / Reject / In-Progress HoD action panels if complaint already assigned to a staff member
  hideHodActionsIfAssigned?: boolean;
  // Optional timeline filtering: full (default) shows all consolidated steps, summary reduces to key milestones
  timelineFilterMode?: "full" | "summary";
}

export function RoleBasedComplaintModal({
  complaint,
  open,
  onOpenChange,
  onUpdate,
  children: _children,
  fetchLatest = true,
  hideHodActionsIfAssigned = false,
  timelineFilterMode = "full",
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
  // Normalize role checks (case/space-insensitive) - compute after user is available
  const roleNorm = String(user?.role ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  const isHod = roleNorm === "hod" || roleNorm === "headofdepartment";

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
  // HoD local status selection that won't be overwritten by polling while editing
  const [hodActionStatus, setHodActionStatus] =
    useState<Complaint["status"]>("In Progress");
  const [isEditingHodStatus, setIsEditingHodStatus] = useState(false);
  const [lastHodStatusEditAt, setLastHodStatusEditAt] = useState<number | null>(
    null
  );
  const [deanStatusNote, setDeanStatusNote] = useState("");
  // Dean status update
  const [deanStatusUpdate, setDeanStatusUpdate] = useState("");
  // Dean action section visible only when:
  // 1) User is dean
  // 2) Complaint status === "In Progress"
  // 3) Dean has accepted / is part of the chain (accepted meaning it passed through dean or dean assigned it)
  // Dean acceptance heuristic: complaint passed through dean if assignmentPath or assignedByRole includes dean
  const acceptedByDean = (() => {
    if (!liveComplaint) return false;
    const byRole = (liveComplaint.assignedByRole || "").trim().toLowerCase();
    if (byRole === "dean") return true;
    if (
      Array.isArray(liveComplaint.assignmentPath) &&
      liveComplaint.assignmentPath.some(
        (r) => String(r).toLowerCase() === "dean"
      )
    )
      return true;
    return false;
  })();
  // Treat "Accepted" as equivalent to "In Progress" for Dean visibility
  const deanStatus = liveComplaint?.status;
  const deanVisiblePhase =
    deanStatus === "In Progress" || deanStatus === "Accepted";
  const showDeanActionSection =
    user?.role === "dean" && deanVisiblePhase && acceptedByDean;
  // (Optional) Normalized status if you want to render unified label elsewhere
  const deanEffectiveStatus =
    deanStatus === "Accepted" ? "In Progress" : deanStatus;
  // Admin in-progress note and UI status (including Pending Review label)
  const [adminStatusNote, setAdminStatusNote] = useState("");
  const [adminUiStatus, setAdminUiStatus] = useState<
    "In Progress" | "Pending Review" | "Resolved"
  >("In Progress");
  // Admin Action local status selection decoupled from live complaint to avoid polling snap-back
  const [adminActionStatus, setAdminActionStatus] =
    useState<Complaint["status"]>("Accepted");
  const [isEditingAdminStatus, setIsEditingAdminStatus] = useState(false);
  const [lastAdminStatusEditAt, setLastAdminStatusEditAt] = useState<
    number | null
  >(null);

  // Staff local state for status update
  const [staffActionStatus, setStaffActionStatus] =
    useState<Complaint["status"]>("In Progress");
  const [staffStatusNote, setStaffStatusNote] = useState("");

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
      (assignedTo.fullName as string) ||
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
      ? (obj.assignmentPath as string[])
          .map((r) => (r === "headOfDepartment" ? "hod" : r))
          .filter((r): r is "student" | "hod" | "dean" | "admin" | "staff" =>
            ["student", "hod", "dean", "admin", "staff"].includes(r as string)
          )
      : (fallback?.assignmentPath as Array<
          "student" | "hod" | "dean" | "admin" | "staff"
        >) || [];
    const evidenceFile = (obj.evidenceFile as string) || fallback?.evidenceFile;
    const isEscalated = Boolean(
      obj.isEscalated ?? fallback?.isEscalated ?? false
    );
    const submittedTo = (obj.submittedTo as string) || fallback?.submittedTo;
    const fallbackRecord: Record<string, unknown> | null = fallback
      ? (fallback as unknown as Record<string, unknown>)
      : null;
    const complaintCode =
      (obj.complaintCode as string) ||
      (obj.friendlyCode as string) ||
      (fallbackRecord?.friendlyCode as string | undefined) ||
      undefined;
    const recipientRole = ((obj.recipientRole as string | null | undefined) ||
      (fallbackRecord?.recipientRole as string | null | undefined) ||
      null) as string | null;
    const recipientId = ((obj.recipientId as string | null | undefined) ||
      (fallbackRecord?.recipientId as string | null | undefined) ||
      null) as string | null;

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
      // Prefer backend department if present; fall back to existing
      department: (obj.department as string) || fallback?.department,
      // Extra routing meta (augment separately if needed)
      recipientRole: recipientRole as unknown as Complaint["recipientRole"],
      recipientId: recipientId || undefined,
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

  // Sync Admin UI status from live complaint status when it changes
  useEffect(() => {
    if (!liveComplaint) return;
    if (liveComplaint.status === "Resolved") setAdminUiStatus("Resolved");
    else if (liveComplaint.status === "Accepted")
      setAdminUiStatus("In Progress");
    else setAdminUiStatus("In Progress");
  }, [liveComplaint]);

  // Sync HoD local action dropdown from live complaint when not actively editing
  useEffect(() => {
    if (!isHod) return;
    if (!liveComplaint?.status) return;
    const now = Date.now();
    const withinCooldown =
      typeof lastHodStatusEditAt === "number" &&
      now - lastHodStatusEditAt < 4000;
    if (!isEditingHodStatus && !withinCooldown) {
      setHodActionStatus(liveComplaint.status as Complaint["status"]);
    }
  }, [isHod, liveComplaint?.status, isEditingHodStatus, lastHodStatusEditAt]);

  // Prefill Dean status to Resolved on Accepted complaints so Save isn’t disabled
  useEffect(() => {
    if (
      open &&
      user?.role === "dean" &&
      liveComplaint?.status === "Accepted" &&
      !deanStatusUpdate
    ) {
      setDeanStatusUpdate("Resolved");
    }
  }, [open, user?.role, liveComplaint?.status, deanStatusUpdate]);

  // Sync Admin Action dropdown from live complaint unless the admin is actively editing
  useEffect(() => {
    if (user.role !== "admin") return;
    if (!liveComplaint?.status) return;
    const now = Date.now();
    const withinCooldown =
      typeof lastAdminStatusEditAt === "number" &&
      now - lastAdminStatusEditAt < 4000;
    if (!isEditingAdminStatus && !withinCooldown) {
      setAdminActionStatus(liveComplaint.status as Complaint["status"]);
    }
  }, [
    user.role,
    liveComplaint?.status,
    open,
    isEditingAdminStatus,
    lastAdminStatusEditAt,
  ]);

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

  // Handle Dean status update for accepted complaints
  const handleDeanStatusUpdate = async () => {
    if (!liveComplaint || !deanStatusUpdate) return;

    // Map UI selection to backend status ("Close" -> "Closed")
    const outgoingStatus =
      deanStatusUpdate === "Close" ? ("Closed" as const) : deanStatusUpdate;

    // dean status update initiated - debug logs removed

    setIsLoading(true);
    try {
      // Update complaint status in backend
      const result = await updateComplaintStatusApi(
        liveComplaint.id,
        outgoingStatus,
        deanStatusNote || undefined
      );
      // Merge the returned complaint if available for immediate UI sync
      try {
        if (result && result.complaint) {
          const mapped = mapToClientComplaint(result.complaint, liveComplaint);
          if (mapped) setLiveComplaint(mapped);
        }
      } catch (_) {
        // ignore mapping errors
      }

      // Rely on backend to create the ActivityLog entry to avoid duplicates

      // Ensure local state reflects new status even if mapping above didn't run
      setLiveComplaint((prev) =>
        prev
          ? {
              ...prev,
              status: outgoingStatus as Complaint["status"],
              lastUpdated: new Date(),
            }
          : prev
      );

      // Reset form
      setDeanStatusUpdate("");
      setDeanStatusNote("");

      // Notify parent component
      onUpdate?.(liveComplaint.id, {
        status: outgoingStatus as Complaint["status"],
        lastUpdated: new Date(),
      });

      // Immediately refetch logs so timeline shows the update without delay
      try {
        const freshLogs = await getActivityLogsForComplaint(liveComplaint.id);
        setLogs(freshLogs as ActivityLog[]);
      } catch (_) {
        // ignore log fetch errors
      }

      // Dispatch event for real-time updates
      window.dispatchEvent(
        new CustomEvent("complaint:status-changed", {
          detail: {
            id: liveComplaint.id,
            status: outgoingStatus,
            newStatus: outgoingStatus,
            note: deanStatusNote || undefined,
            byRole: "dean",
            at: Date.now(),
          },
        })
      );

      toast({
        title: "Status Updated Successfully",
        description: `Complaint status changed to ${outgoingStatus}. ${
          outgoingStatus === "Resolved"
            ? "The complaint will now appear in the Resolved tab."
            : outgoingStatus === "Closed"
            ? "The complaint will now appear in the Rejected tab."
            : ""
        }`,
      });
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Failed to update status";
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

  // Ownership check: determine if the current logged-in user is the assignee/recipient
  const isOwner = (() => {
    try {
      if (!user || !liveComplaint) return false;
      // Prefer stable id-based recipient match when available
      if (
        liveComplaint.recipientId &&
        String(liveComplaint.recipientId) === String(user.id)
      )
        return true;
      // Fall back to matching by full name / display name
      const userName = (
        user.fullName ||
        user.name ||
        (user as unknown as { username?: string }).username ||
        ""
      ).trim();
      if (!userName) return false;
      if (typeof liveComplaint.assignedStaff === "string") {
        if (liveComplaint.assignedStaff.trim() === userName) return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  })();

  // Build timeline with dynamic messages based on routing flow and actions and activity logs
  const submittedByName = liveComplaint.submittedBy || "Student";
  const staffName = getStaffDisplay(liveComplaint.assignedStaff);
  const roleLower = (liveComplaint.assignedByRole || "").toLowerCase();
  const path = Array.isArray(liveComplaint.assignmentPath)
    ? liveComplaint.assignmentPath.map((r) => String(r).toLowerCase())
    : [];
  const viaHod =
    roleLower === "hod" ||
    roleLower === "hod" ||
    path.includes("hod") ||
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
      case "Accepted":
        return <Clock className="h-4 w-4" />;
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
  // Filter for Dean-only status updates to students (no staff interruptions)
  const sortedLogs = [...logs].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  // Filter logs for student timeline: Dean updates, system actions, and student submissions
  const studentVisibleLogs = sortedLogs.filter((log) => {
    const action = log.action || "";
    const role = String(log.role || "").toLowerCase();

    // Include HoD rich updates and accept entries
    if (
      /^(HOD update: Status changed to|Complaint accepted by HOD)/i.test(action)
    ) {
      return true;
    }

    // Include Dean, HoD and Admin status updates
    const statusMatch = action.match(/status updated to\s+(.+)/i);
    if (
      statusMatch &&
      (role === "dean" || role === "admin" || role === "hod")
    ) {
      return true;
    }

    // Include Staff updates that students should see (accept/start work, resolve, close)
    if (statusMatch && role === "staff") {
      const s = String(statusMatch[1] || "")
        .trim()
        .toLowerCase();
      if (s === "in progress" || s === "resolved" || s === "closed") {
        return true;
      }
    }

    // Include explicit HoD terminal actions (Resolved/Closed/Rejected/Reopened by HOD)
    if (/(resolved|closed|rejected|reopened) by hod/i.test(action)) {
      return true;
    }

    // Include HoD assignment/reassignment human-readable logs
    if (/^(Assigned by HOD|Reassigned by HOD)/i.test(action)) {
      return true;
    }

    // Include approval logs (when HoD/Dean accepts complaints)
    if (
      action.match(/complaint approved/i) &&
      (role === "hod" || role === "dean" || role === "admin")
    ) {
      return true;
    }

    // Include student submissions
    if (action.includes("Complaint Submitted") && role === "student") {
      return true;
    }

    return false;
  });

  type Consolidated = {
    lastTime?: Date;
    role?: string;
    byName?: string;
    descs: string[];
  };
  const byStatus = new Map<TimelineEntry["label"], Consolidated>();
  const normalizeStatus = (s: string): TimelineEntry["label"] => {
    const norm = s.toLowerCase();
    if (norm === "accepted") return "Accepted";
    if (norm === "in progress") return "In Progress";
    if (norm === "resolved") return "Resolved";
    if (norm === "closed") return "Closed";
    if (norm === "pending") return "Pending";
    return (s.charAt(0).toUpperCase() + s.slice(1)) as TimelineEntry["label"];
  };

  // Track if complaint is resolved to prevent further conflicting updates
  let isResolved = false;
  // Track if we've already added an explicit Accepted entry (from approval logs)
  let hasAcceptedEntry = false;

  for (const log of studentVisibleLogs) {
    // Handle approval logs (HoD/Dean acceptance)
    if (/^complaint approved$/i.test(log.action || "")) {
      const roleNorm = String(log.role || "").toLowerCase();
      if (
        roleNorm === "hod" ||
        roleNorm === "hod" ||
        roleNorm === "dean" ||
        roleNorm === "admin"
      ) {
        const time = new Date(log.timestamp);
        const details = (log.details || {}) as Record<string, unknown>;
        const userObj =
          (log as unknown as { user?: { name?: string; email?: string } })
            .user || {};
        const byName = userObj.name || userObj.email || undefined;
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
          desc: byName
            ? `${byName}${approverNote ? ": " + approverNote : ""}`
            : approverNote,
        });
        hasAcceptedEntry = true;
      }
      continue;
    }

    // Handle new HoD rich actions: show as standalone entries
    const hodUpdateMatch = (log.action || "").match(
      /^HOD update: Status changed to\s+(.+)/i
    );
    if (hodUpdateMatch) {
      const time = new Date(log.timestamp);
      const details = (log.details || {}) as Record<string, unknown>;
      const rawDesc =
        typeof details.description === "string"
          ? details.description.trim()
          : "";
      timelineEntries.push({
        key: `hodupdate|${time.toISOString()}|${hodUpdateMatch[1]}`,
        label: normalizeStatus((hodUpdateMatch[1] || "").trim()),
        role: log.role || "hod",
        icon: statusIcon(normalizeStatus((hodUpdateMatch[1] || "").trim())),
        time,
        desc: rawDesc,
      });
      continue;
    }

    if (/^Complaint accepted by HOD/i.test(log.action || "")) {
      if (hasAcceptedEntry) {
        continue;
      }
      const time = new Date(log.timestamp);
      const details = (log.details || {}) as Record<string, unknown>;
      const rawDesc =
        typeof details.description === "string"
          ? details.description.trim()
          : "";
      timelineEntries.push({
        key: `acceptedbyhod|${time.toISOString()}`,
        label: "Accepted",
        role: log.role || "hod",
        icon: <CheckCircle className="h-4 w-4 text-success" />,
        time,
        desc: rawDesc,
      });
      hasAcceptedEntry = true;
      continue;
    }

    if (/^Accepted by HOD/i.test(log.action || "")) {
      if (hasAcceptedEntry) {
        continue;
      }
      const time = new Date(log.timestamp);
      const details = (log.details || {}) as Record<string, unknown>;
      const rawDesc =
        typeof details.description === "string"
          ? details.description.trim()
          : "";
      timelineEntries.push({
        key: `acceptedbyhod2|${time.toISOString()}`,
        label: "Accepted",
        role: log.role || "hod",
        icon: <CheckCircle className="h-4 w-4 text-success" />,
        time,
        desc: rawDesc,
      });
      hasAcceptedEntry = true;
      continue;
    }

    // HoD assignment/reassignment entries
    if (/^(Assigned by HOD|Reassigned by HOD)/i.test(log.action || "")) {
      const time = new Date(log.timestamp);
      const details = (log.details || {}) as Record<string, unknown>;
      const rawDesc =
        typeof details.description === "string"
          ? details.description.trim()
          : "";
      timelineEntries.push({
        key: `hodassign|${time.toISOString()}|${rawDesc}`,
        label: "Assigned",
        role: log.role || "hod",
        icon: <UserCheck className="h-4 w-4" />,
        time,
        desc: rawDesc,
      });
      continue;
    }

    // HoD reopen entries
    if (/^Complaint reopened by HOD/i.test(log.action || "")) {
      const time = new Date(log.timestamp);
      const details = (log.details || {}) as Record<string, unknown>;
      const rawDesc =
        typeof details.description === "string"
          ? details.description.trim()
          : "";
      timelineEntries.push({
        key: `hodreopen|${time.toISOString()}`,
        label: "Pending",
        role: log.role || "hod",
        icon: <Clock className="h-4 w-4" />,
        time,
        desc: rawDesc,
      });
      continue;
    }

    // HoD terminal entries (Resolved/Closed/Rejected by HOD)
    if (/^Complaint resolved by HOD/i.test(log.action || "")) {
      const time = new Date(log.timestamp);
      const details = (log.details || {}) as Record<string, unknown>;
      const rawDesc =
        typeof details.description === "string"
          ? details.description.trim()
          : "";
      timelineEntries.push({
        key: `hodresolved|${time.toISOString()}`,
        label: "Resolved",
        role: log.role || "hod",
        icon: statusIcon("Resolved"),
        time,
        desc: rawDesc,
      });
      // Mark as resolved to avoid conflicting later entries
      isResolved = true;
      continue;
    }
    if (/^Complaint (closed|rejected) by HOD/i.test(log.action || "")) {
      const time = new Date(log.timestamp);
      const details = (log.details || {}) as Record<string, unknown>;
      const rawDesc =
        typeof details.description === "string"
          ? details.description.trim()
          : "";
      timelineEntries.push({
        key: `hodclosed|${time.toISOString()}`,
        label: "Closed",
        role: log.role || "hod",
        icon: statusIcon("Closed"),
        time,
        desc: rawDesc,
      });
      continue;
    }

    const m = (log.action || "").match(/status updated to\s+(.+)/i);
    if (!m) continue;

    const status = normalizeStatus((m[1] || "").trim());

    // Skip if already resolved and trying to add conflicting status
    if (isResolved && (status === "In Progress" || status === "Accepted")) {
      continue;
    }

    // Mark as resolved when we encounter it
    if (status === "Resolved") {
      isResolved = true;
    }

    const time = new Date(log.timestamp);
    const details = (log.details || {}) as Record<string, unknown>;
    const rawDesc =
      typeof details.description === "string" ? details.description.trim() : "";
    const parts = rawDesc ? rawDesc.split("\n").filter(Boolean) : [];

    const cur = byStatus.get(status) || ({ descs: [] } as Consolidated);
    const userObj =
      (log as unknown as { user?: { name?: string; email?: string } }).user ||
      {};
    const byName = userObj.name || userObj.email || undefined;

    // Only keep the latest update for each status
    if (!cur.lastTime || time > cur.lastTime) {
      cur.lastTime = time;
      cur.byName = byName || cur.byName;
    }
    cur.role = log.role || "admin"; // Preserve actual role (admin or dean)
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

    // If we already have an explicit Accepted entry, merge its descriptions and skip adding another
    if (status === "Accepted" && hasAcceptedEntry) {
      if (finalDesc) {
        const existingAccepted = timelineEntries.find(
          (e) => e.label === "Accepted"
        );
        if (existingAccepted) {
          existingAccepted.desc = existingAccepted.desc
            ? `${existingAccepted.desc}${finalDesc ? "\n" + finalDesc : ""}`
            : finalDesc;
        }
      }
      continue;
    }
    timelineEntries.push({
      key: `status|${status}`,
      label: status,
      role: grp.role || "staff",
      icon: statusIcon(status),
      time: grp.lastTime,
      desc: grp.byName
        ? `${grp.byName}${finalDesc ? ":\n" + finalDesc : ""}`
        : finalDesc,
    });
  }

  // Optional: if current status has no corresponding log, add a synthetic entry at lastUpdated
  // Only add synthetic entry for non-Resolved statuses since Resolved should always have a log
  if (
    liveComplaint.lastUpdated &&
    liveComplaint.status &&
    liveComplaint.status !== "Resolved"
  ) {
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
        // Attribute synthetic entry to the most likely actor
        role:
          (liveComplaint.assignedByRole as string) ||
          (liveComplaint.assignedStaffRole as string) ||
          "staff",
        icon: statusIcon(liveComplaint.status),
        time: lastUpdatedDate,
        desc: "",
      });
    }
  }

  // development logs removed for timeline

  // Ensure one entry per status, chronologically sorted with logical order
  const statusOrder = [
    "Submitted",
    "Assigned",
    "Accepted",
    "In Progress",
    "Resolved",
    "Closed",
  ];
  const seen = new Set<string>();

  const timelineSteps = timelineEntries
    .filter((e) => {
      const key = e.key || `${e.label}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      // First sort by logical status order
      const aOrder = statusOrder.indexOf(a.label);
      const bOrder = statusOrder.indexOf(b.label);
      if (aOrder !== -1 && bOrder !== -1 && aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      // Then by timestamp
      return (a.time?.getTime?.() || 0) - (b.time?.getTime?.() || 0);
    });

  // development logs removed for timeline steps

  // Direct-to-admin detection for scoping Admin Action
  const isDirectToAdmin = (() => {
    const submittedTo = String(liveComplaint?.submittedTo || "").toLowerCase();
    const src = String(liveComplaint?.sourceRole || "").toLowerCase();
    const assignedBy = String(
      liveComplaint?.assignedByRole || ""
    ).toLowerCase();
    return (
      submittedTo === "admin" || (src === "student" && assignedBy === "admin")
    );
  })();

  // Derived flags and views
  const hideHodPanels = Boolean(
    hideHodActionsIfAssigned &&
      isHod &&
      liveComplaint &&
      Array.isArray(liveComplaint.assignmentPath) &&
      liveComplaint.assignmentPath.some(
        (r) => String(r).toLowerCase() === "staff"
      )
  );

  // HoD Actions should be hidden only when complaint is resolved or closed
  const hideHodActions = Boolean(
    isHod &&
      liveComplaint &&
      (liveComplaint.status === "Resolved" ||
        liveComplaint.status === "Closed" ||
        // Additionally hide for Assigned-to-staff view when requested by parent (HOD Assign tab)
        (hideHodActionsIfAssigned &&
          ((Array.isArray(liveComplaint.assignmentPath) &&
            liveComplaint.assignmentPath.some(
              (r) => String(r).toLowerCase() === "staff"
            )) ||
            // Fallback: if assignedStaff exists, treat as delegated to staff
            Boolean(liveComplaint.assignedStaff))))
  );

  // For now, summary equals full steps (can be refined to reduce granularity)
  const summarizedTimeline = timelineSteps;

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

                {liveComplaint.department && (
                  <div>
                    <Label className="text-sm font-medium">Department</Label>
                    <div className="mt-1">
                      <Badge variant="outline">
                        {liveComplaint.department}
                      </Badge>
                    </div>
                  </div>
                )}

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

        {/* HoD: Pending/Assigned actions (awaiting HoD decision) */}
        {isHod &&
          (liveComplaint.status === "Pending" ||
            liveComplaint.status === "Assigned") &&
          !hideHodPanels && (
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
                              detail: {
                                id: liveComplaint.id,
                                status: "In Progress",
                                newStatus: "In Progress",
                                note: hodNote.trim() || undefined,
                              },
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
                                detail: {
                                  id: liveComplaint.id,
                                  status: "Closed",
                                  newStatus: "Closed",
                                  note: `Rejected: ${hodRejectReason.trim()}`,
                                },
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

        {/* Dean: Pending actions removed (Accept/Reject panel hidden by request) */}

        {/* Submission Information Section (always shown) */}
        <Card>
          <CardHeader>
            <CardTitle>Submission Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveComplaint &&
              (liveComplaint.friendlyCode || liveComplaint.complaintCode) ? (
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Complaint Code
                  </Label>
                  <div className="mt-1 text-sm font-mono break-all">
                    {liveComplaint.friendlyCode || liveComplaint.complaintCode}
                  </div>
                </div>
              ) : null}

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

              {liveComplaint.recipientRole && (
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Target Role
                  </Label>
                  <Badge variant="outline" className="mt-1 capitalize">
                    {liveComplaint.recipientRole}
                  </Badge>
                </div>
              )}

              {liveComplaint.department && (
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Department
                  </Label>
                  <Badge variant="outline" className="mt-1">
                    {liveComplaint.department}
                  </Badge>
                </div>
              )}

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
                        (assignedBy === "hod" || path.includes("hod"))
                      ) {
                        return "Complaint submitted by Student, assigned by HoD.";
                      }
                      // Case 3: Student -> Dean -> HoD -> Staff
                      if (
                        src === "student" &&
                        path.includes("dean") &&
                        (assignedBy === "hod" || path.includes("hod"))
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
              {(timelineFilterMode === "summary"
                ? summarizedTimeline
                : timelineSteps
              ).map((step, idx) => (
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

        {/* HoD Action Section - Only for HoD user; shown after acceptance (Accepted/In Progress) below the timeline */}
        {isHod &&
          !hideHodActions &&
          (liveComplaint.status === "In Progress" ||
            liveComplaint.status === "Accepted") && (
            <Card id="hod-actions" className="mt-6">
              <CardHeader>
                <CardTitle>HoD Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="mb-2">Update Status</Label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={hodActionStatus}
                    onChange={(e) => {
                      setHodActionStatus(e.target.value as Complaint["status"]);
                      setIsEditingHodStatus(true);
                      setLastHodStatusEditAt(Date.now());
                    }}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    {/* HoD and Staff can resolve now */}
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
                  onClick={async () => {
                    if (!liveComplaint) return;
                    setIsLoading(true);
                    try {
                      // HOD update started - debug logs removed
                      const result = await updateComplaintStatusApi(
                        liveComplaint.id,
                        hodActionStatus as
                          | "Pending"
                          | "In Progress"
                          | "Resolved"
                          | "Closed",
                        hodStatusNote.trim() || undefined
                      );
                      // HOD update result received - debug logs removed
                      // Reflect new status locally
                      setLiveComplaint((prev) =>
                        prev
                          ? {
                              ...prev,
                              status: hodActionStatus,
                              lastUpdated: new Date(),
                            }
                          : prev
                      );
                      toast({
                        title: "Status updated",
                        description: `Updated to ${hodActionStatus}.`,
                      });
                      setHodStatusNote("");
                      setIsEditingHodStatus(false);
                      setLastHodStatusEditAt(Date.now());
                      try {
                        const freshLogs = await getActivityLogsForComplaint(
                          liveComplaint.id
                        );
                        setLogs(freshLogs as ActivityLog[]);
                      } catch {
                        // ignore errors while refreshing logs
                      }
                      window.dispatchEvent(
                        new CustomEvent("complaint:status-changed", {
                          detail: {
                            id: liveComplaint.id,
                            status: hodActionStatus,
                            newStatus: hodActionStatus,
                            note: hodStatusNote.trim() || undefined,
                          },
                        })
                      );
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          )}

        {/* Dean Action Section - Only for Dean user; hidden when already Resolved/Closed */}
        {showDeanActionSection && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Dean Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800">
                  <Settings className="h-4 w-4 inline mr-2" />
                  Select a status and optionally add a note for the student.
                  Visible only while complaint is In Progress.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status-select">Update Status</Label>
                  <select
                    id="status-select"
                    className={`w-full px-3 py-2 border bg-background rounded-md text-sm ${
                      deanStatusUpdate
                        ? "border-green-500 bg-green-50"
                        : "border-input"
                    }`}
                    value={deanStatusUpdate}
                    onChange={(e) => setDeanStatusUpdate(e.target.value)}
                  >
                    <option value="">Select Status</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Close">Close</option>
                  </select>
                  {deanStatusUpdate && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ Ready to change status to "{deanStatusUpdate}"
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status-note">Optional Note</Label>
                  <Textarea
                    id="status-note"
                    placeholder="Add a note explaining the status change..."
                    value={deanStatusNote}
                    onChange={(e) => setDeanStatusNote(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Students will see this status and note in their timeline
                    until the complaint is resolved.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleDeanStatusUpdate}
                  disabled={!deanStatusUpdate || isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Settings className="h-4 w-4 mr-2 animate-spin" />
                      Updating Status...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Save Status Change
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeanStatusUpdate("");
                    setDeanStatusNote("");
                  }}
                  disabled={isLoading}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Staff Action section: for Staff while working on a complaint (only when owner) */}
        {user.role === "staff" &&
          isOwner &&
          ["Accepted", "In Progress", "Pending"].includes(
            String(liveComplaint?.status || "")
          ) && (
            <Card>
              <CardHeader>
                <CardTitle>Staff Action</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="mb-2">Status</Label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={staffActionStatus}
                    onChange={(e) =>
                      setStaffActionStatus(
                        e.target.value as Complaint["status"]
                      )
                    }
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
                <div>
                  <Label className="mb-2">Note (optional)</Label>
                  <Textarea
                    className="w-full border rounded px-3 py-2"
                    placeholder="Add a brief note for the student (optional)…"
                    value={staffStatusNote}
                    onChange={(e) =>
                      setStaffStatusNote(e.target.value.slice(0, 1000))
                    }
                    rows={3}
                  />
                  <div className="text-xs text-muted-foreground mt-1 text-right">
                    {staffStatusNote.length}/1000
                  </div>
                </div>
                <Button
                  className="mt-2 w-full"
                  disabled={isLoading}
                  onClick={async () => {
                    if (!liveComplaint) return;
                    setIsLoading(true);
                    try {
                      const newStatus = staffActionStatus as
                        | "Pending"
                        | "In Progress"
                        | "Resolved"
                        | "Closed";
                      await updateComplaintStatusApi(
                        liveComplaint.id,
                        newStatus,
                        staffStatusNote.trim() || undefined
                      );
                      setLiveComplaint((prev) =>
                        prev
                          ? {
                              ...prev,
                              status: newStatus,
                              lastUpdated: new Date(),
                            }
                          : prev
                      );
                      setStaffStatusNote("");
                      toast({
                        title: "Status updated",
                        description: `Updated to ${newStatus}.`,
                      });
                      try {
                        const freshLogs = await getActivityLogsForComplaint(
                          liveComplaint.id
                        );
                        setLogs(freshLogs as ActivityLog[]);
                      } catch {
                        // ignore
                      }
                      onUpdate?.(liveComplaint.id, {
                        status: newStatus,
                        lastUpdated: new Date(),
                      });
                      window.dispatchEvent(
                        new CustomEvent("complaint:status-changed", {
                          detail: {
                            id: liveComplaint.id,
                            status: newStatus,
                            newStatus: newStatus,
                            note: staffStatusNote.trim() || undefined,
                            byRole: "staff",
                            at: Date.now(),
                          },
                        })
                      );
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          )}

        {/* Only show these sections if assigned */}
        {isAssigned && (
          <>
            {/* End-user: submit feedback when resolved and no feedback yet */}
            {user.role === "user" &&
              liveComplaint.status === "Resolved" &&
              !liveComplaint.feedback && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5" />
                      Submit Feedback
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Rating</Label>
                      <div className="mt-2 flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() =>
                              setFeedback({ ...feedback, rating: i + 1 })
                            }
                            className="focus:outline-none"
                            aria-label={`Rate ${i + 1} star`}
                          >
                            <Star
                              className={`h-5 w-5 ${
                                i < (feedback.rating || 0)
                                  ? "text-warning fill-current"
                                  : "text-muted-foreground"
                              }`}
                            />
                          </button>
                        ))}
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({feedback.rating}/5)
                        </span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Comment</Label>
                      <Textarea
                        placeholder="Share your experience..."
                        value={feedback.comment}
                        onChange={(e) =>
                          setFeedback({
                            ...feedback,
                            comment: e.target.value.slice(0, 1000),
                          })
                        }
                        rows={3}
                      />
                      <div className="text-xs text-muted-foreground mt-1 text-right">
                        {feedback.comment.length}/1000
                      </div>
                    </div>
                    <Button
                      onClick={handleFeedbackSubmit}
                      disabled={isLoading || feedback.rating === 0}
                      className="w-full"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Submit Feedback
                    </Button>
                  </CardContent>
                </Card>
              )}

            {/* Duplicate HoD Actions removed; unified above under timeline */}

            {/* Duplicate Dean Actions panel removed; unified above under timeline */}

            {/* Admin Action section: for Admin after acceptance (In Progress), similar to HoD */}
            {user.role === "admin" &&
              (liveComplaint?.status === "Accepted" ||
                liveComplaint?.status === "In Progress") && (
                <Card>
                  <CardHeader>
                    <CardTitle>Admin Action</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="mb-2">Status</Label>
                      <select
                        className="w-full border rounded px-3 py-2"
                        value={adminActionStatus}
                        onChange={(e) => {
                          setIsEditingAdminStatus(true);
                          setLastAdminStatusEditAt(Date.now());
                          setAdminActionStatus(
                            e.target.value as Complaint["status"]
                          );
                        }}
                      >
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </div>
                    <div>
                      <Label className="mb-2">
                        Description Note (optional)
                      </Label>
                      <Textarea
                        className="w-full border rounded px-3 py-2"
                        placeholder="Add an optional note visible to the user..."
                        value={adminStatusNote}
                        onChange={(e) =>
                          setAdminStatusNote(e.target.value.slice(0, 1000))
                        }
                        rows={3}
                      />
                      <div className="text-xs text-muted-foreground mt-1 text-right">
                        {adminStatusNote.length}/1000
                      </div>
                    </div>
                    <Button
                      className="mt-2 w-full"
                      disabled={isLoading}
                      onClick={async () => {
                        if (!liveComplaint) return;
                        setIsLoading(true);
                        const newStatus = adminActionStatus as
                          | "Pending"
                          | "In Progress"
                          | "Resolved"
                          | "Closed";
                        try {
                          await updateComplaintStatusApi(
                            liveComplaint.id,
                            newStatus,
                            adminStatusNote.trim() || undefined
                          );
                          toast({
                            title: "Status updated",
                            description: `Updated to ${newStatus}.`,
                          });
                          setLiveComplaint((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  status: newStatus,
                                  lastUpdated: new Date(),
                                }
                              : prev
                          );
                          // Reset editing guard and note after a successful update
                          setIsEditingAdminStatus(false);
                          setAdminStatusNote("");
                          // Immediately refresh activity logs so the timeline updates without delay
                          try {
                            const freshLogs = await getActivityLogsForComplaint(
                              liveComplaint.id
                            );
                            setLogs(freshLogs as ActivityLog[]);
                          } catch {
                            // ignore log fetch errors
                          }
                          // Notify parent (page) so tabs/lists can react (e.g., move to Resolved/Rejected)
                          onUpdate?.(liveComplaint.id, {
                            status: newStatus,
                            lastUpdated: new Date(),
                          });
                          // Dispatch cross-app event
                          window.dispatchEvent(
                            new CustomEvent("complaint:status-changed", {
                              detail: {
                                id: liveComplaint.id,
                                status: newStatus,
                                newStatus: newStatus,
                                note: adminStatusNote.trim() || undefined,
                                byRole: "admin",
                                at: Date.now(),
                              },
                            })
                          );
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Update
                    </Button>
                  </CardContent>
                </Card>
              )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
