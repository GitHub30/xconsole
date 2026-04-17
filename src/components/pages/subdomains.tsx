"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";

type Subdomain = { subdomain: string; domain: string; document_root: string; ssl: boolean; memo: string };

export function SubdomainsPage() {
  const { t } = useI18n();
  const [subdomains, setSubdomains] = useState<Subdomain[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newSubdomain, setNewSubdomain] = useState("");
  const [newMemo, setNewMemo] = useState("");
  const [editMemo, setEditMemo] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteFiles, setDeleteFiles] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.getSubdomains();
      setSubdomains(res.subdomains);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async () => {
    if (!newSubdomain) return;
    await api.createSubdomain({ subdomain: newSubdomain, memo: newMemo });
    setNewSubdomain(""); setNewMemo(""); setShowAdd(false); fetchData();
  };

  const handleDelete = async (sd: string) => { setDeleteTarget(sd); };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await api.deleteSubdomain(deleteTarget, { delete_files: deleteFiles });
    setDeleteTarget(null); setDeleteFiles(false); fetchData();
  };

  const handleDeleteSelected = async () => {
    await Promise.all(Array.from(selected).map((s) => api.deleteSubdomain(s)));
    setSelected(new Set()); fetchData();
  };

  const handleUpdateMemo = async (sd: string) => {
    await api.updateSubdomain(sd, { memo: editMemo });
    setExpanded(null); fetchData();
  };

  const handleToggleSsl = async (subdomain: string, currentSsl: boolean) => {
    try {
      if (currentSsl) {
        await api.deleteSsl(subdomain);
      } else {
        await api.createSsl({ common_name: subdomain });
      }
      setSubdomains((prev) => prev.map((s) => s.subdomain === subdomain ? { ...s, ssl: !currentSsl } : s));
    } catch (e) {
      console.error(e);
    }
  };

  const toggleSelect = (sd: string) => {
    const next = new Set(selected);
    next.has(sd) ? next.delete(sd) : next.add(sd);
    setSelected(next);
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t("nav.subdomains")}</h2>
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
                <Checkbox checked={selected.size === subdomains.length && subdomains.length > 0} onCheckedChange={() => { selected.size === subdomains.length ? setSelected(new Set()) : setSelected(new Set(subdomains.map(s => s.subdomain))); }} />
              </TableHead>
              <TableHead>{t("subdomain.name")}</TableHead>
              <TableHead>{t("subdomain.parent")}</TableHead>
              <TableHead>{t("subdomain.docroot")}</TableHead>
              <TableHead>{t("domain.ssl")}</TableHead>
              <TableHead>{t("common.memo")}</TableHead>
              <TableHead className="w-20">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {showAdd && (
              <TableRow>
                <TableCell />
                <TableCell><Input placeholder="blog.example.com" value={newSubdomain} onChange={(e) => setNewSubdomain(e.target.value)} className="h-8" /></TableCell>
                <TableCell /><TableCell /><TableCell />
                <TableCell><Input placeholder={t("common.memo")} value={newMemo} onChange={(e) => setNewMemo(e.target.value)} className="h-8" /></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" onClick={handleAdd}>{t("common.save")}</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>{t("common.cancel")}</Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {subdomains.map((s) => (
              <Fragment key={s.subdomain}>
                <TableRow>
                  <TableCell><Checkbox checked={selected.has(s.subdomain)} onCheckedChange={() => toggleSelect(s.subdomain)} /></TableCell>
                  <TableCell className="font-medium">{s.subdomain}</TableCell>
                  <TableCell>{s.domain}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.document_root}</TableCell>
                  <TableCell><Switch checked={s.ssl} onCheckedChange={() => handleToggleSsl(s.subdomain, s.ssl)} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground truncate max-w-[150px]">{s.memo}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => { expanded === s.subdomain ? setExpanded(null) : (setExpanded(s.subdomain), setEditMemo(s.memo)); }}>
                      {expanded === s.subdomain ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />} {t("common.edit")}
                    </Button>
                  </TableCell>
                </TableRow>
                {expanded === s.subdomain && (
                  <TableRow key={`${s.subdomain}-edit`}>
                    <TableCell colSpan={7} className="bg-muted/50">
                      <div className="p-4 space-y-3">
                        <div><label className="text-sm font-medium">{t("common.memo")}</label><Input value={editMemo} onChange={(e) => setEditMemo(e.target.value)} className="mt-1" /></div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleUpdateMemo(s.subdomain)}>{t("common.save")}</Button>
                          <Button size="sm" variant="ghost" onClick={() => setExpanded(null)}>{t("common.cancel")}</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(s.subdomain)}>{t("common.delete")}</Button>
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
              ユーザー公開領域のサブドメインディレクトリも削除する
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
