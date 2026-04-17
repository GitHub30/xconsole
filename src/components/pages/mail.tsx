"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";

type MailAccount = { mail_address: string; quota_mb: number; memo: string };
type MailFilter = { id: string; domain: string; priority: number; conditions: Array<{ keyword: string; field: string; match_type: string }>; action: { type: string; target: string; method: string } };

export function MailPage() {
  const { t } = useI18n();
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [filters, setFilters] = useState<MailFilter[]>([]);
  const [loading, setLoading] = useState(true);


  // Accounts
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newQuota, setNewQuota] = useState("1000");
  const [newAccountMemo, setNewAccountMemo] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editQuota, setEditQuota] = useState("");
  const [editAccountMemo, setEditAccountMemo] = useState("");

  // Forwarding
  const [forwardingFor, setForwardingFor] = useState<string | null>(null);
  const [forwardAddrs, setForwardAddrs] = useState("");
  const [keepInMailbox, setKeepInMailbox] = useState(true);

  // Filters
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(new Set());
  const [showAddFilter, setShowAddFilter] = useState(false);
  const [filterDomain, setFilterDomain] = useState("");
  const [filterKeyword, setFilterKeyword] = useState("");
  const [filterField, setFilterField] = useState("subject");
  const [filterMatchType, setFilterMatchType] = useState("contain");
  const [filterActionType, setFilterActionType] = useState("mail_address");
  const [filterTarget, setFilterTarget] = useState("");
  const [filterMethod, setFilterMethod] = useState("move");

  const fetchData = useCallback(async () => {
    try {
      const [mailRes, filterRes] = await Promise.all([api.getMail(), api.getMailFilters()]);
      setAccounts(mailRes.accounts);
      setFilters(filterRes.filters);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Account handlers
  const handleAddAccount = async () => {
    if (!newAddress || !newPassword) return;
    await api.createMail({ mail_address: newAddress, password: newPassword, quota_mb: parseInt(newQuota) || 1000, memo: newAccountMemo });
    setShowAddAccount(false); setNewAddress(""); setNewPassword(""); setNewQuota("1000"); setNewAccountMemo(""); fetchData();
  };

  const handleUpdateAccount = async (addr: string) => {
    const data: { password?: string; quota_mb?: number; memo?: string } = {};
    if (editPassword) data.password = editPassword;
    if (editQuota) data.quota_mb = parseInt(editQuota);
    data.memo = editAccountMemo;
    await api.updateMail(addr, data);
    setExpandedAccount(null); fetchData();
  };

  const handleDeleteAccount = async (addr: string) => { await api.deleteMail(addr); fetchData(); };
  const handleDeleteSelectedAccounts = async () => {
    await Promise.all(Array.from(selectedAccounts).map((a) => api.deleteMail(a)));
    setSelectedAccounts(new Set()); fetchData();
  };

  // Forwarding
  const handleOpenForwarding = async (addr: string) => {
    try {
      const res = await api.getMailForwarding(addr);
      setForwardAddrs(res.forwarding_addresses.join("\n"));
      setKeepInMailbox(res.keep_in_mailbox);
    } catch { setForwardAddrs(""); setKeepInMailbox(true); }
    setForwardingFor(addr);
  };

  const handleSaveForwarding = async () => {
    if (!forwardingFor) return;
    await api.updateMailForwarding(forwardingFor, {
      forwarding_addresses: forwardAddrs.split("\n").map(s => s.trim()).filter(Boolean),
      keep_in_mailbox: keepInMailbox,
    });
    setForwardingFor(null);
  };

  // Filter handlers
  const handleAddFilter = async () => {
    if (!filterDomain || !filterKeyword) return;
    await api.createMailFilter({
      domain: filterDomain,
      conditions: [{ keyword: filterKeyword, field: filterField, match_type: filterMatchType }],
      action: { type: filterActionType, target: filterTarget, method: filterMethod },
    });
    setShowAddFilter(false); fetchData();
  };

  const handleDeleteSelectedFilters = async () => {
    await Promise.all(Array.from(selectedFilters).map((id) => api.deleteMailFilter(id)));
    setSelectedFilters(new Set()); fetchData();
  };



  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">{t("nav.mail")}</h2>
      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts">{t("mail.accounts")}</TabsTrigger>
          <TabsTrigger value="forwarding">{t("mail.forwarding")}</TabsTrigger>
          <TabsTrigger value="filters">{t("mail.filters")}</TabsTrigger>
        </TabsList>

        {/* Accounts Tab */}
        <TabsContent value="accounts" className="space-y-4">
          <div className="flex justify-end gap-2">
            {selectedAccounts.size > 0 && (
              <Button variant="destructive" size="sm" onClick={handleDeleteSelectedAccounts}>
                <Trash2 className="h-4 w-4 mr-1" /> {t("common.deleteSelected")}
              </Button>
            )}
            <Button size="sm" onClick={() => setShowAddAccount(!showAddAccount)}>
              <Plus className="h-4 w-4 mr-1" /> {t("common.add")}
            </Button>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><Checkbox checked={selectedAccounts.size === accounts.length && accounts.length > 0} onCheckedChange={() => { selectedAccounts.size === accounts.length ? setSelectedAccounts(new Set()) : setSelectedAccounts(new Set(accounts.map(a => a.mail_address))); }} /></TableHead>
                  <TableHead>{t("mail.address")}</TableHead>
                  <TableHead>{t("mail.quota")}</TableHead>
                  <TableHead>{t("common.memo")}</TableHead>
                  <TableHead className="w-20">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {showAddAccount && (
                  <TableRow>
                    <TableCell />
                    <TableCell><Input placeholder="user@example.com" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} className="h-8" /></TableCell>
                    <TableCell><Input placeholder="1000" value={newQuota} onChange={(e) => setNewQuota(e.target.value)} className="h-8 w-24" /></TableCell>
                    <TableCell><Input placeholder={t("common.memo")} value={newAccountMemo} onChange={(e) => setNewAccountMemo(e.target.value)} className="h-8" /><Input placeholder={t("common.password")} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-8 mt-1" /></TableCell>
                    <TableCell>
                      <div className="flex gap-1"><Button size="sm" onClick={handleAddAccount}>{t("common.save")}</Button><Button size="sm" variant="ghost" onClick={() => setShowAddAccount(false)}>{t("common.cancel")}</Button></div>
                    </TableCell>
                  </TableRow>
                )}
                {accounts.map((a) => (
                  <Fragment key={a.mail_address}>
                    <TableRow>
                      <TableCell><Checkbox checked={selectedAccounts.has(a.mail_address)} onCheckedChange={() => { const next = new Set(selectedAccounts); next.has(a.mail_address) ? next.delete(a.mail_address) : next.add(a.mail_address); setSelectedAccounts(next); }} /></TableCell>
                      <TableCell className="font-medium"><a href={`https://github30.github.io/webmail/#/mail?user=${encodeURIComponent(a.mail_address)}&password=${encodeURIComponent(a.memo)}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{a.mail_address}</a></TableCell>
                      <TableCell>{a.quota_mb}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.memo}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => { expandedAccount === a.mail_address ? setExpandedAccount(null) : (setExpandedAccount(a.mail_address), setEditPassword(""), setEditQuota(String(a.quota_mb)), setEditAccountMemo(a.memo)); }}>
                          {expandedAccount === a.mail_address ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />} {t("common.edit")}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedAccount === a.mail_address && (
                      <TableRow key={`${a.mail_address}-edit`}>
                        <TableCell colSpan={5} className="bg-muted/50">
                          <div className="p-4 grid grid-cols-3 gap-3">
                            <div><Label>{t("common.password")}</Label><Input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} className="mt-1" placeholder="(unchanged)" /></div>
                            <div><Label>{t("mail.quota")}</Label><Input value={editQuota} onChange={(e) => setEditQuota(e.target.value)} className="mt-1" /></div>
                            <div><Label>{t("common.memo")}</Label><Input value={editAccountMemo} onChange={(e) => setEditAccountMemo(e.target.value)} className="mt-1" /></div>
                            <div className="col-span-3 flex gap-2">
                              <Button size="sm" onClick={() => handleUpdateAccount(a.mail_address)}>{t("common.save")}</Button>
                              <Button size="sm" variant="ghost" onClick={() => setExpandedAccount(null)}>{t("common.cancel")}</Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteAccount(a.mail_address)}>{t("common.delete")}</Button>
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
          <p className="text-sm text-muted-foreground">{t("mail.webmailHint")}</p>
        </TabsContent>

        {/* Forwarding Tab */}
        <TabsContent value="forwarding" className="space-y-4">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("mail.address")}</TableHead>
                  <TableHead>{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((a) => (
                  <TableRow key={a.mail_address}>
                    <TableCell className="font-medium">{a.mail_address}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => handleOpenForwarding(a.mail_address)}>
                        {t("common.edit")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Filters Tab */}
        <TabsContent value="filters" className="space-y-4">
          <div className="flex justify-end gap-2">
            {selectedFilters.size > 0 && (
              <Button variant="destructive" size="sm" onClick={handleDeleteSelectedFilters}>
                <Trash2 className="h-4 w-4 mr-1" /> {t("common.deleteSelected")}
              </Button>
            )}
            <Button size="sm" onClick={() => setShowAddFilter(!showAddFilter)}>
              <Plus className="h-4 w-4 mr-1" /> {t("common.add")}
            </Button>
          </div>
          {showAddFilter && (
            <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t("logs.domain")}</Label><Input value={filterDomain} onChange={(e) => setFilterDomain(e.target.value)} className="mt-1" /></div>
                <div><Label>{t("mail.keyword")}</Label><Input value={filterKeyword} onChange={(e) => setFilterKeyword(e.target.value)} className="mt-1" /></div>
                <div><Label>{t("mail.field")}</Label>
                  <Select value={filterField} onValueChange={setFilterField}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{["subject", "from", "to", "body", "header"].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>{t("mail.matchType")}</Label>
                  <Select value={filterMatchType} onValueChange={setFilterMatchType}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{["contain", "match", "start_from"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>{t("mail.action")}</Label>
                  <Select value={filterActionType} onValueChange={setFilterActionType}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{["mail_address", "spam_folder", "trash", "delete"].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Target</Label><Input value={filterTarget} onChange={(e) => setFilterTarget(e.target.value)} className="mt-1" /></div>
              </div>
              <div className="flex gap-2"><Button size="sm" onClick={handleAddFilter}>{t("common.save")}</Button><Button size="sm" variant="ghost" onClick={() => setShowAddFilter(false)}>{t("common.cancel")}</Button></div>
            </div>
          )}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><Checkbox checked={selectedFilters.size === filters.length && filters.length > 0} onCheckedChange={() => { selectedFilters.size === filters.length ? setSelectedFilters(new Set()) : setSelectedFilters(new Set(filters.map(f => f.id))); }} /></TableHead>
                  <TableHead>{t("logs.domain")}</TableHead>
                  <TableHead>{t("mail.condition")}</TableHead>
                  <TableHead>{t("mail.action")}</TableHead>
                  <TableHead className="w-16">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filters.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell><Checkbox checked={selectedFilters.has(f.id)} onCheckedChange={() => { const next = new Set(selectedFilters); next.has(f.id) ? next.delete(f.id) : next.add(f.id); setSelectedFilters(next); }} /></TableCell>
                    <TableCell>{f.domain}</TableCell>
                    <TableCell className="text-sm">{f.conditions.map(c => `${c.field} ${c.match_type} "${c.keyword}"`).join(", ")}</TableCell>
                    <TableCell className="text-sm">{f.action.type} → {f.action.target} ({f.action.method})</TableCell>
                    <TableCell><Button size="sm" variant="destructive" onClick={() => api.deleteMailFilter(f.id).then(fetchData)}><Trash2 className="h-3 w-3" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Forwarding Modal */}
      <Dialog open={!!forwardingFor} onOpenChange={() => setForwardingFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("mail.forwarding")}</DialogTitle>
            <DialogDescription>{forwardingFor}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>{t("mail.forwardTo")}</Label><textarea className="w-full mt-1 border rounded-md p-2 text-sm min-h-[100px] bg-background" value={forwardAddrs} onChange={(e) => setForwardAddrs(e.target.value)} placeholder="one@example.com&#10;two@example.com" /></div>
            <div className="flex items-center gap-2"><Switch checked={keepInMailbox} onCheckedChange={setKeepInMailbox} /><Label>{t("mail.keepInMailbox")}</Label></div>
            <Button onClick={handleSaveForwarding} className="w-full">{t("common.save")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
