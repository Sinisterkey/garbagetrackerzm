import type { AppRole } from "./rbac";

export const REPORT_STATUSES = [
  "submitted",
  "assigned",
  "accepted",
  "travelling",
  "working",
  "completed",
  "verified",
  "rejected",
  "cancelled",
] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const STATUS_COLORS: Record<ReportStatus, string> = {
  submitted: "bg-secondary text-secondary-foreground",
  assigned: "bg-chart-5/15 text-chart-5",
  accepted: "bg-primary/15 text-primary",
  travelling: "bg-primary/20 text-primary",
  working: "bg-accent/25 text-accent-foreground",
  completed: "bg-chart-4/20 text-chart-4",
  verified: "bg-primary text-primary-foreground",
  rejected: "bg-destructive/15 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

export const STATUS_LABELS: Record<ReportStatus, string> = {
  submitted: "Submitted",
  assigned: "Assigned",
  accepted: "Accepted",
  travelling: "En route",
  working: "In progress",
  completed: "Completed",
  verified: "Verified",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

// Explicit allowed transitions per role. Server enforces this.
export const ALLOWED_TRANSITIONS: Record<AppRole, Partial<Record<ReportStatus, ReportStatus[]>>> = {
  resident: {
    submitted: ["cancelled"],
  },
  collector: {
    assigned: ["accepted", "rejected"],
    accepted: ["travelling"],
    travelling: ["working"],
    working: ["completed"],
  },
  supervisor: {
    submitted: ["assigned", "cancelled"],
    assigned: ["assigned", "cancelled"],
    accepted: ["assigned", "cancelled"],
    completed: ["verified", "rejected", "working"],
    rejected: ["assigned"],
  },
  administrator: {
    submitted: ["assigned", "cancelled"],
    assigned: ["assigned", "cancelled"],
    accepted: ["assigned", "cancelled"],
    completed: ["verified", "rejected", "working"],
    rejected: ["assigned"],
  },
  super_admin: {
    submitted: ["assigned", "cancelled"],
    assigned: ["assigned", "cancelled"],
    accepted: ["assigned", "cancelled"],
    completed: ["verified", "rejected", "working"],
    rejected: ["assigned"],
  },
};

export function canTransition(role: AppRole, from: ReportStatus, to: ReportStatus) {
  return ALLOWED_TRANSITIONS[role]?.[from]?.includes(to) ?? false;
}