"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, Filter, ChevronLeft, ChevronRight, Eye, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

interface Customer {
  id: string;
  lineName: string;
  lineAvatar?: string;
  tags: string[];
  membershipTier: string;
  lastInteraction: string;
  messageCount: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface CustomersResponse {
  customers: Customer[];
  allTags: string[];
  allMembershipTiers: string[];
  pagination: Pagination;
}

const membershipColors: Record<string, string> = {
  premium: "bg-amber-100 text-amber-800 border-amber-200",
  standard: "bg-yellow-100 text-yellow-800 border-yellow-200",
  light: "bg-gray-100 text-gray-800 border-gray-200",
  free: "bg-blue-100 text-blue-800 border-blue-200",
  // Legacy tiers
  VIP: "bg-amber-100 text-amber-800 border-amber-200",
  Gold: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Silver: "bg-gray-100 text-gray-800 border-gray-200",
  Regular: "bg-blue-100 text-blue-800 border-blue-200",
};

const membershipLabels: Record<string, string> = {
  free: "フリー",
  light: "ライト",
  standard: "スタンダード",
  premium: "プレミアム",
};

const tagColors = [
  "bg-pink-100 text-pink-800",
  "bg-indigo-100 text-indigo-800",
  "bg-teal-100 text-teal-800",
  "bg-orange-100 text-orange-800",
  "bg-cyan-100 text-cyan-800",
];

const PAGE_SIZE = 20;

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function CustomersPage() {
  const [data, setData] = useState<CustomersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [membershipFilter, setMembershipFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [showMembershipDropdown, setShowMembershipDropdown] = useState(false);

  // Debounced search value
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (membershipFilter) params.set("membership_tier", membershipFilter);
      if (tagFilter) params.set("tag", tagFilter);

      const res = await fetch(`/api/customers?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }
      const json: CustomersResponse = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to fetch customers:", err);
      setError("顧客データの取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, membershipFilter, tagFilter]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const customers = data?.customers ?? [];
  const pagination = data?.pagination ?? { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 };
  const allTags = data?.allTags ?? [];
  const allMembershipTiers = data?.allMembershipTiers ?? [];

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-4" />
        <p className="text-lg font-medium">{error}</p>
        <Button variant="outline" className="mt-4" onClick={fetchCustomers}>
          再試行
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="顧客名で検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tag filter dropdown */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setShowTagDropdown(!showTagDropdown); setShowMembershipDropdown(false); }}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            {tagFilter || "タグ"}
          </Button>
          {showTagDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowTagDropdown(false)} />
              <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-md border bg-background p-1 shadow-lg max-h-60 overflow-y-auto">
                <button
                  className="flex w-full items-center rounded-sm px-3 py-2 text-sm hover:bg-accent"
                  onClick={() => { setTagFilter(""); setShowTagDropdown(false); setPage(1); }}
                >
                  すべて
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    className={cn(
                      "flex w-full items-center rounded-sm px-3 py-2 text-sm hover:bg-accent",
                      tagFilter === tag && "bg-accent"
                    )}
                    onClick={() => { setTagFilter(tag); setShowTagDropdown(false); setPage(1); }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Membership filter */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setShowMembershipDropdown(!showMembershipDropdown); setShowTagDropdown(false); }}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            {membershipFilter ? (membershipLabels[membershipFilter] || membershipFilter) : "会員ランク"}
          </Button>
          {showMembershipDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMembershipDropdown(false)} />
              <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-md border bg-background p-1 shadow-lg">
                <button
                  className="flex w-full items-center rounded-sm px-3 py-2 text-sm hover:bg-accent"
                  onClick={() => { setMembershipFilter(""); setShowMembershipDropdown(false); setPage(1); }}
                >
                  すべて
                </button>
                {allMembershipTiers.map((m) => (
                  <button
                    key={m}
                    className={cn(
                      "flex w-full items-center rounded-sm px-3 py-2 text-sm hover:bg-accent",
                      membershipFilter === m && "bg-accent"
                    )}
                    onClick={() => { setMembershipFilter(m); setShowMembershipDropdown(false); setPage(1); }}
                  >
                    {membershipLabels[m] || m}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>顧客</TableHead>
                <TableHead>タグ</TableHead>
                <TableHead>会員ランク</TableHead>
                <TableHead>最終応対</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    該当する顧客が見つかりません
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={customer.lineAvatar} alt={customer.lineName} />
                          <AvatarFallback>{customer.lineName.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{customer.lineName}</p>
                          <p className="text-xs text-muted-foreground">{customer.messageCount} メッセージ</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {customer.tags.map((tag, idx) => (
                          <span
                            key={tag}
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                              tagColors[idx % tagColors.length]
                            )}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                          membershipColors[customer.membershipTier] || "bg-muted"
                        )}
                      >
                        {membershipLabels[customer.membershipTier] || customer.membershipTier}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {customer.lastInteraction ? formatDate(customer.lastInteraction) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/customers/${customer.id}`}>
                        <Button variant="ghost" size="sm" className="gap-1">
                          <Eye className="h-4 w-4" />
                          詳細
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {!loading && pagination.total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {pagination.total} 件中 {(pagination.page - 1) * pagination.limit + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} 件表示
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={pagination.page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Error banner (when we have stale data but a fetch failed) */}
      {error && data && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <Button variant="outline" size="sm" className="ml-auto" onClick={fetchCustomers}>
            再試行
          </Button>
        </div>
      )}
    </div>
  );
}
