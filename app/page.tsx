"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuth, roleRedirect } from "@/lib/auth";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const user = getAuth();
    if (user) {
      router.replace(roleRedirect(user.role));
    } else {
      router.replace("/login");
    }
  }, [router]);

  return null;
}
