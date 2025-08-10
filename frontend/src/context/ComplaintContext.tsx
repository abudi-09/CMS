import React, { createContext, useContext, useState, ReactNode } from "react";
import { submitComplaintApi } from "../lib/api";

export type ComplaintStatus =
  | "Unassigned"
  | "Assigned"
  | "In Progress"
  | "Resolved"
  | "Closed"
  | "Overdue"
  | "Pending";

export interface Complaint {
  id: string;
  title: string;
  description: string;
  category: string;
  priority?: "Low" | "Medium" | "High" | "Critical";
  status: ComplaintStatus;
  submittedBy: string;
  assignedStaff?: string;
  submittedDate: Date;
  lastUpdated: Date;
  evidenceFileName?: string;
  deadline?: Date;
}

interface ComplaintContextType {
  complaints: Complaint[];
  addComplaint: (
    complaint: Omit<
      Complaint,
      "id" | "status" | "submittedDate" | "lastUpdated"
    >
  ) => void;
  updateComplaint: (id: string, updates: Partial<Complaint>) => void;
}

const ComplaintContext = createContext<ComplaintContextType | undefined>(
  undefined
);

export const useComplaints = () => {
  const ctx = useContext(ComplaintContext);
  if (!ctx)
    throw new Error("useComplaints must be used within ComplaintProvider");
  return ctx;
};

export const ComplaintProvider = ({ children }: { children: ReactNode }) => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);

  const addComplaint = async (
    complaint: Omit<
      Complaint,
      "id" | "status" | "submittedDate" | "lastUpdated"
    >
  ) => {
    try {
      const savedComplaint = await submitComplaintApi(complaint);
      setComplaints((prev) => [savedComplaint, ...prev]);
    } catch (error) {
      // Optionally handle error (e.g., show toast)
      console.error("Failed to submit complaint", error);
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
