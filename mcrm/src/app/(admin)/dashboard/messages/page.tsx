"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, MoreHorizontal, Send, Clock, Eye, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface Broadcast {
  id: string;
  title: string;
  targetSegment: string;
  status: "draft" | "scheduled" | "sent" | "failed";
  sentCount: number;
  totalTarget: number;
  scheduledAt: string | null;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "下書き", variant: "outline" },
  scheduled: { label: "配信予定", variant: "secondary" },
  sent: { label: "配信済み", variant: "default" },
  failed: { label: "失敗", variant: "destructive" },
};

const mockBroadcasts: Broadcast[] = [
  {
    id: "bc_1",
    title: "週末限定ディナーコースのご案内",
    targetSegment: "VIP会員",
    status: "sent",
    sentCount: 245,
    totalTarget: 250,
    scheduledAt: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
  {
    id: "bc_2",
    title: "3月のイベント情報",
    targetSegment: "全顧客",
    status: "scheduled",
    sentCount: 0,
    totalTarget: 1248,
    scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: "bc_3",
    title: "お誕生日おめでとうございます",
    targetSegment: "誕生日月",
    status: "sent",
    sentCount: 32,
    totalTarget: 32,
    scheduledAt: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
  {
    id: "bc_4",
    title: "新メニューのお知らせ",
    targetSegment: "常連",
    status: "draft",
    sentCount: 0,
    totalTarget: 520,
    scheduledAt: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: "bc_5",
    title: "年末特別キャンペーン",
    targetSegment: "全顧客",
    status: "failed",
    sentCount: 800,
    totalTarget: 1200,
    scheduledAt: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  },
];

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MessagesPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBroadcasts() {
      try {
        const res = await fetch("/api/broadcasts");
        if (res.ok) {
          const json = await res.json();
          setBroadcasts(json.broadcasts || json);
        } else {
          setBroadcasts(mockBroadcasts);
        }
      } catch {
        setBroadcasts(mockBroadcasts);
      } finally {
        setLoading(false);
      }
    }
    fetchBroadcasts();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{broadcasts.length} 件のメッセージ</p>
        <Link href="/dashboard/messages/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            新規作成
          </Button>
        </Link>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>タイトル</TableHead>
                <TableHead>ターゲット</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>配信数</TableHead>
                <TableHead>配信日時</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {broadcasts.map((bc) => {
                const config = statusConfig[bc.status];
                return (
                  <TableRow key={bc.id}>
                    <TableCell className="font-medium">{bc.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{bc.targetSegment}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {bc.sentCount.toLocaleString()} / {bc.totalTarget.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {bc.status === "scheduled"
                        ? formatDate(bc.scheduledAt)
                        : formatDate(bc.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {bc.status === "draft" && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
