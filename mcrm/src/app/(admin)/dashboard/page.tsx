"use client";

import React, { useState, useEffect } from "react";
import { Users, MessageCircle, CalendarCheck, Calendar, Bot, TrendingUp, UserPlus, Mail, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/dashboard");
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `API returned ${res.status}`);
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
        setError(
          err instanceof Error ? err.message : "ダッシュボードデータの取得に失敗しました"
        );
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
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

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-lg font-semibold">データの読み込みに失敗しました</h2>
        <p className="text-sm text-muted-foreground max-w-md text-center">
          {error || "ダッシュボードデータの取得に失敗しました"}
        </p>
        <button
          onClick={() => {
            setError(null);
            setLoading(true);
            fetch("/api/dashboard")
              .then((res) => {
                if (!res.ok) throw new Error(`API returned ${res.status}`);
                return res.json();
              })
              .then((json) => setData(json))
              .catch((err) =>
                setError(
                  err instanceof Error
                    ? err.message
                    : "ダッシュボードデータの取得に失敗しました"
                )
              )
              .finally(() => setLoading(false));
          }}
          className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
        >
          再試行
        </button>
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
