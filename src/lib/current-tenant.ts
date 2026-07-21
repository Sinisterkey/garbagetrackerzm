/**
 * Client-side "current tenant" — persisted in localStorage.
 * Server functions always require an explicit tenant_id argument;
 * this file is just about which tenant the UI is currently showing.
 */
const KEY = "gt.currentTenantId";

export function getCurrentTenantId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setCurrentTenantId(id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (id) window.localStorage.setItem(KEY, id);
    else window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}