import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentTenant, useMyRole } from "@/hooks/use-current-tenant";
import {
  deleteCategory,
  deletePriority,
  findUserByEmail,
  grantRole,
  listAnnouncements,
  listAuditLogs,
  listTenantMembers,
  revokeRole,
  saveAnnouncement,
  saveCategory,
  savePriority,
} from "@/lib/admin.functions";
import { listCategoriesAndPriorities } from "@/lib/reports.functions";
import { ROLE_LABELS, type AppRole } from "@/lib/rbac";
import { toast } from "sonner";
import { fmtDate } from "@/lib/format";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { current } = useCurrentTenant();
  const { data: role } = useMyRole(current?.tenant.id);

  if (!current) return <AppShell><p>Select a municipality.</p></AppShell>;
  if (role !== "administrator" && role !== "super_admin")
    return (
      <AppShell>
        <PageHeader title="Administration" />
        <p className="text-sm text-muted-foreground">Requires administrator role.</p>
      </AppShell>
    );

  return (
    <AppShell>
      <PageHeader title="Administration" description={current.tenant.name} />
      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="priorities">Priorities</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="audit">Audit log</TabsTrigger>
        </TabsList>
        <TabsContent value="members" className="mt-4"><Members tenantId={current.tenant.id} /></TabsContent>
        <TabsContent value="categories" className="mt-4"><Categories tenantId={current.tenant.id} /></TabsContent>
        <TabsContent value="priorities" className="mt-4"><Priorities tenantId={current.tenant.id} /></TabsContent>
        <TabsContent value="announcements" className="mt-4"><Announcements tenantId={current.tenant.id} /></TabsContent>
        <TabsContent value="audit" className="mt-4"><AuditLog tenantId={current.tenant.id} /></TabsContent>
      </Tabs>
    </AppShell>
  );
}

