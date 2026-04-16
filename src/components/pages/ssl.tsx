"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ShieldCheck, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";

type SslCert = { id: number; common_name: string; type: string; expires_at: string; status: string };

export function SslPage() {
  const { t } = useI18n();
  const [certs, setCerts] = useState<SslCert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInstall, setShowInstall] = useState(false);
  const [newCommonName, setNewCommonName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SslCert | null>(null);

  const fetchData = useCallback(async () => {
    try { const res = await api.getSsl(); setCerts(res.ssl_list); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleInstall = async () => {
    if (!newCommonName) return;
    await api.createSsl({ common_name: newCommonName });
    setShowInstall(false); setNewCommonName(""); fetchData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await api.deleteSsl(deleteTarget.common_name);
    setDeleteTarget(null); fetchData();
  };

  const isExpired = (cert: SslCert) => cert.status === "expired" || new Date(cert.expires_at) < new Date();
  const daysLeft = (cert: SslCert) => {
    const diff = new Date(cert.expires_at).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">{t("nav.ssl")}</h2>
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowInstall(!showInstall)}><ShieldCheck className="h-4 w-4 mr-1" /> {t("ssl.install")}</Button>
      </div>
      {showInstall && (
        <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
          <div><Label>{t("ssl.commonName")}</Label><Input value={newCommonName} onChange={(e) => setNewCommonName(e.target.value)} className="mt-1" placeholder="example.com" /></div>
          <div className="flex gap-2"><Button size="sm" onClick={handleInstall}>{t("ssl.install")}</Button><Button size="sm" variant="ghost" onClick={() => setShowInstall(false)}>{t("common.cancel")}</Button></div>
        </div>
      )}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("ssl.commonName")}</TableHead>
              <TableHead>{t("ssl.type")}</TableHead>
              <TableHead>{t("ssl.expiresAt")}</TableHead>
              <TableHead>{t("ssl.status")}</TableHead>
              <TableHead className="w-32">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {certs.map((c) => (
              <TableRow key={c.common_name}>
                <TableCell className="font-medium">{c.common_name}</TableCell>
                <TableCell><Badge variant="outline">{c.type}</Badge></TableCell>
                <TableCell>
                  <span className={isExpired(c) ? "text-destructive" : ""}>{c.expires_at}</span>
                  {!isExpired(c) && <span className="text-xs text-muted-foreground ml-2">({daysLeft(c)}d)</span>}
                </TableCell>
                <TableCell>
                  <Badge variant={isExpired(c) ? "destructive" : "default"}>
                    {isExpired(c) ? "Expired" : "Active"}
                  </Badge>
                </TableCell>
                <TableCell className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(c)} title={t("common.delete")}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("common.delete")} SSL</DialogTitle>
            <DialogDescription>{deleteTarget?.common_name}</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>{t("common.cancel")}</Button>
            <Button variant="destructive" onClick={handleDelete}>{t("common.delete")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
