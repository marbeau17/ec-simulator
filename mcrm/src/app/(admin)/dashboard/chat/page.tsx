"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { MessageCircle, Bot, User, XCircle, Search, AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ChatThread {
  id: string;
  customerName: string;
  customerAvatar?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  status: "ai" | "human" | "closed";
}

const statusConfig = {
  ai: { label: "AI対応中", icon: Bot, color: "bg-emerald-100 text-emerald-700" },
  human: { label: "手動対応", icon: User, color: "bg-blue-100 text-blue-700" },
  closed: { label: "終了", icon: XCircle, color: "bg-gray-100 text-gray-600" },
};

function formatTime(dateStr: string) {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  return new Date(dateStr).toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
}

export default function ChatListPage() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  async function fetchThreads() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/chat/threads?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`サーバーエラー (${res.status})`);
      }
      const json = await res.json();
      setThreads(json.threads || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "会話の取得に失敗しました";
      setError(message);
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchThreads();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchThreads} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            再読み込み
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="会話を検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {(["all", "ai", "human", "closed"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                statusFilter === status
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {status === "all" ? "すべて" : statusConfig[status].label}
            </button>
          ))}
        </div>
      </div>

      {/* Thread List */}
      <div className="space-y-2">
        {threads.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageCircle className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">会話が見つかりません</p>
            </CardContent>
          </Card>
        ) : (
          threads.map((thread) => {
            const StatusIcon = statusConfig[thread.status].icon;
            return (
              <Link key={thread.id} href={`/dashboard/chat/${thread.id}`}>
                <Card className="cursor-pointer transition-colors hover:bg-accent/50">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={thread.customerAvatar} alt={thread.customerName} />
                        <AvatarFallback>{thread.customerName.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      {thread.unreadCount > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                          {thread.unreadCount}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">{thread.customerName}</p>
                        <span className="text-xs text-muted-foreground shrink-0 ml-2">
                          {formatTime(thread.lastMessageAt)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {thread.lastMessage}
                      </p>
                    </div>

                    <div
                      className={cn(
                        "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium shrink-0",
                        statusConfig[thread.status].color
                      )}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {statusConfig[thread.status].label}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
