"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  MapPin,
  CalendarDays,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Reservation {
  id: string;
  customerName: string;
  date: string;
  time: string;
  partySize: number;
  tableType: string;
  status: "confirmed" | "pending" | "cancelled";
  note?: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  confirmed: { label: "確定", color: "bg-emerald-100 text-emerald-700" },
  pending: { label: "未確定", color: "bg-amber-100 text-amber-700" },
  cancelled: { label: "キャンセル", color: "bg-red-100 text-red-700" },
};

function generateMockReservations(): Reservation[] {
  const names = ["田中太郎", "佐藤花子", "鈴木一郎", "山田美咲", "高橋健太", "渡辺優子", "伊藤翔", "中村美月"];
  const tables = ["カウンター", "テーブルA", "テーブルB", "個室 桜", "個室 竹", "テラス"];
  const statuses: Array<"confirmed" | "pending" | "cancelled"> = ["confirmed", "confirmed", "confirmed", "pending", "cancelled"];
  const reservations: Reservation[] = [];

  for (let d = -5; d <= 30; d++) {
    const date = new Date();
    date.setDate(date.getDate() + d);
    const dateStr = date.toISOString().split("T")[0];
    const count = Math.floor(Math.random() * 6);
    for (let i = 0; i < count; i++) {
      const hour = 11 + Math.floor(Math.random() * 10);
      reservations.push({
        id: `rsv_${dateStr}_${i}`,
        customerName: names[Math.floor(Math.random() * names.length)],
        date: dateStr,
        time: `${hour}:${Math.random() > 0.5 ? "00" : "30"}`,
        partySize: Math.floor(Math.random() * 6) + 1,
        tableType: tables[Math.floor(Math.random() * tables.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
      });
    }
  }

  return reservations.sort((a, b) => {
    if (a.date === b.date) return a.time.localeCompare(b.time);
    return a.date.localeCompare(b.date);
  });
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Fill leading days from previous month
  const startPad = firstDay.getDay();
  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push(d);
  }

  // Current month days
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }

  // Fill trailing days
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      days.push(new Date(year, month + 1, i));
    }
  }

  return days;
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(toDateStr(new Date()));

  useEffect(() => {
    async function fetchReservations() {
      try {
        const res = await fetch("/api/reservations");
        if (res.ok) {
          const json = await res.json();
          setReservations(json.reservations || json);
        } else {
          setReservations(generateMockReservations());
        }
      } catch {
        setReservations(generateMockReservations());
      } finally {
        setLoading(false);
      }
    }
    fetchReservations();
  }, []);

  const reservationsByDate = useMemo(() => {
    const map: Record<string, Reservation[]> = {};
    reservations.forEach((r) => {
      if (!map[r.date]) map[r.date] = [];
      map[r.date].push(r);
    });
    return map;
  }, [reservations]);

  const calendarDays = useMemo(
    () => getDaysInMonth(currentMonth.year, currentMonth.month),
    [currentMonth]
  );

  const todayStr = toDateStr(new Date());
  const selectedReservations = selectedDate ? reservationsByDate[selectedDate] || [] : [];

  const todayReservations = reservationsByDate[todayStr] || [];

  function prevMonth() {
    setCurrentMonth((prev) => {
      const m = prev.month - 1;
      return m < 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: m };
    });
  }

  function nextMonth() {
    setCurrentMonth((prev) => {
      const m = prev.month + 1;
      return m > 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: m };
    });
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-96" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Calendar */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-base">
                {currentMonth.year}年 {currentMonth.month + 1}月
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-2">
              {WEEKDAYS.map((day, i) => (
                <div
                  key={day}
                  className={cn(
                    "text-center text-xs font-medium py-2",
                    i === 0 && "text-red-500",
                    i === 6 && "text-blue-500"
                  )}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7">
              {calendarDays.map((date, idx) => {
                const dateStr = toDateStr(date);
                const isCurrentMonth = date.getMonth() === currentMonth.month;
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;
                const dayReservations = reservationsByDate[dateStr] || [];
                const count = dayReservations.length;
                const hasConfirmed = dayReservations.some((r) => r.status === "confirmed");
                const hasPending = dayReservations.some((r) => r.status === "pending");

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(dateStr)}
                    className={cn(
                      "relative flex flex-col items-center p-2 text-sm transition-colors min-h-[60px] border-t",
                      !isCurrentMonth && "text-muted-foreground/50",
                      isToday && "font-bold",
                      isSelected && "bg-primary/10 rounded-lg",
                      "hover:bg-accent/50"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full",
                        isToday && "bg-primary text-primary-foreground"
                      )}
                    >
                      {date.getDate()}
                    </span>
                    {count > 0 && (
                      <div className="mt-1 flex gap-0.5">
                        {hasConfirmed && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                        {hasPending && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                        <span className="text-[10px] text-muted-foreground ml-0.5">{count}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Today's Reservations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              今日の予約 ({todayReservations.length}件)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayReservations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                今日の予約はありません
              </p>
            ) : (
              <div className="space-y-3">
                {todayReservations.map((rsv) => {
                  const sc = statusConfig[rsv.status];
                  return (
                    <div
                      key={rsv.id}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback>{rsv.customerName.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{rsv.customerName}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />{rsv.time}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />{rsv.partySize}名
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />{rsv.tableType}
                          </span>
                        </div>
                      </div>
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", sc.color)}>
                        {sc.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Side panel - Selected date */}
      <div>
        <Card className="sticky top-20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {selectedDate
                  ? new Date(selectedDate + "T00:00:00").toLocaleDateString("ja-JP", {
                      month: "long",
                      day: "numeric",
                      weekday: "short",
                    })
                  : "日付を選択"}
              </CardTitle>
              {selectedDate && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedDate(null)}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedDate ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                カレンダーから日付を選択してください
              </p>
            ) : selectedReservations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                この日の予約はありません
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{selectedReservations.length}件の予約</p>
                {selectedReservations.map((rsv) => {
                  const sc = statusConfig[rsv.status];
                  return (
                    <div key={rsv.id} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{rsv.customerName}</p>
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", sc.color)}>
                          {sc.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />{rsv.time}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />{rsv.partySize}名
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{rsv.tableType}
                        </span>
                      </div>
                      {rsv.note && (
                        <p className="text-xs text-muted-foreground bg-muted rounded px-2 py-1">
                          {rsv.note}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
