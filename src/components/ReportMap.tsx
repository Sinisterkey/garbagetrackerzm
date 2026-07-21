import { useEffect, useRef } from "react";
import type { ReportStatus } from "@/lib/report-status";

type Marker = { id: string; lat: number; lng: number; title?: string; status?: ReportStatus };

export function ReportMap({
  center,
  zoom = 13,
  markers = [],
  onClick,
  height = 420,
}: {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: Marker[];
  onClick?: (pos: { lat: number; lng: number }) => void;
  height?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);

  useEffect(() => {
    let disposed = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (disposed || !ref.current) return;
      if (!mapRef.current) {
        mapRef.current = L.map(ref.current).setView([center.lat, center.lng], zoom);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 19,
        }).addTo(mapRef.current);
        layerRef.current = L.layerGroup().addTo(mapRef.current);
        if (onClick) {
          mapRef.current.on("click", (e: any) =>
            onClick({ lat: e.latlng.lat, lng: e.latlng.lng }),
          );
        }
      } else {
        mapRef.current.setView([center.lat, center.lng], zoom);
      }

      layerRef.current?.clearLayers();
      for (const m of markers) {
        const color = statusColor(m.status);
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:14px;height:14px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 0 0 2px ${color}55"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        const marker = L.marker([m.lat, m.lng], { icon }).addTo(layerRef.current);
        if (m.title) marker.bindTooltip(m.title, { direction: "top" });
      }
    })();
    return () => {
      disposed = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng, zoom, JSON.stringify(markers)]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return <div ref={ref} style={{ height, width: "100%" }} className="overflow-hidden rounded-xl border" />;
}

function statusColor(status?: ReportStatus): string {
  switch (status) {
    case "submitted":
      return "#f59e0b";
    case "assigned":
    case "accepted":
    case "travelling":
    case "working":
      return "#0d9488";
    case "completed":
    case "verified":
      return "#16a34a";
    case "rejected":
    case "cancelled":
      return "#ef4444";
    default:
      return "#0d9488";
  }
}