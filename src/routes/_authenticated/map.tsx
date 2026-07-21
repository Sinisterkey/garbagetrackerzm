import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, PageHeader } from "@/components/AppShell";
import { ReportMap } from "@/components/ReportMap";
import { useCurrentTenant } from "@/hooks/use-current-tenant";
import { listReports } from "@/lib/reports.functions";
import { listCollectorLocations } from "@/lib/collectors.functions";

export const Route = createFileRoute("/_authenticated/map")({
  component: MapPage,
});

function MapPage() {
  const { current } = useCurrentTenant();
  const listFn = useServerFn(listReports);
  const locFn = useServerFn(listCollectorLocations);

  const reports = useQuery({
    queryKey: ["map-reports", current?.tenant.id],
    enabled: !!current,
    queryFn: () => listFn({ data: { tenantId: current!.tenant.id, scope: "all", limit: 200 } }),
    refetchInterval: 30_000,
  });

  const locs = useQuery({
    queryKey: ["map-collectors", current?.tenant.id],
    enabled: !!current,
    queryFn: () => locFn({ data: { tenantId: current!.tenant.id } }),
    refetchInterval: 30_000,
  });

  if (!current) return <AppShell><p>Select a municipality.</p></AppShell>;

  const markers = [
    ...((reports.data ?? []) as any[]).map((r) => ({
      id: r.id,
      lat: r.lat,
      lng: r.lng,
      title: r.title,
      status: r.status,
    })),
    ...((locs.data ?? []) as any[]).map((l) => ({
      id: `col-${l.collector_id}`,
      lat: l.lat,
      lng: l.lng,
      title: "Collector",
    })),
  ];

  return (
    <AppShell>
      <PageHeader title="Live map" description="Open reports and current collector positions." />
      <ReportMap
        center={{ lat: current.tenant.center_lat, lng: current.tenant.center_lng }}
        zoom={current.tenant.default_zoom}
        markers={markers}
        height={640}
      />
    </AppShell>
  );
}