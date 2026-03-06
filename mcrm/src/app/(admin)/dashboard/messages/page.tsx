"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Eye, Trash2, RefreshCw } from "lucide-react";
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

interface DeliveryStats {
  sent: number;
  failed: number;
  total: number;
}

interface Broadcast {
  id: string;
  title: string;
  message_type: string;
  target_filter: Record<string, unknown> | null;
  target_count: number;
  sent_count: number;
  failed_count: number;
  status: "draft" | "scheduled" | "sending" | "completed" | "failed";
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  delivery_stats: DeliveryStats;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  draft: { label: "下書き", variant: "outline" },
  scheduled: { label: "配信予定", variant: "secondary" },
  sending: { label: "配信中", variant: "secondary" },
  completed: { label: "配信済み", variant: "default" },
  failed: { label: "失敗", variant: "destructive" },
};

const statusFilters = [
  { value: "all", label: "すべて" },
  { value: "draft", label: "下書き" },
  { value: "scheduled", label: "配信予定" },
  { value: "sending", label: "配信中" },
  { value: "completed", label: "配信済み" },
  { value: "failed", label: "失敗" },
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

function formatTargetFilter(filter: Record<string, unknown> | null): string {
  if (!filter || Object.keys(filter).length === 0) return "全顧客";
  const parts: string[] = [];
  if (filter.membership_tier) {
    parts.push(String(filter.membership_tier));
  }
  if (filter.tags && Array.isArray(filter.tags)) {
    parts.push(...(filter.tags as string[]));
  }
  return parts.length > 0 ? parts.join(", ") : "全顧客";
}

export default function MessagesPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchBroadcasts = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "20",
        });
        if (statusFilter !== "all") {
          params.set("status", statusFilter);
        }
        const res = await fetch(`/api/broadcast?${params}`);
        if (res.ok) {
          const json = await res.json();
          setBroadcasts(json.broadcasts ?? []);
          setPagination(
            json.pagination ?? {
              page: 1,
              limit: 20,
              total: 0,
              totalPages: 0,
            }
          );
        }
      } catch (err) {
        console.error("Failed to fetch broadcasts:", err);
      } finally {
        setLoading(false);
      }
    },
    [statusFilter]
  );

  useEffect(() => {
    fetchBroadcasts(1);
  }, [fetchBroadcasts]);

  async function handleDelete(id: string) {
    if (!confirm("この下書きを削除しますか？")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/broadcast/${id}`, { method: "DELETE" });
      if (res.ok) {
        setBroadcasts((prev) => prev.filter((b) => b.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete broadcast:", err);
    } finally {
      setDeleting(null);
    }
  }

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
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {pagination.total} 件のメッセージ
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => fetchBroadcasts(pagination.page)}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <Link href="/dashboard/messages/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            新規作成
          </Button>
        </Link>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {statusFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
              statusFilter === f.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-background hover:bg-accent"
            }`}
          >
            {f.label}
          </button>
        ))}
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
              {broadcasts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    メッセージがありません
                  </TableCell>
                </TableRow>
              ) : (
                broadcasts.map((bc) => {
                  const config = statusConfig[bc.status] || statusConfig.draft;
                  const sentCount =
                    bc.delivery_stats?.sent ?? bc.sent_count ?? 0;
                  const totalTarget = bc.target_count ?? 0;
                  const failedCount =
                    bc.delivery_stats?.failed ?? bc.failed_count ?? 0;

                  return (
                    <TableRow key={bc.id}>
                      <TableCell className="font-medium">{bc.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {formatTargetFilter(bc.target_filter)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.variant}>{config.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {sentCount.toLocaleString()} / {totalTarget.toLocaleString()}
                        </span>
                        {failedCount > 0 && (
                          <span className="text-xs text-destructive ml-1">
                            ({failedCount} 失敗)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {bc.status === "scheduled"
                          ? formatDate(bc.scheduled_at)
                          : bc.status === "completed" || bc.status === "failed"
                          ? formatDate(bc.completed_at)
                          : formatDate(bc.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/dashboard/messages/${bc.id}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {bc.status === "draft" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              disabled={deleting === bc.id}
                              onClick={() => handleDelete(bc.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => fetchBroadcasts(pagination.page - 1)}
          >
            前へ
          </Button>
          <span className="text-sm text-muted-foreground">
            {pagination.page} / {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => fetchBroadcasts(pagination.page + 1)}
          >
            次へ
          </Button>
        </div>
      )}
    </div>
  );
}
