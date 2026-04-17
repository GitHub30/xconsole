"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";

type Database = { db_name: string; version_name: string; size_mb: number; granted_users: string[]; memo: string };
type DbUser = { db_user: string; version_name: string; memo: string };

export function MysqlPage() {
  const { t } = useI18n();
  const [databases, setDatabases] = useState<Database[]>([]);
  const [users, setUsers] = useState<DbUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [hostname, setHostname] = useState("");

  // DB state
  const [selectedDbs, setSelectedDbs] = useState<Set<string>>(new Set());
  const [expandedDb, setExpandedDb] = useState<string | null>(null);
  const [showAddDb, setShowAddDb] = useState(false);
  const [newDbSuffix, setNewDbSuffix] = useState("");
  const [newDbCharset, setNewDbCharset] = useState("utf8mb4");
  const [newDbMemo, setNewDbMemo] = useState("");
  const [newDbUserSuffix, setNewDbUserSuffix] = useState("");
  const [newDbUserPassword, setNewDbUserPassword] = useState("");
  const [editDbMemo, setEditDbMemo] = useState("");

  // User state
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserSuffix, setNewUserSuffix] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserMemo, setNewUserMemo] = useState("");
  const [editUserPassword, setEditUserPassword] = useState("");
  const [editUserMemo, setEditUserMemo] = useState("");

  // Grant dialog (user -> db)
  const [grantDialogUser, setGrantDialogUser] = useState<string | null>(null);
  const [grantedDbs, setGrantedDbs] = useState<string[]>([]);
  const [grantDbName, setGrantDbName] = useState("");

  // Grant dialog (db -> user)
  const [grantDialogDb, setGrantDialogDb] = useState<string | null>(null);
  const [grantedUsersForDb, setGrantedUsersForDb] = useState<string[]>([]);
  const [grantUserName, setGrantUserName] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [dbRes, userRes, infoRes] = await Promise.all([api.getDatabases(), api.getDbUsers(), api.getServerInfo()]);
      setDatabases(dbRes.databases);
      setUsers(userRes.users);
      setHostname(infoRes.hostname);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // DB handlers
  const handleAddDb = async () => {
    if (!newDbSuffix) return;
    const dbRes = await api.createDatabase({ name_suffix: newDbSuffix, character_set: newDbCharset, memo: newDbMemo });
    // Optionally create user and grant
    if (newDbUserSuffix && newDbUserPassword) {
      const userRes = await api.createDbUser({ name_suffix: newDbUserSuffix, password: newDbUserPassword });
      await api.grantDb(userRes.db_user, { db_name: dbRes.db_name });
    }
    setShowAddDb(false); setNewDbSuffix(""); setNewDbCharset("utf8mb4"); setNewDbMemo(""); setNewDbUserSuffix(""); setNewDbUserPassword(""); fetchData();
  };

  const handleUpdateDb = async (name: string) => { await api.updateDatabase(name, { memo: editDbMemo }); setExpandedDb(null); fetchData(); };
  const handleDeleteDb = async (name: string) => { await api.deleteDatabase(name); fetchData(); };
  const handleDeleteSelectedDbs = async () => { await Promise.all(Array.from(selectedDbs).map(n => api.deleteDatabase(n))); setSelectedDbs(new Set()); fetchData(); };

  // User handlers
  const handleAddUser = async () => {
    if (!newUserSuffix || !newUserPassword) return;
    await api.createDbUser({ name_suffix: newUserSuffix, password: newUserPassword, memo: newUserMemo });
    setShowAddUser(false); setNewUserSuffix(""); setNewUserPassword(""); setNewUserMemo(""); fetchData();
  };

  const handleUpdateUser = async (user: string) => {
    const data: { password?: string; memo?: string } = {};
    if (editUserPassword) data.password = editUserPassword;
    data.memo = editUserMemo;
    await api.updateDbUser(user, data);
    setExpandedUser(null); fetchData();
  };

  const handleDeleteUser = async (user: string) => { await api.deleteDbUser(user); fetchData(); };
  const handleDeleteSelectedUsers = async () => { await Promise.all(Array.from(selectedUsers).map(u => api.deleteDbUser(u))); setSelectedUsers(new Set()); fetchData(); };

  // Grant handlers
  const openGrantDialog = async (user: string) => {
    setGrantDialogUser(user);
    try { const res = await api.getDbGrants(user); setGrantedDbs(res.databases); } catch { setGrantedDbs([]); }
  };

  const handleGrant = async () => {
    if (!grantDialogUser || !grantDbName) return;
    await api.grantDb(grantDialogUser, { db_name: grantDbName });
    const res = await api.getDbGrants(grantDialogUser);
    setGrantedDbs(res.databases);
    setGrantDbName("");
    fetchData();
  };

  const handleRevoke = async (dbName: string) => {
    if (!grantDialogUser) return;
    await api.revokeDb(grantDialogUser, { db_name: dbName });
    const res = await api.getDbGrants(grantDialogUser);
    setGrantedDbs(res.databases);
    fetchData();
  };

  // DB grant handlers
  const openDbGrantDialog = (dbName: string) => {
    setGrantDialogDb(dbName);
    const db = databases.find(d => d.db_name === dbName);
    setGrantedUsersForDb(db?.granted_users ?? []);
  };

  const handleGrantUserToDb = async () => {
    if (!grantDialogDb || !grantUserName) return;
    await api.grantDb(grantUserName, { db_name: grantDialogDb });
    fetchData();
    // refresh granted users
    const dbRes = await api.getDatabases();
    const db = dbRes.databases.find((d: Database) => d.db_name === grantDialogDb);
    setGrantedUsersForDb(db?.granted_users ?? []);
    setGrantUserName("");
  };

  const handleRevokeUserFromDb = async (userName: string) => {
    if (!grantDialogDb) return;
    await api.revokeDb(userName, { db_name: grantDialogDb });
    fetchData();
    const dbRes = await api.getDatabases();
    const db = dbRes.databases.find((d: Database) => d.db_name === grantDialogDb);
    setGrantedUsersForDb(db?.granted_users ?? []);
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">{t("nav.mysql")}</h2>
      <Tabs defaultValue="databases">
        <TabsList>
          <TabsTrigger value="databases">{t("mysql.databases")}</TabsTrigger>
          <TabsTrigger value="users">{t("mysql.users")}</TabsTrigger>
        </TabsList>

        {/* Databases Tab */}
        <TabsContent value="databases" className="space-y-4">
          <div className="flex justify-end gap-2">
            {selectedDbs.size > 0 && <Button variant="destructive" size="sm" onClick={handleDeleteSelectedDbs}><Trash2 className="h-4 w-4 mr-1" /> {t("common.deleteSelected")}</Button>}
            <Button size="sm" onClick={() => setShowAddDb(!showAddDb)}><Plus className="h-4 w-4 mr-1" /> {t("common.add")}</Button>
          </div>
          {showAddDb && (
            <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t("mysql.suffix")}</Label><Input value={newDbSuffix} onChange={(e) => setNewDbSuffix(e.target.value)} className="mt-1" /></div>
                <div><Label>{t("mysql.charset")}</Label>
                  <Select value={newDbCharset} onValueChange={setNewDbCharset}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{["utf8mb4", "UTF-8", "EUC-JP", "SHIFT-JIS", "Binary"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>{t("common.memo")}</Label><Input value={newDbMemo} onChange={(e) => setNewDbMemo(e.target.value)} className="mt-1" /></div>
              </div>
              <div className="border-t pt-3">
                <p className="text-sm font-medium mb-2">{t("mysql.users")} ({t("common.add")})</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>{t("mysql.suffix")}</Label><Input value={newDbUserSuffix} onChange={(e) => setNewDbUserSuffix(e.target.value)} className="mt-1" placeholder="optional" /></div>
                  <div><Label>{t("common.password")}</Label><Input type="password" value={newDbUserPassword} onChange={(e) => setNewDbUserPassword(e.target.value)} className="mt-1" placeholder="optional" /></div>
                </div>
              </div>
              <div className="flex gap-2"><Button size="sm" onClick={handleAddDb}>{t("common.save")}</Button><Button size="sm" variant="ghost" onClick={() => setShowAddDb(false)}>{t("common.cancel")}</Button></div>
            </div>
          )}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><Checkbox checked={selectedDbs.size === databases.length && databases.length > 0} onCheckedChange={() => { selectedDbs.size === databases.length ? setSelectedDbs(new Set()) : setSelectedDbs(new Set(databases.map(d => d.db_name))); }} /></TableHead>
                  <TableHead>{t("mysql.dbName")}</TableHead>
                  <TableHead>{t("mysql.size")}</TableHead>
                  <TableHead>{t("mysql.grantedUsers")}</TableHead>
                  <TableHead>{t("common.memo")}</TableHead>
                  <TableHead>{t("mysql.grants")}</TableHead>
                  <TableHead className="w-20">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {databases.map((d) => (
                  <Fragment key={d.db_name}>
                    <TableRow>
                      <TableCell><Checkbox checked={selectedDbs.has(d.db_name)} onCheckedChange={() => { const next = new Set(selectedDbs); next.has(d.db_name) ? next.delete(d.db_name) : next.add(d.db_name); setSelectedDbs(next); }} /></TableCell>
                      <TableCell className="font-medium">{d.db_name}</TableCell>
                      <TableCell>{d.size_mb}</TableCell>
                      <TableCell>{d.granted_users.map(u => <a key={u} href={`https://${encodeURIComponent(u)}:${encodeURIComponent(u)}@phpmyadmin-${hostname}`} target="_blank" rel="noopener noreferrer"><Badge variant="secondary" className="mr-1 cursor-pointer hover:bg-primary hover:text-primary-foreground">{u}</Badge></a>)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{d.memo}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => openDbGrantDialog(d.db_name)}>{t("mysql.grants")}</Button>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => { expandedDb === d.db_name ? setExpandedDb(null) : (setExpandedDb(d.db_name), setEditDbMemo(d.memo)); }}>
                          {expandedDb === d.db_name ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />} {t("common.edit")}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedDb === d.db_name && (
                      <TableRow key={`${d.db_name}-edit`}>
                        <TableCell colSpan={7} className="bg-muted/50">
                          <div className="p-4 space-y-3">
                            <div><Label>{t("common.memo")}</Label><Input value={editDbMemo} onChange={(e) => setEditDbMemo(e.target.value)} className="mt-1" /></div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleUpdateDb(d.db_name)}>{t("common.save")}</Button>
                              <Button size="sm" variant="ghost" onClick={() => setExpandedDb(null)}>{t("common.cancel")}</Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteDb(d.db_name)}>{t("common.delete")}</Button>
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
          <p className="text-sm text-muted-foreground">{t("mysql.phpmyadminHint")}</p>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-end gap-2">
            {selectedUsers.size > 0 && <Button variant="destructive" size="sm" onClick={handleDeleteSelectedUsers}><Trash2 className="h-4 w-4 mr-1" /> {t("common.deleteSelected")}</Button>}
            <Button size="sm" onClick={() => setShowAddUser(!showAddUser)}><Plus className="h-4 w-4 mr-1" /> {t("common.add")}</Button>
          </div>
          {showAddUser && (
            <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
              <div className="grid grid-cols-3 gap-3">
                <div><Label>{t("mysql.suffix")}</Label><Input value={newUserSuffix} onChange={(e) => setNewUserSuffix(e.target.value)} className="mt-1" /></div>
                <div><Label>{t("common.password")}</Label><Input type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} className="mt-1" /></div>
                <div><Label>{t("common.memo")}</Label><Input value={newUserMemo} onChange={(e) => setNewUserMemo(e.target.value)} className="mt-1" /></div>
              </div>
              <div className="flex gap-2"><Button size="sm" onClick={handleAddUser}>{t("common.save")}</Button><Button size="sm" variant="ghost" onClick={() => setShowAddUser(false)}>{t("common.cancel")}</Button></div>
            </div>
          )}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><Checkbox checked={selectedUsers.size === users.length && users.length > 0} onCheckedChange={() => { selectedUsers.size === users.length ? setSelectedUsers(new Set()) : setSelectedUsers(new Set(users.map(u => u.db_user))); }} /></TableHead>
                  <TableHead>{t("mysql.dbUser")}</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>{t("common.memo")}</TableHead>
                  <TableHead>{t("mysql.grants")}</TableHead>
                  <TableHead className="w-20">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <Fragment key={u.db_user}>
                    <TableRow>
                      <TableCell><Checkbox checked={selectedUsers.has(u.db_user)} onCheckedChange={() => { const next = new Set(selectedUsers); next.has(u.db_user) ? next.delete(u.db_user) : next.add(u.db_user); setSelectedUsers(next); }} /></TableCell>
                      <TableCell className="font-medium">{u.db_user}</TableCell>
                      <TableCell>{u.version_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.memo}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => openGrantDialog(u.db_user)}>{t("mysql.grants")}</Button>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => { expandedUser === u.db_user ? setExpandedUser(null) : (setExpandedUser(u.db_user), setEditUserPassword(""), setEditUserMemo(u.memo)); }}>
                          {expandedUser === u.db_user ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />} {t("common.edit")}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedUser === u.db_user && (
                      <TableRow key={`${u.db_user}-edit`}>
                        <TableCell colSpan={6} className="bg-muted/50">
                          <div className="p-4 grid grid-cols-2 gap-3">
                            <div><Label>{t("common.password")}</Label><Input type="password" value={editUserPassword} onChange={(e) => setEditUserPassword(e.target.value)} className="mt-1" placeholder="(unchanged)" /></div>
                            <div><Label>{t("common.memo")}</Label><Input value={editUserMemo} onChange={(e) => setEditUserMemo(e.target.value)} className="mt-1" /></div>
                            <div className="col-span-2 flex gap-2">
                              <Button size="sm" onClick={() => handleUpdateUser(u.db_user)}>{t("common.save")}</Button>
                              <Button size="sm" variant="ghost" onClick={() => setExpandedUser(null)}>{t("common.cancel")}</Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(u.db_user)}>{t("common.delete")}</Button>
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
        </TabsContent>
      </Tabs>

      {/* Grant Dialog (DB -> Users) */}
      <Dialog open={!!grantDialogDb} onOpenChange={() => setGrantDialogDb(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("mysql.grants")}: {grantDialogDb}</DialogTitle>
            <DialogDescription>{t("mysql.grantedUsers")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              {grantedUsersForDb.map((user) => (
                <div key={user} className="flex items-center justify-between p-2 border rounded">
                  <span>{user}</span>
                  <Button size="sm" variant="destructive" onClick={() => handleRevokeUserFromDb(user)}>{t("common.delete")}</Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Select value={grantUserName} onValueChange={setGrantUserName}>
                <SelectTrigger><SelectValue placeholder={t("mysql.dbUser")} /></SelectTrigger>
                <SelectContent>{users.filter(u => !grantedUsersForDb.includes(u.db_user)).map(u => <SelectItem key={u.db_user} value={u.db_user}>{u.db_user}</SelectItem>)}</SelectContent>
              </Select>
              <Button onClick={handleGrantUserToDb}>{t("common.add")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Grant Dialog (User -> DBs) */}
      <Dialog open={!!grantDialogUser} onOpenChange={() => setGrantDialogUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("mysql.grants")}: {grantDialogUser}</DialogTitle>
            <DialogDescription>{t("mysql.grantedUsers")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              {grantedDbs.map((db) => (
                <div key={db} className="flex items-center justify-between p-2 border rounded">
                  <span>{db}</span>
                  <Button size="sm" variant="destructive" onClick={() => handleRevoke(db)}>{t("common.delete")}</Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Select value={grantDbName} onValueChange={setGrantDbName}>
                <SelectTrigger><SelectValue placeholder={t("mysql.dbName")} /></SelectTrigger>
                <SelectContent>{databases.filter(d => !grantedDbs.includes(d.db_name)).map(d => <SelectItem key={d.db_name} value={d.db_name}>{d.db_name}</SelectItem>)}</SelectContent>
              </Select>
              <Button onClick={handleGrant}>{t("common.add")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
