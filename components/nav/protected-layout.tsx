"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, roleRedirect, type AuthUser } from "@/lib/auth";
import Sidebar from "./sidebar";
import ImpersonationBanner from "./impersonation-banner";
import MobileNav from "./mobile-nav";
import AppTopbar from "./app-topbar";

interface Props {
  requiredRole?: "vendor" | "manager";
  requiredPermission?: string;
  children: React.ReactNode;
}

export default function ProtectedLayout({ requiredRole, requiredPermission, children }: Props) {
  const router = useRouter();
  const [authState, setAuthState] = useState<{ ready: boolean; user: AuthUser | null }>({
    ready: false,
    user: null,
  });

  useEffect(() => {
    const auth = getAuth();
    // Authentication is persisted outside React in localStorage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAuthState({ ready: true, user: auth });
    if (!auth) { router.replace("/login"); return; }
    if (requiredRole && auth.role !== requiredRole) {
      router.replace(roleRedirect(auth.role, auth.permissions));
    }
  }, [requiredRole, router]);

  if (!authState.ready || !authState.user || (requiredRole && authState.user.role !== requiredRole)) return null;
  if (requiredPermission && !(authState.user.permissions ?? []).includes(requiredPermission)) {
    return <div className="p-8"><h1 className="text-xl font-bold">Access needed</h1><p className="mt-2">Contact your Surfgistics administrator to enable shipment access for your account.</p><a className="mt-4 inline-block underline" href={roleRedirect(authState.user.role, authState.user.permissions)}>Return to your workspace</a></div>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F3F7F8]">
      <ImpersonationBanner />
      <MobileNav />
      <div className="flex min-w-0 flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-auto">
          <AppTopbar />
          <div className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6 md:px-8 md:py-8 lg:px-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
