import { Link, createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/BrandMark";
import truckPhoto from "@/assets/collection-truck.jpg.asset.json";
import {
  ArrowRight,
  BarChart3,
  Camera,
  MapPin,
  Phone,
  Shield,
  Truck,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Garbage Tracker — Report, dispatch and verify waste collection" },
      { name: "description", content: "Residents report waste with photos, GPS and a contact number; collectors claim jobs and admins verify every cleanup on one live map." },
      { property: "og:title", content: "Garbage Tracker — Report, dispatch and verify waste collection" },
      { property: "og:description", content: "Residents report waste with photos, GPS and a contact number; collectors claim jobs and admins verify every cleanup on one live map." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://garbagetrackerzm.lovable.app/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://garbagetrackerzm.lovable.app/" }],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <BrandMark className="h-8 w-8 text-primary" />
          <span className="text-base font-semibold tracking-tight">Garbage Tracker</span>
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

      <section className="relative overflow-hidden border-b">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 md:grid-cols-[1.05fr_1fr] md:py-24">
          <div className="flex flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-2 border-l-2 border-primary py-1 pl-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Multi-tenant municipal platform
            </span>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
              Municipal waste operations,{" "}
              <span className="text-primary">digitised end to end.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">
              Residents report. Dispatchers assign. Collectors execute. Supervisors verify.
              One workflow, one map, one audit trail — across every municipality on your network.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/auth">
                  Launch the platform <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#capabilities">See capabilities</a>
              </Button>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t pt-6">
              {[
                { k: "3", v: "Roles in the loop" },
                { k: "GPS", v: "Pinned reports" },
                { k: "SLA", v: "Tracked to close" },
              ].map((s) => (
                <div key={s.v}>
                  <dt className="text-2xl font-semibold tracking-tight">{s.k}</dt>
                  <dd className="mt-1 text-xs text-muted-foreground">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative">
            <div className="overflow-hidden rounded-2xl border">
              <img
                src={truckPhoto.url}
                alt="A municipal collection truck tipping household waste at a landfill site"
                loading="lazy"
                className="h-[340px] w-full object-cover md:h-[420px]"
              />
            </div>
            <div className="relative -mt-10 ml-4 mr-4 grid gap-2 rounded-xl border bg-card/95 p-3 shadow-lg backdrop-blur md:ml-10 md:mr-0">
              {[
                { icon: Camera, title: "New report submitted", meta: "3rd Ave · 2 min ago" },
                { icon: Truck, title: "Route T-14 en route", meta: "Collector Amina" },
                { icon: Shield, title: "Verified & closed", meta: "Downtown block · 15 min ago" },
              ].map((r, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg px-2 py-2">
                  <r.icon className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.6} />
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
            { icon: Phone, title: "Direct contact", body: "Residents can leave a contact number on a report so the assigned collector can call them." },
            { icon: Truck, title: "Dispatch & routing", body: "Supervisors assign collectors, watch progress on the live map, and re-route on the fly." },
            { icon: Shield, title: "Verified completion", body: "Completion photos, ratings, and a per-report audit trail — cleanup is provably done." },
            { icon: MapPin, title: "Live map & heatmap", body: "See every open report and collector position update in real time across the municipality." },
            { icon: BarChart3, title: "SLA & analytics", body: "Track response times, backlog, and per-category volume with priority-based SLAs." },
            { icon: Users, title: "Multi-tenant", body: "Each municipality is fully isolated — data, categories, priorities, and staff — via row-level security." },
          ].map((f) => (
            <div key={f.title} className="border-t pt-5">
              <f.icon className="h-5 w-5 text-primary" strokeWidth={1.4} />
              <h3 className="mt-3 font-medium tracking-tight">{f.title}</h3>
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
