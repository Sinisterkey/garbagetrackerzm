import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyTenants, myRoleIn } from "@/lib/tenants.functions";
import { getCurrentTenantId, setCurrentTenantId } from "@/lib/current-tenant";
import type { AppRole } from "@/lib/rbac";

export type TenantMembership = {
  role: AppRole;
  active: boolean;
  tenant: {
    id: string;
    name: string;
    slug: string;
    logo_path: string | null;
    center_lat: number;
    center_lng: number;
    default_zoom: number;
  };
};

export function useMyTenants() {
  const fn = useServerFn(listMyTenants);
  return useQuery({
    queryKey: ["my-tenants"],
    queryFn: () => fn({}) as Promise<TenantMembership[]>,
    staleTime: 30_000,
  });
}

export function useCurrentTenant() {
  const { data: memberships, isLoading } = useMyTenants();
  const [tenantId, setTenantIdState] = useState<string | null>(() => getCurrentTenantId());

  useEffect(() => {
    if (!memberships || memberships.length === 0) return;
    const stored = getCurrentTenantId();
    const stillValid = stored && memberships.some((m) => m.tenant.id === stored);
    if (!stillValid) {
      const first = memberships[0]!.tenant.id;
      setCurrentTenantId(first);
      setTenantIdState(first);
    } else if (stored !== tenantId) {
      setTenantIdState(stored);
    }
  }, [memberships, tenantId]);

  const setTenant = useCallback((id: string) => {
    setCurrentTenantId(id);
    setTenantIdState(id);
  }, []);

  const current = memberships?.find((m) => m.tenant.id === tenantId) ?? null;
  return { memberships: memberships ?? [], tenantId, setTenant, current, loading: isLoading };
}

export function useMyRole(tenantId: string | null | undefined) {
  const fn = useServerFn(myRoleIn);
  return useQuery({
    queryKey: ["my-role", tenantId],
    enabled: !!tenantId,
    queryFn: () => fn({ data: { tenantId: tenantId! } }) as Promise<AppRole | null>,
  });
}