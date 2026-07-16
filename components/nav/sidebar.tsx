"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Boxes,
  CheckCircle2,
  ClipboardList,
  FileInput,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  PackageCheck,
  Settings,
  Ship,
  UploadCloud,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { clearAuth, getAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";

export type NavLink = {
  href: string;
  label: string;
  section: string;
  icon: LucideIcon;
  permission?: string | null;
};

export const vendorLinks: NavLink[] = [
  { href: "/vendor", label: "Overview", section: "Workspace", icon: LayoutDashboard, permission: null },
  { href: "/vendor/imports", label: "ISF & Shipments", section: "Workspace", icon: Ship, permission: "imports" },
  { href: "/vendor/arts-parts", label: "Parts", section: "Operations", icon: Boxes, permission: "parts" },
  { href: "/vendor/tally-in", label: "Tally In", section: "Operations", icon: ClipboardList, permission: "tally_in" },
  { href: "/vendor/arrival-notice", label: "Arrival Notices", section: "Operations", icon: FileInput, permission: "tally_in" },
  { href: "/vendor/inbonds", label: "In-Bond", section: "Operations", icon: UploadCloud, permission: "inbond" },
  { href: "/vendor/tally-out", label: "Tally Out", section: "Operations", icon: CheckCircle2, permission: "tally_out" },
];

export const managerLinks: NavLink[] = [
  { href: "/manager", label: "Overview", section: "Workspace", icon: LayoutDashboard },
  { href: "/manager/imports", label: "ISF & Shipments", section: "Workspace", icon: Ship },
  { href: "/manager/new-items", label: "Automation", section: "Workspace", icon: PackageCheck },
  { href: "/manager/tally-out-etl", label: "Tally Out ETL", section: "Tools", icon: FlaskConical },
  { href: "/manager/vendors", label: "Vendors", section: "Management", icon: Users },
  { href: "/manager/admin/users", label: "User Access", section: "Management", icon: Settings },
];

export function linksForCurrentUser() {
  const user = getAuth();
  const permissions = user?.permissions ?? [];
  return user?.role === "manager"
    ? managerLinks
    : vendorLinks.filter((link) => link.permission === null || !link.permission || permissions.includes(link.permission));
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = getAuth();
  const links = linksForCurrentUser();
  const sections = [...new Set(links.map((link) => link.section))];

  function handleLogout() {
    clearAuth();
    router.push("/login");
  }

  return (
    <aside className="hidden w-64 flex-shrink-0 flex-col bg-[#0A2330] text-white md:flex">
      <div className="border-b border-white/8 px-5 py-5">
        <BrandLogo />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {sections.map((section) => (
          <div key={section} className="mb-5 last:mb-0">
            <p className="mb-1.5 px-3 text-[10px] font-bold uppercase text-white/35">{section}</p>
            <div className="space-y-1">
              {links.filter((link) => link.section === section).map((link) => {
                const Icon = link.icon;
                const active = pathname === link.href || (link.href !== "/manager" && link.href !== "/vendor" && pathname.startsWith(`${link.href}/`));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "group relative flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                      active ? "bg-white/10 text-white" : "text-white/58 hover:bg-white/6 hover:text-white"
                    )}
                  >
                    {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-cyan-400" />}
                    <Icon className={cn("h-[18px] w-[18px]", active ? "text-cyan-300" : "text-white/38 group-hover:text-white/70")} />
                    <span className="truncate">{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/8 p-3">
        <div className="flex items-center gap-3 rounded-md px-3 py-2.5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-cyan-400/14 text-xs font-bold text-cyan-200">
            {user?.email?.slice(0, 2).toUpperCase() ?? "--"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white/85">{user?.email}</p>
            <p className="truncate text-[10px] uppercase text-white/35">{user?.role === "manager" ? "Administrator" : user?.importer_account ?? "Vendor"}</p>
          </div>
          <button onClick={handleLogout} className="rounded-md p-2 text-white/35 hover:bg-white/8 hover:text-white" title="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
