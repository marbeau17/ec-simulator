# データ処理フロー仕様書: LINE連携・Webhook・非同期処理

**プロジェクト**: 武居商店「AI搭載型 独自LINEマーケティングシステム」
**ドキュメントID**: SPEC-03
**最終更新**: 2026-03-04
**ステータス**: Draft

---

## 前提・技術スタック

| レイヤー | 技術 | 備考 |
|---------|------|------|
| メッセージング | LINE Messaging API v2 | チャネルアクセストークン (v2.1) |
| サーバーレス | Vercel Serverless Functions (Edge/Node.js) | Next.js App Router API Routes |
| データベース | Supabase (PostgreSQL) | Supavisor によるコネクションプール |
| AI | Google Gemini API (gemini-2.0-flash) | チャット応答生成 |
| キュー/Cron | Vercel Cron Jobs | 定期実行タスク |

**制約事項**:
- LINE Webhookは受信後 **1秒以内** に200応答を返す必要がある（タイムアウトすると再送される）
- Vercel Serverless Functionsの最大実行時間: Hobbyプラン 10秒 / Proプラン 60秒
- LINE Messaging APIのレートリミット: Push API 500リクエスト/秒

---

## 1. LINE Webhook受信フロー

### 1.1 全体シーケンス図

```mermaid
sequenceDiagram
    participant LINE as LINE Platform
    participant VCL as Vercel (API Route)
    participant SB as Supabase
    participant AI as Gemini API

    LINE->>VCL: POST /api/webhook/line (Webhook Event)
    VCL->>VCL: 署名検証 (X-Line-Signature)
    alt 署名不正
        VCL-->>LINE: 401 Unauthorized
    else 署名正常
        VCL-->>LINE: 200 OK (即時応答)
        VCL->>VCL: waitUntil() で非同期処理開始
        VCL->>SB: イベントデータ保存
        VCL->>AI: AI応答生成リクエスト (必要時)
        AI-->>VCL: 生成テキスト
        VCL->>LINE: Reply API でメッセージ返信
        VCL->>SB: 応答ログ保存
    end
```

### 1.2 署名検証

LINE PlatformからのWebhookリクエストの正当性を検証する。チャネルシークレットをHMAC-SHA256の鍵として、リクエストボディのダイジェスト値と `X-Line-Signature` ヘッダーを比較する。

```typescript
// lib/line/verify-signature.ts

import crypto from "crypto";

const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET!;

export function verifyLineSignature(
  body: string,
  signature: string
): boolean {
  const hash = crypto
    .createHmac("SHA256", CHANNEL_SECRET)
    .update(body)
    .digest("base64");

  // タイミング攻撃対策: 固定時間比較
  const a = Buffer.from(hash);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
```

### 1.3 イベント種別ごとの処理分岐

| イベント種別 | `type` 値 | 処理内容 |
|-------------|-----------|---------|
| メッセージ受信 | `message` | AI応答 or 有人対応振り分け → 応答生成 → 返信 |
| 友だち追加 | `follow` | ユーザー登録 → ウェルカムメッセージ送信 |
| ブロック | `unfollow` | ユーザーステータスを `blocked` に更新 |
| ポストバック | `postback` | data パラメータをパースし対応アクション実行 |

### 1.4 API Route 実装

```typescript
// app/api/webhook/line/route.ts

import { NextRequest } from "next/server";
import { verifyLineSignature } from "@/lib/line/verify-signature";
import { handleMessageEvent } from "@/lib/line/handlers/message";
import { handleFollowEvent } from "@/lib/line/handlers/follow";
import { handleUnfollowEvent } from "@/lib/line/handlers/unfollow";
import { handlePostbackEvent } from "@/lib/line/handlers/postback";

// Vercel Serverless の最大実行時間を延長 (Proプラン前提)
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  // --- 1. リクエストボディを文字列として取得 ---
  const body = await request.text();
  const signature = request.headers.get("x-line-signature");

  if (!signature) {
    return new Response("Missing signature", { status: 401 });
  }

  // --- 2. 署名検証 ---
  if (!verifyLineSignature(body, signature)) {
    console.error("[LINE Webhook] 署名検証失敗");
    return new Response("Invalid signature", { status: 401 });
  }

  // --- 3. 即時200応答 + 非同期処理 ---
  // waitUntil を使い、レスポンス返却後もサーバーレス関数の実行を継続する
  const { waitUntil } = await import("next/server");

  const parsed = JSON.parse(body) as LineWebhookBody;
  const events = parsed.events;

  // イベント処理を非同期で実行
  waitUntil(processEvents(events));

  // LINE Platformへ即時200応答
  return new Response("OK", { status: 200 });
}

async function processEvents(events: LineEvent[]): Promise<void> {
  for (const event of events) {
    try {
      switch (event.type) {
        case "message":
          await handleMessageEvent(event);
          break;
        case "follow":
          await handleFollowEvent(event);
          break;
        case "unfollow":
          await handleUnfollowEvent(event);
          break;
        case "postback":
          await handlePostbackEvent(event);
          break;
        default:
          console.warn(`[LINE Webhook] 未対応イベント: ${event.type}`);
      }
    } catch (error) {
      console.error(`[LINE Webhook] イベント処理エラー:`, {
        eventType: event.type,
        userId: event.source?.userId,
        error: error instanceof Error ? error.message : error,
      });
      // エラーが発生しても他のイベント処理は継続する
    }
  }
}
```

### 1.5 型定義

```typescript
// types/line.ts

export interface LineWebhookBody {
  destination: string;
  events: LineEvent[];
}

export interface LineEvent {
  type: "message" | "follow" | "unfollow" | "postback";
  replyToken: string;
  timestamp: number;
  source: {
    type: "user" | "group" | "room";
    userId: string;
    groupId?: string;
    roomId?: string;
  };
  message?: {
    id: string;
    type: "text" | "image" | "video" | "audio" | "sticker" | "location";
    text?: string;
  };
  postback?: {
    data: string;
    params?: Record<string, string>;
  };
}
```

