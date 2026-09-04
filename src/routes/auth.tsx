import { createFileRoute, redirect, useNavigate, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { BrandMark } from "@/components/BrandMark";
import { cn } from "@/lib/utils";
import { listTenantDirectory, signupAsCollector } from "@/lib/tenants.functions";
import { setCurrentTenantId } from "@/lib/current-tenant";
import { Building2, Home, Truck } from "lucide-react";

const searchSchema = z.object({ redirect: z.string().optional(), step: z.string().optional() });

type AccountType = "resident" | "collector";
const ACCOUNT_TYPE_KEY = "gt.pendingAccountType";

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in · Garbage Tracker" },
      { name: "description", content: "Sign in or create a resident or garbage collector account." },
    ],
  }),
  beforeLoad: async ({ search }) => {
    if (typeof window === "undefined") return;
    if (search.step === "collector") return; // collector municipality step runs signed-in
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      // A collector who started sign-up (e.g. via Google) still needs the municipality step.
      const pendingType = window.sessionStorage.getItem(ACCOUNT_TYPE_KEY);
      if (pendingType === "collector") {
        throw redirect({ to: "/auth", search: { step: "collector" } });
      }
      throw redirect({ to: (search.redirect as any) ?? "/dashboard" });
    }
  },
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const search = useSearch({ from: "/auth" });
  const redirectTo = (search.redirect as string) || "/dashboard";
  const [accountType, setAccountType] = useState<AccountType>("resident");

  if (search.step === "collector") return <CollectorMunicipalityStep />;

  function goAfterAuth(type: AccountType) {
    if (type === "collector") {
      window.sessionStorage.setItem(ACCOUNT_TYPE_KEY, "collector");
      nav({ to: "/auth", search: { step: "collector" } });
    } else {
      window.sessionStorage.removeItem(ACCOUNT_TYPE_KEY);
      nav({ to: redirectTo as any });
    }
  }

  async function onGoogle(type: AccountType) {
    try {
      if (type === "collector") window.sessionStorage.setItem(ACCOUNT_TYPE_KEY, "collector");
      else window.sessionStorage.removeItem(ACCOUNT_TYPE_KEY);
      const result: any = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result?.error) toast.error(result.error.message ?? "Google sign-in failed");
      if (result?.redirected) return;
      goAfterAuth(type);
    } catch (e: any) {
      toast.error(e.message ?? "Google sign-in failed");
    }
  }

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
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>Sign in to your account or create a new one.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>
              <TabsContent value="signin" className="space-y-4">
                <Button variant="outline" className="mt-4 w-full" onClick={() => onGoogle("resident")}>
                  Continue with Google
                </Button>
                <OrDivider />
                <SignInForm onSuccess={() => nav({ to: redirectTo as any })} />
              </TabsContent>
              <TabsContent value="signup" className="space-y-4">
                <AccountTypePicker value={accountType} onChange={setAccountType} />
                <Button variant="outline" className="w-full" onClick={() => onGoogle(accountType)}>
                  Continue with Google
                </Button>
                <OrDivider />
                <SignUpForm accountType={accountType} onSuccess={() => goAfterAuth(accountType)} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Protected by Lovable Cloud. Passwords are checked against known breaches.
        </p>
      </div>
    </div>
  );
}

function OrDivider() {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-card px-2 text-muted-foreground">or use email</span>
      </div>
    </div>
  );
}

