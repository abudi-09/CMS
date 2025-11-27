# Complaint Management System — Team Guideline

## Introduction

The Complaint Management System (CMS) is a role-based web platform for students and staff to submit, triage, act on, and resolve complaints. It streamlines routing (student → admin/dean/hod/staff), provides transparent status tracking, and captures audit logs, notifications, and feedback to measure service quality.

## System Workflow

1. Authentication: Users sign in and receive a session cookie.
2. Submit: Students create a complaint with title, description, category, optional evidence, priority, target recipient (admin/dean/hod/staff), and anonymity flag.
3. Intake and Routing:
   - Direct to Staff/HoD: complaint is immediately assigned and set Pending.
   - To Dean: requires a specific dean recipient and stays Pending until acceptance.
   - To Admin: goes to Admin inbox as Pending.
4. Acceptance and Assignment:
   - Dean/HoD/Admin can approve (accept) complaints. Dean acceptance moves directly to In Progress; others may remain Accepted.
   - Dean can assign to HoD (status Assigned until HoD accepts) or directly assign staff. HoD can assign staff within department.
   - Staff accepts (In Progress) or rejects (Closed) items.
5. Progress Updates: Assignees update status (In Progress → Under Review → Resolved → Closed). Notes are optional but recorded in the timeline when provided.
6. Notifications and Activity Log: Every major action posts to Notification records and ActivityLog for audit/tracking.
7. Feedback: After Resolved, the student can rate and comment; leaders and staff can mark feedback reviewed according to role rules.

## Features Overview

- Complaint submission and editing (Pending only), soft delete by student
- Role inboxes: Admin, Dean, HoD, Staff; scoped lists (e.g., dean-scoped, hod-managed)
- Assignment and reassignment: Admin/Dean/HoD to staff; Dean to HoD; role-aware reassignment
- Status updates with guardrails and department scoping
- Notifications to involved parties (submitter, recipients, leaders)
- Activity log timeline with explicit human-readable entries
- Feedback capture and hierarchical views (staff/hod/dean/admin)
- Query API for dashboards and All Complaints with role defaults and filters

## Technology Stack

- Frontend: React 18 + Vite, TypeScript, TailwindCSS, Radix UI, TanStack Query, React Router, i18next
- Backend: Node.js + Express, Mongoose/MongoDB, Cookie-based auth, CORS middleware
- Utilities: Email sending for status changes, escalation checks (hourly task), Cloudinary config present
- Testing: Frontend vitest/jest-style tests under `src/__tests__`

## Role-Based Views

- Student
  - Submit, edit recipient or content while Pending; soft delete
  - Track My Complaints; receive notifications on changes
  - Give feedback after Resolved
- Staff
  - My Assigned: accept (In Progress), reject (Closed), update status, resolve
  - See deadlines and overdue; receive feedback notifications
- HoD
  - Inbox for Pending/Assigned to HoD; accept/reject assignments
  - Assign or reassign to staff within department; view department-wide data (getHodAll)
- Dean
  - Inbox and scoped complaints strictly to the specific dean
  - Accept complaints (moves to In Progress), assign to HoD, or reject (Closed)
- Admin
  - Inbox of Pending admin-directed; full workflow list of admin-related items
  - Assign complaints to staff; approve or re-approve

## Key Endpoints (Backend)

Base: `/api`

- Auth: `/api/auth/*` (not enumerated here)
- Complaints: `/api/complaints`
  - POST `/submit` — create
  - GET `/my-complaints` — student list
  - PUT `/my/:id` — edit Pending
  - DELETE `/my/:id` — soft delete
  - PUT `/my/:id/recipient` — update recipient (strict dean validation)
  - PUT `/reassign/recipient/:id` — admin/dean/hod post-acceptance reassignment
  - GET `/all` — admin/dean (role-aware)
  - PUT `/assign/:id` — admin/dean assign to staff
  - PUT `/approve/:id` — admin/dean/hod approve (accept)
  - PUT `/dean/assign-to-hod/:id` — dean assign
  - PUT `/dean/accept/:id` — dean accept
  - PUT `/dean/reject/:id` — dean reject
  - GET `/inbox/dean|/inbox/hod|/inbox/admin|/inbox/staff` — role inboxes
  - GET `/dean/scoped` — dean strict scope
  - GET `/admin/workflow` — admin workflow list
  - PUT `/hod/assign-to-staff/:id` — hod assign
  - PUT `/hod/accept/:id` — hod accept
  - PUT `/hod/reject/:id` — hod reject
  - GET `/hod/managed` — hod managed complaints
  - GET `/hod/all` — hod grouped data
  - GET `/feedback/all` — admin feedback overview
  - GET `/feedback/my` — staff feedback
  - GET `/feedback/by-role` — hierarchical feedback
  - PUT `/feedback/reviewed/:id` — mark reviewed by role
  - PUT `/update-status/:id` — status updates by role
  - GET `/` — query with filters and role defaults
  - GET `/:id` — single complaint