---

## 2. メッセージ処理パイプライン

### 2.1 シーケンス図

```mermaid
sequenceDiagram
    participant U as ユーザー (LINE)
    participant WH as Webhook Handler
    participant DB as Supabase
    participant AI as Gemini API
    participant OP as 管理者 (管理画面)

    U->>WH: テキストメッセージ送信
    WH->>DB: ユーザー情報取得 & チャットステータス確認
    DB-->>WH: { chat_mode: "ai" | "manual" }

    alt chat_mode = "ai"
        WH->>DB: 直近の会話履歴取得 (最大20件)
        DB-->>WH: 会話履歴
        WH->>AI: プロンプト + 会話履歴 + ユーザーメッセージ
        AI-->>WH: AI生成テキスト
        WH->>DB: ユーザーメッセージ保存 (role: user)
        WH->>DB: AI応答保存 (role: assistant)
        WH->>U: Reply API でAI応答返信
    else chat_mode = "manual"
        WH->>DB: ユーザーメッセージ保存 (role: user)
        WH->>DB: 未読メッセージとしてマーク
        Note over OP: 管理画面に未読通知表示
        OP->>DB: 手動応答テキスト入力
        DB->>WH: (Push API経由)
        WH->>U: Push API で手動応答送信
    end
```

### 2.2 チャットステータス管理

ユーザーごとにAI対応/有人対応を切り替える。

**DBスキーマ (`line_users` テーブルの該当カラム)**:

| カラム | 型 | デフォルト | 説明 |
|-------|-----|-----------|------|
| `chat_mode` | `text` | `'ai'` | `'ai'` or `'manual'` |
| `chat_mode_changed_at` | `timestamptz` | `null` | 最終切替日時 |
| `chat_mode_changed_by` | `uuid` | `null` | 切替実行者 (管理者ID) |

**切替トリガー**:

| 条件 | 動作 |
|------|------|
| 管理者が管理画面で「有人対応に切替」を押下 | `chat_mode` → `'manual'` |
| 管理者が管理画面で「AI対応に戻す」を押下 | `chat_mode` → `'ai'` |
| AI応答でエラーが3回連続発生 | 自動的に `chat_mode` → `'manual'` + 管理者通知 |
| ユーザーが「オペレーターに繋いで」等のキーワード送信 | `chat_mode` → `'manual'` + 管理者通知 |

### 2.3 メッセージハンドラー実装

```typescript
// lib/line/handlers/message.ts

import { createClient } from "@/lib/supabase/server";
import { generateAIResponse } from "@/lib/ai/generate-response";
import { replyMessage } from "@/lib/line/api";
import type { LineEvent } from "@/types/line";

const MANUAL_SWITCH_KEYWORDS = [
  "オペレーター",
  "人に繋いで",
  "担当者",
  "スタッフ",
];

export async function handleMessageEvent(event: LineEvent): Promise<void> {
  if (event.message?.type !== "text" || !event.message.text) {
    // テキスト以外のメッセージは定型応答
    await replyMessage(event.replyToken, {
      type: "text",
      text: "申し訳ございません。現在テキストメッセージのみ対応しております。",
    });
    return;
  }

  const supabase = createClient();
  const userId = event.source.userId;
  const userMessage = event.message.text;

  // --- 1. ユーザー情報とチャットモード取得 ---
  const { data: user, error: userError } = await supabase
    .from("line_users")
    .select("id, chat_mode, display_name")
    .eq("line_user_id", userId)
    .single();

  if (userError || !user) {
    console.error("[Message Handler] ユーザー取得失敗:", userError);
    return;
  }

  // --- 2. 有人対応キーワード判定 ---
  const shouldSwitchToManual = MANUAL_SWITCH_KEYWORDS.some((kw) =>
    userMessage.includes(kw)
  );

  if (shouldSwitchToManual && user.chat_mode === "ai") {
    await supabase
      .from("line_users")
      .update({
        chat_mode: "manual",
        chat_mode_changed_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    await saveMessage(supabase, user.id, userMessage, "user");
    await replyMessage(event.replyToken, {
      type: "text",
      text: "担当スタッフにおつなぎします。少々お待ちください。",
    });
    // 管理者への通知 (Supabase Realtime経由で管理画面に反映)
    await notifyAdmin(supabase, user.id, userMessage);
    return;
  }

  // --- 3. チャットモードに応じた処理 ---
  if (user.chat_mode === "ai") {
    await handleAIResponse(supabase, event, user.id, userMessage);
  } else {
    // 有人対応モード: メッセージ保存のみ (管理者が後で応答)
    await saveMessage(supabase, user.id, userMessage, "user");
    await notifyAdmin(supabase, user.id, userMessage);
  }
}

async function handleAIResponse(
  supabase: ReturnType<typeof createClient>,
  event: LineEvent,
  internalUserId: string,
  userMessage: string
): Promise<void> {
  // 直近の会話履歴を取得 (最大20件)
  const { data: history } = await supabase
    .from("chat_messages")
    .select("role, content, created_at")
    .eq("line_user_id", internalUserId)
    .order("created_at", { ascending: false })
    .limit(20);

  const conversationHistory = (history ?? []).reverse();

  // AI応答生成
  const aiResponse = await generateAIResponse(
    userMessage,
    conversationHistory
  );

  // メッセージ保存 (ユーザー + AI応答)
  await saveMessage(supabase, internalUserId, userMessage, "user");
  await saveMessage(supabase, internalUserId, aiResponse, "assistant");

  // LINE返信
  await replyMessage(event.replyToken, {
    type: "text",
    text: aiResponse,
  });
}

async function saveMessage(
  supabase: ReturnType<typeof createClient>,
  lineUserId: string,
  content: string,
  role: "user" | "assistant" | "system"
): Promise<void> {
  const { error } = await supabase.from("chat_messages").insert({
    line_user_id: lineUserId,
    role,
    content,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("[Message Handler] メッセージ保存失敗:", error);
  }
}

async function notifyAdmin(
  supabase: ReturnType<typeof createClient>,
  lineUserId: string,
  message: string
): Promise<void> {
  // admin_notifications テーブルにINSERTし、
  // Supabase Realtimeで管理画面にリアルタイム通知
  await supabase.from("admin_notifications").insert({
    type: "new_message",
    line_user_id: lineUserId,
    message_preview: message.substring(0, 100),
    is_read: false,
    created_at: new Date().toISOString(),
  });
}
```

