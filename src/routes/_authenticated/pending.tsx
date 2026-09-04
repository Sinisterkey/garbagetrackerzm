import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentTenant } from "@/hooks/use-current-tenant";
import { BrandMark } from "@/components/BrandMark";
import { Hourglass, LogOut, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pending")({
  head: () => ({
    meta: [
      { title: "Awaiting approval · Garbage Tracker" },
      { name: "description", content: "Your collector account is awaiting administrator approval." },
    ],
  }),
  component: PendingPage,
});

function PendingPage() {
  const router = useRouter();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { memberships, pending, loading } = useCurrentTenant();

  // Once approved (or if the user is not actually pending), leave this page.
  useEffect(() => {
    if (loading) return;
    if (memberships.length > 0) nav({ to: "/dashboard", replace: true });
    else if (pending.length === 0) nav({ to: "/onboarding", replace: true });
  }, [loading, memberships.length, pending.length, nav]);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  const names = pending.map((p) => p.tenant.name).join(", ");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary/5 to-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div className="h-10 w-10 text-primary">
            <BrandMark />
          </div>
          <span className="text-lg font-bold tracking-tight">Garbage Tracker</span>
        </div>
        <Card>
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-primary/20 bg-primary/5 text-primary">
              <Hourglass strokeWidth={1.6} className="h-5 w-5" />
            </div>
            <CardTitle>Awaiting approval</CardTitle>
            <CardDescription>
              {loading
                ? "Checking your account…"
                : `Your request to collect for ${names || "your municipality"} has been received. The administrator will review it shortly. You'll be able to start once it is approved.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => qc.invalidateQueries({ queryKey: ["my-tenants"] })}
            >
              <RefreshCw strokeWidth={1.6} className="h-4 w-4" /> Check again
            </Button>
            <Button variant="ghost" className="w-full gap-2" onClick={signOut}>
              <LogOut strokeWidth={1.6} className="h-4 w-4" /> Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
