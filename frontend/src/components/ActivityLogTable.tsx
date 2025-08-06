import React from "react";

export interface ActivityLog {
  _id: string;
  action: string;
  user: { name: string; email: string };
  role: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

const actionIcons: Record<string, React.ReactNode> = {
  "Complaint Submitted": <span title="Submitted">📝</span>,
  "Complaint Assigned": <span title="Assigned">👤</span>,
  "Complaint Reassigned": <span title="Reassigned">🔁</span>,
  "Status Updated to Resolved": <span title="Resolved">✅</span>,
  "Status Updated to Pending": <span title="Pending">⏳</span>,
  "Status Updated to In Progress": <span title="In Progress">🚧</span>,
  "Feedback Given": <span title="Feedback">💬</span>,
};

export function ActivityLogTable({ logs }: { logs: ActivityLog[] }) {
  return (
    <div className="overflow-x-auto max-h-96">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-muted">
            <th className="px-2 py-2">Action</th>
            <th className="px-2 py-2">By (User)</th>
            <th className="px-2 py-2">Role</th>
            <th className="px-2 py-2">Time</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log._id} className="border-b">
              <td className="px-2 py-2 flex items-center gap-2">
                {actionIcons[log.action] || null}
                {log.action}
              </td>
              <td className="px-2 py-2">{log.user?.name || "Unknown"}</td>
              <td className="px-2 py-2">{log.role}</td>
              <td className="px-2 py-2">
                {new Date(log.timestamp).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
