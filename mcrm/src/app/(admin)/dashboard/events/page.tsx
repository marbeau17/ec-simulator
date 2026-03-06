"use client";

import React, { useState, useEffect } from "react";
import { Plus, MapPin, Users, CalendarDays, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface EventItem {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  date: string;
  location: string;
  capacity: number;
  registeredCount: number;
  status: "published" | "draft" | "completed";
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  published: { label: "公開中", variant: "default" },
  draft: { label: "下書き", variant: "outline" },
  completed: { label: "終了", variant: "secondary" },
};

const mockEvents: EventItem[] = [
  {
    id: "evt_1",
    title: "春のワインテイスティング会",
    description: "厳選された春のワインを楽しむテイスティングイベント。ソムリエによる解説付き。",
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    location: "メインダイニング",
    capacity: 30,
    registeredCount: 22,
    status: "published",
  },
  {
    id: "evt_2",
    title: "シェフの特別ディナーコース",
    description: "料理長による特別コース。季節の食材を使った全8品。",
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
    location: "個室 桜",
    capacity: 12,
    registeredCount: 12,
    status: "published",
  },
  {
    id: "evt_3",
    title: "日本酒の夕べ",
    description: "日本各地の銘酒を味わう特別イベント。",
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21).toISOString(),
    location: "バーラウンジ",
    capacity: 20,
    registeredCount: 8,
    status: "draft",
  },
  {
    id: "evt_4",
    title: "バレンタインスペシャルディナー",
    description: "大切な方と過ごすバレンタインの特別ディナー。",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
    location: "メインダイニング",
    capacity: 40,
    registeredCount: 38,
    status: "completed",
  },
  {
    id: "evt_5",
    title: "料理教室 - パスタ編",
    description: "プロのシェフから学ぶ本格パスタ作り。",
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10).toISOString(),
    location: "キッチンスタジオ",
    capacity: 15,
    registeredCount: 10,
    status: "published",
  },
  {
    id: "evt_6",
    title: "クリスマスパーティー",
    description: "年末の特別パーティー。ライブ演奏あり。",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString(),
    location: "パーティールーム",
    capacity: 60,
    registeredCount: 55,
    status: "completed",
  },
];

const tabs = [
  { value: "all", label: "すべて" },
  { value: "published", label: "公開中" },
  { value: "draft", label: "下書き" },
  { value: "completed", label: "終了" },
];

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch("/api/events");
        if (res.ok) {
          const json = await res.json();
          setEvents(json.events || json);
        } else {
          setEvents(mockEvents);
        }
      } catch {
        setEvents(mockEvents);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  const filtered = events.filter((e) => {
    const matchTab = activeTab === "all" || e.status === activeTab;
    const matchSearch = !search || e.title.includes(search) || e.location.includes(search);
    return matchTab && matchSearch;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                activeTab === tab.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="イベント検索..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-52"
            />
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            新規作成
          </Button>
        </div>
      </div>

      {/* Event Cards Grid */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CalendarDays className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">イベントが見つかりません</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((event) => {
            const config = statusConfig[event.status];
            const isFull = event.registeredCount >= event.capacity;
            const fillRate = Math.round((event.registeredCount / event.capacity) * 100);

            return (
              <Card key={event.id} className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                {/* Event Image Placeholder */}
                <div className="relative h-40 bg-gradient-to-br from-primary/20 to-primary/5">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <CalendarDays className="h-12 w-12 text-primary/30" />
                  </div>
                  <div className="absolute right-3 top-3">
                    <Badge variant={config.variant}>{config.label}</Badge>
                  </div>
                  {isFull && (
                    <div className="absolute left-3 top-3">
                      <Badge variant="destructive">満席</Badge>
                    </div>
                  )}
                </div>

                <CardContent className="p-4 space-y-3">
                  <h3 className="font-semibold line-clamp-1">{event.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CalendarDays className="h-4 w-4 shrink-0" />
                      <span>
                        {new Date(event.date).toLocaleDateString("ja-JP", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          weekday: "short",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span>{event.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4 shrink-0" />
                      <span>
                        {event.registeredCount} / {event.capacity} 名
                      </span>
                    </div>
                  </div>

                  {/* Capacity bar */}
                  <div className="space-y-1">
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          fillRate >= 100
                            ? "bg-red-500"
                            : fillRate >= 80
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        )}
                        style={{ width: `${Math.min(fillRate, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-right">{fillRate}%</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
