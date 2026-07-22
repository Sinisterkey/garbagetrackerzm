import { useEffect, useRef } from "react";
import type { ReportStatus } from "@/lib/report-status";

type Marker = { id: string; lat: number; lng: number; title?: string; status?: ReportStatus };

export function ReportMap({
  center,
  zoom = 13,
  markers = [],
  self,
  onClick,
  height = 420,
}: {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: Marker[];
  self?: { lat: number; lng: number; accuracy?: number } | null;
  onClick?: (pos: { lat: number; lng: number }) => void;
  height?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const selfLayerRef = useRef<any>(null);

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

      if (!selfLayerRef.current) selfLayerRef.current = L.layerGroup().addTo(mapRef.current);
      selfLayerRef.current.clearLayers();
      if (self) {
        const html = `
          <div style="position:relative;width:18px;height:18px;">
            <span style="position:absolute;inset:-6px;border-radius:9999px;background:#2563eb33;animation:gt-pulse 1.8s ease-out infinite;"></span>
            <span style="position:absolute;inset:0;border-radius:9999px;background:#2563eb;border:2px solid white;box-shadow:0 0 0 2px #2563eb55;"></span>
          </div>
          <style>@keyframes gt-pulse{0%{transform:scale(.6);opacity:.9}100%{transform:scale(2.2);opacity:0}}</style>`;
        const icon = L.divIcon({ className: "", html, iconSize: [18, 18], iconAnchor: [9, 9] });
        L.marker([self.lat, self.lng], { icon, zIndexOffset: 1000 })
          .addTo(selfLayerRef.current)
          .bindTooltip("You are here", { direction: "top" });
        if (typeof self.accuracy === "number" && self.accuracy > 0) {
          L.circle([self.lat, self.lng], {
            radius: self.accuracy,
            color: "#2563eb",
            weight: 1,
            fillColor: "#2563eb",
            fillOpacity: 0.08,
          }).addTo(selfLayerRef.current);
        }
      }
    })();
    return () => {
      disposed = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng, zoom, JSON.stringify(markers), self?.lat, self?.lng, self?.accuracy]);

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