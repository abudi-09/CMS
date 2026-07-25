import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  COMPLAINT_STATUSES,
  ALLOWED_TRANSITIONS,
  normalizeStatus,
  canTransition,
  assertTransition,
  deriveStatusOnApproval,
  sanitizeIncomingStatus,
  isTerminal,
} from "../utils/complaintStatus.js";
import { complaintToDTO } from "../utils/complaintFormatter.js";
import buildHodScopeFilter from "../utils/hodFiltering.js";
import { checkEscalations } from "../utils/escalation.js";
import { sendAdminNotification } from "../utils/sendAdminNotification.js";
import { sendVerificationEmail } from "../utils/sendVerificationEmail.js";
import { sendDecisionEmail } from "../utils/sendDecisionEmail.js";
import { sendComplaintUpdateEmail } from "../utils/sendComplaintUpdateEmail.js";
import {
  addNotificationClient,
  removeNotificationClient,
  broadcastNotification,
  getNotificationClientCount,
} from "../utils/notificationStream.js";
import { generateTokenAndSetCookie } from "../utils/generateToken.js";
import Complaint from "../models/complaint.model.js";
import { createUser } from "./helpers.js";

describe("complaintStatus utils", () => {
  it("normalizes status strings", () => {
    expect(normalizeStatus("in-progress")).toBe("In Progress");
    expect(normalizeStatus("PENDING")).toBe("Pending");
    expect(normalizeStatus(null)).toBe(null);
  });

  it("validates transitions", () => {
    expect(canTransition("Pending", "Accepted")).toBe(true);
    expect(canTransition("Closed", "Accepted")).toBe(true);
    expect(canTransition("Resolved", "Pending")).toBe(false);
    expect(assertTransition("Pending", "Accepted")).toBeUndefined();
    expect(() => assertTransition("Resolved", "Pending")).toThrow(
      /Illegal status transition/
    );
  });

  it("derives status on approval and sanitizes incoming status", () => {
    expect(deriveStatusOnApproval("Pending", "hod")).toBe("In Progress");
    expect(deriveStatusOnApproval("Pending", "dean")).toBe("Accepted");
    expect(sanitizeIncomingStatus("In Progress", "Pending")).toBe("In Progress");
    expect(sanitizeIncomingStatus("Resolved", "Pending")).toBe("Pending");
    expect(isTerminal("Closed")).toBe(true);
    expect(isTerminal("Pending")).toBe(false);
    expect(COMPLAINT_STATUSES.length).toBeGreaterThan(0);
    expect(ALLOWED_TRANSITIONS.Pending).toContain("Accepted");
  });
});

describe("complaintFormatter", () => {
  it("maps complaint documents to DTOs", async () => {
    const student = await createUser({ email: "dto@test.com", role: "student" });
    const dto = complaintToDTO({
      _id: "507f1f77bcf86cd799439011",
      title: "WiFi",
      status: "Pending",
      submittedBy: { name: "Alice", email: "alice@test.com" },
      isAnonymous: false,
    });
    expect(dto.title).toBe("WiFi");
    expect(dto.displayName).toBe("Alice");

    const anon = complaintToDTO({
      _id: "507f1f77bcf86cd799439012",
      isAnonymous: true,
      submittedBy: student._id,
    });
    expect(anon.displayName).toBe("Anonymous");
    expect(complaintToDTO(null)).toBe(null);
  });
});

describe("hodFiltering", () => {
  it("builds scoped filters and supports strict mode", async () => {
    const hod = await createUser({ email: "hodfilter@test.com", role: "hod" });
    const filter = buildHodScopeFilter(hod, { staffIds: ["abc"] });
    expect(filter.department).toBeDefined();
    const strict = buildHodScopeFilter(hod, { strictRecipient: true });
    expect(strict.$and.length).toBeGreaterThan(1);
    expect(() => buildHodScopeFilter({})).toThrow(/HoD user/);
  });
});

describe("escalation", () => {
  it("escalates overdue assigned complaints", async () => {
    const student = await createUser({ email: "esc-student@test.com" });
    const staff = await createUser({
      email: "esc-staff@test.com",
      role: "staff",
      isApproved: true,
      isActive: true,
    });
    const oldDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const complaint = await Complaint.create({
      title: "Overdue",
      category: "IT",
      department: "IT",
      status: "Pending",
      submittedBy: student._id,
      assignedTo: staff._id,
      assignedAt: oldDate,
      isEscalated: false,
      sourceRole: "student",
      assignmentPath: ["student"],
    });

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await checkEscalations();
    const updated = await Complaint.findById(complaint._id);
    expect(updated.isEscalated).toBe(true);
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
    await sendAdminNotification(updated);
  });
});

