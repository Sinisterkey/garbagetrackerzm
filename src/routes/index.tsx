import { Link, createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BarChart3,
  Camera,
  MapPin,
  Shield,
  Truck,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Truck className="h-5 w-5" />
          </div>
          <span className="text-base font-bold tracking-tight">Garbage Tracker</span>
        </div>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild>
            <Link to="/auth">
              Get started <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </nav>
      </header>

      <section className="relative overflow-hidden border-b bg-gradient-to-b from-primary/5 to-background">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-2 md:py-28">
          <div className="flex flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Multi-tenant municipal platform
            </span>
            <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
              Municipal waste operations,{" "}
              <span className="text-primary">digitised end to end.</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Residents report. Dispatchers assign. Collectors execute. Supervisors verify.
              One workflow, one map, one audit trail — across every municipality on your network.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/auth">
                  Launch the platform <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#capabilities">See capabilities</a>
              </Button>
            </div>
          </div>
          <div className="relative rounded-2xl border bg-card p-6 shadow-xl">
            <div className="grid gap-3">
              {[
                { icon: Camera, title: "New report submitted", meta: "3rd Ave · 2 min ago", tone: "bg-accent/25 text-accent-foreground" },
                { icon: Truck, title: "Route T-14 en route", meta: "Collector Amina", tone: "bg-primary/10 text-primary" },
                { icon: Shield, title: "Verified & closed", meta: "Downtown block · 15 min ago", tone: "bg-chart-4/20 text-chart-4" },
              ].map((r, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border bg-background p-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${r.tone}`}>
                    <r.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.meta}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="capabilities" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-3xl font-bold tracking-tight">Built for every role in the loop.</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          One platform serves residents, collectors, supervisors, and administrators — with
          role-based access, live GPS, evidence photos, SLA tracking and full audit trails.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { icon: Camera, title: "Report with photo & GPS", body: "Residents pin the exact spot, describe the issue, and attach evidence photos in seconds." },
            { icon: Truck, title: "Dispatch & routing", body: "Supervisors assign collectors, watch progress on the live map, and re-route on the fly." },
            { icon: Shield, title: "Verified completion", body: "Completion photos, ratings, and a per-report audit trail — cleanup is provably done." },
            { icon: MapPin, title: "Live map & heatmap", body: "See every open report and collector position update in real time across the municipality." },
            { icon: BarChart3, title: "SLA & analytics", body: "Track response times, backlog, and per-category volume with priority-based SLAs." },
            { icon: Users, title: "Multi-tenant", body: "Each municipality is fully isolated — data, categories, priorities, and staff — via row-level security." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t bg-muted/40">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} Garbage Tracker</span>
          <span>Secure by default · RLS-isolated · Audit-logged</span>
        </div>
      </footer>
    </div>
  );
}
