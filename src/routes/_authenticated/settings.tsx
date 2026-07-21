import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/hooks/use-session";
import { useCurrentTenant } from "@/hooks/use-current-tenant";
import { ROLE_LABELS } from "@/lib/rbac";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useSession();
  const { memberships } = useCurrentTenant();

  return (
    <AppShell>
      <PageHeader title="Settings" description="Your account and municipality memberships." />
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Account</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Email: </span>{user?.email}</p>
            <p><span className="text-muted-foreground">User ID: </span>{user?.id.slice(0, 8)}…</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Memberships</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {memberships.map((m) => (
                <li key={`${m.tenant.id}-${m.role}`} className="flex justify-between">
                  <span>{m.tenant.name}</span>
                  <span className="text-muted-foreground">{ROLE_LABELS[m.role]}</span>
                </li>
              ))}
              {memberships.length === 0 && <p className="text-muted-foreground">None yet.</p>}
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}