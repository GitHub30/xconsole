"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Settings2 } from "lucide-react";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";

type LogEntry = {
  time: string;
  timestamp: number;
  type: "access" | "error";
  status: number;
  statusText: string;
  host: string;
  request: string;
  remoteHost: string;
  user: string;
  bytes: string;
  referer: string;
  useragent: string;
  raw: string;
};

type ColumnKey = "time" | "statusText" | "request" | "host" | "remoteHost" | "user" | "bytes" | "referer" | "useragent";

const COLUMNS: { key: ColumnKey; i18nKey: string; className: string }[] = [
  { key: "time", i18nKey: "logs.col.time", className: "w-44 whitespace-nowrap" },
  { key: "statusText", i18nKey: "logs.col.status", className: "w-28" },
  { key: "request", i18nKey: "logs.col.request", className: "whitespace-pre-wrap break-all" },
  { key: "host", i18nKey: "logs.col.host", className: "w-48" },
  { key: "remoteHost", i18nKey: "logs.col.remoteHost", className: "w-40" },
  { key: "user", i18nKey: "logs.col.user", className: "w-28" },
  { key: "bytes", i18nKey: "logs.col.bytes", className: "w-24" },
  { key: "referer", i18nKey: "logs.col.referer", className: "break-all" },
  { key: "useragent", i18nKey: "logs.col.useragent", className: "break-all" },
];

const DEFAULT_VISIBLE: ColumnKey[] = ["time", "statusText", "request", "host"];

const MONTHS: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

// LogFormat "%v %h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-Agent}i\"" vhost
const ACCESS_LOG_REGEX = /(?<vhost>\S+)\s+(?<host>\S+)\s+(?<logname>\S+)\s+(?<user>\S+)\s+\[(?<day>\d{2})\/(?<mon>\w{3})\/(?<year>\d{4}):(?<hh>\d{2}):(?<mm>\d{2}):(?<ss>\d{2})\s+[+-]\d{4}\]\s+"(?<request>[^"]*)"\s+(?<status>\d+)\s+(?<bytes>\S+)\s+"(?<referer>[^"]*)"\s+"(?<useragent>[^"]*)"/g;

// ErrorLogFormat "[%{u}t] [%-m:%l] [pid %P:tid %T] %7F: %E: [client\ %a] %M% ,\ referer\ %{Referer}i"
const ERROR_LOG_REGEX = /\[(?<weekday>\w+)\s+(?<mon>\w+)\s+(?<day>\d{1,2})\s+(?<hh>\d{2}):(?<mm>\d{2}):(?<ss>\d{2})\.\d+\s+(?<year>\d{4})\]\s+\[(?<module>[^:]+):(?<level>[^\]]+)\]\s+\[pid\s+(?<pid>\d+):tid\s+(?<tid>\w+)\]\s+(?<detail>.+)/g;

function errorLevelToStatus(level: string): number {
  const l = level.trim().toLowerCase();
  if (l === "emerg" || l === "alert" || l === "crit" || l === "error") return 500;
  if (l === "warn") return 400;
  return 200;
}

function getStatusColor(status: number): string {
  if (status < 400) return "#22c55e";
  if (status < 500) return "#f97316";
  return "#ef4444";
}

function parseAccessLog(log: string): LogEntry[] {
  const entries: LogEntry[] = [];
  for (const match of log.matchAll(ACCESS_LOG_REGEX)) {
    const g = match.groups!;
    const monthIdx = MONTHS[g.mon] ?? 0;
    const ts = new Date(+g.year, monthIdx, +g.day, +g.hh, +g.mm, +g.ss).getTime();
    const time = `${g.year}-${String(monthIdx + 1).padStart(2, "0")}-${g.day} ${g.hh}:${g.mm}:${g.ss}`;
    entries.push({
      time,
      timestamp: ts,
      type: "access",
      status: parseInt(g.status),
      statusText: g.status,
      host: g.vhost,
      request: g.request,
      remoteHost: g.host,
      user: g.user,
      bytes: g.bytes,
      referer: g.referer,
      useragent: g.useragent,
      raw: match[0],
    });
  }
  return entries;
}

function parseErrorLog(log: string): LogEntry[] {
  const entries: LogEntry[] = [];
  for (const match of log.matchAll(ERROR_LOG_REGEX)) {
    const g = match.groups!;
    const monthIdx = MONTHS[g.mon] ?? 0;
    const day = g.day.padStart(2, "0");
    const ts = new Date(+g.year, monthIdx, +day, +g.hh, +g.mm, +g.ss).getTime();
    const time = `${g.year}-${String(monthIdx + 1).padStart(2, "0")}-${day} ${g.hh}:${g.mm}:${g.ss}`;
    const level = g.level.trim();
    const clientMatch = g.detail.match(/\[client\s+(?<client>[^\]]+)\]/);
    const client = clientMatch?.groups?.client || "-";
    const message = g.detail.replace(/^.*\[client\s+[^\]]+\]\s*/, "") || g.detail;
    entries.push({
      time,
      timestamp: ts,
      type: "error",
      status: errorLevelToStatus(level),
      statusText: `${g.module}:${level}`,
      host: client,
      request: message.trim(),
      remoteHost: client,
      user: "-",
      bytes: "-",
      referer: "-",
      useragent: "-",
      raw: match[0],
    });
  }
  return entries;
}

