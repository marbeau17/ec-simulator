"use client";

import React, { useState, useEffect } from "react";
import { Bot, TrendingUp, TrendingDown, AlertTriangle, Lightbulb, DollarSign, ShoppingCart, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface AnalyticsData {
  latestReport: {
    id: string;
    title: string;
    summary: string;
    generatedAt: string;
    period: string;
  };
  metrics: {
    revenue: { value: number; change: number };
    orders: { value: number; change: number };
    avgOrderValue: { value: number; change: number };
  };
  recommendations: Array<{
    id: string;
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
    impact: string;
    category: string;
  }>;
}

const mockData: AnalyticsData = {
  latestReport: {
    id: "rpt_1",
    title: "2026年3月 月次AIインサイトレポート",
    summary:
      "今月は全体的に好調な結果となりました。特にVIP顧客からの予約が前月比20%増加し、客単価も上昇傾向にあります。AIチャット対応により、顧客満足度が向上しオペレーションコストの削減も実現しました。一方、新規顧客の獲得ペースは先月と同水準であり、新規獲得施策の強化が必要です。週末のピーク時間帯（18:00-20:00）の予約が集中しており、キャパシティ管理の改善を推奨します。また、常連顧客のうち30日以上来店のない休眠顧客が15%増加しています。再来店促進キャンペーンの実施を推奨します。",
    generatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    period: "2026年3月1日 - 3月6日",
  },
  metrics: {
    revenue: { value: 4850000, change: 12.3 },
    orders: { value: 342, change: 8.5 },
    avgOrderValue: { value: 14181, change: 3.5 },
  },
  recommendations: [
    {
      id: "rec_1",
      title: "休眠顧客への再来店キャンペーン",
      description:
        "30日以上来店のない顧客187名に対し、パーソナライズされたクーポンを配信することを推奨。過去の注文データに基づくおすすめメニューと10%割引の組み合わせが効果的です。",
      priority: "high",
      impact: "推定売上増: +¥280,000/月",
      category: "顧客維持",
    },
    {
      id: "rec_2",
      title: "週末ピーク時間帯の予約分散",
      description:
        "17:00-18:00のアーリーディナー割引を導入し、ピーク時間帯の混雑を緩和。キャパシティの有効活用率を15%改善できます。",
      priority: "high",
      impact: "座席回転率: +15%",
      category: "オペレーション",
    },
    {
      id: "rec_3",
      title: "VIP顧客向け限定イベント月1回開催",
      description:
        "VIP顧客の来店頻度とロイヤリティを維持するため、月1回のワインテイスティングや料理教室を推奨。客単価30%増が見込めます。",
      priority: "medium",
      impact: "VIP客単価: +30%",
      category: "売上向上",
    },
    {
      id: "rec_4",
      title: "LINE公式アカウントのリッチメニュー改善",
      description:
        "予約導線をリッチメニューの最上段に配置し、予約完了率の改善を推奨。現在のCVRは12%ですが、UI改善で18%まで向上が見込めます。",
      priority: "medium",
      impact: "予約CVR: +6pt",
      category: "デジタル改善",
    },
    {
      id: "rec_5",
      title: "季節メニューのSNS告知強化",
      description:
        "春の新メニューについて、LINE配信に加えInstagramとの連携投稿を実施。新規顧客獲得の相乗効果が見込めます。",
      priority: "low",
      impact: "新規フォロワー: +50名/月",
      category: "マーケティング",
    },
  ],
};

const priorityConfig: Record<string, { label: string; color: string; icon: typeof AlertTriangle }> = {
  high: { label: "高", color: "bg-red-100 text-red-700 border-red-200", icon: AlertTriangle },
  medium: { label: "中", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Lightbulb },
  low: { label: "低", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Lightbulb },
};

type Period = "weekly" | "monthly";

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("monthly");

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch(`/api/analytics?period=${period}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          setData(mockData);
        }
      } catch {
        setData(mockData);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, [period]);

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-48" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Bot className="h-5 w-5" />
          AIアナリティクス
        </h2>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <button
            onClick={() => setPeriod("weekly")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              period === "weekly"
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            週次
          </button>
          <button
            onClick={() => setPeriod("monthly")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              period === "monthly"
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            月次
          </button>
        </div>
      </div>

      {/* Latest AI Report */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                {data.latestReport.title}
              </CardTitle>
              <CardDescription className="mt-1">
                期間: {data.latestReport.period} | 生成日時:{" "}
                {new Date(data.latestReport.generatedAt).toLocaleString("ja-JP")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-foreground/80">{data.latestReport.summary}</p>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">売上</p>
                <p className="text-2xl font-bold">
                  ¥{data.metrics.revenue.value.toLocaleString()}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {data.metrics.revenue.change >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <span
                    className={cn(
                      "text-sm font-medium",
                      data.metrics.revenue.change >= 0
                        ? "text-emerald-500"
                        : "text-red-500"
                    )}
                  >
                    {data.metrics.revenue.change > 0 ? "+" : ""}
                    {data.metrics.revenue.change}%
                  </span>
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">注文数</p>
                <p className="text-2xl font-bold">{data.metrics.orders.value}</p>
                <div className="flex items-center gap-1 mt-1">
                  {data.metrics.orders.change >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <span
                    className={cn(
                      "text-sm font-medium",
                      data.metrics.orders.change >= 0
                        ? "text-emerald-500"
                        : "text-red-500"
                    )}
                  >
                    {data.metrics.orders.change > 0 ? "+" : ""}
                    {data.metrics.orders.change}%
                  </span>
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">平均注文額</p>
                <p className="text-2xl font-bold">
                  ¥{data.metrics.avgOrderValue.value.toLocaleString()}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {data.metrics.avgOrderValue.change >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <span
                    className={cn(
                      "text-sm font-medium",
                      data.metrics.avgOrderValue.change >= 0
                        ? "text-emerald-500"
                        : "text-red-500"
                    )}
                  >
                    {data.metrics.avgOrderValue.change > 0 ? "+" : ""}
                    {data.metrics.avgOrderValue.change}%
                  </span>
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <div>
        <h3 className="mb-4 text-lg font-semibold flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          AI推奨アクション
        </h3>
        <div className="space-y-4">
          {data.recommendations.map((rec) => {
            const pc = priorityConfig[rec.priority];
            const PriorityIcon = pc.icon;
            return (
              <Card key={rec.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
                        pc.color
                      )}
                    >
                      <PriorityIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="font-semibold">{rec.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {rec.category}
                            </Badge>
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                                pc.color
                              )}
                            >
                              優先度: {pc.label}
                            </span>
                          </div>
                        </div>
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          {rec.impact}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{rec.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
