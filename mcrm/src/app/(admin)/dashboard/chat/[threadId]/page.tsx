"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send, Bot, User, Info, Tag, AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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

export default function ChatDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isAiMode, setIsAiMode] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  async function fetchThread() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/chat/threads/${params.threadId}`);
      if (!res.ok) {
        throw new Error(`サーバーエラー (${res.status})`);
      }
      const json = await res.json();
      setThread(json);
      setIsAiMode(json.status === "ai");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "会話の取得に失敗しました";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchThread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.threadId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread?.messages]);

  async function handleSend() {
    if (!message.trim() || !thread || sending) return;

    const content = message.trim();

    // Optimistic update
    const optimisticMsg: Message = {
      id: `optimistic_${Date.now()}`,
      sender: "admin",
      content,
      timestamp: new Date().toISOString(),
    };

    setThread({
      ...thread,
      messages: [...thread.messages, optimisticMsg],
    });
    setMessage("");
    setSending(true);
    setSendError(null);

    try {
      const res = await fetch(`/api/chat/threads/${params.threadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `送信に失敗しました (${res.status})`);
      }

      const { message: savedMessage, warning } = await res.json();

      // Replace optimistic message with real one
      if (savedMessage) {
        setThread((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: prev.messages.map((m) =>
              m.id === optimisticMsg.id
                ? {
                    id: savedMessage.id,
                    sender: "admin" as const,
                    content: savedMessage.content,
                    timestamp: savedMessage.created_at,
                  }
                : m
            ),
          };
        });
      }

      if (warning) {
        setSendError(warning);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "送信に失敗しました";
      setSendError(errMsg);
      // Remove optimistic message on failure
      setThread((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.filter((m) => m.id !== optimisticMsg.id),
        };
      });
      // Restore the message text so user can retry
      setMessage(content);
    } finally {
      setSending(false);
    }
  }

  async function toggleMode() {
    const newMode = !isAiMode;
    setIsAiMode(newMode);
    try {
      const res = await fetch(`/api/chat/threads/${params.threadId}/mode`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: newMode ? "ai" : "human" }),
      });
      if (!res.ok) {
        // Revert on failure
        setIsAiMode(!newMode);
      }
    } catch {
      setIsAiMode(!newMode);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] gap-4">
        <Skeleton className="flex-1" />
        <Skeleton className="w-80 hidden lg:block" />
      </div>
    );
  }

  if (error || !thread) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <p className="text-sm text-destructive">{error || "会話が見つかりません"}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/chat")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              一覧に戻る
            </Button>
            <Button variant="outline" size="sm" onClick={fetchThread} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              再読み込み
            </Button>
          </div>
        </CardContent>
      </Card>
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
          {thread.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <p className="text-sm">メッセージはまだありません</p>
            </div>
          ) : (
            thread.messages.map((msg) => (
              <ChatBubble
                key={msg.id}
                content={msg.content}
                timestamp={msg.timestamp}
                senderType={msg.sender}
                senderName={msg.sender === "user" ? thread.customer.lineName : undefined}
                senderAvatar={msg.sender === "user" ? thread.customer.lineAvatar : undefined}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Send Error */}
        {sendError && (
          <div className="px-2 py-1 text-xs text-destructive bg-destructive/10 rounded">
            {sendError}
          </div>
        )}

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
                disabled={sending}
              />
              <Button onClick={handleSend} disabled={!message.trim() || sending}>
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
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
                {thread.customer.tags.length > 0 ? (
                  thread.customer.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">タグなし</p>
                )}
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
