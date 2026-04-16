"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";

type LogEntry = { time: string; type: "access" | "error"; raw: string; timestamp: number };

const MONTHS: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

function parseAccessLogLines(log: string): LogEntry[] {
  return log.split("\n").filter(Boolean).map((line) => {
    // Format: [14/Apr/2026:16:19:30 +0900]
    const m = line.match(/\[(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})\s+([+-]\d{4})\]/);
    let time = "";
    let ts = 0;
    if (m) {
      const [, day, mon, year, hh, mm, ss] = m;
      const monthIdx = MONTHS[mon] ?? 0;
      ts = new Date(+year, monthIdx, +day, +hh, +mm, +ss).getTime();
      time = `${year}-${String(monthIdx + 1).padStart(2, "0")}-${day} ${hh}:${mm}:${ss}`;
    }
    return { time, type: "access" as const, raw: line, timestamp: ts };
  });
}

function parseErrorLogLines(log: string): LogEntry[] {
  return log.split("\n").filter(Boolean).map((line) => {
    // Format: [Tue Apr 14 09:00:08.435068 2026]
    const m = line.match(/\[\w+ (\w+) (\d+) (\d{2}):(\d{2}):(\d{2})[\d.]* (\d{4})\]/);
    let time = "";
    let ts = 0;
    if (m) {
      const [, mon, day, hh, mm, ss, year] = m;
      const monthIdx = MONTHS[mon] ?? 0;
      ts = new Date(+year, monthIdx, +day, +hh, +mm, +ss).getTime();
      time = `${year}-${String(monthIdx + 1).padStart(2, "0")}-${day.padStart(2, "0")} ${hh}:${mm}:${ss}`;
    }
    return { time, type: "error" as const, raw: line, timestamp: ts };
  });
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

      const accessEntries = parseAccessLogLines(accessRes.log);
      const errorEntries = parseErrorLogLines(errorRes.log);
      const merged = [...accessEntries, ...errorEntries].sort((a, b) => b.timestamp - a.timestamp);
      setEntries(merged);

      // Build hourly chart data
      const hourly = new Array(24).fill(0);
      accessEntries.forEach((e) => {
        const m = e.raw.match(/:(\d{2}):\d{2}:\d{2}/);
        if (m) hourly[parseInt(m[1])]++;
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
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Merged Log Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">{t("ssl.type")}</TableHead>
              <TableHead className="w-44">日時</TableHead>
              <TableHead>{t("logs.merged")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.slice(0, 200).map((entry, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Badge variant={entry.type === "error" ? "destructive" : "secondary"}>
                    {entry.type === "access" ? t("logs.accessLog") : t("logs.errorLog")}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs whitespace-nowrap">{entry.time}</TableCell>
                <TableCell className="font-mono text-xs whitespace-pre-wrap break-all">{entry.raw}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
