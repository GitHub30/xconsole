"use client";

import { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Globe, Earth, Database, Mail, HardDrive, Shield, Clock, FileText, FolderTree, Menu, LogOut, MailIcon, Terminal as TerminalIcon, Server } from "lucide-react";

const WordPressIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement> & { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25.925 25.925" fill="currentColor" className={className} width="24" height="24" {...props}>
    <path d="M1.843,12.962c0,4.401,2.557,8.205,6.267,10.008L2.805,8.437C2.189,9.819,1.843,11.35,1.843,12.962z M20.469,12.4c0-1.374-0.493-2.326-0.917-3.066c-0.563-0.917-1.092-1.691-1.092-2.608c0-1.021,0.775-1.973,1.867-1.973 c0.049,0,0.096,0.006,0.145,0.008c-1.979-1.813-4.615-2.919-7.509-2.919c-3.885,0-7.303,1.993-9.291,5.013 c0.261,0.008,0.507,0.013,0.716,0.013c1.163,0,2.963-0.142,2.963-0.142c0.599-0.035,0.67,0.846,0.071,0.917 c0,0-0.603,0.07-1.272,0.105l4.049,12.045l2.434-7.298l-1.732-4.747c-0.599-0.035-1.167-0.105-1.167-0.105 c-0.6-0.036-0.529-0.953,0.07-0.917c0,0,1.836,0.142,2.928,0.142c1.163,0,2.964-0.142,2.964-0.142 c0.6-0.035,0.67,0.846,0.071,0.917c0,0-0.604,0.07-1.272,0.105l4.018,11.953l1.11-3.706C20.187,14.55,20.469,13.353,20.469,12.4z M13.158,13.935l-3.337,9.694c0.997,0.293,2.05,0.453,3.142,0.453c1.294,0,2.537-0.224,3.693-0.63 c-0.029-0.048-0.057-0.099-0.08-0.153L13.158,13.935z M22.72,7.627c0.049,0.354,0.075,0.734,0.075,1.144 c0,1.128-0.212,2.396-0.846,3.982l-3.396,9.82c3.306-1.928,5.529-5.509,5.529-9.611C24.082,11.028,23.588,9.21,22.72,7.627z" />
    <path d="M0,12.962c0,7.147,5.815,12.963,12.962,12.963c7.149,0,12.963-5.816,12.963-12.963 S20.111,0,12.963,0S0,5.814,0,12.962z M0.594,12.962c0-6.819,5.548-12.368,12.368-12.368s12.369,5.549,12.369,12.368 S19.782,25.33,12.963,25.33S0.594,19.781,0.594,12.962z" />
  </svg>
);
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ThemeToggle } from "@/components/theme-toggle";
import { useI18n } from "@/lib/i18n";
import { api, getServername, getServernamePrefix } from "@/lib/api";

