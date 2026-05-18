"use client";

import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { getAuth, getShadowAuth, stopImpersonation } from "@/lib/auth";

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export default function ImpersonationBanner() {
  const router = useRouter();
  const shadow = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem("shadow_user"),
    () => null,
  );
  const current = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem("user"),
    () => null,
  );

  if (!shadow || !current) return null;

  const shadowAuth = getShadowAuth();
  const currentAuth = getAuth();
  if (!shadowAuth || !currentAuth) return null;

  function handleExit() {
    stopImpersonation();
    router.replace("/manager/admin/users");
    router.refresh();
  }

  return (
    <div className="bg-amber-500 text-[#0F172A] px-4 py-2 flex items-center justify-between gap-4 shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 0c0 1.657-4.03 6-9 6s-9-4.343-9-6 4.03-6 9-6 9 4.343 9 6Z" />
        </svg>
        <span className="text-xs font-semibold uppercase tracking-wider">Viewing as</span>
        <span className="text-sm font-semibold truncate">{currentAuth.email}</span>
        {currentAuth.importer_account && (
          <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-[#0F172A]/10">{currentAuth.importer_account}</span>
        )}
        <span className="text-xs text-[#0F172A]/70 truncate">
          · signed in as {shadowAuth.email}
        </span>
      </div>
      <button
        onClick={handleExit}
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-[#0F172A] text-white hover:bg-[#1E293B] transition-colors cursor-pointer flex-shrink-0"
      >
        Exit
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
