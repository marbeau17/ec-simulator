"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { MessageCircle, Bot, User, XCircle, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

const mockThreads: ChatThread[] = [
  {
    id: "thread_1",
    customerName: "田中太郎",
    lastMessage: "はい、お願いします！",
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    unreadCount: 2,
    status: "ai",
  },
  {
    id: "thread_2",
    customerName: "佐藤花子",
    lastMessage: "メニューの写真を送っていただけますか？",
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    unreadCount: 1,
    status: "human",
  },
  {
    id: "thread_3",
    customerName: "鈴木一郎",
    lastMessage: "ありがとうございました。また来ます。",
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    unreadCount: 0,
    status: "closed",
  },
  {
    id: "thread_4",
    customerName: "山田美咲",
    lastMessage: "アレルギー対応は可能ですか？",
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    unreadCount: 3,
    status: "ai",
  },
  {
    id: "thread_5",
    customerName: "高橋健太",
    lastMessage: "予約の変更をお願いしたいのですが",
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    unreadCount: 0,
    status: "human",
  },
  {
    id: "thread_6",
    customerName: "渡辺優子",
    lastMessage: "キャンセルポリシーを教えてください",
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    unreadCount: 0,
    status: "closed",
  },
  {
    id: "thread_7",
    customerName: "伊藤翔",
    lastMessage: "コース料理の内容を確認したいです",
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    unreadCount: 1,
    status: "ai",
  },
];

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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    async function fetchThreads() {
      try {
        const res = await fetch("/api/chat/threads");
        if (res.ok) {
          const json = await res.json();
          setThreads(json.threads || json);
        } else {
          setThreads(mockThreads);
        }
      } catch {
        setThreads(mockThreads);
      } finally {
        setLoading(false);
      }
    }
    fetchThreads();
  }, []);

  const filtered = threads.filter((t) => {
    const matchSearch = !search || t.customerName.includes(search) || t.lastMessage.includes(search);
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
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
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageCircle className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">会話が見つかりません</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((thread) => {
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
