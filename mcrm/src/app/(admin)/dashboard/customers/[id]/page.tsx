"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Bot, MessageCircle, CalendarCheck, Tag, Star, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface CustomerDetail {
  id: string;
  lineName: string;
  lineUid: string;
  lineAvatar?: string;
  membershipTier: string;
  tags: string[];
  followedAt: string;
  lastInteraction: string;
  totalMessages: number;
  totalReservations: number;
  persona: {
    summary: string;
    interests: string[];
    communicationStyle: string;
  };
  conversations: Array<{
    id: string;
    sender: "user" | "ai" | "admin";
    content: string;
    timestamp: string;
  }>;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
  }>;
}

const membershipLabels: Record<string, string> = {
  free: "フリー",
  light: "ライト",
  standard: "スタンダード",
  premium: "プレミアム",
};

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTimeShort(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCustomer() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/customers/${params.id}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("顧客が見つかりません。");
          } else {
            throw new Error(`API returned ${res.status}`);
          }
          return;
        }
        const json = await res.json();
        // The API wraps the response in a `data` property
        setCustomer(json.data ?? json);
      } catch (err) {
        console.error("Failed to fetch customer:", err);
        setError("顧客データの取得に失敗しました。");
      } finally {
        setLoading(false);
      }
    }
    if (params.id) {
      fetchCustomer();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64 md:col-span-2" />
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/customers")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          顧客一覧に戻る
        </Button>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="h-10 w-10 text-destructive mb-4" />
          <p className="text-lg font-medium">{error || "顧客データの取得に失敗しました。"}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push("/dashboard/customers")}
          >
            顧客一覧に戻る
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/dashboard/customers")}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        顧客一覧に戻る
      </Button>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left column - Profile */}
        <div className="space-y-4">
          {/* Profile Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={customer.lineAvatar} alt={customer.lineName} />
                  <AvatarFallback className="text-xl">{customer.lineName.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <h2 className="mt-4 text-xl font-bold">{customer.lineName}</h2>
                <p className="text-xs text-muted-foreground font-mono mt-1">{customer.lineUid}</p>
                <Badge className="mt-2" variant={customer.membershipTier === "premium" || customer.membershipTier === "VIP" ? "default" : "secondary"}>
                  <Star className="mr-1 h-3 w-3" />
                  {membershipLabels[customer.membershipTier] || customer.membershipTier}
                </Badge>
              </div>
              <Separator className="my-4" />
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{customer.totalMessages}</p>
                  <p className="text-xs text-muted-foreground">メッセージ</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{customer.totalReservations}</p>
                  <p className="text-xs text-muted-foreground">予約</p>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">フォロー日</span>
                  <span>{customer.followedAt ? new Date(customer.followedAt).toLocaleDateString("ja-JP") : "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">最終応対</span>
                  <span>{customer.lastInteraction ? formatDateTime(customer.lastInteraction) : "-"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Tag className="h-4 w-4" />
                タグ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {customer.tags.length > 0 ? (
                  customer.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">タグなし</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* AI Persona Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bot className="h-4 w-4" />
                AIペルソナ分析
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{customer.persona.summary}</p>
              {customer.persona.interests.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-1">関心事</p>
                  <div className="flex flex-wrap gap-1">
                    {customer.persona.interests.map((interest) => (
                      <Badge key={interest} variant="secondary" className="text-xs">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {customer.persona.communicationStyle && (
                <div>
                  <p className="text-xs font-medium mb-1">コミュニケーションスタイル</p>
                  <p className="text-xs text-muted-foreground">{customer.persona.communicationStyle}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column - Timeline & Activity */}
        <div className="md:col-span-2 space-y-4">
          {/* Conversation Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                会話履歴
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customer.conversations.length > 0 ? (
                <div className="space-y-4">
                  {customer.conversations.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex gap-3",
                        msg.sender === "user" ? "justify-start" : "justify-end"
                      )}
                    >
                      {msg.sender === "user" && (
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback>{customer.lineName.slice(0, 1)}</AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl px-4 py-2.5",
                          msg.sender === "user"
                            ? "bg-muted"
                            : msg.sender === "ai"
                            ? "bg-primary text-primary-foreground"
                            : "bg-blue-600 text-white"
                        )}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p
                          className={cn(
                            "mt-1 text-xs",
                            msg.sender === "user" ? "text-muted-foreground" : "opacity-70"
                          )}
                        >
                          {msg.sender === "ai" && "AI "}
                          {msg.sender === "admin" && "管理者 "}
                          {formatTimeShort(msg.timestamp)}
                        </p>
                      </div>
                      {msg.sender !== "user" && (
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className={msg.sender === "ai" ? "bg-primary/20" : "bg-blue-100"}>
                            {msg.sender === "ai" ? <Bot className="h-4 w-4" /> : "AD"}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">会話履歴がありません</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-5 w-5" />
                最近のアクティビティ
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customer.recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {customer.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        {activity.type === "reservation" ? (
                          <CalendarCheck className="h-4 w-4 text-purple-500" />
                        ) : activity.type === "message" ? (
                          <MessageCircle className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Star className="h-4 w-4 text-amber-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">アクティビティがありません</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