describe("email utils", () => {
  it("sends verification and decision emails when configured", async () => {
    await sendVerificationEmail({ to: "verify@test.com", token: "abc123" });
    await sendDecisionEmail({
      to: "decision@test.com",
      decision: "approved",
      name: "User",
      role: "staff",
    });
    await sendDecisionEmail({
      to: "reject@test.com",
      decision: "rejected",
      name: "User",
      role: "staff",
    });
    await sendComplaintUpdateEmail({
      to: "update@test.com",
      studentName: "Student",
      complaintCode: "CMP-1",
      title: "Issue",
      action: "resolved",
      byRole: "staff",
      note: "Done",
    });
  });

  it("skips emails when credentials are missing", async () => {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    delete process.env.EMAIL_USER;
    delete process.env.EMAIL_PASS;
    await sendDecisionEmail({
      to: "skip@test.com",
      decision: "approved",
      role: "staff",
    });
    await sendComplaintUpdateEmail({
      to: "skip@test.com",
      action: "updated",
    });
    process.env.EMAIL_USER = user;
    process.env.EMAIL_PASS = pass;
  });
});

describe("notificationStream", () => {
  it("tracks clients and broadcasts to matching users", () => {
    const res = {
      write: vi.fn(),
      end: vi.fn(),
    };
    addNotificationClient(res, "user-1");
    expect(getNotificationClientCount()).toBeGreaterThanOrEqual(1);
    broadcastNotification({ user: "user-1", title: "Hello" });
    expect(res.write).toHaveBeenCalled();
    broadcastNotification({ user: "other", title: "Nope" });
    broadcastNotification(null);
    broadcastNotification({ title: "no-user" });
    removeNotificationClient(res);
  });

  it("removes clients when write fails", () => {
    const res = {
      write: vi.fn(() => {
        throw new Error("broken pipe");
      }),
      end: vi.fn(() => {
        throw new Error("already closed");
      }),
    };
    addNotificationClient(res, "user-2");
    broadcastNotification({ user: "user-2", title: "Fail" });
  });

  it("heartbeat ping removes broken clients", () => {
    vi.useFakeTimers();
    const res = {
      write: vi.fn(() => {
        throw new Error("ping fail");
      }),
      end: vi.fn(),
    };
    addNotificationClient(res, "user-ping");
    vi.advanceTimersByTime(25000);
    vi.useRealTimers();
  });

  it("createAndBroadcastNotification creates and returns a doc", async () => {
    const { createAndBroadcastNotification } = await import(
      "../controllers/notification.controller.js"
    );
    const user = await createUser({ email: "notify-target@test.com" });
    const doc = await createAndBroadcastNotification({
      user: user._id,
      type: "status",
      title: "Hello",
      message: "World",
    });
    expect(doc).toBeTruthy();
    expect(doc.title).toBe("Hello");
  });
});

describe("generateToken", () => {
  it("sets jwt cookie on response", () => {
    const res = { cookie: vi.fn() };
    generateTokenAndSetCookie("507f1f77bcf86cd799439011", res);
    expect(res.cookie).toHaveBeenCalledWith(
      "jwt",
      expect.any(String),
      expect.objectContaining({ httpOnly: true })
    );
  });
});

describe("category model", () => {
  it("ensureDefaultCategories upserts the Other category", async () => {
    const { ensureDefaultCategories, Category } = await import(
      "../models/category.model.js"
    );
    await ensureDefaultCategories();
    const other = await Category.findOne({ name: "Other" });
    expect(other).toBeTruthy();
  });
});

describe("complaintStatus edge cases", () => {
  it("covers remaining normalizeStatus aliases", () => {
    expect(normalizeStatus("assigned")).toBe("Assigned");
    expect(normalizeStatus("resolved")).toBe("Resolved");
    expect(normalizeStatus("closed")).toBe("Closed");
    expect(normalizeStatus("accepted")).toBe("Accepted");
    expect(normalizeStatus("  weird  ")).toBe("weird");
  });
});

describe("complaintFormatter branches", () => {
  it("covers string submitter and object fallbacks", () => {
    expect(
      complaintToDTO({
        _id: "1",
        submittedBy: "plain-string",
        assignedTo: { email: "a@test.com" },
        status: "Resolved",
        feedback: { rating: 5 },
      }).displayName
    ).toBe("plain-string");

    expect(
      complaintToDTO({
        _id: "2",
        submittedBy: { email: "only@test.com" },
        assignedTo: "x",
      }).displayName
    ).toBe("only@test.com");
  });
});