### 2.4 AI応答生成

```typescript
// lib/ai/generate-response.ts

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM_PROMPT = `あなたは武居商店のAIアシスタントです。
以下のガイドラインに従って応答してください:

1. 丁寧で親しみやすい口調で応答する
2. 商品に関する質問には正確な情報を提供する
3. 在庫状況や価格の具体的な数値が不明な場合は「確認いたします」と回答する
4. 個人情報（住所、電話番号等）の入力を求めない
5. 注文確定や決済に関わる操作はスタッフ対応を案内する
6. 応答は200文字以内に収める（LINEの可読性を考慮）
`;

interface ChatMessage {
  role: string;
  content: string;
}

export async function generateAIResponse(
  userMessage: string,
  conversationHistory: ChatMessage[]
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
  });

  // 会話履歴をGemini API形式に変換
  const contents = conversationHistory.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  // 現在のメッセージを追加
  contents.push({
    role: "user",
    parts: [{ text: userMessage }],
  });

  try {
    const chat = model.startChat({
      history: contents.slice(0, -1), // 最後のメッセージ以外を履歴に
      systemInstruction: SYSTEM_PROMPT,
    });

    const result = await chat.sendMessage(userMessage);
    const responseText = result.response.text();

    // 200文字以上の場合は切り詰め
    if (responseText.length > 200) {
      return responseText.substring(0, 197) + "...";
    }

    return responseText;
  } catch (error) {
    console.error("[AI] Gemini API エラー:", error);
    throw error; // 呼び出し元でリトライ判定
  }
}
```

### 2.5 chat_messages テーブル スキーマ

```sql
CREATE TABLE chat_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_user_id  UUID NOT NULL REFERENCES line_users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content       TEXT NOT NULL,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 検索パフォーマンス用インデックス
CREATE INDEX idx_chat_messages_user_created
  ON chat_messages (line_user_id, created_at DESC);

-- RLS ポリシー: 管理者のみアクセス可能
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "管理者のみ閲覧可"
  ON chat_messages FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');
```

---

## 3. 一斉配信フロー

### 3.1 シーケンス図

```mermaid
sequenceDiagram
    participant ADM as 管理者
    participant APP as 管理画面 (Next.js)
    participant API as API Route
    participant DB as Supabase
    participant Q as 配信キュー (DB)
    participant W as 配信ワーカー (Cron)
    participant LINE as LINE API

    ADM->>APP: 配信内容作成 + セグメント選択
    APP->>API: POST /api/broadcasts
    API->>DB: broadcast_jobs INSERT (status: pending)
    API->>DB: セグメント条件でユーザー抽出
    DB-->>API: 対象ユーザーリスト (N件)
    API->>Q: broadcast_tasks INSERT (N件, status: queued)
    API-->>APP: ジョブ作成完了 (job_id返却)

    Note over W: Cron: 10秒間隔で実行

    W->>Q: status=queued のタスク取得 (LIMIT 400)
    Q-->>W: タスクリスト
    loop バッチ送信 (400件/バッチ)
        W->>LINE: multicast API (最大500宛先/リクエスト)
        LINE-->>W: 200 OK or エラー
        W->>Q: タスクステータス更新 (sent / failed)
    end
    W->>DB: broadcast_jobs ステータス更新
```

### 3.2 DBスキーマ

```sql
-- 配信ジョブ (1配信 = 1レコード)
CREATE TABLE broadcast_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  message_content JSONB NOT NULL,      -- LINE Message Object (Flex Message等)
  segment_filter  JSONB NOT NULL,      -- セグメント条件
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  total_count     INTEGER DEFAULT 0,   -- 配信対象総数
  sent_count      INTEGER DEFAULT 0,   -- 送信済み数
  failed_count    INTEGER DEFAULT 0,   -- 失敗数
  scheduled_at    TIMESTAMPTZ,         -- 予約配信日時 (NULLなら即時)
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_by      UUID NOT NULL REFERENCES admin_users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 配信タスク (ユーザー単位の送信レコード)
CREATE TABLE broadcast_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_job_id UUID NOT NULL REFERENCES broadcast_jobs(id) ON DELETE CASCADE,
  line_user_id    TEXT NOT NULL,        -- LINE userId
  status          TEXT NOT NULL DEFAULT 'queued'
                  CHECK (status IN ('queued', 'sending', 'sent', 'failed')),
  error_detail    TEXT,
  retry_count     INTEGER DEFAULT 0,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ワーカーがキューから取得する際のインデックス
CREATE INDEX idx_broadcast_tasks_queue
  ON broadcast_tasks (broadcast_job_id, status, created_at)
  WHERE status = 'queued';
```

### 3.3 配信ジョブ作成API

