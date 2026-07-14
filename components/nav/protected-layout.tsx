"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, type AuthUser } from "@/lib/auth";
import Sidebar from "./sidebar";
import ImpersonationBanner from "./impersonation-banner";
import MobileNav from "./mobile-nav";
import AppTopbar from "./app-topbar";

interface Props {
  requiredRole?: "vendor" | "manager";
  children: React.ReactNode;
}

export default function ProtectedLayout({ requiredRole, children }: Props) {
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
      router.replace(auth.role === "manager" ? "/manager" : "/vendor");
    }
  }, [requiredRole, router]);

  if (!authState.ready || !authState.user) return null;

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
