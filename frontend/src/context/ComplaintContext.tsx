/* eslint-disable react-refresh/only-export-components */
import React, { useState, ReactNode, useContext, createContext } from "react";
import { submitComplaintApi } from "../lib/api";
import type { Complaint as APIComplaintPayload } from "../lib/api";
import { Complaint } from "../components/ComplaintCard";

// Input shape for creating a complaint from UI
type NewComplaintInput = Omit<
  Complaint,
  "id" | "status" | "submittedDate" | "lastUpdated" | "submittedBy"
> & {
  recipientStaffId?: string;
  recipientHodId?: string;
  recipientRole?: "staff" | "hod" | "dean" | "admin" | null;
  recipientId?: string | null;
  isAnonymous?: boolean;
  // Allow form-extra keys; they will be ignored by API mapping if not used
  [key: string]: unknown;
};

type ComplaintContextType = {
  complaints: Complaint[];
  addComplaint: (complaint: NewComplaintInput) => Promise<Complaint>;
  updateComplaint: (id: string, updates: Partial<Complaint>) => void;
};

const ComplaintContext = createContext<ComplaintContextType | undefined>(
  undefined
);

export const useComplaints = () => {
  const ctx = useContext(ComplaintContext);
  if (!ctx) {
    // Safe fallback: allow pages to function even if provider isn't mounted (e.g., isolated renders)
    if (typeof console !== "undefined") {
      console.warn(
        "useComplaints used without ComplaintProvider. Using no-op fallback."
      );
    }
    return {
      complaints: [],
      addComplaint: async (complaint: NewComplaintInput) => {
        // Mirror provider behavior by delegating to API and mapping category->department
        const deadlineIso =
          complaint.deadline instanceof Date
            ? complaint.deadline.toISOString()
            : undefined;
        const submittedToNorm = ((): "admin" | "dean" | "hod" | undefined => {
          const v = complaint.submittedTo;
          if (!v) return undefined;
          const low = String(v).toLowerCase();
          if (low === "admin" || low === "dean" || low === "hod")
            return low as typeof submittedToNorm extends () => infer R
              ? R
              : never;
          return undefined;
        })();
        const assignedByRoleNorm = (():
          | "student"
          | "hod"
          | "dean"
          | "admin"
          | undefined => {
          const r = complaint.assignedByRole;
          if (!r) return undefined;
          const low = String(r).toLowerCase();
          if (
            low === "student" ||
            low === "hod" ||
            low === "dean" ||
            low === "admin"
          )
            return low as typeof assignedByRoleNorm extends () => infer R
              ? R
              : never;
          return undefined; // exclude staff to satisfy narrower backend type definition
        })();
        const payload: APIComplaintPayload = {
          title: complaint.title,
          description: complaint.description,
          // Keep department from caller (usually user's department)
          department: complaint.department || "",
          // Backend requires category; map from selected category
          category: complaint.category,
          priority: complaint.priority,
          deadline: deadlineIso,
          evidenceFile: complaint.evidenceFile ?? null,
          submittedTo: submittedToNorm,
          sourceRole: complaint.sourceRole,
          assignedByRole: assignedByRoleNorm,
          assignmentPath: complaint.assignmentPath,
          recipientStaffId: complaint.recipientStaffId,
          recipientHodId: complaint.recipientHodId,
          recipientRole: complaint.recipientRole ?? null,
          recipientId: complaint.recipientId ?? null,
          isAnonymous:
            (complaint as { isAnonymous?: boolean; anonymous?: boolean })
              .isAnonymous ??
            (complaint as { isAnonymous?: boolean; anonymous?: boolean })
              .anonymous ??
            false,
        };
        const savedComplaint = await submitComplaintApi(payload);
        return savedComplaint as Complaint;
      },
      updateComplaint: () => {
        // no-op in fallback
      },
    } as const;
  }
  return ctx;
};

export const ComplaintProvider = ({ children }: { children: ReactNode }) => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);

  const addComplaint = async (complaint: NewComplaintInput) => {
    try {
      // Ensure the complaint has all required fields for the API
      const savedComplaint = await submitComplaintApi({
        title: complaint.title,
        description: complaint.description,
        department: complaint.department || "",
        category: complaint.category,
        priority:
          (complaint.priority as APIComplaintPayload["priority"]) || undefined,
        deadline:
          complaint.deadline instanceof Date
            ? complaint.deadline.toISOString()
            : (complaint.deadline as string | undefined),
        evidenceFile: complaint.evidenceFile ?? null,
        submittedTo: (() => {
          const v = complaint.submittedTo;
          if (!v) return undefined;
          const low = String(v).toLowerCase();
          if (low === "admin" || low === "dean" || low === "hod")
            return low as "admin" | "dean" | "hod";
          return undefined;
        })(),
        sourceRole: (() => {
          const r = complaint.sourceRole;
          if (!r) return undefined;
          const low = String(r).toLowerCase();
          if (
            low === "student" ||
            low === "staff" ||
            low === "hod" ||
            low === "dean" ||
            low === "admin"
          )
            return low as "student" | "staff" | "hod" | "dean" | "admin";
          return undefined;
        })(),
        assignedByRole: (() => {
          const r = complaint.assignedByRole;
          if (!r) return undefined;
          const low = String(r).toLowerCase();
          if (
            low === "student" ||
            low === "hod" ||
            low === "dean" ||
            low === "admin"
          )
            return low as "student" | "hod" | "dean" | "admin";
          return undefined;
        })(),
        assignmentPath: complaint.assignmentPath,
        recipientStaffId: complaint.recipientStaffId,
        recipientHodId: complaint.recipientHodId,
        recipientRole: complaint.recipientRole ?? null,
        recipientId: complaint.recipientId ?? null,
        isAnonymous:
          (complaint as { isAnonymous?: boolean; anonymous?: boolean })
            .isAnonymous ??
          (complaint as { isAnonymous?: boolean; anonymous?: boolean })
            .anonymous ??
          false,
      });
      setComplaints((prev) => [savedComplaint, ...prev]);
      return savedComplaint;
    } catch (error) {
      // Optionally handle error (e.g., show toast)
      console.error("Failed to submit complaint", error);
      throw error;
    }
  };
  const updateComplaint = (id: string, updates: Partial<Complaint>) => {
    setComplaints((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, ...updates, lastUpdated: new Date() } : c
      )
    );
  };

  return (
    <ComplaintContext.Provider
      value={{ complaints, addComplaint, updateComplaint }}
    >
      {children}
    </ComplaintContext.Provider>
  );
};
export type { Complaint };
