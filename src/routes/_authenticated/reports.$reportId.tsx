import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { ReportMap } from "@/components/ReportMap";
import { toast } from "sonner";
import {
  addComment,
  getReport,
  rateReport,
  transitionReport,
} from "@/lib/reports.functions";
import { assignCollector, listCollectors } from "@/lib/assignments.functions";
import { signReadUrls } from "@/lib/storage.functions";
import { useCurrentTenant, useMyRole } from "@/hooks/use-current-tenant";
import { ALLOWED_TRANSITIONS, STATUS_LABELS, type ReportStatus } from "@/lib/report-status";
import { fmtDate, relativeTime } from "@/lib/format";
import { PhotoUploader } from "@/components/PhotoUploader";
import { MessageSquare, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports/$reportId")({
  component: ReportDetail,
});

function ReportDetail() {
  const params = Route.useParams();
  const qc = useQueryClient();
  const { current } = useCurrentTenant();
  const { data: role } = useMyRole(current?.tenant.id);

  const getFn = useServerFn(getReport);
  const q = useQuery({
    queryKey: ["report", params.reportId],
    queryFn: () => getFn({ data: { reportId: params.reportId } }),
  });

  const paths = useMemo(() => (q.data?.photos ?? []).map((p: any) => p.storage_path), [q.data]);
  const signFn = useServerFn(signReadUrls);
  const photoUrls = useQuery({
    queryKey: ["photo-urls", paths],
    enabled: paths.length > 0,
    queryFn: () => signFn({ data: { paths } }),
  });

  const transitionFn = useServerFn(transitionReport);
  const transition = useMutation({
    mutationFn: (input: { to: ReportStatus; note?: string; completionPhotoPaths?: string[] }) =>
      transitionFn({ data: { reportId: params.reportId, ...input } }),
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["report", params.reportId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addCommentFn = useServerFn(addComment);
  const [commentBody, setCommentBody] = useState("");
  const comment = useMutation({
    mutationFn: () => addCommentFn({ data: { reportId: params.reportId, body: commentBody } }),
    onSuccess: () => {
      setCommentBody("");
      qc.invalidateQueries({ queryKey: ["report", params.reportId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rateFn = useServerFn(rateReport);
  const [stars, setStars] = useState(5);
  const rate = useMutation({
    mutationFn: () => rateFn({ data: { reportId: params.reportId, stars } }),
    onSuccess: () => {
      toast.success("Thanks for the feedback");
      qc.invalidateQueries({ queryKey: ["report", params.reportId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const collectorsFn = useServerFn(listCollectors);
  const collectors = useQuery({
    queryKey: ["collectors", current?.tenant.id],
    enabled: !!current && (role === "supervisor" || role === "administrator" || role === "super_admin"),
    queryFn: () => collectorsFn({ data: { tenantId: current!.tenant.id } }),
  });
  const assignFn = useServerFn(assignCollector);
  const assign = useMutation({
    mutationFn: (collectorId: string) =>
      assignFn({ data: { reportId: params.reportId, collectorId } }),
    onSuccess: () => {
      toast.success("Assigned");
      qc.invalidateQueries({ queryKey: ["report", params.reportId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const [completionPhotos, setCompletionPhotos] = useState<string[]>([]);

  if (q.isLoading || !q.data) return <AppShell><p>Loading…</p></AppShell>;
  const { report, events, comments, rating } = q.data;

  const nextOptions =
    role && (ALLOWED_TRANSITIONS[role]?.[report.status as ReportStatus] ?? []).filter(
      (s) => s !== report.status,
    );

  return (
    <AppShell>
      <PageHeader
        title={report.title}
        description={report.address ?? `${report.lat.toFixed(5)}, ${report.lng.toFixed(5)}`}
        actions={<StatusBadge status={report.status as ReportStatus} className="text-sm" />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Overview</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {report.description && <p>{report.description}</p>}
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>Size: {report.size}</span>
                {report.urgent && <span className="text-destructive">Urgent</span>}
                {report.category && <span>Category: {(report.category as any).name}</span>}
                {report.priority && <span>Priority: {(report.priority as any).name}</span>}
                <span>Created {relativeTime(report.created_at)}</span>
              </div>
              {(report as any).contact_phone && (
                <p className="text-sm">
                  Reporter contact:{" "}
                  <a
                    className="font-medium text-primary underline-offset-4 hover:underline"
                    href={`tel:${(report as any).contact_phone}`}
                  >
                    {(report as any).contact_phone}
                  </a>
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Location</CardTitle></CardHeader>
            <CardContent>
              <ReportMap
                center={{ lat: report.lat, lng: report.lng }}
                zoom={16}
                markers={[{ id: report.id, lat: report.lat, lng: report.lng, status: report.status as ReportStatus }]}
                height={320}
              />
            </CardContent>
          </Card>

          {paths.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Photos</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {(photoUrls.data ?? []).map((u: any, i: number) =>
                    u.signedUrl ? (
                      <a key={i} href={u.signedUrl} target="_blank" rel="noreferrer">
                        <img
                          src={u.signedUrl}
                          alt=""
                          className="h-32 w-full rounded-md object-cover"
                        />
                      </a>
                    ) : null,
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm">
                {events.map((e: any) => (
                  <li key={e.id} className="flex gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                    <div>
                      <p className="font-medium">
                        {e.from_status ? `${STATUS_LABELS[e.from_status as ReportStatus]} → ` : ""}
                        {STATUS_LABELS[e.to_status as ReportStatus]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {fmtDate(e.created_at)}
                        {e.note ? ` · ${e.note}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <CardTitle className="text-base">Comments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2 text-sm">
                {comments.map((c: any) => (
                  <li key={c.id} className="rounded-md border p-2">
                    <p>{c.body}</p>
                    <p className="text-xs text-muted-foreground">{relativeTime(c.created_at)}</p>
                  </li>
                ))}
                {comments.length === 0 && (
                  <p className="text-xs text-muted-foreground">No comments yet.</p>
                )}
              </ul>
              <div className="space-y-2">
                <Textarea
                  rows={2}
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="Add a comment…"
                />
                <Button
                  disabled={!commentBody || comment.isPending}
                  onClick={() => comment.mutate()}
                >
                  Post comment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {nextOptions && nextOptions.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Actions</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {role === "collector" && report.status === "working" && current && (
                  <div>
                    <p className="mb-1 text-xs font-medium">Completion photos</p>
                    <PhotoUploader
                      tenantId={current.tenant.id}
                      subfolder="completion"
                      value={completionPhotos}
                      onChange={setCompletionPhotos}
                      max={5}
                    />
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {nextOptions.map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={s === "rejected" || s === "cancelled" ? "outline" : "default"}
                      onClick={() =>
                        transition.mutate({
                          to: s,
                          completionPhotoPaths: s === "completed" ? completionPhotos : undefined,
                        })
                      }
                    >
                      {STATUS_LABELS[s]}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {(role === "supervisor" || role === "administrator" || role === "super_admin") && (
            <Card>
              <CardHeader><CardTitle className="text-base">Assign collector</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Select onValueChange={(v) => assign.mutate(v)}>
                  <SelectTrigger><SelectValue placeholder="Pick collector" /></SelectTrigger>
                  <SelectContent>
                    {(collectors.data ?? []).map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.full_name ?? c.email ?? c.id.slice(0, 8)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {report.assigned_collector_id && (
                  <p className="text-xs text-muted-foreground">
                    Currently assigned: {report.assigned_collector_id.slice(0, 8)}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {report.status === "verified" && !rating && (
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <Star className="h-4 w-4" />
                <CardTitle className="text-base">Rate the service</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setStars(n)}
                      className="text-2xl"
                    >
                      <Star
                        className={n <= stars ? "h-6 w-6 fill-primary text-primary" : "h-6 w-6 text-muted-foreground"}
                      />
                    </button>
                  ))}
                </div>
                <Button onClick={() => rate.mutate()} disabled={rate.isPending}>Submit rating</Button>
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-muted-foreground">
            <Link to="/dashboard" className="underline">Back to dashboard</Link>
          </p>
        </div>
      </div>
    </AppShell>
  );
}