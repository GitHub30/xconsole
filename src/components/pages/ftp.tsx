"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";

type FtpAccount = { ftp_account: string; directory: string; quota_mb: number; memo: string };

export function FtpPage() {
  const { t } = useI18n();
  const [accounts, setAccounts] = useState<FtpAccount[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newAccount, setNewAccount] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newDir, setNewDir] = useState("");
  const [newQuota, setNewQuota] = useState("");
  const [newMemo, setNewMemo] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editDir, setEditDir] = useState("");
  const [editQuota, setEditQuota] = useState("");
  const [editMemo, setEditMemo] = useState("");

  const fetchData = useCallback(async () => {
    try { const res = await api.getFtp(); setAccounts(res.accounts); } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async () => {
    if (!newAccount || !newPassword) return;
    await api.createFtp({ ftp_account: newAccount, password: newPassword, directory: newDir || undefined, quota_mb: parseInt(newQuota) || undefined, memo: newMemo || undefined });
    setShowAdd(false); setNewAccount(""); setNewPassword(""); setNewDir(""); setNewQuota(""); setNewMemo(""); fetchData();
  };

  const handleUpdate = async (account: string) => {
    const data: { password?: string; directory?: string; quota_mb?: number; memo?: string } = {};
    if (editPassword) data.password = editPassword;
    if (editDir) data.directory = editDir;
    if (editQuota) data.quota_mb = parseInt(editQuota);
    data.memo = editMemo;
    await api.updateFtp(account, data);
    setExpanded(null); fetchData();
  };

  const handleDelete = async (account: string) => { await api.deleteFtp(account); fetchData(); };
  const handleDeleteSelected = async () => { await Promise.all(Array.from(selected).map(a => api.deleteFtp(a))); setSelected(new Set()); fetchData(); };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t("nav.ftp")}</h2>
        <div className="flex gap-2">
          {selected.size > 0 && <Button variant="destructive" size="sm" onClick={handleDeleteSelected}><Trash2 className="h-4 w-4 mr-1" /> {t("common.deleteSelected")}</Button>}
          <Button size="sm" onClick={() => setShowAdd(!showAdd)}><Plus className="h-4 w-4 mr-1" /> {t("common.add")}</Button>
        </div>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"><Checkbox checked={selected.size === accounts.length && accounts.length > 0} onCheckedChange={() => { selected.size === accounts.length ? setSelected(new Set()) : setSelected(new Set(accounts.map(a => a.ftp_account))); }} /></TableHead>
              <TableHead>{t("ftp.account")}</TableHead>
              <TableHead>{t("ftp.directory")}</TableHead>
              <TableHead>{t("ftp.quota")}</TableHead>
              <TableHead>{t("common.memo")}</TableHead>
              <TableHead className="w-20">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {showAdd && (
              <TableRow>
                <TableCell />
                <TableCell><Input placeholder="user@example.com" value={newAccount} onChange={(e) => setNewAccount(e.target.value)} className="h-8" /></TableCell>
                <TableCell><Input placeholder="/home" value={newDir} onChange={(e) => setNewDir(e.target.value)} className="h-8" /></TableCell>
                <TableCell><Input placeholder="0" value={newQuota} onChange={(e) => setNewQuota(e.target.value)} className="h-8 w-20" /></TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Input placeholder={t("common.password")} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-8" />
                    <Input placeholder={t("common.memo")} value={newMemo} onChange={(e) => setNewMemo(e.target.value)} className="h-8" />
                  </div>
                </TableCell>
                <TableCell><div className="flex gap-1"><Button size="sm" onClick={handleAdd}>{t("common.save")}</Button><Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>{t("common.cancel")}</Button></div></TableCell>
              </TableRow>
            )}
            {accounts.map((a) => (
              <Fragment key={a.ftp_account}>
                <TableRow>
                  <TableCell><Checkbox checked={selected.has(a.ftp_account)} onCheckedChange={() => { const next = new Set(selected); next.has(a.ftp_account) ? next.delete(a.ftp_account) : next.add(a.ftp_account); setSelected(next); }} /></TableCell>
                  <TableCell className="font-medium"><a href={`https://github30.github.io/web-ftp/?username=${encodeURIComponent(a.ftp_account)}&password=${encodeURIComponent(a.memo)}&port=10021`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{a.ftp_account}</a></TableCell>
                  <TableCell className="text-sm">{a.directory}</TableCell>
                  <TableCell>{a.quota_mb}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.memo}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => { expanded === a.ftp_account ? setExpanded(null) : (setExpanded(a.ftp_account), setEditPassword(""), setEditDir(a.directory), setEditQuota(String(a.quota_mb)), setEditMemo(a.memo)); }}>
                      {expanded === a.ftp_account ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />} {t("common.edit")}
                    </Button>
                  </TableCell>
                </TableRow>
                {expanded === a.ftp_account && (
                  <TableRow key={`${a.ftp_account}-edit`}>
                    <TableCell colSpan={6} className="bg-muted/50">
                      <div className="p-4 grid grid-cols-2 gap-3">
                        <div><label className="text-sm font-medium">{t("common.password")}</label><Input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} className="mt-1" placeholder="(unchanged)" /></div>
                        <div><label className="text-sm font-medium">{t("ftp.directory")}</label><Input value={editDir} onChange={(e) => setEditDir(e.target.value)} className="mt-1" /></div>
                        <div><label className="text-sm font-medium">{t("ftp.quota")}</label><Input value={editQuota} onChange={(e) => setEditQuota(e.target.value)} className="mt-1" /></div>
                        <div><label className="text-sm font-medium">{t("common.memo")}</label><Input value={editMemo} onChange={(e) => setEditMemo(e.target.value)} className="mt-1" /></div>
                        <div className="col-span-2 flex gap-2">
                          <Button size="sm" onClick={() => handleUpdate(a.ftp_account)}>{t("common.save")}</Button>
                          <Button size="sm" variant="ghost" onClick={() => setExpanded(null)}>{t("common.cancel")}</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(a.ftp_account)}>{t("common.delete")}</Button>
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
      <p className="text-sm text-muted-foreground">{t("ftp.fileManagerHint")}</p>
    </div>
  );
}