function downloadLog(content: string, prefix: string) {
  const now = new Date();
  const ts = now.toISOString().replace(/[-:]/g, "").replace("T", "T").split(".")[0];
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${prefix}${ts}.log`;
  a.click();
  URL.revokeObjectURL(url);
}

export function LogsPage() {
  const { t } = useI18n();
  const [domains, setDomains] = useState<string[]>([]);
  const [selectedDomain, setSelectedDomain] = useState("");
  const [keyword, setKeyword] = useState("");
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [accessRaw, setAccessRaw] = useState("");
  const [errorRaw, setErrorRaw] = useState("");
  const [chartData, setChartData] = useState<{ hour: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCols, setVisibleCols] = useState<ColumnKey[]>(DEFAULT_VISIBLE);
  const [hoveredEntry, setHoveredEntry] = useState<LogEntry | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const toggleCol = (key: ColumnKey) => {
    setVisibleCols((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setSelectedEntry(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    api.getDomains().then((res) => {
      const names = res.domains.map((d) => d.domain);
      setDomains(names);
      if (names.length > 0) setSelectedDomain(names[0]);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const fetchLogs = useCallback(async () => {
    if (!selectedDomain) return;
    setLoading(true);
    try {
      const [accessRes, errorRes] = await Promise.all([
        api.getAccessLog(selectedDomain, 1000, keyword || undefined),
        api.getErrorLog(selectedDomain, 1000, keyword || undefined),
      ]);
      setAccessRaw(accessRes.log);
      setErrorRaw(errorRes.log);

      const accessEntries = parseAccessLog(accessRes.log);
      const errorEntries = parseErrorLog(errorRes.log);
      const merged = [...accessEntries, ...errorEntries].sort((a, b) => b.timestamp - a.timestamp);
      setEntries(merged);

      // Build hourly chart data
      const hourly = new Array(24).fill(0);
      accessEntries.forEach((e) => {
        const hour = parseInt(e.time.split(" ")[1]?.split(":")[0] || "0");
        hourly[hour]++;
      });
      setChartData(hourly.map((count, i) => ({ hour: `${i}:00`, count })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedDomain, keyword]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  if (loading && !domains.length) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold">{t("nav.logs")}</h2>
        <div className="flex items-center gap-2">
          <Select value={selectedDomain} onValueChange={setSelectedDomain}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t("logs.domain")} />
            </SelectTrigger>
            <SelectContent>
              {domains.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder={t("logs.keyword") || "キーワード"}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-[200px]"
          />
          <Button size="sm" variant="outline" onClick={() => downloadLog(accessRaw, "access")}>
            <Download className="h-4 w-4 mr-1" /> {t("logs.accessLog")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => downloadLog(errorRaw, "error")}>
            <Download className="h-4 w-4 mr-1" /> {t("logs.errorLog")}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <Settings2 className="h-4 w-4 mr-1" /> {t("logs.columns")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {COLUMNS.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.key}
                  checked={visibleCols.includes(col.key)}
                  onCheckedChange={() => toggleCol(col.key)}
                >
                  {t(col.i18nKey)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Access Chart */}
      {chartData.length > 0 && (
        <div className="border rounded-lg p-4">
          <h3 className="text-sm font-medium mb-2">{t("logs.graph")}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={false} />
              {(selectedEntry || hoveredEntry) && (
                <ReferenceLine
                  x={`${new Date((selectedEntry || hoveredEntry)!.timestamp).getHours()}:00`}
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Merged Log Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.filter((c) => visibleCols.includes(c.key)).map((col) => (
                <TableHead key={col.key} className={col.className}>{t(col.i18nKey)}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.slice(0, 200).map((entry, i) => (
              <TableRow
                key={i}
                style={{ borderLeft: `2px solid ${getStatusColor(entry.status)}` }}
                className="relative group cursor-pointer"
                onMouseEnter={() => setHoveredEntry(entry)}
                onMouseLeave={() => setHoveredEntry(null)}
                onClick={(e) => {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setTooltipPos({ left: rect.left, top: rect.top - 4 });
                  setSelectedEntry(selectedEntry === entry ? null : entry);
                }}
              >
                {COLUMNS.filter((c) => visibleCols.includes(c.key)).map((col) => (
                  <TableCell key={col.key} className={`font-mono text-xs ${col.className}`}>{entry[col.key]}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Log detail tooltip */}
      {selectedEntry && (
        <div
          ref={tooltipRef}
          className="fixed z-50 max-w-[80vw] px-3 py-2 text-xs font-mono bg-popover text-popover-foreground border rounded-md shadow-lg whitespace-pre"
          style={{ left: tooltipPos.left, top: tooltipPos.top, transform: "translateY(-100%)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {COLUMNS.map((col) => (
            <div key={col.key}>
              <span className="text-muted-foreground">{t(col.i18nKey)}: </span>
              <span>{selectedEntry[col.key]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
