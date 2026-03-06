"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send, Bot, User, ToggleLeft, ToggleRight, Info, Phone, Tag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatBubble } from "@/components/admin/chat-bubble";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  sender: "user" | "ai" | "admin";
  content: string;
  timestamp: string;
}

interface ThreadDetail {
  id: string;
  customer: {
    id: string;
    lineName: string;
    lineAvatar?: string;
    membershipTier: string;
    tags: string[];
    totalMessages: number;
    followedAt: string;
  };
  status: "ai" | "human" | "closed";
  messages: Message[];
}

const mockThread: ThreadDetail = {
  id: "thread_1",
  customer: {
    id: "cust_1",
    lineName: "田中太郎",
    membershipTier: "VIP",
    tags: ["常連", "VIP対象", "ワイン好き"],
    totalMessages: 142,
    followedAt: "2024-06-15T10:00:00Z",
  },
  status: "ai",
  messages: [
    { id: "1", sender: "user", content: "こんにちは、今週末の予約について相談したいのですが。", timestamp: new Date(Date.now() - 1000 * 60 * 40).toISOString() },
    { id: "2", sender: "ai", content: "田中様、こんにちは！いつもご利用ありがとうございます。今週末のご予約についてですね。何名様でしょうか？", timestamp: new Date(Date.now() - 1000 * 60 * 39).toISOString() },
    { id: "3", sender: "user", content: "2名でお願いします。19時頃希望です。", timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString() },
    { id: "4", sender: "ai", content: "2名様、19時でございますね。土曜日・日曜日どちらをご希望でしょうか？\n\n現在の空き状況：\n・土曜日 19:00 - カウンター/テーブル共に空きあり\n・日曜日 19:00 - テーブルのみ空きあり", timestamp: new Date(Date.now() - 1000 * 60 * 34).toISOString() },
    { id: "5", sender: "user", content: "土曜日でお願いします。個室は空いてますか？", timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
    { id: "6", sender: "ai", content: "土曜日19時、個室もご利用可能です！VIP会員様特典として個室料金をサービスさせていただきます。ご予約を確定してよろしいですか？", timestamp: new Date(Date.now() - 1000 * 60 * 29).toISOString() },
    { id: "7", sender: "user", content: "はい、お願いします！", timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString() },
    { id: "8", sender: "ai", content: "ご予約を確定しました！\n\n📅 日時: 土曜日 19:00\n👤 人数: 2名様\n🚪 席: 個室\n\n当日のお越しをお待ちしております。何かご不明な点がございましたらお気軽にお申し付けください。", timestamp: new Date(Date.now() - 1000 * 60 * 24).toISOString() },
  ],
};

export default function ChatDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isAiMode, setIsAiMode] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchThread() {
      try {
        const res = await fetch(`/api/chat/threads/${params.threadId}`);
        if (res.ok) {
          const json = await res.json();
          setThread(json);
          setIsAiMode(json.status === "ai");
        } else {
          setThread(mockThread);
          setIsAiMode(mockThread.status === "ai");
        }
      } catch {
        setThread(mockThread);
        setIsAiMode(mockThread.status === "ai");
      } finally {
        setLoading(false);
      }
    }
    fetchThread();
  }, [params.threadId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread?.messages]);

  async function handleSend() {
    if (!message.trim() || !thread) return;

    const newMsg: Message = {
      id: `msg_${Date.now()}`,
      sender: "admin",
      content: message,
      timestamp: new Date().toISOString(),
    };

    setThread({
      ...thread,
      messages: [...thread.messages, newMsg],
    });
    setMessage("");

    try {
      await fetch(`/api/chat/threads/${params.threadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: message }),
      });
    } catch {
      // Message already shown optimistically
    }
  }

  async function toggleMode() {
    const newMode = !isAiMode;
    setIsAiMode(newMode);
    try {
      await fetch(`/api/chat/threads/${params.threadId}/mode`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: newMode ? "ai" : "human" }),
      });
    } catch {
      // Mode toggled optimistically
    }
  }

  if (loading || !thread) {
    return (
      <div className="flex h-[calc(100vh-8rem)] gap-4">
        <Skeleton className="flex-1" />
        <Skeleton className="w-80 hidden lg:block" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col">
        {/* Chat Header */}
        <div className="flex items-center gap-3 border-b pb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/chat")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-10 w-10">
            <AvatarImage src={thread.customer.lineAvatar} alt={thread.customer.lineName} />
            <AvatarFallback>{thread.customer.lineName.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold">{thread.customer.lineName}</p>
            <p className="text-xs text-muted-foreground">
              {thread.customer.membershipTier} 会員
            </p>
          </div>
          <Button
            variant={isAiMode ? "default" : "outline"}
            size="sm"
            onClick={toggleMode}
            className="gap-2"
          >
            {isAiMode ? (
              <>
                <Bot className="h-4 w-4" />
                AI対応中
              </>
            ) : (
              <>
                <User className="h-4 w-4" />
                手動対応中
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSidebar(!showSidebar)}
            className="hidden lg:flex"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {thread.messages.map((msg) => (
            <ChatBubble
              key={msg.id}
              content={msg.content}
              timestamp={msg.timestamp}
              senderType={msg.sender}
              senderName={msg.sender === "user" ? thread.customer.lineName : undefined}
              senderAvatar={msg.sender === "user" ? thread.customer.lineAvatar : undefined}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t pt-4">
          {isAiMode ? (
            <div className="flex items-center justify-center gap-2 rounded-lg bg-muted p-4 text-sm text-muted-foreground">
              <Bot className="h-5 w-5" />
              AI自動応答モードが有効です。手動で返信するには「手動対応」に切り替えてください。
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder="メッセージを入力..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button onClick={handleSend} disabled={!message.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Customer Info Sidebar */}
      {showSidebar && (
        <div className="hidden w-80 shrink-0 overflow-y-auto border-l pl-4 lg:block">
          <div className="space-y-4">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-16 w-16">
                <AvatarImage src={thread.customer.lineAvatar} alt={thread.customer.lineName} />
                <AvatarFallback className="text-lg">
                  {thread.customer.lineName.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <h3 className="mt-3 font-semibold">{thread.customer.lineName}</h3>
              <Badge className="mt-1">{thread.customer.membershipTier}</Badge>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">総メッセージ数</span>
                <span className="font-medium">{thread.customer.totalMessages}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">フォロー日</span>
                <span className="font-medium">
                  {new Date(thread.customer.followedAt).toLocaleDateString("ja-JP")}
                </span>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-sm font-medium flex items-center gap-1 mb-2">
                <Tag className="h-3 w-3" />
                タグ
              </p>
              <div className="flex flex-wrap gap-1">
                {thread.customer.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => router.push(`/dashboard/customers/${thread.customer.id}`)}
            >
              顧客詳細を表示
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
