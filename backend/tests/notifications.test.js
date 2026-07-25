import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../app.js";
import Notification from "../models/notification.model.js";
import { seedOrg, agentFor } from "./helpers.js";

async function createNotification(userId, overrides = {}) {
  return Notification.create({
    user: userId,
    type: "status",
    title: "Status update",
    message: "Your complaint status changed",
    read: false,
    ...overrides,
  });
}

describe("Notifications API", () => {
  let org;
  let notification;

  beforeEach(async () => {
    org = await seedOrg();
    notification = await createNotification(org.student._id, {
      title: "Unread notice",
    });
    await createNotification(org.student._id, {
      title: "Second notice",
      read: true,
    });
  });

  it("returns 401 for unauthenticated requests", async () => {
    const res = await request(app).get("/api/notifications");
    expect(res.status).toBe(401);
  });

  it("GET /api/notifications returns unread notifications", async () => {
    const agent = await agentFor(org.student);
    const res = await agent.get("/api/notifications");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0].title).toBe("Unread notice");
    expect(res.body.total).toBe(1);
  });

  it("GET /api/notifications/my returns legacy unread list", async () => {
    const agent = await agentFor(org.student);
    const res = await agent.get("/api/notifications/my");
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
  });

  it("PATCH /api/notifications/:id/read marks a notification read", async () => {
    const agent = await agentFor(org.student);
    const res = await agent.patch(
      `/api/notifications/${notification._id}/read`
    );
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/marked read/i);
    expect(res.body.notification.read).toBe(true);
  });

  it("PUT /api/notifications/read/:id marks read via legacy route", async () => {
    const agent = await agentFor(org.student);
    const res = await agent.put(
      `/api/notifications/read/${notification._id}`
    );
    expect(res.status).toBe(200);
    expect(res.body.notification.read).toBe(true);
  });

  it("PATCH /api/notifications/read-all marks all unread as read", async () => {
    const agent = await agentFor(org.student);
    const res = await agent.patch("/api/notifications/read-all");
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/all marked read/i);

    const list = await agent.get("/api/notifications");
    expect(list.body.items.length).toBe(0);
  });

  it("PUT /api/notifications/read-all marks all via legacy route", async () => {
    await createNotification(org.student._id, { title: "Another unread" });
    const agent = await agentFor(org.student);
    const res = await agent.put("/api/notifications/read-all");
    expect(res.status).toBe(200);

    const list = await agent.get("/api/notifications/my");
    expect(list.body.items.length).toBe(0);
  });

  it("returns 404 when marking another user's notification", async () => {
    const other = await createNotification(org.admin._id);
    const agent = await agentFor(org.student);
    const res = await agent.patch(`/api/notifications/${other._id}/read`);
    expect(res.status).toBe(404);
  });

  it("GET /api/notifications/stream returns 401 without auth", async () => {
    const res = await request(app).get("/api/notifications/stream");
    expect(res.status).toBe(401);
  });

  it("notificationsStream writes SSE headers and tracks clients", async () => {
    const { notificationsStream } = await import(
      "../controllers/notification.controller.js"
    );
    const {
      getNotificationClientCount,
      removeNotificationClient,
    } = await import("../utils/notificationStream.js");

    const listeners = {};
    const res = {
      writeHead: vi.fn(),
      write: vi.fn(),
    };
    const req = {
      user: { _id: org.student._id },
      on: (event, cb) => {
        listeners[event] = cb;
      },
    };

    const before = getNotificationClientCount();
    await notificationsStream(req, res);
    expect(res.writeHead).toHaveBeenCalled();
    expect(res.write).toHaveBeenCalled();
    expect(getNotificationClientCount()).toBe(before + 1);

    listeners.close?.();
    removeNotificationClient(res);
  });
});