const navItems = [
  { href: "/", labelKey: "nav.domains", icon: Globe },
  { href: "/subdomains", labelKey: "nav.subdomains", icon: FolderTree },
  { href: "/logs", labelKey: "nav.logs", icon: FileText },
  { href: "/dns", labelKey: "nav.dns", icon: Earth },
  { href: "/mail", labelKey: "nav.mail", icon: Mail },
  { href: "/ftp", labelKey: "nav.ftp", icon: HardDrive },
  { href: "/mysql", labelKey: "nav.mysql", icon: Database },
  { href: "/wordpress", labelKey: "nav.wordpress", icon: WordPressIcon },
  { href: "/cron", labelKey: "nav.cron", icon: Clock },
  { href: "/ssl", labelKey: "nav.ssl", icon: Shield },
  { href: "/server-info", labelKey: "nav.serverInfo", icon: Server },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const [usage, setUsage] = useState<{ used_gb: number; quota_gb: number } | null>(null);
  const [serverLabel, setServerLabel] = useState("");

  useEffect(() => setServerLabel(getServername()), []);

  const qs = searchParams.toString();
  const queryString = qs ? `?${qs}` : "";

  useEffect(() => {
    api.getServerUsage().then((data) => setUsage(data.disk)).catch(() => {});
  }, []);

  const pct = usage ? Math.round((usage.used_gb / usage.quota_gb) * 100) : 0;

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center gap-2">
        <img src="https://i.imgur.com/c8aHyTO.png" alt="XServer" className="h-16" />
        <p className="text-xs text-muted-foreground truncate">{serverLabel}</p>
      </div>
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={`${item.href}${queryString}`}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>
      {usage && (
        <div className="p-4 border-t space-y-2">
          <div className="text-xs text-muted-foreground">
            {t("common.usage")} {usage.used_gb}GB / {usage.quota_gb}GB ({pct}%)
          </div>
          <Progress value={pct} className="h-2" />
        </div>
      )}
    </div>
  );
}

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { t, lang, setLang, languages, langLabel } = useI18n();
  const searchParams = useSearchParams();
  const [ftpOpen, setFtpOpen] = useState(false);
  const [sshOpen, setSshOpen] = useState(false);
  const [ftpPassword, setFtpPassword] = useState("");
  const [sshKey, setSshKey] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const savedFtp = localStorage.getItem("ftp_password");
    if (savedFtp) setFtpPassword(savedFtp);
    const savedSsh = localStorage.getItem("ssh_key");
    if (savedSsh) setSshKey(savedSsh);
  }, []);

  const handleFtpConnect = () => {
    localStorage.setItem("ftp_password", ftpPassword);
    const prefix = getServernamePrefix();
    const hostname = getServername();
    window.open(`https://github30.github.io/web-ftp/?username=${encodeURIComponent(prefix)}&password=${encodeURIComponent(ftpPassword)}&hostname=${encodeURIComponent(hostname)}&port=10021`, "_blank");
    setFtpOpen(false);
  };

  const handleSshConnect = () => {
    localStorage.setItem("ssh_key", sshKey);
    const prefix = getServernamePrefix();
    const hostname = getServername();
    window.open(`https://opencloudshell.com/c.php?port=10022&destination=${encodeURIComponent(prefix)}%40${encodeURIComponent(hostname)}&key=${encodeURIComponent(sshKey)}`, "_blank");
    setSshOpen(false);
  };

  const handleLogout = () => {
    window.location.href = "/";
  };

  const qs = searchParams.toString();
  const queryString = qs ? `?${qs}` : "";

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-60 md:flex-col border-r bg-sidebar">
        <SidebarContent />
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b flex items-center justify-between px-4 bg-background shrink-0">
          <div className="flex items-center gap-2">
            {/* Mobile Menu */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-60 p-0">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <SidebarContent onNavigate={() => setSheetOpen(false)} />
              </SheetContent>
            </Sheet>
            <h1 className="text-lg font-semibold md:hidden">XServer</h1>
          </div>

          <div className="flex items-center gap-1">
            {/* Language Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs">
                  {langLabel(lang)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {languages.map((l) => (
                  <DropdownMenuItem key={l} onClick={() => setLang(l)}>
                    {langLabel(l)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <ThemeToggle />

            {/* Mail icon */}
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/mail${queryString}`}>
                <MailIcon className="h-5 w-5" />
              </Link>
            </Button>

            {/* FTP */}
            <Button variant="ghost" size="icon" onClick={() => setFtpOpen(true)}>
              <HardDrive className="h-5 w-5" />
            </Button>

            {/* SSH */}
            <Button variant="ghost" size="icon" onClick={() => setSshOpen(true)}>
              <TerminalIcon className="h-5 w-5" />
            </Button>

            {/* Logout */}
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>

      {/* FTP Modal */}
      <Dialog open={ftpOpen} onOpenChange={setFtpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("header.ftp")}</DialogTitle>
            <DialogDescription>
              <a href="https://secure.xserver.ne.jp/xinfo/?action_reissue_server_index=true" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                {t("header.ftpPasswordReset")}
              </a>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("header.ftpPassword")}</Label>
              <Input type="password" value={ftpPassword} onChange={(e) => setFtpPassword(e.target.value)} />
            </div>
            <Button onClick={handleFtpConnect} className="w-full">{t("common.connect")}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* SSH Modal */}
      <Dialog open={sshOpen} onOpenChange={setSshOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("header.ssh")}</DialogTitle>
            <DialogDescription>
              <a href="https://www.xserver.ne.jp/manual/man_server_ssh.php" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                {t("header.sshManual")}
              </a>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("header.sshRequest")}</p>
            <p className="text-sm">
              <a href="https://www.xserver.ne.jp/news_detail.php?view_id=11602" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                {t("header.sshRequestLink")}
              </a>
            </p>
            <div>
              <Label>{t("header.sshPrivateKey")}</Label>
              <Textarea rows={6} value={sshKey} onChange={(e) => setSshKey(e.target.value)} placeholder="-----BEGIN OPENSSH PRIVATE KEY-----" />
            </div>
            <Button onClick={handleSshConnect} className="w-full">{t("common.connect")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
