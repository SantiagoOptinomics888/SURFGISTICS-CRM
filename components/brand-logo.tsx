import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandLogo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/8 ring-1 ring-white/12">
        <Image
          src="/brand/surfgistics-mark.png"
          alt=""
          width={34}
          height={34}
          priority
          className="h-[34px] w-[34px] object-contain"
        />
      </div>
      {!compact && (
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold text-white">Surfgistics</p>
          <p className="truncate text-[10px] font-semibold uppercase text-cyan-200/65">Trade operations</p>
        </div>
      )}
    </div>
  );
}