```typescript
// app/api/broadcasts/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const body = await request.json();

  const { title, messageContent, segmentFilter, scheduledAt } = body;

  // --- 1. セグメント条件に合致するユーザー抽出 ---
  let query = supabase
    .from("line_users")
    .select("line_user_id")
    .eq("status", "active")
    .eq("is_blocked", false);

  // セグメントフィルター適用
  if (segmentFilter.tags?.length > 0) {
    query = query.overlaps("tags", segmentFilter.tags);
  }
  if (segmentFilter.lastActiveDaysAgo) {
    const since = new Date();
    since.setDate(since.getDate() - segmentFilter.lastActiveDaysAgo);
    query = query.gte("last_active_at", since.toISOString());
  }

  const { data: users, error: usersError } = await query;

  if (usersError) {
    return NextResponse.json(
      { error: "セグメント抽出エラー" },
      { status: 500 }
    );
  }

  if (!users || users.length === 0) {
    return NextResponse.json(
      { error: "配信対象ユーザーが0件です" },
      { status: 400 }
    );
  }

  // --- 2. 配信ジョブ作成 ---
  const { data: job, error: jobError } = await supabase
    .from("broadcast_jobs")
    .insert({
      title,
      message_content: messageContent,
      segment_filter: segmentFilter,
      status: scheduledAt ? "pending" : "processing",
      total_count: users.length,
      scheduled_at: scheduledAt ?? null,
      created_by: (await supabase.auth.getUser()).data.user?.id,
    })
    .select("id")
    .single();

  if (jobError || !job) {
    return NextResponse.json(
      { error: "ジョブ作成エラー" },
      { status: 500 }
    );
  }

  // --- 3. 配信タスク一括挿入 (1000件ずつバッチ) ---
  const BATCH_SIZE = 1000;
  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE).map((u) => ({
      broadcast_job_id: job.id,
      line_user_id: u.line_user_id,
      status: "queued" as const,
    }));

    const { error: taskError } = await supabase
      .from("broadcast_tasks")
      .insert(batch);

    if (taskError) {
      console.error("[Broadcast] タスク挿入エラー:", taskError);
    }
  }

  return NextResponse.json({
    jobId: job.id,
    targetCount: users.length,
  });
}
```

### 3.4 配信ワーカー (Cron Job)

```typescript
// app/api/cron/broadcast-worker/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/service-role";
import { multicast } from "@/lib/line/api";

// Vercel Cronで10秒間隔実行
// vercel.json: { "crons": [{ "path": "/api/cron/broadcast-worker", "schedule": "*/1 * * * *" }] }
// ※ Vercel Cronの最小単位は1分。10秒間隔が必要な場合はジョブ内でループする。

const BATCH_SIZE = 400; // LINE multicast APIの上限は500だが余裕を持つ
const MAX_MULTICAST_USERS = 500;
const CRON_SECRET = process.env.CRON_SECRET!;

export async function GET(request: NextRequest) {
  // Cron認証
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(); // service_role キーで接続

  // --- 1. 処理中の配信ジョブを取得 ---
  const { data: jobs } = await supabase
    .from("broadcast_jobs")
    .select("id, message_content")
    .eq("status", "processing")
    .order("created_at", { ascending: true })
    .limit(1);

  if (!jobs || jobs.length === 0) {
    return NextResponse.json({ message: "処理対象ジョブなし" });
  }

  const job = jobs[0];

  // --- 2. キューからタスク取得 (排他制御) ---
  // FOR UPDATE SKIP LOCKED で複数ワーカーの競合を防止
  const { data: tasks, error: taskError } = await supabase.rpc(
    "dequeue_broadcast_tasks",
    {
      p_job_id: job.id,
      p_limit: BATCH_SIZE,
    }
  );

  if (taskError || !tasks || tasks.length === 0) {
    // タスクが0件 = ジョブ完了
    await finalizeJob(supabase, job.id);
    return NextResponse.json({ message: "ジョブ完了" });
  }

  // --- 3. LINE multicast API でバッチ送信 ---
  // 500件ずつに分割して送信
  for (let i = 0; i < tasks.length; i += MAX_MULTICAST_USERS) {
    const chunk = tasks.slice(i, i + MAX_MULTICAST_USERS);
    const userIds = chunk.map((t: any) => t.line_user_id);
    const taskIds = chunk.map((t: any) => t.id);

    try {
      await multicast(userIds, job.message_content);

      // 送信成功: ステータス更新
      await supabase
        .from("broadcast_tasks")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .in("id", taskIds);

      // ジョブの送信済みカウント加算
      await supabase.rpc("increment_broadcast_sent_count", {
        p_job_id: job.id,
        p_count: chunk.length,
      });
    } catch (error) {
      console.error("[Broadcast Worker] 送信エラー:", error);

      await supabase
        .from("broadcast_tasks")
        .update({
          status: "failed",
          error_detail:
            error instanceof Error ? error.message : "Unknown error",
          retry_count: 1, // RPC内でincrementする設計でもよい
        })
        .in("id", taskIds);

      await supabase.rpc("increment_broadcast_failed_count", {
        p_job_id: job.id,
        p_count: chunk.length,
      });
    }
  }

  return NextResponse.json({
    processed: tasks.length,
    jobId: job.id,
  });
}

async function finalizeJob(
  supabase: ReturnType<typeof createClient>,
  jobId: string
): Promise<void> {
  // 未送信タスクが残っていないか確認
  const { count } = await supabase
    .from("broadcast_tasks")
    .select("id", { count: "exact", head: true })
    .eq("broadcast_job_id", jobId)
    .eq("status", "queued");

  if (count === 0) {
    await supabase
      .from("broadcast_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  }
}
```

### 3.5 排他制御用 RPC

```sql
-- Supabase Database Function: キューからタスクを排他的に取得
CREATE OR REPLACE FUNCTION dequeue_broadcast_tasks(
  p_job_id UUID,
  p_limit INTEGER DEFAULT 400
)
RETURNS SETOF broadcast_tasks
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  UPDATE broadcast_tasks
  SET status = 'sending'
  WHERE id IN (
    SELECT id FROM broadcast_tasks
    WHERE broadcast_job_id = p_job_id
      AND status = 'queued'
    ORDER BY created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;

-- 送信済みカウント加算
CREATE OR REPLACE FUNCTION increment_broadcast_sent_count(
  p_job_id UUID,
  p_count INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE broadcast_jobs
  SET sent_count = sent_count + p_count
  WHERE id = p_job_id;
END;
$$;

-- 失敗カウント加算
CREATE OR REPLACE FUNCTION increment_broadcast_failed_count(
  p_job_id UUID,
  p_count INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE broadcast_jobs
  SET failed_count = failed_count + p_count
  WHERE id = p_job_id;
END;
$$;
```

