import Notification from "../models/notification.model.js";
import {
  broadcastNotification,
  addNotificationClient,
  removeNotificationClient,
} from "../utils/notificationStream.js";

export const listMyNotifications = async (req, res) => {
  try {
    const { page = 1, pageSize = 50 } = req.query;
    const p = Math.max(parseInt(page), 1) || 1;
    const ps = Math.min(Math.max(parseInt(pageSize), 1), 200) || 50;
    const filter = { user: req.user._id, read: false }; // unread only

    const [items, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((p - 1) * ps)
        .limit(ps)
        .lean(),
      Notification.countDocuments(filter),
    ]);
    res.status(200).json({ items, total, page: p, pageSize: ps });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const n = await Notification.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { $set: { read: true } },
      { new: true }
    );
    if (!n) return res.status(404).json({ error: "Not found" });
    res.status(200).json({ message: "Marked read", notification: n });
  } catch (e) {
    res.status(500).json({ error: "Failed to mark read" });
  }
};

export const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, read: false },
      { $set: { read: true } }
    );
    res.status(200).json({ message: "All marked read" });
  } catch (e) {
    res.status(500).json({ error: "Failed to mark all read" });
  }
};

// New unified endpoints (RESTful naming + PATCH verbs)
export const getNotifications = async (req, res) => {
  try {
    const { page = 1, pageSize = 50 } = req.query;
    const p = Math.max(parseInt(page), 1) || 1;
    const ps = Math.min(Math.max(parseInt(pageSize), 1), 200) || 50;
    const filter = { user: req.user._id, read: false }; // unread only
    const [items, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((p - 1) * ps)
        .limit(ps)
        .lean(),
      Notification.countDocuments(filter),
    ]);
    res.status(200).json({ items, total, page: p, pageSize: ps });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

export const patchNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const n = await Notification.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { $set: { read: true } },
      { new: true }
    );
    if (!n) return res.status(404).json({ error: "Not found" });
    res.status(200).json({ message: "Marked read", notification: n });
  } catch (e) {
    res.status(500).json({ error: "Failed to update notification" });
  }
};

export const patchAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, read: false },
      { $set: { read: true } }
    );
    res.status(200).json({ message: "All marked read" });
  } catch (e) {
    res.status(500).json({ error: "Failed to update notifications" });
  }
};

// SSE subscription handler (mounted in route file)
export const notificationsStream = async (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });
  addNotificationClient(res, req.user._id);
  res.write(`: connected ${Date.now()}\n\n`);
  req.on("close", () => removeNotificationClient(res));
};

// Helper for other controllers to create + broadcast with role snapshot
export async function createAndBroadcastNotification(data) {
  try {
    const doc = await Notification.create({
      ...data,
      role: data.role || data.recipientRole || undefined,
    });
    broadcastNotification({
      _id: doc._id,
      user: doc.user,
      type: doc.type,
      title: doc.title,
      message: doc.message,
      read: doc.read,
      role: doc.role,
      meta: doc.meta,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
    return doc;
  } catch (e) {
    console.warn("createAndBroadcastNotification failed", e?.message);
    return null;
  }
}
