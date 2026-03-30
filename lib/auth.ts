export interface AuthUser {
  email: string;
  role: "vendor" | "manager";
  importer_account: string | null;
  access_token: string;
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
}

export function roleRedirect(role: string): string {
  return role === "manager" ? "/manager" : "/vendor";
}
