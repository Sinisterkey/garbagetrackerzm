import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ReportMap } from "@/components/ReportMap";
import { PhotoUploader } from "@/components/PhotoUploader";
import { useCurrentTenant, useMyRole } from "@/hooks/use-current-tenant";
import { createReport, listCategoriesAndPriorities } from "@/lib/reports.functions";
import { toast } from "sonner";
import { Crosshair } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports/new")({
  component: NewReport,
});

function NewReport() {
  const { current } = useCurrentTenant();
  const nav = useNavigate();
  const { data: role } = useMyRole(current?.tenant.id);

  useEffect(() => {
    if (role && role !== "resident") nav({ to: "/dashboard", replace: true });
  }, [role, nav]);

  const catFn = useServerFn(listCategoriesAndPriorities);
  const createFn = useServerFn(createReport);

  const meta = useQuery({
    queryKey: ["cat-prio", current?.tenant.id],
    enabled: !!current,
    queryFn: () => catFn({ data: { tenantId: current!.tenant.id } }),
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [priorityId, setPriorityId] = useState<string | null>(null);
  const [size, setSize] = useState<"small" | "medium" | "large" | "extra_large">("medium");
  const [urgent, setUrgent] = useState(false);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    if (!current) return;
    if (!pos) setPos({ lat: current.tenant.center_lat, lng: current.tenant.center_lng });
  }, [current, pos]);

  function useMyLocation() {
    if (!navigator.geolocation) return toast.error("Geolocation not available");
    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => toast.error(e.message),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  const create = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          tenantId: current!.tenant.id,
          title,
          description: description || undefined,
          categoryId: categoryId ?? undefined,
          priorityId: priorityId ?? undefined,
          size,
          urgent,
          lat: pos!.lat,
          lng: pos!.lng,
          address: address || undefined,
          photoPaths: photos,
        },
      }),
    onSuccess: (r: any) => {
      toast.success("Report submitted");
      nav({ to: "/reports/$reportId", params: { reportId: r.id } });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!current)
    return (
      <AppShell>
        <p>Select a municipality first.</p>
      </AppShell>
    );

  return (
    <AppShell>
      <PageHeader title="New report" description="Describe the issue and pin its exact location." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Overflowing bin at 3rd & Main"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Any details a collector should know…"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Category</Label>
                <Select value={categoryId ?? ""} onValueChange={(v) => setCategoryId(v || null)}>
                  <SelectTrigger><SelectValue placeholder="Choose category" /></SelectTrigger>
                  <SelectContent>
                    {(meta.data?.categories ?? []).map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={priorityId ?? ""} onValueChange={(v) => setPriorityId(v || null)}>
                  <SelectTrigger><SelectValue placeholder="Choose priority" /></SelectTrigger>
                  <SelectContent>
                    {(meta.data?.priorities ?? []).map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} · SLA {p.sla_minutes}m
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Size</Label>
                <Select value={size} onValueChange={(v: any) => setSize(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                    <SelectItem value="extra_large">Extra large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2 rounded-md border p-2">
                <Switch id="urgent" checked={urgent} onCheckedChange={setUrgent} />
                <Label htmlFor="urgent" className="text-sm">Urgent</Label>
              </div>
            </div>
            <div>
              <Label>Address (optional)</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div>
              <Label>Photos</Label>
              <PhotoUploader tenantId={current.tenant.id} value={photos} onChange={setPhotos} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Location</CardTitle>
            <Button size="sm" variant="outline" onClick={useMyLocation}>
              <Crosshair className="mr-2 h-4 w-4" /> Use my location
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {pos && (
              <ReportMap
                center={pos}
                zoom={15}
                markers={[{ id: "here", lat: pos.lat, lng: pos.lng, status: "submitted" }]}
                onClick={(p) => setPos(p)}
                height={360}
              />
            )}
            <p className="text-xs text-muted-foreground">Tap the map to pin the exact spot.</p>
          </CardContent>
        </Card>
      </div>
      <div className="mt-6 flex justify-end">
        <Button
          size="lg"
          disabled={!title || !pos || create.isPending}
          onClick={() => create.mutate()}
        >
          {create.isPending ? "Submitting…" : "Submit report"}
        </Button>
      </div>
    </AppShell>
  );
}