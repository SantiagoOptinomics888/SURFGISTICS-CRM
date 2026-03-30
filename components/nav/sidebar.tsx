"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearAuth, getAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const vendorLinks = [
  { href: "/vendor", label: "Dashboard" },
  { href: "/vendor/arts-parts", label: "Arts & Parts" },
  { href: "/vendor/ftz-line-items", label: "FTZ Line Items" },
  { href: "/vendor/inbonds", label: "In-Bond" },
  { href: "/vendor/tally-out", label: "Tally Out" },
];

const managerLinks = [
  { href: "/manager", label: "Dashboard" },
  { href: "/manager/vendors", label: "Vendors" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = getAuth();
  const links = user?.role === "manager" ? managerLinks : vendorLinks;

  function handleLogout() {
    clearAuth();
    router.push("/login");
  }

  return (
    <aside className="w-56 min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="px-6 py-5 border-b border-gray-700">
        <p className="text-lg font-bold">Surfgistics</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{user?.email}</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "block px-3 py-2 rounded-md text-sm font-medium transition-colors",
              pathname === href
                ? "bg-gray-700 text-white"
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-gray-700">
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-gray-300 hover:text-white hover:bg-gray-800"
          onClick={handleLogout}
        >
          Log out
        </Button>
      </div>
    </aside>
  );
}
