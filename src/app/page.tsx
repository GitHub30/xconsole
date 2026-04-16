"use client";

import { Suspense } from "react";
import { AppRouter } from "@/components/app-router";

export default function Page() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <AppRouter />
    </Suspense>
  );
}
