export type AppRole =
  | "resident"
  | "collector"
  | "supervisor"
  | "administrator"
  | "super_admin";

export const ROLE_LABELS: Record<AppRole, string> = {
  resident: "Resident",
  collector: "Collector",
  supervisor: "Supervisor",
  administrator: "Administrator",
  super_admin: "Platform Admin",
};

export function isStaff(role: AppRole) {
  return role === "supervisor" || role === "administrator" || role === "super_admin";
}

export function homeForRole(role: AppRole): string {
  switch (role) {
    case "resident":
      return "/dashboard";
    case "collector":
      return "/jobs";
    case "supervisor":
      return "/queue";
    case "administrator":
      return "/admin";
    case "super_admin":
      return "/admin";
  }
}