### 3.6 LINE APIレートリミット対応

```typescript
// lib/line/api.ts

const LINE_API_BASE = "https://api.line.me/v2/bot";
const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!;

// レートリミッター: 500リクエスト/秒を超えないよう制御
let requestTimestamps: number[] = [];
const MAX_REQUESTS_PER_SECOND = 450; // 安全マージンを設けて450に設定

async function rateLimitedFetch(
  url: string,
  options: RequestInit
): Promise<Response> {
  const now = Date.now();

  // 1秒以上前のタイムスタンプを除去
  requestTimestamps = requestTimestamps.filter((ts) => now - ts < 1000);

  if (requestTimestamps.length >= MAX_REQUESTS_PER_SECOND) {
    // 最古のリクエストから1秒経過するまで待機
    const waitMs = 1000 - (now - requestTimestamps[0]);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  requestTimestamps.push(Date.now());
  return fetch(url, options);
}

export async function replyMessage(
  replyToken: string,
  message: LineMessage
): Promise<void> {
  const response = await rateLimitedFetch(`${LINE_API_BASE}/message/reply`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [message],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `LINE Reply API エラー: ${response.status} - ${errorBody}`
    );
  }
}

export async function multicast(
  userIds: string[],
  messages: LineMessage[]
): Promise<void> {
  const response = await rateLimitedFetch(
    `${LINE_API_BASE}/message/multicast`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: userIds,
        messages: Array.isArray(messages) ? messages : [messages],
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `LINE Multicast API エラー: ${response.status} - ${errorBody}`
    );
  }
}

interface LineMessage {
  type: string;
  text?: string;
  [key: string]: unknown; // Flex Message等に対応
}
```

### 3.7 Supavisor コネクションプール設定

```
# .env.local

# トランザクション必要な処理用 (Session mode)
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres

# コネクションプール経由 (Transaction mode) - 配信ワーカー等の大量クエリ用
DATABASE_URL_POOLED=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Supabase クライアント使い分け**:

| 用途 | 接続先 | ポート | モード |
|------|--------|--------|--------|
| 通常の CRUD (Webhook処理等) | Supavisor | 6543 | Transaction |
| Realtime subscription | Direct | 5432 | Session |
| 配信ワーカー (大量INSERT/UPDATE) | Supavisor | 6543 | Transaction |

---

## 4. イベント通知・リマインド自動配信

### 4.1 シーケンス図

```mermaid
sequenceDiagram
    participant U as ユーザー (LINE)
    participant API as API Route
    participant DB as Supabase
    participant CRON as Vercel Cron
    participant LINE as LINE API

    Note over U,LINE: === イベント参加申込フロー ===
    U->>API: ポストバック: action=event_register&event_id=xxx
    API->>DB: event_registrations INSERT
    DB-->>API: 登録成功
    API->>DB: events.current_count + 1
    API->>LINE: Reply: 「参加登録完了しました」
    API->>LINE: Push: 確認メッセージ (Flex Message)

    Note over U,LINE: === 前日リマインドフロー ===
    CRON->>DB: 明日開催のイベント & 参加者取得
    DB-->>CRON: イベント + 参加者リスト
    loop 各参加者
        CRON->>LINE: Push API: リマインドメッセージ
    end
    CRON->>DB: リマインド送信ログ記録

    Note over U,LINE: === キャンセル & 繰り上げフロー ===
    U->>API: ポストバック: action=event_cancel&event_id=xxx
    API->>DB: event_registrations UPDATE (status: cancelled)
    API->>DB: events.current_count - 1
    API->>DB: キャンセル待ち1番目を取得
    alt キャンセル待ちあり
        API->>DB: 繰り上げ登録 (status: waitlist → confirmed)
        API->>LINE: Push: 繰り上げ通知メッセージ
    end
    API->>LINE: Reply: 「キャンセルを受け付けました」
```

### 4.2 DBスキーマ

```sql
CREATE TABLE events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  event_date      DATE NOT NULL,
  start_time      TIME NOT NULL,
  end_time        TIME,
  location        TEXT,
  max_capacity    INTEGER NOT NULL,
  current_count   INTEGER NOT NULL DEFAULT 0,
  waitlist_count  INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'upcoming'
                  CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
  reminder_sent   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE event_registrations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  line_user_id    UUID NOT NULL REFERENCES line_users(id),
  status          TEXT NOT NULL DEFAULT 'confirmed'
                  CHECK (status IN ('confirmed', 'waitlist', 'cancelled')),
  waitlist_order  INTEGER,              -- キャンセル待ち順番
  registered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at    TIMESTAMPTZ,

  UNIQUE (event_id, line_user_id)       -- 同一イベントへの重複登録防止
);

CREATE INDEX idx_event_registrations_event_status
  ON event_registrations (event_id, status);
```

### 4.3 イベント参加申込ハンドラー

```typescript
// lib/line/handlers/postback.ts

import { createClient } from "@/lib/supabase/server";
import { replyMessage, pushMessage } from "@/lib/line/api";
import type { LineEvent } from "@/types/line";

export async function handlePostbackEvent(event: LineEvent): Promise<void> {
  if (!event.postback?.data) return;

  const params = new URLSearchParams(event.postback.data);
  const action = params.get("action");

  switch (action) {
    case "event_register":
      await handleEventRegister(event, params.get("event_id")!);
      break;
    case "event_cancel":
      await handleEventCancel(event, params.get("event_id")!);
      break;
    default:
      console.warn(`[Postback] 未対応アクション: ${action}`);
  }
}