Other route groups exist: `stats`, `profile`, `users`, `categories`, `notifications`, `activity-logs`, `approval`.

## Tester Checklist (Features & Expected Results)

- Submit Complaint
  - Student can submit; dean submissions require valid `recipientId` of an active dean
  - Direct-to-staff sets status Pending and 3-day default deadline
- Edit & Delete (student)
  - Only while Pending; soft delete flips `isDeleted` and hides from lists
- Assignment
  - Admin/Dean can assign complaint to staff; Dean/HOD enforce same-department rules
  - Dean assign to HoD sets status Assigned until HoD accepts
- Acceptance
  - Dean accept moves status to In Progress; HOD/Admin may set Accepted/In Progress
- Status Updates
  - Staff can update only if assigned; HoD/Dean limited to department scope; only Dean/Admin can mark Resolved
  - After Resolved, only closing is allowed
- Scoped Visibility
  - Dean lists exclude admin-directed items; dean scoped endpoints only show items targeted to/acted by that dean
  - HoD inbox shows department-specific items for that HoD
- Notifications & Logs
  - Notifications created for submitter and recipients; ActivityLog records one clear entry per action
- Feedback
  - Students can submit rating/comment post-Resolved; staff/dean/admin/hod can filter/mark reviewed per rules

## AI Agent Prompts (Ready-to-Use)

- General
  - "Explain how our system works in simple terms for a new user."
  - "Describe the main workflow of our system step by step."
- Stakeholder View
  - "Summarize how our system creates value for stakeholders (students, staff, leadership)."
- Tester View
  - "List the main features to test with expected outcomes and edge cases."
  - "Given the API responses in `getAssignedComplaints`, draft E2E cases for staff flows."
- End-User View
  - "Explain how an end user files a complaint and tracks it to resolution."
- Technical View
  - "Describe the technology stack and how frontend and backend connect in this repo."
  - "Map each backend route in `backend/routes/complaint.routes.js` to its controller behavior."

## Notes

- Escalation: `checkEscalations` runs hourly from server start; details in `backend/utils/escalation.js`.
- Anonymous complaints: names are masked in responses using `maskSubmitter`.
- Department scoping and dean/admin leakage protections are enforced across queries.

## Troubleshooting (Dev errors and fixes)

Common dev-time errors you may see in the browser console and how to resolve them:

- net::ERR_CONNECTION_REFUSED or net::ERR_CONNECTION_RESET when calling `/api/*`

  - Cause: Backend isn’t running or crashed on startup. In this repo, the server exits if `MONGO_URI` is missing/invalid.
  - Fix:
    - Create `.env` from `.env.example` and set `MONGO_URI` and `JWT_SECRET`.
    - Start the backend: npm run dev (listens on http://localhost:5000).
    - Optional quick check: GET http://localhost:5000/api/stats/test-db (public).

- 401 Unauthorized on protected endpoints

  - Cause: No auth cookie sent (not logged in) or token invalid/expired.
  - Fix:
    - Login at `/api/auth/login` (frontend uses credentials: 'include').
    - Verify cookie exists: DevTools → Application → Cookies → http://localhost:8080 → `jwt`.
    - If missing, ensure frontend origin matches CORS allowlist and proxy is configured (see `frontend/vite.config.ts`).

- 403 Forbidden on endpoints like `/api/categories`, `/api/staff/...`, `/api/stats/complaints/department`

  - Cause: Role/middleware checks or inactive account.
  - Details:
    - `protectRoute` returns 403 if the user is deactivated (`isActive === false`).
    - Route guards like `hodOnly`, `deanOnly`, `adminOnly` return 403 for role mismatch.
  - Fix:
    - Ensure you’re logged in as the correct role for the route you’re calling.
    - In DB, confirm the user is `isApproved: true` and `isActive: true` when required (e.g., HoD/Staff).

- 403 on `/api/notifications/stream` (SSE)

  - Cause: The notifications stream is protected; missing/invalid cookie or inactive account returns 401/403.
  - Fix: Ensure you’re logged in and the auth cookie is sent. Frontend opens a relative EventSource (`/api/notifications/stream`) through the Vite proxy.

- CORS issues (preflight blocked)
  - Backend allows localhost origins: 8080/8081/8082 and 5173. If you use another port, add it in `backend/middleware/cors.js`.
  - Frontend proxy forwards `/api` and `/uploads` to http://localhost:5000 (see `frontend/vite.config.ts`).

Tip: The backend uses cookie-based auth with `SameSite=strict`. localhost→localhost is considered same-site, so cookies should be included when using relative `/api/*` paths or when `credentials: 'include'` is set.
