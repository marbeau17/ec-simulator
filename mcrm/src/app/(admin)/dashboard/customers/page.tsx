"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Search, Filter, ChevronLeft, ChevronRight, MoreHorizontal, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

const membershipColors: Record<string, string> = {
  VIP: "bg-amber-100 text-amber-800 border-amber-200",
  Gold: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Silver: "bg-gray-100 text-gray-800 border-gray-200",
  Regular: "bg-blue-100 text-blue-800 border-blue-200",
};

const tagColors = [
  "bg-pink-100 text-pink-800",
  "bg-indigo-100 text-indigo-800",
  "bg-teal-100 text-teal-800",
  "bg-orange-100 text-orange-800",
  "bg-cyan-100 text-cyan-800",
];

const mockCustomers: Customer[] = Array.from({ length: 50 }, (_, i) => ({
  id: `cust_${i + 1}`,
  lineName: ["田中太郎", "佐藤花子", "鈴木一郎", "山田美咲", "高橋健太", "渡辺優子", "伊藤翔", "中村美月", "小林大輝", "加藤さくら"][i % 10],
  lineAvatar: undefined,
  tags: [["常連", "VIP対象"], ["新規", "イベント参加"], ["常連", "誕生日月"], ["新規"], ["常連", "VIP対象", "イベント参加"]][i % 5],
  membershipTier: ["VIP", "Gold", "Silver", "Regular"][i % 4],
  lastInteraction: new Date(Date.now() - 1000 * 60 * 60 * (i * 3 + 1)).toISOString(),
  messageCount: Math.floor(Math.random() * 100) + 1,
}));

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const PAGE_SIZE = 10;

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [membershipFilter, setMembershipFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [showMembershipDropdown, setShowMembershipDropdown] = useState(false);

  useEffect(() => {
    async function fetchCustomers() {
      try {
        const res = await fetch("/api/customers");
        if (res.ok) {
          const json = await res.json();
          setCustomers(json.customers || json);
        } else {
          setCustomers(mockCustomers);
        }
      } catch {
        setCustomers(mockCustomers);
      } finally {
        setLoading(false);
      }
    }
    fetchCustomers();
  }, []);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    customers.forEach((c) => c.tags.forEach((t) => tags.add(t)));
    return Array.from(tags);
  }, [customers]);

  const allMemberships = useMemo(() => {
    const m = new Set<string>();
    customers.forEach((c) => m.add(c.membershipTier));
    return Array.from(m);
  }, [customers]);

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const matchSearch = !search || c.lineName.toLowerCase().includes(search.toLowerCase());
      const matchTag = !tagFilter || c.tags.includes(tagFilter);
      const matchMembership = !membershipFilter || c.membershipTier === membershipFilter;
      return matchSearch && matchTag && matchMembership;
    });
  }, [customers, search, tagFilter, membershipFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
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
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
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
              <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-md border bg-background p-1 shadow-lg">
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
            {membershipFilter || "会員ランク"}
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
                {allMemberships.map((m) => (
                  <button
                    key={m}
                    className={cn(
                      "flex w-full items-center rounded-sm px-3 py-2 text-sm hover:bg-accent",
                      membershipFilter === m && "bg-accent"
                    )}
                    onClick={() => { setMembershipFilter(m); setShowMembershipDropdown(false); setPage(1); }}
                  >
                    {m}
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
              {paginated.map((customer) => (
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
                      {customer.membershipTier}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(customer.lastInteraction)}
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filtered.length} 件中 {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} 件表示
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
