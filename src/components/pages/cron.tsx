"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";

type CronJob = { id: string; minute: string; hour: string; day: string; month: string; weekday: string; command: string; comment: string; enabled: boolean };

export function CronPage() {
  const { t } = useI18n();
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const [newMinute, setNewMinute] = useState("*");
  const [newHour, setNewHour] = useState("*");
  const [newDay, setNewDay] = useState("*");
  const [newMonth, setNewMonth] = useState("*");
  const [newWeekday, setNewWeekday] = useState("*");
  const [newCommand, setNewCommand] = useState("");
  const [newComment, setNewComment] = useState("");

  const [editMinute, setEditMinute] = useState("");
  const [editHour, setEditHour] = useState("");
  const [editDay, setEditDay] = useState("");
  const [editMonth, setEditMonth] = useState("");
  const [editWeekday, setEditWeekday] = useState("");
  const [editCommand, setEditCommand] = useState("");
  const [editComment, setEditComment] = useState("");
  const [editEnabled, setEditEnabled] = useState(true);

  const fetchData = useCallback(async () => {
    try { const res = await api.getCrons(); setJobs(res.crons); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async () => {
    if (!newCommand) return;
    await api.createCron({ minute: newMinute, hour: newHour, day: newDay, month: newMonth, weekday: newWeekday, command: newCommand, comment: newComment });
    setShowAdd(false); setNewMinute("*"); setNewHour("*"); setNewDay("*"); setNewMonth("*"); setNewWeekday("*"); setNewCommand(""); setNewComment(""); fetchData();
  };

  const handleUpdate = async (id: string) => {
    await api.updateCron(id, { minute: editMinute, hour: editHour, day: editDay, month: editMonth, weekday: editWeekday, command: editCommand, comment: editComment, enabled: editEnabled });
    setExpanded(null); fetchData();
  };

  const handleToggle = async (job: CronJob) => {
    await api.updateCron(job.id, { enabled: !job.enabled });
    fetchData();
  };

  const handleDelete = async (id: string) => { await api.deleteCron(id); fetchData(); };
  const handleDeleteSelected = async () => { await Promise.all(Array.from(selected).map(id => api.deleteCron(id))); setSelected(new Set()); fetchData(); };

  const expandJob = (j: CronJob) => {
    if (expanded === j.id) { setExpanded(null); return; }
    setExpanded(j.id);
    setEditMinute(j.minute); setEditHour(j.hour); setEditDay(j.day); setEditMonth(j.month); setEditWeekday(j.weekday); setEditCommand(j.command); setEditComment(j.comment); setEditEnabled(j.enabled);
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">{t("nav.cron")}</h2>
      <div className="flex justify-end gap-2">
        {selected.size > 0 && <Button variant="destructive" size="sm" onClick={handleDeleteSelected}><Trash2 className="h-4 w-4 mr-1" /> {t("common.deleteSelected")}</Button>}
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}><Plus className="h-4 w-4 mr-1" /> {t("common.add")}</Button>
      </div>
      {showAdd && (
        <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
          <div className="grid grid-cols-5 gap-3">
            <div><Label>{t("cron.minute")}</Label><Input value={newMinute} onChange={(e) => setNewMinute(e.target.value)} className="mt-1 font-mono" /></div>
            <div><Label>{t("cron.hour")}</Label><Input value={newHour} onChange={(e) => setNewHour(e.target.value)} className="mt-1 font-mono" /></div>
            <div><Label>{t("cron.day")}</Label><Input value={newDay} onChange={(e) => setNewDay(e.target.value)} className="mt-1 font-mono" /></div>
            <div><Label>{t("cron.month")}</Label><Input value={newMonth} onChange={(e) => setNewMonth(e.target.value)} className="mt-1 font-mono" /></div>
            <div><Label>{t("cron.weekday")}</Label><Input value={newWeekday} onChange={(e) => setNewWeekday(e.target.value)} className="mt-1 font-mono" /></div>
          </div>
          <div><Label>{t("cron.command")}</Label><Input value={newCommand} onChange={(e) => setNewCommand(e.target.value)} className="mt-1 font-mono" /></div>
          <div><Label>{t("cron.comment")}</Label><Input value={newComment} onChange={(e) => setNewComment(e.target.value)} className="mt-1" /></div>
          <div className="flex gap-2"><Button size="sm" onClick={handleAdd}>{t("common.save")}</Button><Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>{t("common.cancel")}</Button></div>
        </div>
      )}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"><Checkbox checked={selected.size === jobs.length && jobs.length > 0} onCheckedChange={() => { selected.size === jobs.length ? setSelected(new Set()) : setSelected(new Set(jobs.map(j => j.id))); }} /></TableHead>
              <TableHead>{t("cron.minute")} {t("cron.hour")} {t("cron.day")} {t("cron.month")} {t("cron.weekday")}</TableHead>
              <TableHead>{t("cron.command")}</TableHead>
              <TableHead>{t("cron.comment")}</TableHead>
              <TableHead className="w-20">{t("cron.enabled")}</TableHead>
              <TableHead className="w-20">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((j) => (
              <Fragment key={j.id}>
                <TableRow className={!j.enabled ? "opacity-50" : ""}>
                  <TableCell><Checkbox checked={selected.has(j.id)} onCheckedChange={() => { const next = new Set(selected); next.has(j.id) ? next.delete(j.id) : next.add(j.id); setSelected(next); }} /></TableCell>
                  <TableCell className="font-mono text-sm">{j.minute} {j.hour} {j.day} {j.month} {j.weekday}</TableCell>
                  <TableCell className="font-mono text-sm max-w-xs truncate">{j.command}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{j.comment}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch checked={j.enabled} onCheckedChange={() => handleToggle(j)} />
                      <Badge variant={j.enabled ? "default" : "secondary"}>{j.enabled ? "ON" : "OFF"}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => expandJob(j)}>
                      {expanded === j.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
                {expanded === j.id && (
                  <TableRow key={`${j.id}-edit`}>
                    <TableCell colSpan={6} className="bg-muted/50">
                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-5 gap-3">
                          <div><Label>{t("cron.minute")}</Label><Input value={editMinute} onChange={(e) => setEditMinute(e.target.value)} className="mt-1 font-mono" /></div>
                          <div><Label>{t("cron.hour")}</Label><Input value={editHour} onChange={(e) => setEditHour(e.target.value)} className="mt-1 font-mono" /></div>
                          <div><Label>{t("cron.day")}</Label><Input value={editDay} onChange={(e) => setEditDay(e.target.value)} className="mt-1 font-mono" /></div>
                          <div><Label>{t("cron.month")}</Label><Input value={editMonth} onChange={(e) => setEditMonth(e.target.value)} className="mt-1 font-mono" /></div>
                          <div><Label>{t("cron.weekday")}</Label><Input value={editWeekday} onChange={(e) => setEditWeekday(e.target.value)} className="mt-1 font-mono" /></div>
                        </div>
                        <div><Label>{t("cron.command")}</Label><Input value={editCommand} onChange={(e) => setEditCommand(e.target.value)} className="mt-1 font-mono" /></div>
                        <div><Label>{t("cron.comment")}</Label><Input value={editComment} onChange={(e) => setEditComment(e.target.value)} className="mt-1" /></div>
                        <div className="flex items-center gap-2"><Switch checked={editEnabled} onCheckedChange={setEditEnabled} /><Label>{t("common.status")}</Label></div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleUpdate(j.id)}>{t("common.save")}</Button>
                          <Button size="sm" variant="ghost" onClick={() => setExpanded(null)}>{t("common.cancel")}</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(j.id)}>{t("common.delete")}</Button>
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
