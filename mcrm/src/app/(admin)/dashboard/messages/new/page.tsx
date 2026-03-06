"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Clock, Eye, Smartphone, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const membershipTiers = [
  { value: "", label: "指定なし" },
  { value: "free", label: "Free" },
  { value: "bronze", label: "Bronze" },
  { value: "silver", label: "Silver" },
  { value: "gold", label: "Gold" },
  { value: "platinum", label: "Platinum" },
];

const availableTags = [
  "VIP会員",
  "常連",
  "新規",
  "誕生日月",
  "イベント参加",
  "ランチ利用",
  "ディナー利用",
];

type MessageType = "text" | "flex";
type ScheduleType = "immediate" | "scheduled";
type Step = "compose" | "preview";

export default function NewBroadcastPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("compose");
  const [title, setTitle] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("text");
  const [messageContent, setMessageContent] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [membershipTier, setMembershipTier] = useState("");
  const [scheduleType, setScheduleType] = useState<ScheduleType>("immediate");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function buildTargetFilter(): Record<string, unknown> {
    const filter: Record<string, unknown> = {};
    if (membershipTier) {
      filter.membership_tier = membershipTier;
    }
    if (selectedTags.length > 0) {
      filter.tags = selectedTags;
    }
    return filter;
  }

  function buildScheduledAt(): string | null {
    if (scheduleType !== "scheduled" || !scheduledDate || !scheduledTime)
      return null;
    return new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();
  }

  function formatTargetDescription(): string {
    const parts: string[] = [];
    if (membershipTier) {
      const tier = membershipTiers.find((t) => t.value === membershipTier);
      parts.push(tier?.label ?? membershipTier);
    }
    if (selectedTags.length > 0) {
      parts.push(...selectedTags);
    }
    return parts.length > 0 ? parts.join(", ") : "全顧客";
  }

  const isValid =
    title.trim() &&
    messageContent.trim() &&
    (scheduleType === "immediate" || (scheduledDate && scheduledTime));

  async function handleSend() {
    if (!isValid) return;
    setSending(true);
    setError(null);

    try {
      // Step 1: Create the broadcast job
      const scheduledAt = buildScheduledAt();
      const targetFilter = buildTargetFilter();

      const createRes = await fetch("/api/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          message_type: messageType,
          message_content:
            messageType === "text"
              ? messageContent
              : (() => {
                  try {
                    return JSON.parse(messageContent);
                  } catch {
                    return { text: messageContent };
                  }
                })(),
          target_filter:
            Object.keys(targetFilter).length > 0 ? targetFilter : null,
          scheduled_at: scheduledAt,
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(err.error || "配信の作成に失敗しました");
      }

      const { data: job } = await createRes.json();

      // Step 2: If immediate, trigger send
      if (scheduleType === "immediate") {
        const sendRes = await fetch(`/api/broadcast/${job.id}/send`, {
          method: "POST",
        });

        if (!sendRes.ok) {
          const err = await sendRes.json();
          throw new Error(err.error || "配信の送信に失敗しました");
        }
      }

      router.push("/dashboard/messages");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setSending(false);
    }
  }

  async function handleSaveDraft() {
    if (!title.trim() || !messageContent.trim()) return;
    setSending(true);
    setError(null);

    try {
      const targetFilter = buildTargetFilter();
      const res = await fetch("/api/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          message_type: messageType,
          message_content:
            messageType === "text"
              ? messageContent
              : (() => {
                  try {
                    return JSON.parse(messageContent);
                  } catch {
                    return { text: messageContent };
                  }
                })(),
          target_filter:
            Object.keys(targetFilter).length > 0 ? targetFilter : null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "下書きの保存に失敗しました");
      }

      router.push("/dashboard/messages");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setSending(false);
    }
  }

  // Preview step
  if (step === "preview") {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setStep("compose")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          編集に戻る
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">配信内容の確認</CardTitle>
            <CardDescription>
              内容を確認してから配信してください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                タイトル
              </p>
              <p className="text-sm mt-1">{title}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                メッセージタイプ
              </p>
              <p className="text-sm mt-1">
                {messageType === "text" ? "テキスト" : "Flexメッセージ"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                メッセージ内容
              </p>
              <div className="mt-1 rounded-md border bg-muted/50 p-3">
                <p className="whitespace-pre-wrap text-sm">{messageContent}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                配信対象
              </p>
              <p className="text-sm mt-1">{formatTargetDescription()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                配信タイミング
              </p>
              <p className="text-sm mt-1">
                {scheduleType === "immediate"
                  ? "即時配信"
                  : `予約配信: ${scheduledDate} ${scheduledTime}`}
              </p>
            </div>

            {error && (
              <div className="rounded-md border border-destructive bg-destructive/10 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleSend}
                disabled={sending}
                className="gap-2"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {sending
                  ? "送信中..."
                  : scheduleType === "immediate"
                  ? "配信する"
                  : "予約する"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setStep("compose")}
                disabled={sending}
              >
                戻って編集
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Compose step
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
                <label className="text-sm font-medium mb-1.5 block">
                  タイトル
                </label>
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
              <CardDescription>
                会員ランクやタグで配信対象を絞り込みます（未指定の場合は全顧客）
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Membership tier */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  会員ランク
                </label>
                <select
                  value={membershipTier}
                  onChange={(e) => setMembershipTier(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {membershipTiers.map((tier) => (
                    <option key={tier.value} value={tier.value}>
                      {tier.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  タグ
                </label>
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
              </div>

              {(membershipTier || selectedTags.length > 0) && (
                <p className="text-sm text-muted-foreground">
                  対象: {formatTargetDescription()}
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
                    <p className="text-xs text-muted-foreground">
                      今すぐ送信します
                    </p>
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
                    <p className="text-xs text-muted-foreground">
                      日時を指定して配信
                    </p>
                  </div>
                </button>
              </div>

              {scheduleType === "scheduled" && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-1.5 block">
                      日付
                    </label>
                    <Input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-1.5 block">
                      時間
                    </label>
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

          {/* Error */}
          {error && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={() => setStep("preview")}
              disabled={!isValid || sending}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              プレビューして確認
            </Button>
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={!title.trim() || !messageContent.trim() || sending}
              className="gap-2"
            >
              {sending && <Loader2 className="h-4 w-4 animate-spin" />}
              下書き保存
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowMobilePreview(!showMobilePreview)}
              className="gap-2 lg:hidden"
            >
              <Smartphone className="h-4 w-4" />
              プレビュー
            </Button>
          </div>
        </div>

        {/* Right - Preview */}
        <div className={cn("lg:block", showMobilePreview ? "block" : "hidden")}>
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
                          <p className="text-sm text-gray-400">
                            メッセージを入力してください
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>配信対象</span>
                      <span>{formatTargetDescription()}</span>
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
