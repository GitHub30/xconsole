"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useI18n } from "@/lib/i18n";

const MOCK_ENDPOINT = "https://xapi.ix.workers.dev";
const PROD_ENDPOINT = "https://cors.ix.workers.dev/api.xserver.ne.jp";

export function LoginPage() {
  const { t } = useI18n();
  const [servername, setServername] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [useMock, setUseMock] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!servername || !apiKey) return;
    const endpoint = useMock ? MOCK_ENDPOINT : PROD_ENDPOINT;
    const params = new URLSearchParams({ servername, api_key: apiKey, endpoint });
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
              <Label htmlFor="servername">{t("login.servername")}</Label>
              <Input
                id="servername"
                placeholder="xs123456.xsrv.jp"
                value={servername}
                onChange={(e) => setServername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey">{t("login.apiKey")}</Label>
              <Input
                id="apiKey"
                type="password"
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
