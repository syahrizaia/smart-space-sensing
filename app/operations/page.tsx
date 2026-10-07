"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { OperationsDashboard } from "@/components/operations/OperationsDashboard";

function OperationsPageContent() {
  const searchParams = useSearchParams();
  const section = searchParams.get("section");
  const zone = searchParams.get("zone");

  useEffect(() => {
    if (section !== "facility-status") return;

    // Beri waktu untuk merender dashboard sebelum mencari elemen tujuan.
    const timer = window.setTimeout(() => {
      document
        .getElementById("facility-status")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);

    return () => window.clearTimeout(timer);
  }, [section]);

  return <OperationsDashboard initialZoneId={zone ?? null} />;
}

export default function OperationsPage() {
  // useSearchParams berada di dalam Suspense agar prerendering Next.js tetap berjalan.
  return (
    <Suspense fallback={<div className="min-h-64" aria-label="Memuat Operations" />}>
      <OperationsPageContent />
    </Suspense>
  );
}
