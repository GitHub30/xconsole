const MOCK_ENDPOINT = "https://xapi.ix.workers.dev";

function getUrlParams(): { apiKey: string | null; endpoint: string | null } {
  if (typeof window === "undefined") return { apiKey: null, endpoint: null };
  const params = new URLSearchParams(window.location.search);
  return { apiKey: params.get("api_key"), endpoint: params.get("endpoint") };
}

function getEndpoint(): string {
  return getUrlParams().endpoint || MOCK_ENDPOINT;
}

function getApiKey(): string | null {
  return getUrlParams().apiKey;
}

function getAuth(): { servername: string; apiKey: string } | null {
  if (typeof window === "undefined") return null;
  const apiKey = getApiKey();
  if (!apiKey) return null;
  const servername = localStorage.getItem(apiKey);
  if (!servername) return null;
  return { servername, apiKey };
}

export function hasUrlAuth(): boolean {
  const { apiKey } = getUrlParams();
  return !!apiKey;
}

export function saveServername(apiKey: string, servername: string): void {
  localStorage.setItem(apiKey, servername);
}

export function clearAuth(): void {
  const apiKey = getApiKey();
  if (apiKey) localStorage.removeItem(apiKey);
}

export function isLoggedIn(): boolean {
  return getAuth() !== null;
}

export function getServername(): string {
  return getAuth()?.servername ?? "";
}

export function getServernamePrefix(): string {
  const sn = getServername();
  return sn.split(".")[0] || sn;
}

export async function fetchMe(apiKey: string, endpoint: string): Promise<{
  service_type: string;
  expires_at: string | null;
  servername: string;
  permission_type: string;
}> {
  const url = `${endpoint}/v1/me`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error ${res.status}: ${text}`);
  }
  return res.json();
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const auth = getAuth();
  if (!auth) throw new Error("Not authenticated");

  const url = `${getEndpoint()}/v1/server/${auth.servername}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${auth.apiKey}`,
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error ${res.status}: ${text}`);
  }
  return res.json();
}

