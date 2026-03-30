"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function LiveBadge() {
  const queryClient = useQueryClient();
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [pulse, setPulse] = useState(false);

  // Track whenever any query refreshes
  useEffect(() => {
    const unsub = queryClient.getQueryCache().subscribe(() => {
      setLastSync(new Date());
      setPulse(true);
      setTimeout(() => setPulse(false), 800);
    });
    return unsub;
  }, [queryClient]);

  const [display, setDisplay] = useState("just now");
  useEffect(() => {
    const t = setInterval(() => {
      const secs = Math.floor((Date.now() - lastSync.getTime()) / 1000);
      if (secs < 5) setDisplay("just now");
      else if (secs < 60) setDisplay(`${secs}s ago`);
      else setDisplay(`${Math.floor(secs / 60)}m ago`);
    }, 1000);
    return () => clearInterval(t);
  }, [lastSync]);

  return (
    <div className="flex items-center gap-2">
      <span className={`relative flex h-2 w-2 ${pulse ? "scale-125" : ""} transition-transform duration-200`}>
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <span className="text-xs text-[#64748B]">
        Live · synced <span className="font-medium text-[#334155]">{display}</span>
      </span>
    </div>
  );
}
