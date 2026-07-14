"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { managerLinks, vendorLinks } from "./sidebar";

export default function MobileNav() {
  const pathname = usePathname();
  const user = getAuth();
  const permissions = user?.permissions ?? [];
  const links = user?.role === "manager"
    ? managerLinks
    : vendorLinks.filter((link) => link.permission === null || permissions.includes(link.permission));

  return (
    <header className="border-b border-[#1E293B] bg-[#0F172A] md:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-[#0369A1] text-sm font-bold text-white">S</div>
          <span className="text-sm font-semibold text-white">Surfgistics</span>
        </div>
        <span className="max-w-40 truncate text-xs text-[#94A3B8]">{user?.email}</span>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-2" aria-label="Mobile navigation">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex flex-shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-medium",
              pathname === link.href ? "bg-[#1E293B] text-white" : "text-[#94A3B8]"
            )}
          >
            {link.icon}
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
