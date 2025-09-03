/* eslint-disable react-refresh/only-export-components */
import React, { useState, ReactNode, useContext, createContext } from "react";
import { submitComplaintApi } from "../lib/api";
import type { Complaint as APIComplaintPayload } from "../lib/api";
import { Complaint } from "../components/ComplaintCard";

type ComplaintContextType = {
  complaints: Complaint[];
  addComplaint: (
    complaint: Omit<
      Complaint,
      "id" | "status" | "submittedDate" | "lastUpdated"
    > & {
      recipientStaffId?: string;
      recipientHodId?: string;
      recipientRole?: "staff" | "hod" | "dean" | "admin" | null;
      recipientId?: string | null;
    }
  ) => Promise<Complaint>;
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
      addComplaint: async (
        complaint: Omit<
          Complaint,
          "id" | "status" | "submittedDate" | "lastUpdated"
        > & {
          recipientStaffId?: string;
          recipientHodId?: string;
          recipientRole?: "staff" | "hod" | "dean" | "admin" | null;
          recipientId?: string | null;
        }
      ) => {
        // Mirror provider behavior by delegating to API and mapping category->department
        const payload: APIComplaintPayload = {
          title: complaint.title,
          description: complaint.description,
          // Keep department from caller (usually user's department)
          department: complaint.department || "",
          // Backend requires category; map from selected category
          category: complaint.category,
          priority: complaint.priority,
          deadline: complaint.deadline,
          evidenceFile: complaint.evidenceFile ?? null,
          submittedTo: complaint.submittedTo ?? null,
          sourceRole: complaint.sourceRole,
          assignedByRole: complaint.assignedByRole ?? null,
          assignmentPath: complaint.assignmentPath,
          recipientStaffId: complaint.recipientStaffId,
          recipientHodId: complaint.recipientHodId,
          recipientRole: complaint.recipientRole ?? null,
          recipientId: complaint.recipientId ?? null,
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

  const addComplaint = async (
    complaint: Omit<
      Complaint,
      "id" | "status" | "submittedDate" | "lastUpdated"
    > & {
      recipientStaffId?: string;
      recipientHodId?: string;
      recipientRole?: "staff" | "hod" | "dean" | "admin" | null;
      recipientId?: string | null;
    }
  ) => {
    try {
      // Ensure the complaint has all required fields for the API
      const savedComplaint = await submitComplaintApi({
        ...complaint,
        // Keep the caller-provided department (user's department)
        department: complaint.department || "",
        // Ensure category is present for backend
        category: complaint.category,
        recipientStaffId: complaint.recipientStaffId,
        recipientHodId: complaint.recipientHodId,
        recipientRole: complaint.recipientRole ?? null,
        recipientId: complaint.recipientId ?? null,
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
