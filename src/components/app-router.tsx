"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/lib/i18n";
import { DashboardLayout } from "@/components/dashboard-layout";
import { LoginPage } from "@/components/pages/login";
import { DomainsPage } from "@/components/pages/domains";
import { SubdomainsPage } from "@/components/pages/subdomains";
import { LogsPage } from "@/components/pages/logs";
import { DnsPage } from "@/components/pages/dns";
import { MailPage } from "@/components/pages/mail";
import { FtpPage } from "@/components/pages/ftp";
import { MysqlPage } from "@/components/pages/mysql";
import { WordPressPage } from "@/components/pages/wordpress";
import { CronPage } from "@/components/pages/cron";
import { SslPage } from "@/components/pages/ssl";
import { ServerInfoPage } from "@/components/pages/server-info";

function getPageFromPath(pathname: string) {
  const path = pathname === "/" ? "/" : pathname.replace(/\/$/, "");
  switch (path) {
    case "/login": return "login";
    case "/": return "domains";
    case "/subdomains": return "subdomains";
    case "/logs": return "logs";
    case "/dns": return "dns";
    case "/mail": return "mail";
    case "/ftp": return "ftp";
    case "/mysql": return "mysql";
    case "/wordpress": return "wordpress";
    case "/cron": return "cron";
    case "/ssl": return "ssl";
    case "/server-info": return "server-info";
    default: return "domains";
  }
}

function PageContent({ page }: { page: string }) {
  switch (page) {
    case "domains": return <DomainsPage />;
    case "subdomains": return <SubdomainsPage />;
    case "logs": return <LogsPage />;
    case "dns": return <DnsPage />;
    case "mail": return <MailPage />;
    case "ftp": return <FtpPage />;
    case "mysql": return <MysqlPage />;
    case "wordpress": return <WordPressPage />;
    case "cron": return <CronPage />;
    case "ssl": return <SslPage />;
    case "server-info": return <ServerInfoPage />;
    default: return <DomainsPage />;
  }
}

export function AppRouter() {
  const searchParams = useSearchParams();
  const [currentPage, setCurrentPage] = useState("domains");

  const servername = searchParams.get("servername");
  const apiKey = searchParams.get("api_key");
  const isLoggedIn = !!(servername && apiKey);

  useEffect(() => {
    const updatePage = () => {
      setCurrentPage(getPageFromPath(window.location.pathname));
    };
    updatePage();
    window.addEventListener("popstate", updatePage);
    return () => window.removeEventListener("popstate", updatePage);
  }, []);

  // Listen for route changes via Next.js Link
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setCurrentPage(getPageFromPath(window.location.pathname));
    });
    observer.observe(document.querySelector("head > title") || document.head, { childList: true, subtree: true });
    
    // Also check on pathname changes
    const interval = setInterval(() => {
      setCurrentPage(getPageFromPath(window.location.pathname));
    }, 200);
    
    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  return (
    <ThemeProvider>
      <I18nProvider>
        {!isLoggedIn ? (
          <LoginPage />
        ) : (
          <DashboardLayout>
            <PageContent page={currentPage} />
          </DashboardLayout>
        )}
      </I18nProvider>
    </ThemeProvider>
  );
}
