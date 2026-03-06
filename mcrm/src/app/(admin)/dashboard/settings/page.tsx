"use client";

import React, { useState } from "react";
import { Store, Users, MessageSquare, Bell, Save, Plus, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type TabKey = "general" | "users" | "line" | "notifications";

const tabs: Array<{ key: TabKey; label: string; icon: typeof Store }> = [
  { key: "general", label: "基本情報", icon: Store },
  { key: "users", label: "ユーザー管理", icon: Users },
  { key: "line", label: "LINE連携", icon: MessageSquare },
  { key: "notifications", label: "通知設定", icon: Bell },
];

const mockUsers = [
  { id: "1", name: "管理者", email: "admin@example.com", role: "owner" },
  { id: "2", name: "オペレーター1", email: "op1@example.com", role: "admin" },
  { id: "3", name: "オペレーター2", email: "op2@example.com", role: "operator" },
];

const roleLabels: Record<string, string> = {
  owner: "オーナー",
  admin: "管理者",
  operator: "オペレーター",
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("general");
  const [saving, setSaving] = useState(false);

  // General settings state
  const [shopName, setShopName] = useState("サンプルレストラン");
  const [shopPhone, setShopPhone] = useState("03-1234-5678");
  const [shopAddress, setShopAddress] = useState("東京都渋谷区恵比寿1-2-3");
  const [shopDescription, setShopDescription] = useState(
    "本格イタリアンと厳選ワインをお楽しみいただけるレストランです。"
  );

  // Notification settings state
  const [notifyNewFollow, setNotifyNewFollow] = useState(true);
  const [notifyNewMessage, setNotifyNewMessage] = useState(true);
  const [notifyNewReservation, setNotifyNewReservation] = useState(true);
  const [notifyAiEscalation, setNotifyAiEscalation] = useState(true);
  const [notifyDailyReport, setNotifyDailyReport] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopName,
          shopPhone,
          shopAddress,
          shopDescription,
          notifications: {
            newFollow: notifyNewFollow,
            newMessage: notifyNewMessage,
            newReservation: notifyNewReservation,
            aiEscalation: notifyAiEscalation,
            dailyReport: notifyDailyReport,
          },
        }),
      });
    } catch {
      // Handle error
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                activeTab === tab.key
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* General Tab */}
      {activeTab === "general" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">店舗情報</CardTitle>
            <CardDescription>店舗の基本情報を管理します</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">店舗名</label>
                <Input value={shopName} onChange={(e) => setShopName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">電話番号</label>
                <Input value={shopPhone} onChange={(e) => setShopPhone(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">住所</label>
              <Input value={shopAddress} onChange={(e) => setShopAddress(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">説明</label>
              <textarea
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={shopDescription}
                onChange={(e) => setShopDescription(e.target.value)}
              />
            </div>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              保存
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">管理ユーザー</CardTitle>
                <CardDescription>管理画面にアクセスできるユーザーを管理します</CardDescription>
              </div>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                ユーザー追加
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ユーザー</TableHead>
                  <TableHead>メールアドレス</TableHead>
                  <TableHead>ロール</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={user.role === "owner" ? "default" : "secondary"}
                      >
                        {roleLabels[user.role]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {user.role !== "owner" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* LINE Tab */}
      {activeTab === "line" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">LINE連携設定</CardTitle>
            <CardDescription>LINE Messaging API の接続情報を表示します</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">チャネルID</p>
                  <p className="text-sm font-mono bg-muted rounded px-2 py-1">
                    {process.env.NEXT_PUBLIC_LINE_CHANNEL_ID || "設定されていません"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">接続ステータス</p>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-sm text-emerald-600 font-medium">接続中</span>
                  </div>
                </div>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Webhook URL</p>
                <p className="text-sm font-mono bg-muted rounded px-2 py-1 break-all">
                  {typeof window !== "undefined"
                    ? `${window.location.origin}/api/webhook/line`
                    : "/api/webhook/line"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">LIFF URL</p>
                <p className="text-sm font-mono bg-muted rounded px-2 py-1">
                  {process.env.NEXT_PUBLIC_LIFF_ID
                    ? `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}`
                    : "設定されていません"}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              LINE連携の設定変更は環境変数の変更が必要です。管理者にお問い合わせください。
            </p>
          </CardContent>
        </Card>
      )}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">通知設定</CardTitle>
            <CardDescription>管理画面の通知を設定します</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "新規フォロー通知", desc: "新しい顧客がLINE公式アカウントをフォローした時", value: notifyNewFollow, setter: setNotifyNewFollow },
              { label: "新規メッセージ通知", desc: "顧客からメッセージを受信した時", value: notifyNewMessage, setter: setNotifyNewMessage },
              { label: "新規予約通知", desc: "新しい予約が作成された時", value: notifyNewReservation, setter: setNotifyNewReservation },
              { label: "AIエスカレーション通知", desc: "AIが対応困難と判断し手動対応を要求した時", value: notifyAiEscalation, setter: setNotifyAiEscalation },
              { label: "日次レポート", desc: "毎日の活動サマリーを受け取る", value: notifyDailyReport, setter: setNotifyDailyReport },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <button
                  onClick={() => item.setter(!item.value)}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors",
                    item.value ? "bg-primary" : "bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                      item.value ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
            ))}
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              保存
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
