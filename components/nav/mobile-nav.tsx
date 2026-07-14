"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { clearAuth, getAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";
import { linksForCurrentUser } from "./sidebar";

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const user = getAuth();
  const links = linksForCurrentUser();

  function signOut() {
    clearAuth();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-white/8 bg-[#0A2330] md:hidden">
      <div className="flex h-16 items-center justify-between px-4">
        <BrandLogo compact />
        <div className="min-w-0 flex-1 px-3">
          <p className="truncate text-sm font-bold text-white">Surfgistics</p>
          <p className="truncate text-[10px] text-white/45">{user?.importer_account ?? "Admin workspace"}</p>
        </div>
        <button onClick={() => setOpen((value) => !value)} className="rounded-md p-2 text-white/75 hover:bg-white/8" aria-label={open ? "Close navigation" : "Open navigation"}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-white/8 px-3 pb-4 pt-3">
          <nav className="grid grid-cols-2 gap-1" aria-label="Mobile navigation">
            {links.map((link) => {
              const Icon = link.icon;
              const active = pathname === link.href;
              return (
                <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className={cn("flex items-center gap-2 rounded-md px-3 py-2.5 text-xs font-semibold", active ? "bg-white/10 text-white" : "text-white/55 hover:bg-white/6")}>
                  <Icon className={cn("h-4 w-4", active && "text-cyan-300")} />
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <button onClick={signOut} className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-white/10 py-2.5 text-xs font-semibold text-white/65">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
    </header>
  );
}
