import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, EmptyState, PageHeader } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import {
  listMyNotifications,
  markAllRead,
  markNotificationRead,
} from "@/lib/notifications.functions";
import { relativeTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listMyNotifications);
  const markFn = useServerFn(markNotificationRead);
  const markAllFn = useServerFn(markAllRead);

  const q = useQuery({ queryKey: ["notifications"], queryFn: () => listFn({}) });
  const mark = useMutation({
    mutationFn: (id: string) => markFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const markAll = useMutation({
    mutationFn: () => markAllFn({}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <AppShell>
      <PageHeader
        title="Notifications"
        actions={
          <Button variant="outline" onClick={() => markAll.mutate()}>
            Mark all read
          </Button>
        }
      />
      {q.data && q.data.length === 0 && (
        <EmptyState icon={Bell} title="No notifications yet" />
      )}
      <div className="grid gap-2">
        {(q.data ?? []).map((n: any) => (
          <Card key={n.id} className={n.read_at ? "opacity-60" : ""}>
            <CardContent className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="font-medium">{n.title}</p>
                {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                <p className="text-xs text-muted-foreground">{relativeTime(n.created_at)}</p>
              </div>
              <div className="flex gap-2">
                {n.link && (
                  <Button asChild size="sm" variant="outline">
                    <Link to={n.link}>Open</Link>
                  </Button>
                )}
                {!n.read_at && (
                  <Button size="sm" variant="ghost" onClick={() => mark.mutate(n.id)}>
                    Mark read
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}