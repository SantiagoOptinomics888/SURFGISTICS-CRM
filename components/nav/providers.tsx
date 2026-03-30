"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Refetch every 15s — CRM reacts to API calls in near real-time
            refetchInterval: 15_000,
            // Also refetch when the tab regains focus
            refetchOnWindowFocus: true,
            // Keep stale data showing while refreshing
            staleTime: 10_000,
          },
        },
      })
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