async function handleEventRegister(
  event: LineEvent,
  eventId: string
): Promise<void> {
  const supabase = createClient();
  const userId = event.source.userId;

  // ユーザー内部ID取得
  const { data: user } = await supabase
    .from("line_users")
    .select("id")
    .eq("line_user_id", userId)
    .single();

  if (!user) return;

  // イベント情報取得
  const { data: eventData } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (!eventData) {
    await replyMessage(event.replyToken, {
      type: "text",
      text: "該当するイベントが見つかりませんでした。",
    });
    return;
  }

  // 重複チェック
  const { data: existing } = await supabase
    .from("event_registrations")
    .select("id, status")
    .eq("event_id", eventId)
    .eq("line_user_id", user.id)
    .not("status", "eq", "cancelled")
    .maybeSingle();

  if (existing) {
    await replyMessage(event.replyToken, {
      type: "text",
      text: "既にこのイベントに登録済みです。",
    });
    return;
  }

  // 定員チェック & 登録
  const isWaitlist = eventData.current_count >= eventData.max_capacity;

  const { error: regError } = await supabase
    .from("event_registrations")
    .insert({
      event_id: eventId,
      line_user_id: user.id,
      status: isWaitlist ? "waitlist" : "confirmed",
      waitlist_order: isWaitlist ? eventData.waitlist_count + 1 : null,
    });

  if (regError) {
    console.error("[Event] 登録エラー:", regError);
    await replyMessage(event.replyToken, {
      type: "text",
      text: "登録処理中にエラーが発生しました。しばらくしてからお試しください。",
    });
    return;
  }

  // カウント更新
  if (isWaitlist) {
    await supabase.rpc("increment_event_waitlist_count", {
      p_event_id: eventId,
    });
  } else {
    await supabase.rpc("increment_event_current_count", {
      p_event_id: eventId,
    });
  }

  // 返信
  if (isWaitlist) {
    await replyMessage(event.replyToken, {
      type: "text",
      text: `「${eventData.title}」はただいま満席です。\nキャンセル待ち ${eventData.waitlist_count + 1} 番目として登録しました。\n空きが出た場合にお知らせします。`,
    });
  } else {
    await replyMessage(event.replyToken, {
      type: "text",
      text: `「${eventData.title}」への参加登録が完了しました！\n\n📅 ${eventData.event_date}\n⏰ ${eventData.start_time}\n📍 ${eventData.location}\n\n前日にリマインドをお送りします。`,
    });
  }
}

async function handleEventCancel(
  event: LineEvent,
  eventId: string
): Promise<void> {
  const supabase = createClient();
  const userId = event.source.userId;

  const { data: user } = await supabase
    .from("line_users")
    .select("id")
    .eq("line_user_id", userId)
    .single();

  if (!user) return;

  // 登録情報取得
  const { data: registration } = await supabase
    .from("event_registrations")
    .select("id, status")
    .eq("event_id", eventId)
    .eq("line_user_id", user.id)
    .eq("status", "confirmed")
    .maybeSingle();

  if (!registration) {
    await replyMessage(event.replyToken, {
      type: "text",
      text: "参加登録が見つかりませんでした。",
    });
    return;
  }

  // キャンセル処理
  await supabase
    .from("event_registrations")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", registration.id);

  // カウント減算
  await supabase.rpc("decrement_event_current_count", {
    p_event_id: eventId,
  });

  // キャンセル待ち繰り上げ
  await promoteFromWaitlist(supabase, eventId);

  await replyMessage(event.replyToken, {
    type: "text",
    text: "キャンセルを受け付けました。またのご参加をお待ちしております。",
  });
}

async function promoteFromWaitlist(
  supabase: ReturnType<typeof createClient>,
  eventId: string
): Promise<void> {
  // キャンセル待ち1番目を取得
  const { data: waitlistEntry } = await supabase
    .from("event_registrations")
    .select("id, line_user_id")
    .eq("event_id", eventId)
    .eq("status", "waitlist")
    .order("waitlist_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!waitlistEntry) return;

  // 繰り上げ
  await supabase
    .from("event_registrations")
    .update({ status: "confirmed", waitlist_order: null })
    .eq("id", waitlistEntry.id);

  // カウント更新
  await supabase.rpc("increment_event_current_count", {
    p_event_id: eventId,
  });
  await supabase.rpc("decrement_event_waitlist_count", {
    p_event_id: eventId,
  });

  // 繰り上げ通知
  const { data: user } = await supabase
    .from("line_users")
    .select("line_user_id")
    .eq("id", waitlistEntry.line_user_id)
    .single();

  if (user) {
    const { data: eventData } = await supabase
      .from("events")
      .select("title, event_date, start_time, location")
      .eq("id", eventId)
      .single();

    if (eventData) {
      await pushMessage(user.line_user_id, {
        type: "text",
        text: `【繰り上げ当選のお知らせ】\n\n「${eventData.title}」にキャンセルが出たため、参加が確定しました！\n\n📅 ${eventData.event_date}\n⏰ ${eventData.start_time}\n📍 ${eventData.location}\n\nお会いできることを楽しみにしております。`,
      });
    }
  }
}
```

### 4.4 前日リマインド Cron Job

```typescript
// app/api/cron/event-reminder/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/service-role";
import { pushMessage } from "@/lib/line/api";

// vercel.json: { "crons": [{ "path": "/api/cron/event-reminder", "schedule": "0 9 * * *" }] }
// 毎朝9:00 JST (0:00 UTC) に実行

const CRON_SECRET = process.env.CRON_SECRET!;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient();

  // 明日の日付を取得 (JST)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0]; // YYYY-MM-DD

  // 明日開催のイベント取得 (リマインド未送信)
  const { data: events } = await supabase
    .from("events")
    .select("id, title, event_date, start_time, location")
    .eq("event_date", tomorrowStr)
    .eq("reminder_sent", false)
    .eq("status", "upcoming");

  if (!events || events.length === 0) {
    return NextResponse.json({ message: "リマインド対象なし" });
  }

  let totalSent = 0;

  for (const event of events) {
    // 参加確定者を取得
    const { data: registrations } = await supabase
      .from("event_registrations")
      .select("line_users(line_user_id)")
      .eq("event_id", event.id)
      .eq("status", "confirmed");

    if (!registrations) continue;

    for (const reg of registrations) {
      const lineUserId = (reg as any).line_users?.line_user_id;
      if (!lineUserId) continue;

      try {
        await pushMessage(lineUserId, {
          type: "text",
          text: `【明日のイベントリマインド】\n\n「${event.title}」がいよいよ明日です！\n\n📅 ${event.event_date}\n⏰ ${event.start_time}\n📍 ${event.location}\n\nお忘れなくご参加ください。お会いできることを楽しみにしております。`,
        });
        totalSent++;
      } catch (error) {
        console.error(
          `[Reminder] 送信失敗: user=${lineUserId}`,
          error
        );
      }

      // レートリミット考慮: 10ms間隔
      await new Promise((r) => setTimeout(r, 10));
    }

    // リマインド送信済みフラグ更新
    await supabase
      .from("events")
      .update({ reminder_sent: true })
      .eq("id", event.id);
  }

  return NextResponse.json({
    eventsProcessed: events.length,
    remindersSent: totalSent,
  });
}
```

### 4.5 Vercel Cron 設定

```json
// vercel.json

