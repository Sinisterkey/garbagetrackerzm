import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, EmptyState, PageHeader } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCurrentTenant, useMyRole } from "@/hooks/use-current-tenant";
import { listReports } from "@/lib/reports.functions";
import { getDashboardStats } from "@/lib/analytics.functions";
import { StatusBadge } from "@/components/StatusBadge";
import { relativeTime } from "@/lib/format";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  Inbox,
  PlusCircle,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const nav = useNavigate();
  const { current, loading } = useCurrentTenant();
  const { data: role } = useMyRole(current?.tenant.id);

  useEffect(() => {
    if (role === "collector") nav({ to: "/jobs", replace: true });
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
          <Button asChild>
            <Link to="/reports/new">
              <PlusCircle className="mr-2 h-4 w-4" /> New report
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Today" value={stats.data?.today ?? "—"} icon={CalendarDays} tone="bg-blue-500/10 text-blue-600" />
        <StatCard label="Open" value={stats.data?.pending ?? "—"} icon={Inbox} tone="bg-amber-500/10 text-amber-600" />
        <StatCard label="Completed (30d)" value={stats.data?.completed30d ?? "—"} icon={CheckCircle2} tone="bg-emerald-500/10 text-emerald-600" />
        <StatCard label="Avg response" value={stats.data ? `${stats.data.avgResponseHours}h` : "—"} icon={Clock} tone="bg-violet-500/10 text-violet-600" />
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent reports</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
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
                    {r.address ?? `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`} · {relativeTime(r.created_at)}
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
  tone,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </CardTitle>
        <div className={`flex h-8 w-8 items-center justify-center rounded-md ${tone}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}