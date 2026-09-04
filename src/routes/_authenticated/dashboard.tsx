import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, EmptyState, PageHeader } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCurrentTenant, useMyRole } from "@/hooks/use-current-tenant";
import { useSession } from "@/hooks/use-session";
import { listReports } from "@/lib/reports.functions";
import { getDashboardStats } from "@/lib/analytics.functions";
import { StatusBadge } from "@/components/StatusBadge";
import { fmtDate } from "@/lib/format";
import {
  Building2,
  CalendarClock,
  CircleCheck,
  Hourglass,
  Inbox,
  PencilLine,
  ArrowUpRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const nav = useNavigate();
  const { user } = useSession();
  const { current, loading } = useCurrentTenant();
  const { data: role } = useMyRole(current?.tenant.id);

  const displayName =
    (user?.user_metadata as Record<string, unknown> | undefined)?.full_name as string | undefined
    || user?.email?.split("@")[0]
    || "there";

  useEffect(() => {
    if (role === "collector") nav({ to: "/jobs", replace: true });
    if (role === "super_admin") nav({ to: "/admin", replace: true });
  }, [role, nav]);

  const listFn = useServerFn(listReports);
  const statsFn = useServerFn(getDashboardStats);

  const stats = useQuery({
    queryKey: ["stats", current?.tenant.id],
    enabled: !!current,
    queryFn: () => statsFn({ data: { tenantId: current!.tenant.id } }),
  });

  const mine = useQuery({
    queryKey: ["reports", current?.tenant.id, role],
    enabled: !!current,
    queryFn: () =>
      listFn({
        data: {
          tenantId: current!.tenant.id,
          scope: role === "resident" ? "mine" : "all",
          limit: 10,
        },
      }),
  });

  if (loading) return <AppShell><p className="text-sm text-muted-foreground">Loading…</p></AppShell>;

  if (!current) {
    return (
      <AppShell>
        <EmptyState
          icon={Building2}
          title="Join or create a municipality to begin"
          description="You need to belong to a municipality to submit or manage reports."
          action={
            <Button asChild>
              <Link to="/onboarding">Go to onboarding</Link>
            </Button>
          }
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title={`Welcome to ${current.tenant.name}`}
        description="Live overview of reports and operations."
        actions={
          role === "resident" ? (
            <Button asChild>
              <Link to="/reports/new">
                <PencilLine strokeWidth={1.7} className="mr-2 h-4 w-4" /> New report
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Today" value={stats.data?.today ?? "—"} icon={CalendarClock} />
        <StatCard label="Open" value={stats.data?.pending ?? "—"} icon={Inbox} />
        <StatCard label="Completed (30d)" value={stats.data?.completed30d ?? "—"} icon={CircleCheck} />
        <StatCard label="Avg response" value={stats.data ? `${stats.data.avgResponseHours}h` : "—"} icon={Hourglass} />
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent reports</CardTitle>
          <ArrowUpRight strokeWidth={1.6} className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="p-0">
          {mine.data && mine.data.length === 0 && (
            <div className="p-6 text-sm text-muted-foreground">No reports yet.</div>
          )}
          <ul className="divide-y">
            {(mine.data ?? []).map((r: any) => (
              <li key={r.id} className="flex items-center justify-between gap-4 px-6 py-3">
                <Link to="/reports/$reportId" params={{ reportId: r.id }} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.address ?? `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`} · {fmtDate(r.created_at)}
                  </p>
                </Link>
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </CardTitle>
        <Icon strokeWidth={1.4} className="h-4 w-4 text-muted-foreground/70" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}