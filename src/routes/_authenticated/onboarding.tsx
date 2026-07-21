import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createTenant, joinTenantAsResident, listTenantDirectory } from "@/lib/tenants.functions";
import { setCurrentTenantId } from "@/lib/current-tenant";
import { useCurrentTenant } from "@/hooks/use-current-tenant";
import { Building2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: OnboardingPage,
});

function OnboardingPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { memberships } = useCurrentTenant();
  const dirFn = useServerFn(listTenantDirectory);
  const dir = useQuery({ queryKey: ["tenant-directory"], queryFn: () => dirFn({}) });

  const createFn = useServerFn(createTenant);
  const joinFn = useServerFn(joinTenantAsResident);

  const create = useMutation({
    mutationFn: (data: { name: string; timezone: string; centerLat: number; centerLng: number }) =>
      createFn({ data }),
    onSuccess: (t: any) => {
      setCurrentTenantId(t.id);
      qc.invalidateQueries();
      toast.success("Municipality created");
      nav({ to: "/dashboard" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const join = useMutation({
    mutationFn: (tenantId: string) => joinFn({ data: { tenantId } }),
    onSuccess: (_r, tenantId) => {
      setCurrentTenantId(tenantId);
      qc.invalidateQueries();
      toast.success("Joined as resident");
      nav({ to: "/dashboard" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const [name, setName] = useState("");
  const [tz, setTz] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [lat, setLat] = useState(0);
  const [lng, setLng] = useState(0);

  return (
    <AppShell>
      <PageHeader
        title="Onboarding"
        description={
          memberships.length === 0
            ? "Create a new municipality or join an existing one."
            : "Add another municipality to your account."
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create a municipality</CardTitle>
            <CardDescription>
              You'll be its administrator. You can add supervisors and collectors afterwards.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="City of Springfield" />
            </div>
            <div>
              <Label>Timezone</Label>
              <Input value={tz} onChange={(e) => setTz(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Center latitude</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={lat}
                  onChange={(e) => setLat(Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Center longitude</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={lng}
                  onChange={(e) => setLng(Number(e.target.value))}
                />
              </div>
            </div>
            <Button
              className="w-full"
              disabled={!name || create.isPending}
              onClick={() => create.mutate({ name, timezone: tz, centerLat: lat, centerLng: lng })}
            >
              {create.isPending ? "Creating…" : "Create municipality"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Join an existing municipality</CardTitle>
            <CardDescription>Join as a resident to submit reports.</CardDescription>
          </CardHeader>
          <CardContent>
            {dir.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            <div className="space-y-2">
              {(dir.data ?? []).map((t: any) => (
                <div key={t.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.slug}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => join.mutate(t.id)}>
                    Join
                  </Button>
                </div>
              ))}
              {dir.data && dir.data.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No municipalities yet — create the first one.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}