export const api = {
  // Server Info
  getServerInfo: () => request<{
    server_id: string; hostname: string; ip_address: string; os: string;
    cpu: string | null; memory: string | null; apache_version: string;
    perl_versions: string[]; php_versions: string[]; db_versions: string[];
    name_servers: string[]; domain_validation_token: string;
  }>("/server-info"),

  getServerUsage: () => request<{
    disk: { quota_gb: number; used_gb: number; file_limit: number; file_count: number };
    counts: { domains: number; subdomains: number; mail_accounts: number; ftp_accounts: number; mysql_databases: number };
  }>("/server-info/usage"),

  // Domains
  getDomains: () => request<{ domains: Array<{ domain: string; type: string; ssl: boolean; memo: string; is_awaiting: boolean }> }>("/domain"),
  createDomain: (data: { domain: string; ssl?: boolean; redirect_https?: boolean; ai_crawler_block_enabled?: boolean; memo?: string }) => request<{ domain: string; message: string; ssl_status?: string }>("/domain", { method: "POST", body: JSON.stringify(data) }),
  getDomain: (domain: string) => request<{ domain: string; type: string; document_root: string; url: string; php_version: string; ssl: boolean; memo: string; is_awaiting: boolean; created_at: string }>(`/domain/${encodeURIComponent(domain)}`),
  updateDomain: (domain: string, data: { memo: string }) => request<{ message: string }>(`/domain/${encodeURIComponent(domain)}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteDomain: (domain: string, data?: { delete_files?: boolean }) => request<{ message: string }>(`/domain/${encodeURIComponent(domain)}`, { method: "DELETE", body: JSON.stringify(data ?? {}) }),
  resetDomain: (domain: string, data: { type: string }) => request<{ message: string }>(`/domain/${encodeURIComponent(domain)}/reset`, { method: "POST", body: JSON.stringify(data) }),

  // Subdomains
  getSubdomains: (domain?: string) => request<{ subdomains: Array<{ subdomain: string; domain: string; document_root: string; ssl: boolean; memo: string }> }>(`/subdomain${domain ? `?domain=${encodeURIComponent(domain)}` : ""}`),
  createSubdomain: (data: { subdomain: string; ssl?: boolean; memo?: string }) => request<{ subdomain: string; message: string; ssl_status?: string }>("/subdomain", { method: "POST", body: JSON.stringify(data) }),
  updateSubdomain: (subdomain: string, data: { memo: string }) => request<{ message: string }>(`/subdomain/${encodeURIComponent(subdomain)}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteSubdomain: (subdomain: string, data?: { delete_files?: boolean }) => request<{ message: string }>(`/subdomain/${encodeURIComponent(subdomain)}`, { method: "DELETE", body: JSON.stringify(data ?? {}) }),

  // DNS
  getDns: (domain?: string) => request<{ records: Array<{ id: number; domain: string; host: string; type: string; content: string; ttl: number; priority: number }> }>(`/dns${domain ? `?domain=${encodeURIComponent(domain)}` : ""}`),
  createDns: (data: { domain: string; host: string; type: string; content: string; ttl?: number; priority?: number }) => request<{ id: number; message: string }>("/dns", { method: "POST", body: JSON.stringify(data) }),
  updateDns: (id: number, data: { domain?: string; host?: string; type?: string; content?: string; ttl?: number; priority?: number }) => request<{ message: string }>(`/dns/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteDns: (id: number) => request<{ message: string }>(`/dns/${id}`, { method: "DELETE" }),

  // Mail
  getMail: (domain?: string) => request<{ accounts: Array<{ mail_address: string; quota_mb: number; memo: string }> }>(`/mail${domain ? `?domain=${encodeURIComponent(domain)}` : ""}`),
  createMail: (data: { mail_address: string; password: string; quota_mb?: number; memo?: string }) => request<{ mail_address: string; message: string }>("/mail", { method: "POST", body: JSON.stringify(data) }),
  getMailDetail: (account: string) => request<{ mail_address: string; quota_mb: number; used_mb: number; memo: string }>(`/mail/${encodeURIComponent(account)}`),
  updateMail: (account: string, data: { password?: string; quota_mb?: number; memo?: string }) => request<{ message: string }>(`/mail/${encodeURIComponent(account)}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteMail: (account: string) => request<{ message: string }>(`/mail/${encodeURIComponent(account)}`, { method: "DELETE" }),

  // Mail Forwarding
  getMailForwarding: (account: string) => request<{ forwarding_addresses: string[]; keep_in_mailbox: boolean }>(`/mail/${encodeURIComponent(account)}/forwarding`),
  updateMailForwarding: (account: string, data: { forwarding_addresses?: string[]; keep_in_mailbox?: boolean }) => request<{ message: string }>(`/mail/${encodeURIComponent(account)}/forwarding`, { method: "PUT", body: JSON.stringify(data) }),

  // Mail Filter
  getMailFilters: (domain?: string) => request<{ filters: Array<{ id: string; domain: string; priority: number; conditions: Array<{ keyword: string; field: string; match_type: string }>; action: { type: string; target: string; method: string } }> }>(`/mail-filter${domain ? `?domain=${encodeURIComponent(domain)}` : ""}`),
  createMailFilter: (data: { domain: string; conditions: Array<{ keyword: string; field: string; match_type: string }>; action: { type: string; target?: string; method: string } }) => request<{ id: string; message: string }>("/mail-filter", { method: "POST", body: JSON.stringify(data) }),
  deleteMailFilter: (id: string) => request<{ message: string }>(`/mail-filter/${encodeURIComponent(id)}`, { method: "DELETE" }),

  // FTP
  getFtp: (domain?: string) => request<{ accounts: Array<{ ftp_account: string; directory: string; quota_mb: number; memo: string }> }>(`/ftp${domain ? `?domain=${encodeURIComponent(domain)}` : ""}`),
  createFtp: (data: { ftp_account: string; password: string; directory?: string; quota_mb?: number; memo?: string }) => request<{ ftp_account: string; message: string }>("/ftp", { method: "POST", body: JSON.stringify(data) }),
  updateFtp: (account: string, data: { password?: string; directory?: string; quota_mb?: number; memo?: string }) => request<{ message: string }>(`/ftp/${encodeURIComponent(account)}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteFtp: (account: string) => request<{ message: string }>(`/ftp/${encodeURIComponent(account)}`, { method: "DELETE" }),

  // MySQL
  getDatabases: () => request<{ databases: Array<{ db_name: string; version_name: string; size_mb: number; granted_users: string[]; memo: string }> }>("/db"),
  createDatabase: (data: { name_suffix: string; character_set?: string; memo?: string }) => request<{ db_name: string; message: string }>("/db", { method: "POST", body: JSON.stringify(data) }),
  updateDatabase: (name: string, data: { memo: string }) => request<{ message: string }>(`/db/${encodeURIComponent(name)}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteDatabase: (name: string) => request<{ message: string }>(`/db/${encodeURIComponent(name)}`, { method: "DELETE" }),

  getDbUsers: () => request<{ users: Array<{ db_user: string; version_name: string; memo: string }> }>("/db/user"),
  createDbUser: (data: { name_suffix: string; password: string; memo?: string }) => request<{ db_user: string; message: string }>("/db/user", { method: "POST", body: JSON.stringify(data) }),
  updateDbUser: (user: string, data: { password?: string; memo?: string }) => request<{ message: string }>(`/db/user/${encodeURIComponent(user)}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteDbUser: (user: string) => request<{ message: string }>(`/db/user/${encodeURIComponent(user)}`, { method: "DELETE" }),

  getDbGrants: (user: string) => request<{ databases: string[] }>(`/db/user/${encodeURIComponent(user)}/grant`),
  grantDb: (user: string, data: { db_name: string }) => request<{ message: string }>(`/db/user/${encodeURIComponent(user)}/grant`, { method: "POST", body: JSON.stringify(data) }),
  revokeDb: (user: string, data: { db_name: string }) => request<{ message: string }>(`/db/user/${encodeURIComponent(user)}/grant`, { method: "DELETE", body: JSON.stringify(data) }),

  // WordPress
  getWordPress: (domain?: string) => request<{ wordpress: Array<{ id: string; domain: string; url: string; title: string; version: string; db_name: string; db_user: string; memo: string }> }>(`/wp${domain ? `?domain=${encodeURIComponent(domain)}` : ""}`),
  createWordPress: (data: { url: string; title: string; admin_username: string; admin_password: string; admin_email: string; memo?: string }) => request<{ id: string; message: string }>("/wp", { method: "POST", body: JSON.stringify(data) }),
  updateWordPress: (id: string, data: { memo: string }) => request<{ message: string }>(`/wp/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteWordPress: (id: string, data?: { delete_db?: boolean; delete_db_user?: boolean; delete_cron?: boolean }) => request<{ message: string }>(`/wp/${encodeURIComponent(id)}`, { method: "DELETE", body: JSON.stringify(data ?? {}) }),

  // Cron
  getCrons: () => request<{ crons: Array<{ id: string; minute: string; hour: string; day: string; month: string; weekday: string; command: string; comment: string; enabled: boolean }>; notification_email: string | null }>("/cron"),
  createCron: (data: { minute: string; hour: string; day: string; month: string; weekday: string; command: string; comment?: string }) => request<{ id: string; message: string }>("/cron", { method: "POST", body: JSON.stringify(data) }),
  updateCron: (id: string, data: { minute?: string; hour?: string; day?: string; month?: string; weekday?: string; command?: string; comment?: string; enabled?: boolean }) => request<{ id: string; message: string }>(`/cron/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteCron: (id: string) => request<{ message: string }>(`/cron/${encodeURIComponent(id)}`, { method: "DELETE" }),

  // SSL
  getSsl: (domain?: string) => request<{ ssl_list: Array<{ id: number; common_name: string; type: string; expires_at: string; status: string }> }>(`/ssl${domain ? `?domain=${encodeURIComponent(domain)}` : ""}`),
  createSsl: (data: { common_name: string }) => request<{ message: string }>("/ssl", { method: "POST", body: JSON.stringify(data) }),
  deleteSsl: (commonName: string) => request<{ message: string }>(`/ssl/${encodeURIComponent(commonName)}`, { method: "DELETE" }),

  // Logs
  // PHP Version
  getPhpVersion: (domain?: string) => request<{ available_versions: Record<string, string>; domains: Array<{ domain: string; current_version: string }> }>(`/php-version${domain ? `?domain=${encodeURIComponent(domain)}` : ""}`),
  updatePhpVersion: (domain: string, data: { version: string }) => request<{ message: string }>(`/php-version/${encodeURIComponent(domain)}`, { method: "PUT", body: JSON.stringify(data) }),

  // Logs
  getAccessLog: (domain: string, lines?: number, keyword?: string) => request<{ domain: string; log: string }>(`/access-log?domain=${encodeURIComponent(domain)}${lines ? `&lines=${lines}` : ""}${keyword ? `&keyword=${encodeURIComponent(keyword)}` : ""}`),
  getErrorLog: (domain: string, lines?: number, keyword?: string) => request<{ domain: string; log: string }>(`/error-log?domain=${encodeURIComponent(domain)}${lines ? `&lines=${lines}` : ""}${keyword ? `&keyword=${encodeURIComponent(keyword)}` : ""}`),
};
