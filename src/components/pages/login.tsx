"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useI18n } from "@/lib/i18n";
import { fetchMe, saveServername } from "@/lib/api";
import { toast } from "sonner";

const MOCK_ENDPOINT = "https://xapi.ix.workers.dev";
const PROD_ENDPOINT = "https://cors.ix.workers.dev/api.xserver.ne.jp";

export function LoginPage() {
  const { t } = useI18n();
  const [apiKey, setApiKey] = useState("");
  const [useMock, setUseMock] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey) return;
    setLoading(true);
    setError("");
    let endpoint: string;
    let me: any;

    if (useMock) {
      endpoint = MOCK_ENDPOINT;
      try {
        me = await fetchMe(apiKey, endpoint);
      } catch (err) {
        let message = "ログインに失敗しました";
        if (err instanceof Error) {
          try {
            const jsonStr = err.message.replace(/^API Error \d+:\s*/, "");
            const parsed = JSON.parse(jsonStr);
            message = parsed?.error?.message || err.message;
          } catch {
            message = err.message;
          }
        }
        toast.error(message);
        setLoading(false);
        return;
      }
    } else {
      const prodEndpoints = [
        "https://cors.ix.workers.dev/api.xserver.ne.jp",
        "https://cors.ix.workers.dev/api.shin-server.jp",
        "https://cors.ix.workers.dev/api.star.ne.jp"
      ];
      const promises = prodEndpoints.map(async (ep) => {
        const result = await fetchMe(apiKey, ep);
        return { endpoint: ep, me: result };
      });
      try {
        const resolved = await Promise.any(promises);
        endpoint = resolved.endpoint;
        me = resolved.me;
      } catch (err) {
        let message = "Login failed";
        if (err instanceof AggregateError) {
          message = "Login failed";
        } else if (err instanceof Error) {
          try {
            const jsonStr = err.message.replace(/^API Error \d+:\s*/, "");
            const parsed = JSON.parse(jsonStr);
            message = parsed?.error?.message || err.message;
          } catch {
            message = err.message;
          }
        }
        toast.error(message);
        setLoading(false);
        return;
      }
    }

    if (!me.servername) throw new Error("No servername returned");
    saveServername(apiKey, me.servername);
    const params = new URLSearchParams({ api_key: apiKey, endpoint });
    const base = (process.env.NEXT_PUBLIC_BASE_PATH || "") + "/";
    window.location.href = `${base}?${params.toString()}`;
  };

  return (
    <div className="flex items-start justify-center min-h-screen bg-background p-4 relative pt-[10vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">{t("login.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">{t("login.apiKey")}</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="xs_..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                required
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="useMock"
                checked={useMock}
                onCheckedChange={(checked) => setUseMock(checked === true)}
              />
              <Label htmlFor="useMock">{t("login.useMock")}</Label>
            </div>
            {error && (
              <div className="rounded-md bg-destructive/15 text-destructive text-sm px-3 py-2">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full">
              {t("login.submit")}
            </Button>
          </form>
        </CardContent>
      </Card>
      <img
        src="https://i.imgur.com/c8aHyTO.png"
        alt=""
        className="fixed bottom-4 right-4 w-48 h-48 object-contain"
      />
    </div>
  );
}
