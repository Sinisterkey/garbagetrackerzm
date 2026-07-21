import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentTenant } from "@/hooks/use-current-tenant";
import { listReports } from "@/lib/reports.functions";
import { StatusBadge } from "@/components/StatusBadge";
import { REPORT_STATUSES, STATUS_LABELS, type ReportStatus } from "@/lib/report-status";
import { relativeTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/queue")({
  component: QueuePage,
});

function QueuePage() {
  const { current } = useCurrentTenant();
  const listFn = useServerFn(listReports);
  const [status, setStatus] = useState<ReportStatus | "">("");
  const [search, setSearch] = useState("");

  const q = useQuery({
    queryKey: ["queue", current?.tenant.id, status, search],
    enabled: !!current,
    queryFn: () =>
      listFn({
        data: {
          tenantId: current!.tenant.id,
          scope: "all",
          status: status || undefined,
          search: search || undefined,
          limit: 200,
        },
      }),
  });

  if (!current) return <AppShell><p>Select a municipality.</p></AppShell>;

  return (
    <AppShell>
      <PageHeader
        title="Dispatch queue"
        description="Every report in this municipality. Click one to assign or verify."
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          placeholder="Search titles…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : (v as ReportStatus))}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {REPORT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        {(q.data ?? []).map((r: any) => (
          <Card key={r.id}>
            <CardContent className="flex items-center gap-4 py-3">
              <Link to="/reports/$reportId" params={{ reportId: r.id }} className="min-w-0 flex-1">
                <p className="truncate font-medium">{r.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {r.address ?? `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`} · {relativeTime(r.created_at)}
                </p>
              </Link>
              {r.urgent && (
                <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-medium uppercase text-destructive">
                  Urgent
                </span>
              )}
              <StatusBadge status={r.status} />
            </CardContent>
          </Card>
        ))}
        {q.data && q.data.length === 0 && (
          <p className="text-sm text-muted-foreground">No reports match your filters.</p>
        )}
      </div>
    </AppShell>
  );
}