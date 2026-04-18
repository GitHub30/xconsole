"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ChevronDown, ChevronRight, Trash2, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";

type DnsRecord = { id: number; domain: string; host: string; type: string; content: string; ttl: number; priority: number };

const DNS_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "SRV", "CAA"];

export function DnsPage() {
  const { t } = useI18n();
  const [records, setRecords] = useState<DnsRecord[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  // Add form
  const [newDomain, setNewDomain] = useState("");
  const [newHost, setNewHost] = useState("");
  const [newType, setNewType] = useState("A");
  const [newContent, setNewContent] = useState("");
  const [newTtl, setNewTtl] = useState("3600");
  const [newPriority, setNewPriority] = useState("");

  // Edit form
  const [editHost, setEditHost] = useState("");
  const [editType, setEditType] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editTtl, setEditTtl] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const res = await api.getDns();
      setRecords(res.records);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async () => {
    if (!newDomain || !newHost || !newContent) return;
    const data: { domain: string; host: string; type: string; content: string; ttl?: number; priority?: number } = {
      domain: newDomain, host: newHost, type: newType, content: newContent,
    };
    if (newTtl) data.ttl = parseInt(newTtl);
    if (newPriority) data.priority = parseInt(newPriority);
    await api.createDns(data);
    setShowAdd(false); setNewDomain(""); setNewHost(""); setNewContent(""); setNewTtl("3600"); setNewPriority("");
    fetchData();
  };

  const handleUpdate = async (id: number) => {
    await api.updateDns(id, { host: editHost, type: editType, content: editContent, ttl: parseInt(editTtl) || 3600 });
    setExpanded(null); fetchData();
  };

  const handleDelete = async (id: number) => { await api.deleteDns(id); fetchData(); };

  const handleDeleteSelected = async () => {
    await Promise.all(Array.from(selected).map((id) => api.deleteDns(id)));
    setSelected(new Set()); fetchData();
  };

  if (loading) return <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t("nav.dns")}</h2>
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
                <Checkbox checked={selected.size === records.length && records.length > 0} onCheckedChange={() => { selected.size === records.length ? setSelected(new Set()) : setSelected(new Set(records.map(r => r.id))); }} />
              </TableHead>
              <TableHead>{t("logs.domain")}</TableHead>
              <TableHead>{t("dns.host")}</TableHead>
              <TableHead>{t("dns.type")}</TableHead>
              <TableHead>{t("dns.content")}</TableHead>
              <TableHead>{t("dns.ttl")}</TableHead>
              <TableHead>{t("dns.priority")}</TableHead>
              <TableHead className="w-20">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {showAdd && (
              <TableRow>
                <TableCell />
                <TableCell><Input placeholder="example.com" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} className="h-8" /></TableCell>
                <TableCell><Input placeholder="@" value={newHost} onChange={(e) => setNewHost(e.target.value)} className="h-8" /></TableCell>
                <TableCell>
                  <Select value={newType} onValueChange={setNewType}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>{DNS_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
                <TableCell><Input placeholder="192.168.1.1" value={newContent} onChange={(e) => setNewContent(e.target.value)} className="h-8" /></TableCell>
                <TableCell><Input placeholder="3600" value={newTtl} onChange={(e) => setNewTtl(e.target.value)} className="h-8 w-20" /></TableCell>
                <TableCell><Input placeholder="" value={newPriority} onChange={(e) => setNewPriority(e.target.value)} className="h-8 w-16" /></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" onClick={handleAdd}>{t("common.save")}</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>{t("common.cancel")}</Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {records.map((r) => (
              <Fragment key={r.id}>
                <TableRow>
                  <TableCell><Checkbox checked={selected.has(r.id)} onCheckedChange={() => { const next = new Set(selected); next.has(r.id) ? next.delete(r.id) : next.add(r.id); setSelected(next); }} /></TableCell>
                  <TableCell>{r.domain}</TableCell>
                  <TableCell className="font-medium">{r.host}</TableCell>
                  <TableCell><span className="font-mono text-sm">{r.type}</span></TableCell>
                  <TableCell className="text-sm break-all max-w-[200px]">{r.content}</TableCell>
                  <TableCell>{r.ttl}</TableCell>
                  <TableCell>{r.priority ?? "-"}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => { if (expanded === r.id) { setExpanded(null); } else { setExpanded(r.id); setEditHost(r.host); setEditType(r.type); setEditContent(r.content); setEditTtl(String(r.ttl)); } }}>
                      {expanded === r.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />} {t("common.edit")}
                    </Button>
                  </TableCell>
                </TableRow>
                {expanded === r.id && (
                  <TableRow key={`${r.id}-edit`}>
                    <TableCell colSpan={8} className="bg-muted/50">
                      <div className="p-4 grid grid-cols-2 gap-3">
                        <div><label className="text-sm font-medium">{t("dns.host")}</label><Input value={editHost} onChange={(e) => setEditHost(e.target.value)} className="mt-1" /></div>
                        <div><label className="text-sm font-medium">{t("dns.type")}</label>
                          <Select value={editType} onValueChange={setEditType}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>{DNS_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div><label className="text-sm font-medium">{t("dns.content")}</label><Input value={editContent} onChange={(e) => setEditContent(e.target.value)} className="mt-1" /></div>
                        <div><label className="text-sm font-medium">{t("dns.ttl")}</label><Input value={editTtl} onChange={(e) => setEditTtl(e.target.value)} className="mt-1" /></div>
                        <div className="col-span-2 flex gap-2">
                          <Button size="sm" onClick={() => handleUpdate(r.id)}>{t("common.save")}</Button>
                          <Button size="sm" variant="ghost" onClick={() => setExpanded(null)}>{t("common.cancel")}</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(r.id)}>{t("common.delete")}</Button>
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
    </div>
  );
}
