import Notification from "../models/notification.model.js";

export const listMyNotifications = async (req, res) => {
  try {
    const { page = 1, pageSize = 50, unread = "" } = req.query;
    const p = Math.max(parseInt(page), 1) || 1;
    const ps = Math.min(Math.max(parseInt(pageSize), 1), 200) || 50;
    const filter = { user: req.user._id };
    if (String(unread).toLowerCase() === "true") filter.read = false;

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
