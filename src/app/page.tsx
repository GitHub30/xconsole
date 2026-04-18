"use client";

import { Suspense } from "react";
import { AppRouter } from "@/components/app-router";
import { Loader2 } from "lucide-react";

export default function Page() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <AppRouter />
    </Suspense>
  );
}
