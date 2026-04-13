"use client";

import { useMemo, useState } from "react";

interface HasCreatedAt {
  created_at: string;
}

export function useDateFilter<T extends HasCreatedAt>(data: T[] | undefined) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filtered = useMemo(() => {
    if (!data) return undefined;
    if (!dateFrom && !dateTo) return data;

    return data.filter((row) => {
      const d = row.created_at.slice(0, 10);
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    });
  }, [data, dateFrom, dateTo]);

  return { filtered, dateFrom, dateTo, setDateFrom, setDateTo };
}
