export interface BasicUserRef {
  _id?: string;
  id?: string;
  name?: string;
  fullName?: string;
  email?: string;
  role?: string;
}

export interface BackendComplaintDTO {
  id?: string;
  _id?: string;
  complaintCode?: string;
  title?: string;
  description?: string;
  category?: string;
  department?: string;
  status?: string;
  priority?: string;
  submittedBy?: BasicUserRef | string | null;
  assignedTo?: BasicUserRef | string | null;
  assignedByRole?: string | null;
  assignmentPath?: string[];
  createdAt?: string;
  updatedAt?: string;
  assignedAt?: string;
  deadline?: string;
  feedback?: { rating?: number; comment?: string } | null;
  isEscalated?: boolean;
  recipientRole?: string | null;
  recipientId?: string | null;
}

export interface UIComplaint {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  submittedBy?: string;
  assignedStaff?: string;
  submittedDate?: Date;
  lastUpdated?: Date;
  assignedDate?: Date;
  deadline?: Date;
  feedback?: { rating: number; comment: string };
  isEscalated?: boolean;
  assignmentPath: string[];
  recipientRole?: string | null;
}

export function mapBackendComplaint(dto: BackendComplaintDTO): UIComplaint {
  return {
    id: dto.id || dto._id || dto.complaintCode || "",
    title: dto.title || "Untitled Complaint",
    description: dto.description || "No description provided",
    category: dto.category || dto.department || "General",
    status: dto.status || "Pending",
    priority: dto.priority || "Medium",
    submittedBy:
      typeof dto.submittedBy === "object"
        ? dto.submittedBy?.name ||
          dto.submittedBy?.fullName ||
          dto.submittedBy?.email
        : typeof dto.submittedBy === "string"
        ? dto.submittedBy
        : undefined,
    assignedStaff:
      typeof dto.assignedTo === "object"
        ? dto.assignedTo?.name ||
          dto.assignedTo?.fullName ||
          dto.assignedTo?.email
        : typeof dto.assignedTo === "string"
        ? dto.assignedTo
        : undefined,
    submittedDate: dto.createdAt ? new Date(dto.createdAt) : undefined,
    lastUpdated: dto.updatedAt ? new Date(dto.updatedAt) : undefined,
    assignedDate: dto.assignedAt ? new Date(dto.assignedAt) : undefined,
    deadline: dto.deadline ? new Date(dto.deadline) : undefined,
    feedback: dto.feedback?.rating
      ? {
          rating: dto.feedback.rating || 0,
          comment: dto.feedback.comment || "",
        }
      : undefined,
    isEscalated: !!dto.isEscalated,
    assignmentPath: Array.isArray(dto.assignmentPath)
      ? dto.assignmentPath.filter(Boolean)
      : [],
    recipientRole: dto.recipientRole || null,
  };
}
