"use client";

import { usePathname } from "next/navigation";
import { CircleCheck, Hash } from "lucide-react";
import { getAuth } from "@/lib/auth";
import { managerLinks, vendorLinks } from "./sidebar";

export default function AppTopbar() {
  const pathname = usePathname();
  const user = getAuth();
  const link = [...managerLinks, ...vendorLinks].find((item) => item.href === pathname);

  return (
    <div className="sticky top-0 z-20 hidden h-16 items-center justify-between border-b border-[#DDE6E9] bg-white/95 px-8 backdrop-blur md:flex">
      <div>
        <p className="text-[11px] font-bold uppercase text-[#7B8F97]">{link?.section ?? "Workspace"}</p>
        <p className="text-sm font-semibold text-[#142B35]">{link?.label ?? "Surfgistics CRM"}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#397265]">
          <CircleCheck className="h-4 w-4 text-[#24A17A]" /> Systems connected
        </span>
        {user?.importer_account && (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-[#DDE6E9] bg-[#F7FAFA] px-2.5 py-1.5 font-mono text-xs font-semibold text-[#31515D]">
            <Hash className="h-3.5 w-3.5 text-[#0C91B6]" /> {user.importer_account}
          </span>
        )}
      </div>
    </div>
  );
}
