import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, PageHeader } from "@/components/AppShell";
import { ReportMap } from "@/components/ReportMap";
import { useCurrentTenant } from "@/hooks/use-current-tenant";
import { listReports } from "@/lib/reports.functions";
import { listCollectorLocations } from "@/lib/collectors.functions";
import { Button } from "@/components/ui/button";
import { LocateFixed, LocateOff } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/map")({
  component: MapPage,
});

function MapPage() {
  const { current } = useCurrentTenant();
  const listFn = useServerFn(listReports);
  const locFn = useServerFn(listCollectorLocations);
  const [tracking, setTracking] = useState(false);
  const [self, setSelf] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [centerOverride, setCenterOverride] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!tracking) return;
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation isn't available on this device");
      setTracking(false);
      return;
    }
    let firstFix = true;
    const id = navigator.geolocation.watchPosition(
      (p) => {
        const next = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy };
        setSelf(next);
        if (firstFix) {
          setCenterOverride({ lat: next.lat, lng: next.lng });
          firstFix = false;
        }
      },
      (err) => {
        toast.error(err.message || "Unable to get your location");
        setTracking(false);
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [tracking]);

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
      <PageHeader
        title="Live map"
        description="Open reports and current collector positions."
        actions={
          <Button
            variant={tracking ? "default" : "outline"}
            onClick={() => {
              if (tracking) {
                setTracking(false);
                setSelf(null);
              } else {
                setTracking(true);
              }
            }}
          >
            {tracking ? (
              <><LocateOff className="mr-2 h-4 w-4" /> Stop sharing</>
            ) : (
              <><LocateFixed className="mr-2 h-4 w-4" /> Show my location</>
            )}
          </Button>
        }
      />
      <ReportMap
        center={centerOverride ?? { lat: current.tenant.center_lat, lng: current.tenant.center_lng }}
        zoom={current.tenant.default_zoom}
        markers={markers}
        self={self}
        height={640}
      />
    </AppShell>
  );
}