import React, { useState, ReactNode, useContext, createContext } from "react";
import { submitComplaintApi } from "../lib/api";
import { Complaint } from "../components/ComplaintCard";

type ComplaintContextType = {
  complaints: Complaint[];
  addComplaint: (
    complaint: Omit<
      Complaint,
      "id" | "status" | "submittedDate" | "lastUpdated"
    >
  ) => Promise<Complaint>;
  updateComplaint: (id: string, updates: Partial<Complaint>) => void;
};

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
      // Ensure the complaint has all required fields for the API
      const savedComplaint = await submitComplaintApi({
        ...complaint,
        department: complaint.category, // Map category to department for backend
        // Optionally add default values for omitted fields if needed
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