function Members({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listTenantMembers);
  const grantFn = useServerFn(grantRole);
  const revokeFn = useServerFn(revokeRole);
  const findFn = useServerFn(findUserByEmail);

  const q = useQuery({
    queryKey: ["members", tenantId],
    queryFn: () => listFn({ data: { tenantId } }),
  });

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("resident");

  const grant = useMutation({
    mutationFn: async () => {
      const p = await findFn({ data: { email } });
      if (!p) throw new Error("No user with that email — ask them to sign in once first");
      return grantFn({ data: { tenantId, userId: p.id, role: role as any } });
    },
    onSuccess: () => {
      setEmail("");
      toast.success("Role granted");
      qc.invalidateQueries({ queryKey: ["members", tenantId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => revokeFn({ data: { memberId: id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members", tenantId] }),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card>
        <CardHeader><CardTitle className="text-base">Grant role</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div>
            <Label>User email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={(v: any) => setRole(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["resident", "collector", "supervisor", "administrator"] as AppRole[]).map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button disabled={!email || grant.isPending} onClick={() => grant.mutate()} className="w-full">
            Grant
          </Button>
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="text-base">Current members</CardTitle></CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {(q.data ?? []).map((m: any) => (
              <li key={m.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">
                    {m.profile?.full_name ?? m.profile?.email ?? m.user_id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABELS[m.role as AppRole]} · {m.active ? "active" : "inactive"}
                  </p>
                </div>
                {m.active && (
                  <Button size="sm" variant="ghost" onClick={() => revoke.mutate(m.id)}>
                    Revoke
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Categories({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const metaFn = useServerFn(listCategoriesAndPriorities);
  const saveFn = useServerFn(saveCategory);
  const delFn = useServerFn(deleteCategory);
  const q = useQuery({
    queryKey: ["meta", tenantId],
    queryFn: () => metaFn({ data: { tenantId } }),
  });
  const [name, setName] = useState("");
  const save = useMutation({
    mutationFn: () => saveFn({ data: { tenantId, name, color: "#0d9488", icon: "trash-2", active: true } }),
    onSuccess: () => {
      setName("");
      qc.invalidateQueries({ queryKey: ["meta", tenantId] });
    },
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meta", tenantId] }),
  });
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Categories</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name" />
          <Button onClick={() => save.mutate()} disabled={!name}>Add</Button>
        </div>
        <ul className="divide-y text-sm">
          {(q.data?.categories ?? []).map((c: any) => (
            <li key={c.id} className="flex items-center justify-between py-2">
              <span>{c.name}</span>
              <Button size="sm" variant="ghost" onClick={() => del.mutate(c.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function Priorities({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const metaFn = useServerFn(listCategoriesAndPriorities);
  const saveFn = useServerFn(savePriority);
  const delFn = useServerFn(deletePriority);
  const q = useQuery({
    queryKey: ["meta", tenantId],
    queryFn: () => metaFn({ data: { tenantId } }),
  });
  const [name, setName] = useState("");
  const [level, setLevel] = useState(3);
  const [sla, setSla] = useState(240);
  const save = useMutation({
    mutationFn: () =>
      saveFn({ data: { tenantId, name, level, slaMinutes: sla, color: "#f59e0b", active: true } }),
    onSuccess: () => {
      setName("");
      qc.invalidateQueries({ queryKey: ["meta", tenantId] });
    },
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meta", tenantId] }),
  });
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Priorities & SLAs</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-4 gap-2">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input type="number" placeholder="Level" value={level} onChange={(e) => setLevel(Number(e.target.value))} />
          <Input type="number" placeholder="SLA minutes" value={sla} onChange={(e) => setSla(Number(e.target.value))} />
          <Button onClick={() => save.mutate()} disabled={!name}>Add</Button>
        </div>
        <ul className="divide-y text-sm">
          {(q.data?.priorities ?? []).map((p: any) => (
            <li key={p.id} className="flex items-center justify-between py-2">
              <span>{p.name} <span className="text-xs text-muted-foreground">L{p.level} · SLA {p.sla_minutes}m</span></span>
              <Button size="sm" variant="ghost" onClick={() => del.mutate(p.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function Announcements({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listAnnouncements);
  const saveFn = useServerFn(saveAnnouncement);
  const q = useQuery({
    queryKey: ["announcements", tenantId],
    queryFn: () => listFn({ data: { tenantId } }),
  });
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const save = useMutation({
    mutationFn: () => saveFn({ data: { tenantId, title, body, published: true } }),
    onSuccess: () => {
      setTitle("");
      setBody("");
      qc.invalidateQueries({ queryKey: ["announcements", tenantId] });
    },
  });
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base">New announcement</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea rows={4} placeholder="Message" value={body} onChange={(e) => setBody(e.target.value)} />
          <Button onClick={() => save.mutate()} disabled={!title || !body}>Publish</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Previous</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {(q.data ?? []).map((a: any) => (
              <li key={a.id} className="rounded-md border p-2">
                <p className="font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground">{fmtDate(a.created_at)}</p>
                <p className="mt-1">{a.body}</p>
              </li>
            ))}
            {q.data && q.data.length === 0 && (
              <p className="text-xs text-muted-foreground">None yet.</p>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function AuditLog({ tenantId }: { tenantId: string }) {
  const listFn = useServerFn(listAuditLogs);
  const q = useQuery({
    queryKey: ["audit", tenantId],
    queryFn: () => listFn({ data: { tenantId } }),
  });
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Recent activity</CardTitle></CardHeader>
      <CardContent>
        <ul className="divide-y text-sm">
          {(q.data ?? []).map((l: any) => (
            <li key={l.id} className="flex items-center justify-between py-2">
              <div>
                <p className="font-mono text-xs">{l.action}</p>
                <p className="text-xs text-muted-foreground">
                  {l.entity}
                  {l.entity_id ? `#${String(l.entity_id).slice(0, 8)}` : ""}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">{fmtDate(l.created_at)}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}