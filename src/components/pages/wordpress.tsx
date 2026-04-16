"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";

type WpSite = { id: string; domain: string; url: string; title: string; version: string; db_name: string; db_user: string; memo: string };

export function WordPressPage() {
  const { t } = useI18n();
  const [sites, setSites] = useState<WpSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newAdmin, setNewAdmin] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newMemo, setNewMemo] = useState("");

  const [editMemo, setEditMemo] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<WpSite | null>(null);
  const [deleteDb, setDeleteDb] = useState(false);
  const [deleteDbUser, setDeleteDbUser] = useState(false);
  const [deleteCron, setDeleteCron] = useState(false);

  const fetchData = useCallback(async () => {
    try { const res = await api.getWordPress(); setSites(res.wordpress); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async () => {
    if (!newUrl || !newAdmin || !newPassword || !newEmail) return;
    await api.createWordPress({ url: newUrl, title: newTitle, admin_username: newAdmin, admin_password: newPassword, admin_email: newEmail, memo: newMemo });
    setShowAdd(false); setNewUrl(""); setNewTitle(""); setNewAdmin(""); setNewPassword(""); setNewEmail(""); setNewMemo(""); fetchData();
  };

  const handleUpdate = async (id: string) => {
    await api.updateWordPress(id, { memo: editMemo });
    setExpanded(null); fetchData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await api.deleteWordPress(deleteTarget.id, { delete_db: deleteDb, delete_db_user: deleteDbUser, delete_cron: deleteCron });
    setDeleteTarget(null); setDeleteDb(false); setDeleteDbUser(false); setDeleteCron(false); fetchData();
  };

  const handleDeleteSelected = async () => {
    await Promise.all(Array.from(selected).map(id => api.deleteWordPress(id, {})));
    setSelected(new Set()); fetchData();
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">{t("nav.wordpress")}</h2>
      <div className="flex justify-end gap-2">
        {selected.size > 0 && <Button variant="destructive" size="sm" onClick={handleDeleteSelected}><Trash2 className="h-4 w-4 mr-1" /> {t("common.deleteSelected")}</Button>}
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}><Plus className="h-4 w-4 mr-1" /> {t("common.add")}</Button>
      </div>
      {showAdd && (
        <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>URL</Label><Input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} className="mt-1" placeholder="example.com/wp" /></div>
            <div><Label>{t("wp.title")}</Label><Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="mt-1" /></div>
            <div><Label>{t("wp.adminUser")}</Label><Input value={newAdmin} onChange={(e) => setNewAdmin(e.target.value)} className="mt-1" /></div>
            <div><Label>{t("wp.adminPass")}</Label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1" /></div>
            <div><Label>{t("wp.adminEmail")}</Label><Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="mt-1" /></div>
            <div><Label>{t("common.memo")}</Label><Input value={newMemo} onChange={(e) => setNewMemo(e.target.value)} className="mt-1" /></div>
          </div>
          <div className="flex gap-2"><Button size="sm" onClick={handleAdd}>{t("common.save")}</Button><Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>{t("common.cancel")}</Button></div>
        </div>
      )}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"><Checkbox checked={selected.size === sites.length && sites.length > 0} onCheckedChange={() => { selected.size === sites.length ? setSelected(new Set()) : setSelected(new Set(sites.map(s => s.id))); }} /></TableHead>
              <TableHead>URL</TableHead>
              <TableHead>{t("wp.title")}</TableHead>
              <TableHead>{t("wp.version")}</TableHead>
              <TableHead>{t("common.memo")}</TableHead>
              <TableHead className="w-20">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sites.map((s) => (
              <Fragment key={s.id}>
                <TableRow>
                  <TableCell><Checkbox checked={selected.has(s.id)} onCheckedChange={() => { const next = new Set(selected); next.has(s.id) ? next.delete(s.id) : next.add(s.id); setSelected(next); }} /></TableCell>
                  <TableCell className="font-medium"><a href={`https://${s.url}`} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">{s.url}</a></TableCell>
                  <TableCell>{s.title}</TableCell>
                  <TableCell>{s.version}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.memo}</TableCell>
                  <TableCell className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => { expanded === s.id ? setExpanded(null) : (setExpanded(s.id), setEditMemo(s.memo)); }}>
                      {expanded === s.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(s)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
                {expanded === s.id && (
                  <TableRow key={`${s.id}-edit`}>
                    <TableCell colSpan={6} className="bg-muted/50">
                      <div className="p-4 space-y-3">
                        <div><Label>{t("common.memo")}</Label><Input value={editMemo} onChange={(e) => setEditMemo(e.target.value)} className="mt-1" /></div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleUpdate(s.id)}>{t("common.save")}</Button>
                          <Button size="sm" variant="ghost" onClick={() => setExpanded(null)}>{t("common.cancel")}</Button>
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
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("common.delete")} WordPress</DialogTitle>
            <DialogDescription>{deleteTarget?.url}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2"><Checkbox checked={deleteDb} onCheckedChange={(v) => setDeleteDb(!!v)} />{t("wp.deleteDb")}</label>
              <label className="flex items-center gap-2"><Checkbox checked={deleteDbUser} onCheckedChange={(v) => setDeleteDbUser(!!v)} />{t("wp.deleteDbUser")}</label>
              <label className="flex items-center gap-2"><Checkbox checked={deleteCron} onCheckedChange={(v) => setDeleteCron(!!v)} />{t("wp.deleteCron")}</label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setDeleteTarget(null)}>{t("common.cancel")}</Button>
              <Button variant="destructive" onClick={handleDelete}>{t("common.delete")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
