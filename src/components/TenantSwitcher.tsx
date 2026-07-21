import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Building2, ChevronsUpDown, Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useCurrentTenant } from "@/hooks/use-current-tenant";
import { ROLE_LABELS } from "@/lib/rbac";

export function TenantSwitcher() {
  const { memberships, current, setTenant } = useCurrentTenant();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 gap-2 px-2 text-left">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="hidden min-w-0 flex-col text-xs md:flex">
            <span className="truncate font-semibold text-foreground">
              {current?.tenant.name ?? "No municipality"}
            </span>
            <span className="truncate text-muted-foreground">
              {current ? ROLE_LABELS[current.role] : "Select or create"}
            </span>
          </div>
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Your municipalities</DropdownMenuLabel>
        {memberships.length === 0 && (
          <div className="px-2 py-3 text-sm text-muted-foreground">
            You are not a member of any municipality yet.
          </div>
        )}
        {memberships.map((m) => (
          <DropdownMenuItem key={m.tenant.id} onSelect={() => setTenant(m.tenant.id)}>
            <div className="flex flex-col">
              <span className="font-medium">{m.tenant.name}</span>
              <span className="text-xs text-muted-foreground">{ROLE_LABELS[m.role]}</span>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/onboarding" className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add or create municipality
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}