function AccountTypePicker({ value, onChange }: { value: AccountType; onChange: (v: AccountType) => void }) {
  const options: { id: AccountType; title: string; desc: string; icon: typeof Home }[] = [
    { id: "resident", title: "Resident", desc: "Report garbage in your municipality.", icon: Home },
    { id: "collector", title: "Garbage collector", desc: "Collect reported garbage. Needs admin approval.", icon: Truck },
  ];
  return (
    <div className="mt-4">
      <Label className="mb-2 block">I am a…</Label>
      <div className="grid grid-cols-2 gap-2" role="radiogroup">
        {options.map((o) => {
          const active = value === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.id)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "border-primary bg-primary/5" : "hover:bg-accent",
              )}
            >
              <o.icon strokeWidth={1.6} className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")} />
              <span className="text-sm font-semibold">{o.title}</span>
              <span className="text-xs text-muted-foreground">{o.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SignInForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    window.sessionStorage.removeItem(ACCOUNT_TYPE_KEY);
    onSuccess();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

function SignUpForm({ accountType, onSuccess }: { accountType: AccountType; onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, account_type: accountType },
        emailRedirectTo: window.location.origin,
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    if (!data.session) {
      toast.success("Account created — check your email to confirm, then sign in.");
      return;
    }
    toast.success(accountType === "collector" ? "Account created — now choose your municipality" : "Account created — you're signed in");
    onSuccess();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <Label htmlFor="name">Full name</Label>
        <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="s-email">Email</Label>
        <Input id="s-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="s-password">Password</Label>
        <Input
          id="s-password"
          type="password"
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Creating account…" : accountType === "collector" ? "Continue" : "Create account"}
      </Button>
    </form>
  );
}

/** Second step for collectors: pick an existing municipality or create a new one. */
function CollectorMunicipalityStep() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [checked, setChecked] = useState(false);
  const [mode, setMode] = useState<"join" | "create">("join");
  const [tenantId, setTenantId] = useState<string>("");
  const [name, setName] = useState("");
  const [tz, setTz] = useState("UTC");
  const [lat, setLat] = useState(0);
  const [lng, setLng] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTz(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) nav({ to: "/auth", replace: true });
      else setChecked(true);
    });
  }, [nav]);

  const dirFn = useServerFn(listTenantDirectory);
  const dir = useQuery({ queryKey: ["tenant-directory"], queryFn: () => dirFn({}), enabled: checked });
  const signupFn = useServerFn(signupAsCollector);

  useEffect(() => {
    if (dir.data && dir.data.length === 0) setMode("create");
  }, [dir.data]);

  async function submit() {
    setBusy(true);
    try {
      const m = await signupFn({
        data:
          mode === "join"
            ? { tenantId }
            : { newName: name, timezone: tz, centerLat: lat, centerLng: lng },
      });
      window.sessionStorage.removeItem(ACCOUNT_TYPE_KEY);
      setCurrentTenantId(m.tenant_id);
      // Drop any cached (empty) membership list so the waiting screen sees the new request.
      qc.removeQueries({ queryKey: ["my-tenants"] });
      qc.removeQueries({ queryKey: ["my-role"] });
      toast.success("Request sent — waiting for administrator approval");
      await nav({ to: "/pending", replace: true });
    } catch (e: any) {
      toast.error(e.message ?? "Could not submit your request");
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = mode === "join" ? !!tenantId : name.trim().length >= 2;

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
          <CardHeader>
            <CardTitle>Your municipality</CardTitle>
            <CardDescription>
              Choose the municipality you collect for, or register a new one. The administrator will
              approve your collector account before you can start.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button variant={mode === "join" ? "default" : "outline"} onClick={() => setMode("join")}>
                Existing
              </Button>
              <Button variant={mode === "create" ? "default" : "outline"} onClick={() => setMode("create")}>
                Create new
              </Button>
            </div>

            {mode === "join" ? (
              <div className="space-y-2">
                {dir.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
                {(dir.data ?? []).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTenantId(t.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md border p-3 text-left transition-colors",
                      tenantId === t.id ? "border-primary bg-primary/5" : "hover:bg-accent",
                    )}
                  >
                    <Building2 className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.slug}</p>
                    </div>
                  </button>
                ))}
                {dir.data && dir.data.length === 0 && (
                  <p className="text-sm text-muted-foreground">No municipalities yet — create the first one.</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label>Municipality name</Label>
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
              </div>
            )}

            <Button className="w-full" disabled={!canSubmit || busy} onClick={submit}>
              {busy ? "Sending…" : "Send request for approval"}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={async () => {
                window.sessionStorage.removeItem(ACCOUNT_TYPE_KEY);
                await supabase.auth.signOut();
                nav({ to: "/auth", replace: true });
              }}
            >
              Cancel and sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
