export interface AuthUser {
  email: string;
  role: "vendor" | "manager";
  importer_account: string | null;
  access_token: string;
  permissions: string[];
}

export function saveAuth(data: AuthUser) {
  localStorage.setItem("access_token", data.access_token);
  localStorage.setItem("user", JSON.stringify(data));
}

export function getAuth(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function clearAuth() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("user");
  localStorage.removeItem("shadow_user");
}

export function roleRedirect(role: string): string {
  return role === "manager" ? "/manager" : "/vendor";
}

export function startImpersonation(targetAuth: AuthUser) {
  if (typeof window === "undefined") return;
  const current = getAuth();
  if (current && !isImpersonating()) {
    localStorage.setItem("shadow_user", JSON.stringify(current));
  }
  saveAuth(targetAuth);
}

export function isImpersonating(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("shadow_user") !== null;
}

export function getShadowAuth(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("shadow_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function stopImpersonation() {
  if (typeof window === "undefined") return;
  const shadow = getShadowAuth();
  if (shadow) saveAuth(shadow);
  localStorage.removeItem("shadow_user");
}
