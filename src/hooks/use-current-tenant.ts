import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { amIPlatformAdmin, listMyTenants, myRoleIn } from "@/lib/tenants.functions";
import { getCurrentTenantId, setCurrentTenantId } from "@/lib/current-tenant";
import type { AppRole } from "@/lib/rbac";

export type MembershipStatus = "pending" | "approved" | "rejected";

export type TenantMembership = {
  role: AppRole;
  active: boolean;
  status: MembershipStatus;
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

export function usePlatformAdmin() {
  const fn = useServerFn(amIPlatformAdmin);
  return useQuery({
    queryKey: ["platform-admin"],
    queryFn: () => fn({}) as Promise<boolean>,
    staleTime: 60_000,
  });
}

/**
 * Current tenant = one of the caller's *approved* memberships.
 * Pending memberships (collectors awaiting approval) are exposed separately.
 */
export function useCurrentTenant() {
  const { data: all, isLoading } = useMyTenants();
  const memberships = (all ?? []).filter((m) => m.status === "approved");
  const pending = (all ?? []).filter((m) => m.status === "pending");
  const [tenantId, setTenantIdState] = useState<string | null>(() => getCurrentTenantId());

  useEffect(() => {
    if (memberships.length === 0) return;
    const stored = getCurrentTenantId();
    const stillValid = stored && memberships.some((m) => m.tenant.id === stored);
    if (!stillValid) {
      const first = memberships[0]!.tenant.id;
      setCurrentTenantId(first);
      setTenantIdState(first);
    } else if (stored !== tenantId) {
      setTenantIdState(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, tenantId]);

  const setTenant = useCallback((id: string) => {
    setCurrentTenantId(id);
    setTenantIdState(id);
  }, []);

  const current = memberships.find((m) => m.tenant.id === tenantId) ?? null;
  return { memberships, pending, tenantId, setTenant, current, loading: isLoading };
}

export function useMyRole(tenantId: string | null | undefined) {
  const fn = useServerFn(myRoleIn);
  return useQuery({
    queryKey: ["my-role", tenantId],
    enabled: !!tenantId,
    queryFn: () => {
      if (!tenantId) return Promise.resolve(null);
      return fn({ data: { tenantId } }) as Promise<AppRole | null>;
    },
  });
}
