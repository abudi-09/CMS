# University of Gondar — Complaint Management System (Frontend)

React + Vite + TypeScript client for the institutional complaint management platform.

## Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS + Radix UI
- React Router, TanStack Query, Recharts

## Setup

```sh
npm install
cp .env.example .env
npm run dev
```

Dev server defaults to `http://localhost:8080` and proxies `/api` and `/uploads` to the Express backend (`http://localhost:5000`).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

## Roles

Student, Staff, HoD, Dean, and Admin dashboards with role-scoped complaint workflows.
