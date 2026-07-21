import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, EmptyState, PageHeader } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { useCurrentTenant } from "@/hooks/use-current-tenant";
import { listReports } from "@/lib/reports.functions";
import { pingLocation } from "@/lib/collectors.functions";
import { relativeTime } from "@/lib/format";
import { Truck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/jobs")({
  component: JobsPage,
});

function JobsPage() {
  const { current } = useCurrentTenant();
  const listFn = useServerFn(listReports);
  const pingFn = useServerFn(pingLocation);

  const q = useQuery({
    queryKey: ["jobs", current?.tenant.id],
    enabled: !!current,
    queryFn: () => listFn({ data: { tenantId: current!.tenant.id, scope: "assigned", limit: 50 } }),
  });

  // Periodic GPS ping while collector is on the jobs page
  useEffect(() => {
    if (!current || !navigator.geolocation) return;
    let cancel = false;
    const send = () => {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          if (cancel) return;
          pingFn({
            data: {
              tenantId: current.tenant.id,
              lat: p.coords.latitude,
              lng: p.coords.longitude,
              heading: p.coords.heading ?? undefined,
            },
          }).catch(() => {});
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8_000 },
      );
    };
    send();
    const id = setInterval(send, 60_000);
    return () => {
      cancel = true;
      clearInterval(id);
    };
  }, [current, pingFn]);

  if (!current) return <AppShell><p>Select a municipality.</p></AppShell>;

  return (
    <AppShell>
      <PageHeader title="My jobs" description="Reports assigned to you. Your location is shared while this page is open." />
      {q.data && q.data.length === 0 ? (
        <EmptyState icon={Truck} title="No jobs yet" description="You'll see assigned reports appear here." />
      ) : (
        <div className="grid gap-3">
          {(q.data ?? []).map((r: any) => (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <Link
                  to="/reports/$reportId"
                  params={{ reportId: r.id }}
                  className="min-w-0 flex-1"
                >
                  <p className="truncate font-medium">{r.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.address ?? `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`} · {relativeTime(r.created_at)}
                  </p>
                </Link>
                <StatusBadge status={r.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}