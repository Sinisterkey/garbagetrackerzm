import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Bell,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Map,
  PlusCircle,
  Settings,
  Truck,
  UserCog,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TenantSwitcher } from "./TenantSwitcher";
import { useCurrentTenant, useMyRole } from "@/hooks/use-current-tenant";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AppRole } from "@/lib/rbac";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; roles: AppRole[] };

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["resident", "administrator", "supervisor", "super_admin"] },
  { to: "/reports/new", label: "New report", icon: PlusCircle, roles: ["resident", "administrator", "supervisor", "super_admin"] },
  { to: "/jobs", label: "My jobs", icon: Truck, roles: ["collector"] },
  { to: "/map", label: "Live map", icon: Map, roles: ["collector", "administrator", "supervisor", "super_admin"] },
  { to: "/queue", label: "Dispatch", icon: ListTodo, roles: ["administrator", "supervisor", "super_admin"] },
  { to: "/admin", label: "Administration", icon: UserCog, roles: ["administrator", "supervisor", "super_admin"] },
  { to: "/notifications", label: "Notifications", icon: Bell, roles: ["resident", "collector", "administrator", "supervisor", "super_admin"] },
  { to: "/settings", label: "Settings", icon: Settings, roles: ["resident", "collector", "administrator", "supervisor", "super_admin"] },
];

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { current } = useCurrentTenant();
  const { data: role } = useMyRole(current?.tenant.id);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items = NAV.filter((n) => (role ? n.roles.includes(role) : n.to === "/dashboard"));

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[260px_1fr] bg-muted/40">
      <aside className="hidden md:flex md:flex-col border-r bg-background">
        <div className="flex h-16 items-center gap-2 border-b px-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Truck className="h-5 w-5" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold">Garbage Tracker</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Municipal ops
            </span>
          </div>
        </div>
        <div className="border-b p-3">
          <TenantSwitcher />
        </div>
        <nav className="flex-1 space-y-1 p-2">
          {items.map((n) => {
            const active = pathname === n.to || pathname.startsWith(n.to + "/");
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3">
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="flex h-16 items-center justify-between gap-2 border-b bg-background px-4 md:px-8">
          <div className="md:hidden">
            <TenantSwitcher />
          </div>
          <div className="hidden text-sm text-muted-foreground md:block">
            {current ? current.tenant.name : "No municipality selected"}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/notifications">
                <Bell className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon: Icon = Users,
  action,
}: {
  title: string;
  description?: string;
  icon?: typeof Users;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-background p-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}