{
  "crons": [
    {
      "path": "/api/cron/broadcast-worker",
      "schedule": "* * * * *"
    },
    {
      "path": "/api/cron/event-reminder",
      "schedule": "0 0 * * *"
    }
  ]
}
```

| Cronジョブ | スケジュール | 説明 |
|-----------|-------------|------|
| broadcast-worker | 毎分 | 一斉配信キュー処理 |
| event-reminder | 毎日 0:00 UTC (9:00 JST) | 前日リマインド送信 |

---

## 5. エラーハンドリング・リトライ戦略

### 5.1 全体フロー図

```mermaid
flowchart TD
    A[処理実行] --> B{成功?}
    B -->|Yes| C[完了ログ記録]
    B -->|No| D{リトライ回数 < 上限?}
    D -->|Yes| E[指数バックオフで待機]
    E --> A
    D -->|No| F[failed_jobs テーブルに記録]
    F --> G[管理者通知]

    style F fill:#f66,stroke:#333,color:#fff
    style C fill:#6f6,stroke:#333,color:#fff
```

### 5.2 リトライユーティリティ

```typescript
// lib/utils/retry.ts

interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableErrors?: string[];
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 1000,    // 1秒
  maxDelayMs: 30000,    // 30秒
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // リトライ不可能なエラーは即座にthrow
      if (isNonRetryableError(lastError)) {
        throw lastError;
      }

      if (attempt < opts.maxRetries) {
        // 指数バックオフ + ジッター
        const delay = Math.min(
          opts.baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000,
          opts.maxDelayMs
        );

        console.warn(
          `[Retry] Attempt ${attempt + 1}/${opts.maxRetries} failed. ` +
          `Retrying in ${Math.round(delay)}ms...`,
          lastError.message
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

function isNonRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();

  // 400系エラー (リクエスト自体が不正) はリトライしない
  const nonRetryablePatterns = [
    "400",        // Bad Request
    "401",        // Unauthorized
    "403",        // Forbidden
    "404",        // Not Found
    "invalid",    // バリデーションエラー
  ];

  return nonRetryablePatterns.some((pattern) => message.includes(pattern));
}
```

### 5.3 LINE API呼び出しでの使用例

```typescript
// lib/line/api.ts (replyMessage / pushMessage 内部で使用)

import { withRetry } from "@/lib/utils/retry";

export async function pushMessage(
  userId: string,
  message: LineMessage
): Promise<void> {
  await withRetry(
    async () => {
      const response = await rateLimitedFetch(
        `${LINE_API_BASE}/message/push`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
          },
          body: JSON.stringify({
            to: userId,
            messages: [message],
          }),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `LINE Push API エラー: ${response.status} - ${errorBody}`
        );
      }
    },
    {
      maxRetries: 3,
      baseDelayMs: 1000,
    }
  );
}
```

### 5.4 Webhook処理失敗時のDead Letter Queue

処理に失敗したイベントをDBに保存し、後で再処理できるようにする。

```sql
CREATE TABLE failed_webhook_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      TEXT NOT NULL,
  event_payload   JSONB NOT NULL,
  error_message   TEXT NOT NULL,
  retry_count     INTEGER NOT NULL DEFAULT 0,
  max_retries     INTEGER NOT NULL DEFAULT 3,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'processing', 'resolved', 'abandoned')),
  next_retry_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_failed_webhook_retry
  ON failed_webhook_events (status, next_retry_at)
  WHERE status = 'pending';
```

```typescript
// lib/line/dead-letter-queue.ts

import { createClient } from "@/lib/supabase/service-role";
import type { LineEvent } from "@/types/line";

export async function enqueueFailedEvent(
  event: LineEvent,
  error: Error
): Promise<void> {
  const supabase = createClient();

  const nextRetryAt = new Date();
  nextRetryAt.setMinutes(nextRetryAt.getMinutes() + 5); // 初回は5分後

  await supabase.from("failed_webhook_events").insert({
    event_type: event.type,
    event_payload: event as unknown as Record<string, unknown>,
    error_message: error.message,
    next_retry_at: nextRetryAt.toISOString(),
  });
}
```

### 5.5 Dead Letter Queueの再処理ワーカー

```typescript
// app/api/cron/retry-failed-events/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/service-role";
import { handleMessageEvent } from "@/lib/line/handlers/message";
import { handleFollowEvent } from "@/lib/line/handlers/follow";
import { handlePostbackEvent } from "@/lib/line/handlers/postback";

// vercel.json: { "crons": [{ "path": "/api/cron/retry-failed-events", "schedule": "*/5 * * * *" }] }

