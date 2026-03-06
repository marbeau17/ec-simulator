"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Clock, Eye, Smartphone, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const availableTags = ["全顧客", "VIP会員", "Gold会員", "Silver会員", "常連", "新規", "誕生日月", "イベント参加"];

type MessageType = "text" | "flex";
type ScheduleType = "immediate" | "scheduled";

export default function NewBroadcastPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("text");
  const [messageContent, setMessageContent] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [scheduleType, setScheduleType] = useState<ScheduleType>("immediate");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleSend() {
    if (!title.trim() || !messageContent.trim() || selectedTags.length === 0) return;

    setSending(true);
    try {
      await fetch("/api/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          messageType,
          content: messageContent,
          targetTags: selectedTags,
          schedule: scheduleType === "scheduled" ? { date: scheduledDate, time: scheduledTime } : null,
        }),
      });
      router.push("/dashboard/messages");
    } catch {
      // Handle error
    } finally {
      setSending(false);
    }
  }

  const isValid = title.trim() && messageContent.trim() && selectedTags.length > 0;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/dashboard/messages")}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        メッセージ一覧に戻る
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left - Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">基本情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">タイトル</label>
                <Input
                  placeholder="配信タイトルを入力..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Message Editor */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">メッセージ内容</CardTitle>
              <div className="flex gap-2">
                <button
                  onClick={() => setMessageType("text")}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    messageType === "text"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  テキスト
                </button>
                <button
                  onClick={() => setMessageType("flex")}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    messageType === "flex"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  Flexメッセージ
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {messageType === "text" ? (
                <textarea
                  className="w-full min-h-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="メッセージ本文を入力..."
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                />
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Flex Message JSON を入力してください
                  </p>
                  <textarea
                    className="w-full min-h-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder='{"type": "bubble", "body": { ... }}'
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Target Segment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">配信対象</CardTitle>
              <CardDescription>タグを選択して配信対象を絞り込みます</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                      selectedTags.includes(tag)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background hover:bg-accent"
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              {selectedTags.length > 0 && (
                <p className="mt-3 text-sm text-muted-foreground">
                  選択中: {selectedTags.join(", ")}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">配信タイミング</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <button
                  onClick={() => setScheduleType("immediate")}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border p-4 flex-1 transition-colors",
                    scheduleType === "immediate"
                      ? "border-primary bg-primary/5"
                      : "border-input hover:bg-accent"
                  )}
                >
                  <Send className="h-5 w-5" />
                  <div className="text-left">
                    <p className="text-sm font-medium">即時配信</p>
                    <p className="text-xs text-muted-foreground">今すぐ送信します</p>
                  </div>
                </button>
                <button
                  onClick={() => setScheduleType("scheduled")}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border p-4 flex-1 transition-colors",
                    scheduleType === "scheduled"
                      ? "border-primary bg-primary/5"
                      : "border-input hover:bg-accent"
                  )}
                >
                  <Clock className="h-5 w-5" />
                  <div className="text-left">
                    <p className="text-sm font-medium">予約配信</p>
                    <p className="text-xs text-muted-foreground">日時を指定して配信</p>
                  </div>
                </button>
              </div>

              {scheduleType === "scheduled" && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-1.5 block">日付</label>
                    <Input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-1.5 block">時間</label>
                    <Input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleSend}
              disabled={!isValid || sending}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {scheduleType === "immediate" ? "配信する" : "予約する"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
              className="gap-2 lg:hidden"
            >
              <Eye className="h-4 w-4" />
              プレビュー
            </Button>
          </div>
        </div>

        {/* Right - Preview */}
        <div className={cn("lg:block", showPreview ? "block" : "hidden")}>
          <div className="sticky top-20">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  プレビュー
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* LINE-like preview */}
                <div className="mx-auto w-full max-w-[280px]">
                  <div className="rounded-2xl border bg-[#7494C0] p-3">
                    {/* Chat header */}
                    <div className="mb-3 text-center">
                      <p className="text-xs text-white/80">LINE プレビュー</p>
                    </div>
                    {/* Message bubble */}
                    <div className="space-y-2">
                      {messageContent ? (
                        <div className="rounded-xl bg-white p-3 shadow-sm">
                          <p className="whitespace-pre-wrap text-sm text-gray-800">
                            {messageType === "text"
                              ? messageContent
                              : "Flex Message (プレビュー対象外)"}
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-xl bg-white/50 p-3">
                          <p className="text-sm text-gray-400">メッセージを入力してください</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>配信対象</span>
                      <span>{selectedTags.length > 0 ? selectedTags.join(", ") : "未選択"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>配信タイミング</span>
                      <span>
                        {scheduleType === "immediate"
                          ? "即時"
                          : scheduledDate
                          ? `${scheduledDate} ${scheduledTime}`
                          : "未設定"}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
