import { Suspense } from "react";
import { AppRouter } from "@/components/app-router";
import { Loader2 } from "lucide-react";

export function generateStaticParams() {
  return [
    { slug: ["login"] },
    { slug: ["subdomains"] },
    { slug: ["logs"] },
    { slug: ["dns"] },
    { slug: ["mail"] },
    { slug: ["ftp"] },
    { slug: ["mysql"] },
    { slug: ["wordpress"] },
    { slug: ["cron"] },
    { slug: ["ssl"] },
    { slug: ["server-info"] },
  ];
}

export default function CatchAllPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <AppRouter />
    </Suspense>
  );
}
