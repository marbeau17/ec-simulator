"use client";

import React, { useState, useEffect } from "react";
import { Users, MessageCircle, CalendarCheck, Calendar, Bot, TrendingUp, UserPlus, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/admin/kpi-card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DashboardData {
  kpi: {
    totalCustomers: number;
    customerChange: number;
    monthlyMessages: number;
    messageChange: number;
    reservationsThisMonth: number;
    reservationChange: number;
    activeEvents: number;
    eventChange: number;
  };
  insights: Array<{
    id: string;
    title: string;
    summary: string;
    priority: string;
    createdAt: string;
  }>;
  customerGrowth: Array<{ month: string; count: number }>;
  messageVolume: Array<{ date: string; count: number }>;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    customerName?: string;
    customerAvatar?: string;
  }>;
}

const defaultData: DashboardData = {
  kpi: {
    totalCustomers: 1248,
    customerChange: 12.5,
    monthlyMessages: 3420,
    messageChange: 8.2,
    reservationsThisMonth: 156,
    reservationChange: -3.1,
    activeEvents: 4,
    eventChange: 33.3,
  },
  insights: [
    {
      id: "1",
      title: "リピーター率の上昇",
      summary: "過去30日間でリピーター率が15%上昇しています。VIP顧客向けの特別キャンペーンが効果的でした。",
      priority: "high",
      createdAt: new Date().toISOString(),
    },
    {
      id: "2",
      title: "週末予約の増加傾向",
      summary: "土日の予約が平日と比較して40%増加しています。週末限定メニューの導入を推奨します。",
      priority: "medium",
      createdAt: new Date().toISOString(),
    },
    {
      id: "3",
      title: "チャット応答時間の改善",
      summary: "AI自動応答の導入により、平均応答時間が5分から30秒に短縮されました。",
      priority: "low",
      createdAt: new Date().toISOString(),
    },
  ],
  customerGrowth: [
    { month: "10月", count: 980 },
    { month: "11月", count: 1050 },
    { month: "12月", count: 1120 },
    { month: "1月", count: 1150 },
    { month: "2月", count: 1200 },
    { month: "3月", count: 1248 },
  ],
  messageVolume: [
    { date: "月", count: 120 },
    { date: "火", count: 150 },
    { date: "水", count: 180 },
    { date: "木", count: 130 },
    { date: "金", count: 200 },
    { date: "土", count: 280 },
    { date: "日", count: 250 },
  ],
  recentActivity: [
    {
      id: "1",
      type: "follow",
      description: "新規フォロー",
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      customerName: "田中太郎",
    },
    {
      id: "2",
      type: "message",
      description: "メッセージを送信しました",
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      customerName: "佐藤花子",
    },
    {
      id: "3",
      type: "reservation",
      description: "予約を作成しました",
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      customerName: "鈴木一郎",
    },
    {
      id: "4",
      type: "message",
      description: "AI自動応答で対応しました",
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      customerName: "山田美咲",
    },
    {
      id: "5",
      type: "follow",
      description: "新規フォロー",
      timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      customerName: "高橋健太",
    },
  ],
};

function priorityColor(priority: string) {
  switch (priority) {
    case "high":
      return "destructive";
    case "medium":
      return "default";
    default:
      return "secondary";
  }
}

function priorityLabel(priority: string) {
  switch (priority) {
    case "high":
      return "重要";
    case "medium":
      return "中";
    default:
      return "低";
  }
}

function activityIcon(type: string) {
  switch (type) {
    case "follow":
      return <UserPlus className="h-4 w-4 text-emerald-500" />;
    case "message":
      return <MessageCircle className="h-4 w-4 text-blue-500" />;
    case "reservation":
      return <CalendarCheck className="h-4 w-4 text-purple-500" />;
    default:
      return <Mail className="h-4 w-4 text-muted-foreground" />;
  }
}

function formatTimeAgo(timestamp: string) {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  return `${Math.floor(hours / 24)}日前`;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/dashboard");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          setData(defaultData);
        }
      } catch {
        setData(defaultData);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="総顧客数"
          value={data.kpi.totalCustomers.toLocaleString()}
          change={data.kpi.customerChange}
          icon={Users}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
        />
        <KpiCard
          title="月間メッセージ"
          value={data.kpi.monthlyMessages.toLocaleString()}
          change={data.kpi.messageChange}
          icon={MessageCircle}
          iconColor="text-emerald-600"
          iconBgColor="bg-emerald-100"
        />
        <KpiCard
          title="今月の予約"
          value={data.kpi.reservationsThisMonth.toLocaleString()}
          change={data.kpi.reservationChange}
          icon={CalendarCheck}
          iconColor="text-purple-600"
          iconBgColor="bg-purple-100"
        />
        <KpiCard
          title="アクティブイベント"
          value={data.kpi.activeEvents}
          change={data.kpi.eventChange}
          icon={Calendar}
          iconColor="text-orange-600"
          iconBgColor="bg-orange-100"
        />
      </div>

      {/* AI Insights */}
      <div>
        <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
          <Bot className="h-5 w-5" />
          AI インサイト
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {data.insights.map((insight) => (
            <Card key={insight.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{insight.title}</CardTitle>
                  <Badge variant={priorityColor(insight.priority) as "default" | "secondary" | "destructive" | "outline"}>
                    {priorityLabel(insight.priority)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{insight.summary}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">顧客数推移</CardTitle>
            <CardDescription>過去6ヶ月の顧客数</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.customerGrowth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="顧客数"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">メッセージ量</CardTitle>
            <CardDescription>今週のメッセージ数</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.messageVolume}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar
                    dataKey="count"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    name="メッセージ数"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            最近のアクティビティ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center gap-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                  {activityIcon(activity.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">{activity.customerName}</p>
                  <p className="text-xs text-muted-foreground">
                    {activity.description}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatTimeAgo(activity.timestamp)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
