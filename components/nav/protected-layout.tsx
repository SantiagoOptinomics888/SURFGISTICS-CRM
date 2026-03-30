"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuth } from "@/lib/auth";
import Sidebar from "./sidebar";

interface Props {
  requiredRole?: "vendor" | "manager";
  children: React.ReactNode;
}

export default function ProtectedLayout({ requiredRole, children }: Props) {
  const router = useRouter();
  const user = getAuth();

  useEffect(() => {
    if (!user) { router.replace("/login"); return; }
    if (requiredRole && user.role !== requiredRole) {
      router.replace(user.role === "manager" ? "/manager" : "/vendor");
    }
  }, [user, requiredRole, router]);

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
