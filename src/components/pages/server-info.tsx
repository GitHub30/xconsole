"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Server, Cpu, HardDrive, Globe, Database, Mail, FolderTree, Users } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";

type ServerInfo = {
  server_id: string;
  hostname: string;
  ip_address: string;
  os: string;
  cpu: string | null;
  memory: string | null;
  apache_version: string;
  perl_versions: string[];
  php_versions: string[];
  db_versions: string[];
  name_servers: string[];
  domain_validation_token: string;
};

type ServerUsage = {
  disk: { quota_gb: number; used_gb: number; file_limit: number; file_count: number };
  counts: { domains: number; subdomains: number; mail_accounts: number; ftp_accounts: number; mysql_databases: number };
};

export function ServerInfoPage() {
  const { t } = useI18n();
  const [info, setInfo] = useState<ServerInfo | null>(null);
  const [usage, setUsage] = useState<ServerUsage | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [infoRes, usageRes] = await Promise.all([
        api.getServerInfo(),
        api.getServerUsage(),
      ]);
      setInfo(infoRes);
      setUsage(usageRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="p-6 text-muted-foreground">{t("common.loading")}</div>;
  if (!info || !usage) return <div className="p-6 text-muted-foreground">{t("common.error")}</div>;

  const diskPct = usage.disk.quota_gb > 0 ? Math.round((usage.disk.used_gb / usage.disk.quota_gb) * 100) : 0;
  const filePct = usage.disk.file_limit > 0 ? Math.round((usage.disk.file_count / usage.disk.file_limit) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">{t("nav.serverInfo")}</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("serverInfo.domains")}</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usage.counts.domains}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("serverInfo.subdomains")}</CardTitle>
            <FolderTree className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usage.counts.subdomains}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("serverInfo.mailAccounts")}</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usage.counts.mail_accounts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("serverInfo.mysqlDatabases")}</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usage.counts.mysql_databases}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              {t("serverInfo.diskUsage")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>{t("serverInfo.storage")}</span>
                <span>{usage.disk.used_gb}GB / {usage.disk.quota_gb}GB ({diskPct}%)</span>
              </div>
              <Progress value={diskPct} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>{t("serverInfo.files")}</span>
                <span>{usage.disk.file_count.toLocaleString()} / {usage.disk.file_limit === 0 ? "∞" : usage.disk.file_limit.toLocaleString()} {usage.disk.file_limit > 0 ? `(${filePct}%)` : ""}</span>
              </div>
              <Progress value={usage.disk.file_limit > 0 ? filePct : 0} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              {t("serverInfo.basic")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("serverInfo.serverId")}</dt>
                <dd className="font-mono">{info.server_id}</dd>
              </div>
              <Separator />
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("serverInfo.hostname")}</dt>
                <dd className="font-mono">{info.hostname}</dd>
              </div>
              <Separator />
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("serverInfo.ipAddress")}</dt>
                <dd className="font-mono">{info.ip_address}</dd>
              </div>
              <Separator />
              <div className="flex justify-between">
                <dt className="text-muted-foreground">OS</dt>
                <dd>{info.os}</dd>
              </div>
              {info.cpu && (<><Separator /><div className="flex justify-between">
                <dt className="text-muted-foreground">CPU</dt>
                <dd>{info.cpu}</dd>
              </div></>)}
              {info.memory && (<><Separator /><div className="flex justify-between">
                <dt className="text-muted-foreground">{t("serverInfo.memory")}</dt>
                <dd>{info.memory}</dd>
              </div></>)}
              <Separator />
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Apache</dt>
                <dd>{info.apache_version}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">PHP</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {info.php_versions.map((v) => <Badge key={v} variant="secondary">{v}</Badge>)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Perl</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {info.perl_versions.map((v) => <Badge key={v} variant="secondary">{v}</Badge>)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("serverInfo.database")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {info.db_versions.map((v) => <Badge key={v} variant="secondary">{v}</Badge>)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t("serverInfo.nameServers")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {info.name_servers.map((ns) => <Badge key={ns} variant="outline" className="font-mono">{ns}</Badge>)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t("serverInfo.domainValidationToken")}</CardTitle>
        </CardHeader>
        <CardContent>
          <code className="text-sm bg-muted px-2 py-1 rounded break-all">{info.domain_validation_token}</code>
        </CardContent>
      </Card>
    </div>
  );
}
