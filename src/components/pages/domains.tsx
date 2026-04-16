"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";

type Domain = { domain: string; type: string; ssl: boolean; memo: string; is_awaiting: boolean };
type AccessData = { domain: string; count: number; hourly: number[] };

function Sparkline({ data }: { data: number[] }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const w = 80, h = 24;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="inline-block">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-chart-1" />
    </svg>
  );
}

function parseAccessLog(log: string): { count: number; hourly: number[] } {
  const lines = log.split("\n").filter(Boolean);
  const hourly = new Array(24).fill(0);
  for (const line of lines) {
    const m = line.match(/\[(\d{2})\/\w+\/\d{4}:(\d{2}):/);
    if (m) hourly[parseInt(m[2])]++;
  }
  return { count: lines.length, hourly };
}

export function DomainsPage() {
  const { t } = useI18n();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [accessData, setAccessData] = useState<Record<string, AccessData>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [newMemo, setNewMemo] = useState("");
  const [newRedirectHttps, setNewRedirectHttps] = useState(true);
  const [newAiCrawlerBlock, setNewAiCrawlerBlock] = useState(true);
  const [editMemo, setEditMemo] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteFiles, setDeleteFiles] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.getDomains();
      setDomains(res.domains);
      // Fetch access logs for each domain
      const accessMap: Record<string, AccessData> = {};
      await Promise.all(
        res.domains.map(async (d) => {
          try {
            const logRes = await api.getAccessLog(d.domain, 500);
            const parsed = parseAccessLog(logRes.log);
            accessMap[d.domain] = { domain: d.domain, ...parsed };
          } catch {
            accessMap[d.domain] = { domain: d.domain, count: 0, hourly: [] };
          }
        })
      );
      setAccessData(accessMap);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async () => {
    if (!newDomain) return;
    await api.createDomain({ domain: newDomain, ssl: true, redirect_https: newRedirectHttps, ai_crawler_block_enabled: newAiCrawlerBlock, memo: newMemo });
    setNewDomain("");
    setNewMemo("");
    setNewRedirectHttps(true);
    setNewAiCrawlerBlock(true);
    setShowAdd(false);
    fetchData();
  };

  const handleDelete = async (domain: string) => {
    setDeleteTarget(domain);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await api.deleteDomain(deleteTarget, { delete_files: deleteFiles });
    setDeleteTarget(null);
    setDeleteFiles(false);
    fetchData();
  };

  const handleDeleteSelected = async () => {
    await Promise.all(Array.from(selected).map((d) => api.deleteDomain(d)));
    setSelected(new Set());
    fetchData();
  };

  const handleUpdateMemo = async (domain: string) => {
    await api.updateDomain(domain, { memo: editMemo });
    setExpanded(null);
    fetchData();
  };

  const toggleSelect = (domain: string) => {
    const next = new Set(selected);
    if (next.has(domain)) next.delete(domain);
    else next.add(domain);
    setSelected(next);
  };

  const toggleSelectAll = () => {
    if (selected.size === domains.length) setSelected(new Set());
    else setSelected(new Set(domains.map((d) => d.domain)));
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t("nav.domains")}</h2>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
              <Trash2 className="h-4 w-4 mr-1" /> {t("common.deleteSelected")}
            </Button>
          )}
          <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="h-4 w-4 mr-1" /> {t("common.add")}
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={selected.size === domains.length && domains.length > 0} onCheckedChange={toggleSelectAll} />
              </TableHead>
              <TableHead>{t("domain.name")}</TableHead>
              <TableHead>{t("domain.type")}</TableHead>
              <TableHead>{t("domain.ssl")}</TableHead>
              <TableHead>{t("domain.access")}</TableHead>
              <TableHead></TableHead>
              <TableHead>{t("common.memo")}</TableHead>
              <TableHead className="w-20">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {showAdd && (
              <TableRow>
                <TableCell />
                <TableCell>
                  <Input placeholder="example.com" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} className="h-8" />
                </TableCell>
                <TableCell />
                <TableCell />
                <TableCell />
                <TableCell />
                <TableCell>
                  <div className="space-y-2">
                    <Input placeholder={t("common.memo")} value={newMemo} onChange={(e) => setNewMemo(e.target.value)} className="h-8" />
                    <div className="flex items-center gap-2"><Switch checked={newRedirectHttps} onCheckedChange={setNewRedirectHttps} /><Label className="text-xs">HTTPS転送</Label></div>
                    <div className="flex items-center gap-2"><Switch checked={newAiCrawlerBlock} onCheckedChange={setNewAiCrawlerBlock} /><Label className="text-xs">AIクローラー遮断</Label></div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant="default" onClick={handleAdd}>{t("common.save")}</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>{t("common.cancel")}</Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {domains.map((d) => (
              <Fragment key={d.domain}>
                <TableRow>
                  <TableCell>
                    <Checkbox checked={selected.has(d.domain)} onCheckedChange={() => toggleSelect(d.domain)} />
                  </TableCell>
                  <TableCell className="font-medium">{d.domain}</TableCell>
                  <TableCell><Badge variant="secondary">{d.type}</Badge></TableCell>
                  <TableCell>
                    {d.ssl ? <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">SSL</Badge> : <Badge variant="outline">-</Badge>}
                  </TableCell>
                  <TableCell>{accessData[d.domain]?.count ?? "-"}</TableCell>
                  <TableCell>
                    <Sparkline data={accessData[d.domain]?.hourly ?? []} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm truncate max-w-[150px]">{d.memo}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (expanded === d.domain) {
                          setExpanded(null);
                        } else {
                          setExpanded(d.domain);
                          setEditMemo(d.memo);
                        }
                      }}
                    >
                      {expanded === d.domain ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      {t("common.edit")}
                    </Button>
                  </TableCell>
                </TableRow>
                {expanded === d.domain && (
                  <TableRow key={`${d.domain}-edit`}>
                    <TableCell colSpan={8} className="bg-muted/50">
                      <div className="p-4 space-y-3">
                        <div>
                          <label className="text-sm font-medium">{t("common.memo")}</label>
                          <Input value={editMemo} onChange={(e) => setEditMemo(e.target.value)} className="mt-1" />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleUpdateMemo(d.domain)}>{t("common.save")}</Button>
                          <Button size="sm" variant="ghost" onClick={() => setExpanded(null)}>{t("common.cancel")}</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(d.domain)}>{t("common.delete")}</Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => { setDeleteTarget(null); setDeleteFiles(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("common.delete")}</DialogTitle>
            <DialogDescription>{deleteTarget}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <Checkbox checked={deleteFiles} onCheckedChange={(v) => setDeleteFiles(!!v)} />
              ユーザー公開領域のドメインディレクトリも削除する
            </label>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => { setDeleteTarget(null); setDeleteFiles(false); }}>{t("common.cancel")}</Button>
              <Button variant="destructive" onClick={confirmDelete}>{t("common.delete")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
