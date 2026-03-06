"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Bot, MessageCircle, CalendarCheck, Tag, Star, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

const mockCustomer: CustomerDetail = {
  id: "cust_1",
  lineName: "田中太郎",
  lineUid: "U1234567890abcdef",
  membershipTier: "VIP",
  tags: ["常連", "VIP対象", "誕生日月", "ワイン好き"],
  followedAt: "2024-06-15T10:00:00Z",
  lastInteraction: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  totalMessages: 142,
  totalReservations: 23,
  persona: {
    summary: "高頻度で来店するVIP顧客。ワインと季節の料理に関心が高く、週末のディナー予約が多い。丁寧な対応を好み、特別感のあるサービスに高い満足度を示す。",
    interests: ["ワイン", "季節料理", "個室利用", "記念日ディナー"],
    communicationStyle: "丁寧語を好む。簡潔な情報提供を期待。",
  },
  conversations: [
    { id: "1", sender: "user", content: "今週末の予約は可能ですか？2名でお願いします。", timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
    { id: "2", sender: "ai", content: "田中様、いつもありがとうございます。今週末（土曜日）の18:00以降でしたらお席をご用意できます。お時間のご希望はございますか？", timestamp: new Date(Date.now() - 1000 * 60 * 29).toISOString() },
    { id: "3", sender: "user", content: "19時でお願いします。個室は空いてますか？", timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString() },
    { id: "4", sender: "ai", content: "19時で承知しました。個室もご利用可能です。VIP会員様特典として個室料金はサービスさせていただきます。ご予約を確定してよろしいですか？", timestamp: new Date(Date.now() - 1000 * 60 * 24).toISOString() },
    { id: "5", sender: "user", content: "はい、お願いします！", timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString() },
    { id: "6", sender: "ai", content: "ご予約を確定しました。土曜日19:00、2名様、個室でお待ちしております。当日のお越しを楽しみにしております。", timestamp: new Date(Date.now() - 1000 * 60 * 19).toISOString() },
  ],
  recentActivity: [
    { id: "1", type: "reservation", description: "予約作成 - 土曜日 19:00 2名 個室", timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString() },
    { id: "2", type: "message", description: "AIチャットで予約対応", timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
    { id: "3", type: "visit", description: "来店 - ディナー", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString() },
    { id: "4", type: "reservation", description: "予約作成 - 金曜日 20:00 4名", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString() },
  ],
};

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTimeShort(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCustomer() {
      try {
        const res = await fetch(`/api/customers/${params.id}`);
        if (res.ok) {
          const json = await res.json();
          setCustomer(json);
        } else {
          setCustomer(mockCustomer);
        }
      } catch {
        setCustomer(mockCustomer);
      } finally {
        setLoading(false);
      }
    }
    fetchCustomer();
  }, [params.id]);

  if (loading || !customer) {
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
                <Badge className="mt-2" variant={customer.membershipTier === "VIP" ? "default" : "secondary"}>
                  <Star className="mr-1 h-3 w-3" />
                  {customer.membershipTier}
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
                  <span>{new Date(customer.followedAt).toLocaleDateString("ja-JP")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">最終応対</span>
                  <span>{formatDateTime(customer.lastInteraction)}</span>
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
                {customer.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
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
              <div>
                <p className="text-xs font-medium mb-1">コミュニケーションスタイル</p>
                <p className="text-xs text-muted-foreground">{customer.persona.communicationStyle}</p>
              </div>
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