const CRON_SECRET = process.env.CRON_SECRET!;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient();

  // リトライ対象を取得
  const { data: failedEvents } = await supabase
    .from("failed_webhook_events")
    .select("*")
    .eq("status", "pending")
    .lte("next_retry_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(50);

  if (!failedEvents || failedEvents.length === 0) {
    return NextResponse.json({ message: "リトライ対象なし" });
  }

  let resolved = 0;
  let abandoned = 0;

  for (const entry of failedEvents) {
    // 処理中にマーク
    await supabase
      .from("failed_webhook_events")
      .update({ status: "processing" })
      .eq("id", entry.id);

    try {
      const event = entry.event_payload as unknown as LineEvent;

      // replyTokenは期限切れのため、Push APIで代替する必要がある
      // ここではログ保存等の副作用処理のみ再実行
      switch (entry.event_type) {
        case "message":
          await handleMessageEvent(event);
          break;
        case "follow":
          await handleFollowEvent(event);
          break;
        case "postback":
          await handlePostbackEvent(event);
          break;
      }

      await supabase
        .from("failed_webhook_events")
        .update({
          status: "resolved",
          updated_at: new Date().toISOString(),
        })
        .eq("id", entry.id);

      resolved++;
    } catch (error) {
      const newRetryCount = entry.retry_count + 1;

      if (newRetryCount >= entry.max_retries) {
        // リトライ上限到達 → 放棄
        await supabase
          .from("failed_webhook_events")
          .update({
            status: "abandoned",
            retry_count: newRetryCount,
            error_message:
              error instanceof Error ? error.message : "Unknown error",
            updated_at: new Date().toISOString(),
          })
          .eq("id", entry.id);

        abandoned++;
      } else {
        // 次回リトライスケジュール (指数バックオフ)
        const nextRetry = new Date();
        const delayMinutes = 5 * Math.pow(2, newRetryCount); // 5, 10, 20分...
        nextRetry.setMinutes(nextRetry.getMinutes() + delayMinutes);

        await supabase
          .from("failed_webhook_events")
          .update({
            status: "pending",
            retry_count: newRetryCount,
            next_retry_at: nextRetry.toISOString(),
            error_message:
              error instanceof Error ? error.message : "Unknown error",
            updated_at: new Date().toISOString(),
          })
          .eq("id", entry.id);
      }
    }
  }

  return NextResponse.json({ resolved, abandoned, total: failedEvents.length });
}
```

### 5.6 processEvents へのDead Letter Queue統合

Section 1.4の `processEvents` 関数を以下のように更新する:

```typescript
// app/api/webhook/line/route.ts (processEvents の更新版)

import { enqueueFailedEvent } from "@/lib/line/dead-letter-queue";

async function processEvents(events: LineEvent[]): Promise<void> {
  for (const event of events) {
    try {
      await withRetry(
        async () => {
          switch (event.type) {
            case "message":
              await handleMessageEvent(event);
              break;
            case "follow":
              await handleFollowEvent(event);
              break;
            case "unfollow":
              await handleUnfollowEvent(event);
              break;
            case "postback":
              await handlePostbackEvent(event);
              break;
            default:
              console.warn(`[LINE Webhook] 未対応イベント: ${event.type}`);
          }
        },
        { maxRetries: 2, baseDelayMs: 500 }
      );
    } catch (error) {
      console.error(`[LINE Webhook] イベント処理最終失敗:`, {
        eventType: event.type,
        userId: event.source?.userId,
        error: error instanceof Error ? error.message : error,
      });

      // Dead Letter Queueに登録
      await enqueueFailedEvent(
        event,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
}
```

### 5.7 エラーハンドリング方針まとめ

| エラー種別 | 対応方法 | リトライ | 上限 |
|-----------|---------|---------|------|
| LINE署名検証失敗 | 401応答、ログ記録 | しない | - |
| Supabase接続エラー | 指数バックオフでリトライ | する | 3回 |
| Gemini API エラー (429 Rate Limit) | 指数バックオフでリトライ | する | 3回 |
| Gemini API エラー (500系) | 指数バックオフでリトライ | する | 3回 |
| LINE Reply API エラー (400) | ログ記録、リトライしない | しない | - |
| LINE Reply API エラー (429) | 指数バックオフでリトライ | する | 3回 |
| LINE Push API エラー (500系) | 指数バックオフでリトライ | する | 3回 |
| Webhook処理タイムアウト | DLQに登録、Cronで再処理 | する (Cron) | 3回 |
| AI応答エラー3回連続 | 有人モードに自動切替 | - | - |

---

## 付録A: 環境変数一覧

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `LINE_CHANNEL_SECRET` | LINEチャネルシークレット | `abc123...` |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINEチャネルアクセストークン (v2.1) | `eyJ...` |
| `GEMINI_API_KEY` | Google Gemini API キー | `AIza...` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクトURL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | `eyJ...` |
| `DATABASE_URL` | DB直接接続 (Session mode) | `postgresql://...` |
| `DATABASE_URL_POOLED` | DB接続 (Transaction mode) | `postgresql://...:6543/...` |
| `CRON_SECRET` | Cronジョブ認証用シークレット | `random-secret-string` |

## 付録B: ファイル構成

```
app/
├── api/
│   ├── webhook/
│   │   └── line/
│   │       └── route.ts          # LINE Webhook エンドポイント
│   ├── broadcasts/
│   │   └── route.ts              # 一斉配信ジョブ作成API
│   └── cron/
│       ├── broadcast-worker/
│       │   └── route.ts          # 配信キューワーカー
│       ├── event-reminder/
│       │   └── route.ts          # 前日リマインドCron
│       └── retry-failed-events/
│           └── route.ts          # DLQ再処理Cron
lib/
├── line/
│   ├── api.ts                    # LINE API クライアント
│   ├── verify-signature.ts       # 署名検証
│   ├── dead-letter-queue.ts      # DLQ操作
│   └── handlers/
│       ├── message.ts            # メッセージイベント処理
│       ├── follow.ts             # フォローイベント処理
│       ├── unfollow.ts           # ブロックイベント処理
│       └── postback.ts           # ポストバックイベント処理
├── ai/
│   └── generate-response.ts      # Gemini API応答生成
├── supabase/
│   ├── server.ts                 # Supabaseクライアント (Server)
│   └── service-role.ts           # Supabaseクライアント (Service Role)
└── utils/
    └── retry.ts                  # リトライユーティリティ
types/
└── line.ts                       # LINE型定義
```
