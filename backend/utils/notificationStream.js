// SSE publisher with per-user filtering
// clients: Set<{ res: express.Response, userId: string }>
const clients = new Set();

export function addNotificationClient(res, userId) {
  clients.add({ res, userId: String(userId) });
}

export function removeNotificationClient(res) {
  for (const entry of clients) {
    if (entry.res === res) {
      clients.delete(entry);
      break;
    }
  }
}

export function broadcastNotification(doc) {
  if (!doc) return;
  const targetUser = String(doc.user || "");
  if (!targetUser) return;
  const payload = JSON.stringify({ type: "notification", data: doc });
  for (const entry of clients) {
    if (entry.userId !== targetUser) continue;
    try {
      entry.res.write(`data: ${payload}\n\n`);
    } catch (e) {
      try {
        entry.res.end();
      } catch {}
      clients.delete(entry);
    }
  }
}

// Heartbeat keep-alive
setInterval(() => {
  for (const entry of clients) {
    try {
      entry.res.write(`: ping ${Date.now()}\n\n`);
    } catch (e) {
      try {
        entry.res.end();
      } catch {}
      clients.delete(entry);
    }
  }
}, 25000);

export function getNotificationClientCount() {
  return clients.size;
}
