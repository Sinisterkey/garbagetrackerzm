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
import {
  createTenant,
  joinTenantAsResident,
  listTenantDirectory,
  signupAsCollector,
} from "@/lib/tenants.functions";
import { setCurrentTenantId } from "@/lib/current-tenant";
import { useCurrentTenant, usePlatformAdmin } from "@/hooks/use-current-tenant";
import { Building2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: OnboardingPage,
});

function OnboardingPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { memberships, pending } = useCurrentTenant();
  const { data: isPlatformAdmin } = usePlatformAdmin();
  const dirFn = useServerFn(listTenantDirectory);
  const dir = useQuery({ queryKey: ["tenant-directory"], queryFn: () => dirFn({}) });

  const createFn = useServerFn(createTenant);
  const joinFn = useServerFn(joinTenantAsResident);
  const collectorFn = useServerFn(signupAsCollector);

  // An existing collector adding another municipality also goes through approval.
  const isCollectorOnly =
    memberships.length > 0 && memberships.every((m) => m.role === "collector") && !isPlatformAdmin;

  const create = useMutation({
    mutationFn: (data: { name: string; timezone: string; centerLat: number; centerLng: number }) =>
      createFn({ data }),
    onSuccess: (t: any) => {
      setCurrentTenantId(t.id);
      qc.invalidateQueries();
      toast.success("Municipality created");
      nav({ to: "/admin" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const join = useMutation({
    mutationFn: async (tenantId: string) => {
      if (isCollectorOnly) {
        await collectorFn({ data: { tenantId } });
        return "pending" as const;
      }
      await joinFn({ data: { tenantId } });
      return "joined" as const;
    },
    onSuccess: (result, tenantId) => {
      qc.invalidateQueries();
      if (result === "pending") {
        toast.success("Request sent — waiting for administrator approval");
        return;
      }
      setCurrentTenantId(tenantId);
      toast.success("Joined as resident");
      nav({ to: "/dashboard" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const [name, setName] = useState("");
  const [tz, setTz] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [lat, setLat] = useState(0);
  const [lng, setLng] = useState(0);

  const memberIds = new Set([...memberships, ...pending].map((m) => m.tenant.id));

  return (
    <AppShell>
      <PageHeader
        title="Municipalities"
        description={
          memberships.length === 0
            ? "Join a municipality to begin."
            : "Add another municipality to your account."
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        {isPlatformAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Create a municipality</CardTitle>
              <CardDescription>
                As platform administrator you can register new municipalities and assign collectors to them.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="City of Kitwe" />
              </div>
              <div>
                <Label>Timezone</Label>
                <Input value={tz} onChange={(e) => setTz(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Center latitude</Label>
                  <Input type="number" step="0.0001" value={lat} onChange={(e) => setLat(Number(e.target.value))} />
                </div>
                <div>
                  <Label>Center longitude</Label>
                  <Input type="number" step="0.0001" value={lng} onChange={(e) => setLng(Number(e.target.value))} />
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
        )}

        <Card>
          <CardHeader>
            <CardTitle>{isCollectorOnly ? "Collect for another municipality" : "Join a municipality"}</CardTitle>
            <CardDescription>
              {isCollectorOnly
                ? "Your request will be reviewed by the administrator."
                : "Join as a resident to submit reports."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dir.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            <div className="space-y-2">
              {(dir.data ?? []).map((t) => {
                const already = memberIds.has(t.id);
                return (
                  <div key={t.id} className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.slug}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" disabled={already || join.isPending} onClick={() => join.mutate(t.id)}>
                      {already ? "Member" : isCollectorOnly ? "Request" : "Join"}
                    </Button>
                  </div>
                );
              })}
              {dir.data && dir.data.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No municipalities have been registered yet. Please check back later.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
