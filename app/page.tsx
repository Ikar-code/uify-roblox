"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/store";

export default function Index() {
  const router = useRouter();
  useEffect(() => {
    router.replace(getUser() ? "/home" : "/login");
  }, [router]);
  return <div className="splash">Chargement…</div>;
}
