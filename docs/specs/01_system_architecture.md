# システム全体アーキテクチャ仕様書

**プロジェクト名:** 武居商店「AI搭載型 独自LINEマーケティングシステム」
**ドキュメントバージョン:** 1.0.0
**最終更新日:** 2026-03-04

---

## 1. システム全体構成図

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            ユーザー（LINE アプリ）                            │
└──────────┬──────────────────────────────────┬───────────────────────────────┘
           │                                  │
           │ LINE Messaging API               │ LIFF (WebView)
           │ (Webhook POST)                   │ (HTTPS)
           ▼                                  ▼
┌─────────────────────┐          ┌──────────────────────────────────────────┐
│  LINE Platform       │          │  Vercel (Next.js)                        │
│  ─────────────────── │          │  ────────────────────────────────────── │
│  Messaging API       │─Webhook─▶│  ┌─────────────────────────────────┐   │
│  Login Channel       │          │  │ Edge Functions                    │   │
│  LIFF                │          │  │  - /api/webhook (LINE Webhook)   │   │
└─────────────────────┘          │  │  - /api/auth/* (認証)             │   │
                                  │  └──────────┬──────────────────────┘   │
                                  │             │                           │
                                  │  ┌──────────▼──────────────────────┐   │
                                  │  │ Serverless Functions              │   │
                                  │  │  - /api/ai/* (AI処理)            │   │
                                  │  │  - /api/broadcast/* (一斉配信)   │   │
                                  │  │  - /api/admin/* (管理画面API)    │   │
                                  │  │  - /api/cron/* (定期実行)        │   │
                                  │  └───┬──────────────┬──────────┬───┘   │
                                  │      │              │          │        │
                                  │  ┌───▼───┐   ┌─────▼────┐  ┌─▼──────┐ │
                                  │  │ LIFF  │   │ 管理画面  │  │ LP     │ │
                                  │  │ Pages │   │ Pages    │  │ Pages  │ │
                                  │  └───────┘   └──────────┘  └────────┘ │
                                  └──────┬──────────────┬──────────────────┘
                                         │              │
                            ┌────────────┘              └──────────┐
                            ▼                                      ▼
              ┌──────────────────────────┐          ┌──────────────────────┐
              │  Supabase                 │          │  Google AI            │
              │  ──────────────────────── │          │  ──────────────────── │
              │  PostgreSQL (データ)      │          │  Gemini 1.5 Flash    │
              │  Auth (認証)              │          │  Gemini 1.5 Pro      │
              │  RLS (行レベルセキュリティ)│          └──────────────────────┘
              │  Realtime (リアルタイム)  │
              │  Storage (画像等)         │
              └──────────────────────────┘
```

### データフロー概要

```
[LINE ユーザー操作]
       │
       ▼
[LINE Platform] ──Webhook POST──▶ [Edge Function: /api/webhook]
                                         │
                                         ├─ 署名検証（即時）
                                         ├─ 200 OK 即時返却（タイムアウト回避）
                                         │
                                         └─▶ [Serverless Function: 非同期処理]
                                                  │
                                              ┌───┴───┐
                                              ▼       ▼
                                      [Supabase]  [Gemini API]
                                      DB読み書き   AI応答生成
                                              │       │
                                              └───┬───┘
                                                  ▼
                                        [LINE Messaging API]
                                         Reply/Push Message
```

---

## 2. インフラ構成

### 2.1 Vercel プロジェクト構成

**プロジェクト構造:**

```
takei-line-marketing/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (liff)/                   # LIFF用ページグループ
│   │   │   ├── layout.tsx
│   │   │   ├── survey/page.tsx       # アンケートページ
│   │   │   ├── coupon/page.tsx       # クーポン表示ページ
│   │   │   └── mypage/page.tsx       # マイページ
│   │   ├── (admin)/                  # 管理画面ページグループ
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── customers/page.tsx
│   │   │   ├── broadcast/page.tsx
│   │   │   └── ai-settings/page.tsx
│   │   ├── (lp)/                     # ランディングページグループ
│   │   │   └── page.tsx
│   │   ├── api/
│   │   │   ├── webhook/
│   │   │   │   └── route.ts          # LINE Webhook (Edge)
│   │   │   ├── auth/
│   │   │   │   ├── line-callback/
│   │   │   │   │   └── route.ts      # LINE Login コールバック (Edge)
│   │   │   │   └── session/
│   │   │   │       └── route.ts      # セッション管理 (Edge)
│   │   │   ├── ai/
│   │   │   │   ├── generate-reply/
│   │   │   │   │   └── route.ts      # AI応答生成 (Serverless)
│   │   │   │   └── analyze/
│   │   │   │       └── route.ts      # 顧客分析 (Serverless)
│   │   │   ├── broadcast/
│   │   │   │   ├── send/
│   │   │   │   │   └── route.ts      # 一斉配信実行 (Serverless)
│   │   │   │   └── schedule/
│   │   │   │       └── route.ts      # 配信スケジュール (Serverless)
│   │   │   ├── admin/
│   │   │   │   └── [...slug]/
│   │   │   │       └── route.ts      # 管理API (Serverless)
│   │   │   └── cron/
│   │   │       ├── daily-report/
│   │   │       │   └── route.ts      # 日次レポート (Serverless)
│   │   │       └── segment-update/
│   │   │           └── route.ts      # セグメント更新 (Serverless)
│   │   └── layout.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             # ブラウザ用クライアント
│   │   │   ├── server.ts             # サーバー用クライアント
│   │   │   └── admin.ts              # Service Role クライアント
│   │   ├── line/
│   │   │   ├── messaging.ts          # LINE Messaging API ラッパー
│   │   │   ├── webhook.ts            # Webhook パーサー・検証
│   │   │   └── liff.ts               # LIFF SDK ラッパー
│   │   ├── ai/
│   │   │   ├── gemini.ts             # Gemini API クライアント
│   │   │   ├── prompts.ts            # プロンプトテンプレート
│   │   │   └── context-builder.ts    # コンテキスト構築
│   │   └── utils/
│   │       ├── rate-limiter.ts
│   │       └── queue.ts              # 簡易キュー実装
│   ├── components/
│   ├── hooks/
│   └── types/
├── supabase/
│   ├── migrations/                   # DBマイグレーション
│   ├── functions/                    # Supabase Edge Functions（必要時）
│   └── seed.sql
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── deploy-staging.yml
│       └── deploy-production.yml
├── next.config.ts
├── vercel.json
├── package.json
└── tsconfig.json
```

**Edge Functions vs Serverless Functions の使い分け:**

| エンドポイント | ランタイム | 理由 |
|---|---|---|
| `/api/webhook` | **Edge** | LINE Webhookの1秒タイムアウト制約。即時200返却が必須。コールドスタート排除。 |
| `/api/auth/*` | **Edge** | 認証処理は低レイテンシが必須。JWT検証のみで軽量。 |
| `/api/ai/*` | **Serverless** | Gemini API呼び出しに数秒かかるため、Edge の CPU 時間制限（50ms）を超過する。maxDuration: 30。 |
| `/api/broadcast/*` | **Serverless** | 大量のDB読み書き・LINE API呼び出しが発生。maxDuration: 60。 |
| `/api/admin/*` | **Serverless** | 管理系CRUD操作。Node.js APIフルアクセスが必要。 |
| `/api/cron/*` | **Serverless** | 定期バッチ処理。maxDuration: 300（Vercel Proプラン）。 |

**vercel.json:**

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-report",
      "schedule": "0 23 * * *"
    },
    {
      "path": "/api/cron/segment-update",
      "schedule": "0 */6 * * *"
    }
  ],
  "headers": [
    {
      "source": "/api/webhook",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" }
      ]
    }
  ]
}
```

**Edge Function の設定例 (`/api/webhook/route.ts`):**

```typescript
export const runtime = 'edge';

export async function POST(request: Request) {
  // 即時応答してタイムアウトを回避（詳細は第5章）
}
```

**Serverless Function の設定例 (`/api/ai/generate-reply/route.ts`):**

```typescript
export const runtime = 'nodejs';
export const maxDuration = 30; // 秒

export async function POST(request: Request) {
  // Gemini API 呼び出し等の重い処理
}
```

### 2.2 Supabase 構成

**プロジェクト設定:**

| 項目 | 値 |
|---|---|
| リージョン | `ap-northeast-1`（東京） |
| プラン | Pro（本番）/ Free（開発） |
| PostgreSQL バージョン | 15+ |
| 接続プーリング | Supavisor（Transaction mode） |

**接続方式の使い分け:**

```typescript
// lib/supabase/server.ts - サーバーサイド用（RLS適用）
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
      db: {
        // Supavisor 経由の接続プール（Transaction mode）
        // Supabase ダッシュボードで Supavisor を有効化済みの前提
        schema: 'public',
      },
    }
  );
}
```

```typescript
// lib/supabase/admin.ts - Service Role 用（RLSバイパス）
// Webhook処理やCronなど、ユーザーコンテキスト外の処理で使用
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
```

**Realtime 設定:**

管理画面のダッシュボードでリアルタイム更新が必要なテーブルのみ有効化する。

```sql
-- Supabase ダッシュボード > Database > Replication で設定、
-- または SQL で直接有効化
ALTER PUBLICATION supabase_realtime ADD TABLE broadcast_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE customer_messages;
```

```typescript
// 管理画面での Realtime サブスクリプション例
const channel = supabase
  .channel('broadcast-status')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'broadcast_jobs',
      filter: `id=eq.${jobId}`,
    },
    (payload) => {
      // 配信進捗をリアルタイム更新
      setBroadcastProgress(payload.new.progress);
    }
  )
  .subscribe();
```

### 2.3 外部サービス接続

**LINE Messaging API:**

```typescript
// lib/line/messaging.ts
import { messagingApi, HTTPFetchError } from '@line/bot-sdk';

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
};

const client = new messagingApi.MessagingApiClient(config);

export async function replyMessage(
  replyToken: string,
  messages: messagingApi.Message[]
): Promise<void> {
  try {
    await client.replyMessage({ replyToken, messages });
  } catch (err) {
    if (err instanceof HTTPFetchError) {
      console.error('LINE API Error:', {
        status: err.status,
        body: err.body,
      });
    }
    throw err;
  }
}

export async function pushMessage(
  to: string,
  messages: messagingApi.Message[]
): Promise<void> {
  await client.pushMessage({ to, messages });
}

// 一斉配信用（500件/リクエスト上限）
export async function multicast(
  to: string[],
  messages: messagingApi.Message[]
): Promise<void> {
  await client.multicast({ to, messages });
}
```

**Gemini API:**

```typescript
// lib/ai/gemini.ts
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// 用途別モデル選択
export const models = {
  // 高速応答（チャット返信、簡単な分析）
  flash: genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
    ],
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      maxOutputTokens: 1024,
    },
  }),

  // 高精度（顧客分析、レポート生成、複雑な判断）
  pro: genAI.getGenerativeModel({
    model: 'gemini-1.5-pro',
    generationConfig: {
      temperature: 0.3,
      topP: 0.8,
      maxOutputTokens: 4096,
    },
  }),
};

export type ModelType = keyof typeof models;

export async function generateContent(
  modelType: ModelType,
  prompt: string,
  systemInstruction?: string
): Promise<string> {
  const model = models[modelType];

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    ...(systemInstruction && {
      systemInstruction: { role: 'system', parts: [{ text: systemInstruction }] },
    }),
  });

  const response = result.response;
  return response.text();
}
```

**モデル使い分け基準:**

| ユースケース | モデル | 理由 |
|---|---|---|
| ユーザーチャット返信 | `gemini-1.5-flash` | 低レイテンシ必須（2秒以内目標） |
| 商品レコメンド生成 | `gemini-1.5-flash` | パターン化可能、速度優先 |
| 顧客セグメント分析 | `gemini-1.5-pro` | 複雑な判断、精度優先 |
| 日次レポート生成 | `gemini-1.5-pro` | 長文出力、分析精度重視 |
| プロンプト最適化判定 | `gemini-1.5-pro` | 高度な推論が必要 |

---

## 3. CI/CD パイプライン設計

### 3.1 ブランチ戦略

```
main (本番)
 │
 ├── staging (ステージング)
 │    │
 │    ├── feature/xxx (機能開発)
 │    ├── fix/xxx (バグ修正)
 │    └── hotfix/xxx (緊急修正 → main直接マージも可)
 │
 └── hotfix/xxx (緊急時のみ main から直接分岐)
```

**ブランチ運用ルール:**

| ブランチ | マージ先 | デプロイ先 | 保護ルール |
|---|---|---|---|
| `main` | - | Vercel Production | PR必須、CI通過必須、1名以上のレビュー |
| `staging` | `main` | Vercel Preview (staging) | PR必須、CI通過必須 |
| `feature/*` | `staging` | Vercel Preview (自動) | なし |
| `hotfix/*` | `main` + `staging` | - | PR必須、CI通過必須 |

### 3.2 GitHub Actions ワークフロー

**CI ワークフロー (`.github/workflows/ci.yml`):**

```yaml
name: CI

on:
  pull_request:
    branches: [main, staging]
  push:
    branches: [main, staging]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

env:
  NODE_VERSION: '20'

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci

      - name: ESLint
        run: npx eslint . --max-warnings 0

      - name: Type Check
        run: npx tsc --noEmit

      - name: Prettier Check
        run: npx prettier --check .

  test:
    name: Test
    runs-on: ubuntu-latest
    needs: lint
    env:
      NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
      SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.TEST_SUPABASE_SERVICE_ROLE_KEY }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci

      - name: Unit Tests
        run: npx vitest run --coverage

      - name: Upload Coverage
        uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci

      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}

  db-migration-check:
    name: DB Migration Check
    runs-on: ubuntu-latest
    if: |
      github.event_name == 'pull_request' &&
      contains(github.event.pull_request.labels.*.name, 'db-migration')
    steps:
      - uses: actions/checkout@v4

      - uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Validate Migrations
        run: |
          supabase db lint
          supabase db diff --linked
```

**本番デプロイワークフロー (`.github/workflows/deploy-production.yml`):**

```yaml
name: Deploy Production

on:
  push:
    branches: [main]

concurrency:
  group: deploy-production
  cancel-in-progress: false  # 本番デプロイはキャンセルしない

jobs:
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'

  db-migrate:
    name: Run DB Migrations
    runs-on: ubuntu-latest
    needs: deploy
    if: contains(github.event.head_commit.message, '[migrate]')
    environment: production
    steps:
      - uses: actions/checkout@v4

      - uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Run Migrations
        run: supabase db push --linked
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}

  notify:
    name: Notify Deployment
    runs-on: ubuntu-latest
    needs: [deploy, db-migrate]
    if: always()
    steps:
      - name: Notify via LINE
        if: needs.deploy.result == 'success'
        run: |
          curl -X POST https://api.line.me/v2/bot/message/push \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${{ secrets.LINE_NOTIFY_TOKEN }}" \
            -d '{
              "to": "${{ secrets.ADMIN_LINE_USER_ID }}",
              "messages": [{"type": "text", "text": "本番デプロイ完了: ${{ github.sha }}"}]
            }'

      - name: Notify Failure
        if: needs.deploy.result == 'failure'
        run: |
          curl -X POST https://api.line.me/v2/bot/message/push \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${{ secrets.LINE_NOTIFY_TOKEN }}" \
            -d '{
              "to": "${{ secrets.ADMIN_LINE_USER_ID }}",
              "messages": [{"type": "text", "text": "本番デプロイ失敗: ${{ github.sha }}\n確認してください。"}]
            }'
```

### 3.3 環境変数管理

**Vercel 環境変数（ダッシュボードで設定）:**

| 変数名 | Production | Preview | Development | 説明 |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 本番URL | ステージングURL | ローカルURL | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 本番キー | ステージングキー | ローカルキー | Supabase 匿名キー |
| `SUPABASE_SERVICE_ROLE_KEY` | 本番キー | ステージングキー | ローカルキー | Supabase Service Role |
| `LINE_CHANNEL_ACCESS_TOKEN` | 本番トークン | テストトークン | テストトークン | LINE チャネルアクセストークン |
| `LINE_CHANNEL_SECRET` | 本番シークレット | テストシークレット | テストシークレット | LINE チャネルシークレット |
| `LIFF_ID` | 本番LIFF ID | テストLIFF ID | テストLIFF ID | LIFF アプリケーションID |
| `GEMINI_API_KEY` | 本番キー | テストキー | テストキー | Gemini API キー |
| `CRON_SECRET` | ランダム文字列 | ランダム文字列 | - | Cron エンドポイント認証用 |
| `NEXT_PUBLIC_BASE_URL` | 本番ドメイン | Preview URL | localhost:3000 | アプリベースURL |

**GitHub Secrets（Actions用）:**

| シークレット名 | 用途 |
|---|---|
| `VERCEL_TOKEN` | Vercel デプロイ用トークン |
| `VERCEL_ORG_ID` | Vercel 組織ID |
| `VERCEL_PROJECT_ID` | Vercel プロジェクトID |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI 認証用 |
| `SUPABASE_DB_PASSWORD` | DB マイグレーション用 |
| `TEST_SUPABASE_URL` | CI テスト用 Supabase URL |
| `TEST_SUPABASE_ANON_KEY` | CI テスト用匿名キー |
| `TEST_SUPABASE_SERVICE_ROLE_KEY` | CI テスト用 Service Role キー |
| `LINE_NOTIFY_TOKEN` | デプロイ通知用 LINE トークン |
| `ADMIN_LINE_USER_ID` | 管理者 LINE ユーザーID |

### 3.4 ゼロダウンタイムデプロイ戦略

Vercel は Immutable Deployment モデルを採用しているため、標準でゼロダウンタイムデプロイが実現される。追加で以下を考慮する。

**DBマイグレーション時の注意:**

```
1. 後方互換なマイグレーションを先にデプロイ
   例: カラム追加は nullable で追加 → アプリデプロイ → NOT NULL 制約追加

2. 破壊的変更の手順:
   Step 1: 新カラム追加（nullable）→ デプロイ
   Step 2: アプリを新カラム対応に更新 → デプロイ
   Step 3: データ移行バッチ実行
   Step 4: 旧カラム削除 → デプロイ
```

**Vercel デプロイフック（ロールバック用）:**

```bash
# 問題発生時の即座ロールバック
# Vercel ダッシュボードから過去のデプロイを Promote するか、
# CLI で以下を実行:
vercel rollback --token=$VERCEL_TOKEN
```

---

## 4. セキュリティアーキテクチャ

### 4.1 認証フロー（LINE Login → Supabase Auth 連携）

```
[ユーザー]
    │
    │ 1. LIFF.init() / LINE Login ボタン押下
    ▼
[LINE Login]
    │
    │ 2. 認可コード発行（OAuth 2.0 Authorization Code Flow）
    ▼
[/api/auth/line-callback] (Edge Function)
    │
    │ 3. 認可コード → LINE Access Token 取得
    │ 4. LINE Access Token → LINE Profile 取得（userId, displayName, pictureUrl）
    │ 5. Supabase Auth: signInWithIdToken or カスタムトークン発行
    │ 6. Supabase JWT + Refresh Token をセキュアCookieにセット
    ▼
[ユーザー: 認証済み]
    │
    │ 以降のAPIリクエストには Supabase JWT が自動付与
    ▼
[Supabase RLS で行レベルアクセス制御]
```

**認証コールバック実装 (`/api/auth/line-callback/route.ts`):**

```typescript
export const runtime = 'edge';

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  // 1. CSRF検証（stateパラメータ）
  // state はセッション開始時に生成し Cookie に保存済み
  const savedState = request.headers.get('cookie')?.match(/line_oauth_state=([^;]+)/)?.[1];
  if (!state || state !== savedState) {
    return NextResponse.json({ error: 'Invalid state' }, { status: 403 });
  }

  // 2. LINE Access Token 取得
  const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code!,
      redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/line-callback`,
      client_id: process.env.LINE_LOGIN_CHANNEL_ID!,
      client_secret: process.env.LINE_LOGIN_CHANNEL_SECRET!,
    }),
  });

  const tokenData = await tokenResponse.json();

  // 3. ID Token を検証してプロフィール取得
  // LINE の id_token は JWT 形式。LINE の公開鍵で検証する。
  const profileResponse = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      id_token: tokenData.id_token,
      client_id: process.env.LINE_LOGIN_CHANNEL_ID!,
    }),
  });

  const profile = await profileResponse.json();

  // 4. Supabase Auth でユーザー作成/ログイン
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // LINE userId をキーにしてユーザーを upsert
  const { data: existingUsers } = await supabaseAdmin
    .from('customers')
    .select('supabase_user_id')
    .eq('line_user_id', profile.sub)
    .single();

  let supabaseUserId: string;

  if (existingUsers?.supabase_user_id) {
    supabaseUserId = existingUsers.supabase_user_id;
  } else {
    // 新規ユーザー作成
    const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
      email: `${profile.sub}@line.placeholder`,
      email_confirm: true,
      user_metadata: {
        line_user_id: profile.sub,
        display_name: profile.name,
        picture_url: profile.picture,
      },
    });

    if (error) throw error;
    supabaseUserId = newUser.user.id;

    // customers テーブルにも挿入
    await supabaseAdmin.from('customers').insert({
      supabase_user_id: supabaseUserId,
      line_user_id: profile.sub,
      display_name: profile.name,
      picture_url: profile.picture,
    });
  }

  // 5. Supabase セッション生成
  const { data: session, error: sessionError } =
    await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: `${profile.sub}@line.placeholder`,
    });

  // 6. セキュアCookieにセット & リダイレクト
  const response = NextResponse.redirect(
    new URL('/mypage', process.env.NEXT_PUBLIC_BASE_URL!)
  );

  // HttpOnly, Secure, SameSite=Lax で保護
  response.cookies.set('sb-access-token', session.properties?.access_token ?? '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60, // 1時間
  });

  response.cookies.set('sb-refresh-token', session.properties?.refresh_token ?? '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30日
  });

  return response;
}
```

### 4.2 API 認証

**LINE Webhook 署名検証:**

```typescript
// lib/line/webhook.ts
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * LINE Webhook リクエストの署名を検証する。
 * Edge Runtime では Web Crypto API を使用。
 */
export async function verifyWebhookSignature(
  body: string,
  signature: string
): Promise<boolean> {
  const channelSecret = process.env.LINE_CHANNEL_SECRET!;

  // Edge Runtime 対応: Web Crypto API を使用
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(channelSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(body)
  );

  const expectedSignature = btoa(
    String.fromCharCode(...new Uint8Array(signatureBuffer))
  );

  return expectedSignature === signature;
}
```

**管理画面API の JWT 検証ミドルウェア:**

```typescript
// middleware.ts (Next.js Middleware - Edge Runtime)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // 管理画面へのアクセス制御
  if (request.nextUrl.pathname.startsWith('/admin') ||
      request.nextUrl.pathname.startsWith('/api/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // 管理者ロールチェック
    const { data: admin } = await supabase
      .from('admin_users')
      .select('role')
      .eq('supabase_user_id', user.id)
      .single();

    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Cron エンドポイントの認証
  if (request.nextUrl.pathname.startsWith('/api/cron')) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/api/cron/:path*',
  ],
};
```

### 4.3 ネットワークセキュリティ

**Next.js セキュリティヘッダー (`next.config.ts`):**

```typescript
import type { NextConfig } from 'next';

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.line-scdn.net",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://profile.line-scdn.net https://*.supabase.co",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.line.me https://generativelanguage.googleapis.com",
      "frame-src 'self' https://access.line.me",
      "font-src 'self'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
```

**Supabase RLS ポリシー例:**

```sql
-- customers テーブル: ユーザーは自分のデータのみ読み書き可能
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data"
  ON customers FOR SELECT
  USING (supabase_user_id = auth.uid());

CREATE POLICY "Users can update own data"
  ON customers FOR UPDATE
  USING (supabase_user_id = auth.uid())
  WITH CHECK (supabase_user_id = auth.uid());

-- admin_users テーブル: 管理者のみ全テーブルアクセス可能
CREATE POLICY "Admins can view all customers"
  ON customers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.supabase_user_id = auth.uid()
    )
  );

-- customer_messages テーブル: ユーザーは自分のメッセージのみ閲覧可
CREATE POLICY "Users can view own messages"
  ON customer_messages FOR SELECT
  USING (customer_id IN (
    SELECT id FROM customers WHERE supabase_user_id = auth.uid()
  ));
```

---

## 5. 非同期処理・キューイング設計

### 5.1 LINE Webhook タイムアウト回避策

LINE Webhook は **1秒以内** に200レスポンスを返却しないとリトライが発生する。AI応答生成には数秒かかるため、即時応答+非同期処理パターンを採用する。

**方式: Edge Function 即時応答 + `waitUntil` 非同期処理**

```
[LINE Platform]
       │
       │ POST /api/webhook
       ▼
[Edge Function]
       │
       ├─ 1. 署名検証（~5ms）
       ├─ 2. イベント解析（~1ms）
       ├─ 3. 200 OK 即時返却 ◄── ここで LINE への応答完了
       │
       └─ 4. waitUntil() で非同期処理を継続
              │
              ├─ Supabase にイベント保存
              ├─ Gemini API で応答生成
              └─ LINE Reply API で返信送信
```

**実装コード (`/api/webhook/route.ts`):**

```typescript
export const runtime = 'edge';

import { verifyWebhookSignature } from '@/lib/line/webhook';
import { processWebhookEvent } from '@/lib/line/event-processor';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('x-line-signature') ?? '';

  // 1. 署名検証
  const isValid = await verifyWebhookSignature(body, signature);
  if (!isValid) {
    return new Response('Invalid signature', { status: 401 });
  }

  const events = JSON.parse(body).events;

  // 2. 非同期処理を waitUntil に委譲し、即時 200 を返却
  //    Next.js の Edge Runtime では、以下のパターンで
  //    レスポンス返却後も処理を継続できる
  const processingPromise = (async () => {
    for (const event of events) {
      try {
        await processWebhookEvent(event);
      } catch (error) {
        // エラーをログに記録（処理失敗しても200は返却済み）
        console.error('Webhook event processing error:', error);
        await supabaseAdmin.from('webhook_error_logs').insert({
          event_type: event.type,
          event_data: event,
          error_message: String(error),
          created_at: new Date().toISOString(),
        });
      }
    }
  })();

  // Vercel Edge Runtime の waitUntil を使用
  // @ts-expect-error -- waitUntil は Vercel Edge Runtime に存在
  request.signal?.addEventListener?.('abort', () => {});
  if (typeof globalThis !== 'undefined' && 'EdgeRuntime' in globalThis) {
    // Vercel Edge Runtime の場合
    const { waitUntil } = await import('@vercel/functions');
    waitUntil(processingPromise);
  }

  // 3. 即時 200 OK 返却
  return new Response('OK', { status: 200 });
}
```

**イベント処理の実装 (`lib/line/event-processor.ts`):**

```typescript
import { replyMessage } from '@/lib/line/messaging';
import { generateContent } from '@/lib/ai/gemini';
import { buildCustomerContext } from '@/lib/ai/context-builder';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function processWebhookEvent(event: LineWebhookEvent): Promise<void> {
  switch (event.type) {
    case 'message':
      await handleMessageEvent(event);
      break;
    case 'follow':
      await handleFollowEvent(event);
      break;
    case 'postback':
      await handlePostbackEvent(event);
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

async function handleMessageEvent(event: MessageEvent): Promise<void> {
  const userId = event.source.userId;

  // 1. 顧客情報取得
  const { data: customer } = await supabaseAdmin
    .from('customers')
    .select('*')
    .eq('line_user_id', userId)
    .single();

  // 2. メッセージ保存
  await supabaseAdmin.from('customer_messages').insert({
    customer_id: customer?.id,
    line_user_id: userId,
    direction: 'incoming',
    message_type: event.message.type,
    content: event.message.type === 'text' ? event.message.text : null,
    raw_event: event,
  });

  // 3. テキストメッセージの場合のみ AI 応答生成
  if (event.message.type === 'text') {
    const context = await buildCustomerContext(userId);
    const aiReply = await generateContent(
      'flash', // 低レイテンシ優先
      `${context}\n\nユーザーメッセージ: ${event.message.text}`,
      '武居商店のカスタマーサポートAIとして応答してください。丁寧な日本語で、商品に関する質問に答えてください。'
    );

    // 4. 応答保存
    await supabaseAdmin.from('customer_messages').insert({
      customer_id: customer?.id,
      line_user_id: userId,
      direction: 'outgoing',
      message_type: 'text',
      content: aiReply,
      ai_generated: true,
    });

    // 5. LINE Reply
    await replyMessage(event.replyToken, [
      { type: 'text', text: aiReply },
    ]);
  }
}
```

### 5.2 Vercel Edge/Serverless での非同期パターン

**パターン比較:**

| パターン | ランタイム | 最大実行時間 | ユースケース |
|---|---|---|---|
| `waitUntil` | Edge | 30秒 | Webhook 即時応答後の処理 |
| Serverless 直接実行 | Node.js | 300秒(Pro) | AI分析、レポート生成 |
| Vercel Cron | Node.js | 300秒(Pro) | 定期バッチ、セグメント更新 |
| 内部API呼び出しチェーン | 両方 | 各関数の上限 | 長時間処理の分割実行 |

**長時間処理の分割パターン（一斉配信の例）:**

```typescript
// /api/broadcast/send/route.ts
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  const { broadcastId } = await request.json();

  // 1. 配信ジョブ作成
  const { data: job } = await supabaseAdmin
    .from('broadcast_jobs')
    .update({ status: 'processing', started_at: new Date().toISOString() })
    .eq('id', broadcastId)
    .select()
    .single();

  // 2. 対象顧客をバッチで取得・送信
  const BATCH_SIZE = 500; // LINE multicast 上限
  let offset = 0;
  let totalSent = 0;

  while (true) {
    const { data: targets, error } = await supabaseAdmin
      .from('broadcast_targets')
      .select('line_user_id')
      .eq('broadcast_id', broadcastId)
      .eq('sent', false)
      .range(offset, offset + BATCH_SIZE - 1);

    if (error || !targets || targets.length === 0) break;

    const userIds = targets.map((t) => t.line_user_id);

    try {
      // 3. LINE multicast API 呼び出し
      await multicast(userIds, job!.messages);

      // 4. 送信済みフラグ更新
      await supabaseAdmin
        .from('broadcast_targets')
        .update({ sent: true, sent_at: new Date().toISOString() })
        .in('line_user_id', userIds)
        .eq('broadcast_id', broadcastId);

      totalSent += userIds.length;

      // 5. 進捗更新（Realtime で管理画面に通知される）
      await supabaseAdmin
        .from('broadcast_jobs')
        .update({ progress: totalSent })
        .eq('id', broadcastId);
    } catch (error) {
      console.error('Multicast batch error:', error);
      // エラーログ記録、次バッチへ続行
      await supabaseAdmin.from('broadcast_error_logs').insert({
        broadcast_id: broadcastId,
        batch_offset: offset,
        error_message: String(error),
      });
    }

    // 6. レートリミット対策: LINE API の制限に従い待機
    await sleep(100); // 100ms 間隔

    offset += BATCH_SIZE;

    // 7. 実行時間チェック（タイムアウト前に中断 → 続きは再呼び出し）
    if (isApproachingTimeout(55_000)) {
      // 残りがある場合は自分自身を再呼び出し
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/broadcast/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CRON_SECRET}`,
        },
        body: JSON.stringify({ broadcastId }),
      });
      return new Response(
        JSON.stringify({ status: 'continuing', sent: totalSent }),
        { status: 202 }
      );
    }
  }

  // 8. 完了更新
  await supabaseAdmin
    .from('broadcast_jobs')
    .update({
      status: 'completed',
      progress: totalSent,
      completed_at: new Date().toISOString(),
    })
    .eq('id', broadcastId);

  return Response.json({ status: 'completed', totalSent });
}

// ユーティリティ
const startTime = Date.now();

function isApproachingTimeout(limitMs: number): boolean {
  return Date.now() - startTime > limitMs;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

### 5.3 一斉配信時の DB 負荷対策

**問題:** 数千〜数万件の配信対象に対して個別にクエリを発行すると DB 負荷が急増する。

**対策1: バッチ処理による DB アクセス最適化**

```sql
-- broadcast_targets テーブルにインデックス
CREATE INDEX idx_broadcast_targets_unsent
  ON broadcast_targets (broadcast_id, sent)
  WHERE sent = false;

-- バッチ取得用のDB関数（500件ずつ取得して sent=true に更新）
CREATE OR REPLACE FUNCTION claim_broadcast_batch(
  p_broadcast_id UUID,
  p_batch_size INT DEFAULT 500
)
RETURNS TABLE (line_user_id TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH batch AS (
    SELECT bt.id, bt.line_user_id
    FROM broadcast_targets bt
    WHERE bt.broadcast_id = p_broadcast_id
      AND bt.sent = false
    ORDER BY bt.id
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED  -- 並行実行時の競合回避
  )
  UPDATE broadcast_targets bt
  SET sent = true,
      sent_at = NOW()
  FROM batch
  WHERE bt.id = batch.id
  RETURNING bt.line_user_id;
END;
$$;
```

**対策2: レートリミッター**

```typescript
// lib/utils/rate-limiter.ts

/**
 * トークンバケット方式のレートリミッター
 * LINE Messaging API の制限: 100,000 リクエスト/分（プランによる）
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private maxTokens: number,     // バケット最大容量
    private refillRate: number,    // 秒あたりのリフィルレート
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  async acquire(count: number = 1): Promise<void> {
    this.refill();

    if (this.tokens >= count) {
      this.tokens -= count;
      return;
    }

    // トークン不足: 必要量が溜まるまで待機
    const waitTime = ((count - this.tokens) / this.refillRate) * 1000;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
    this.refill();
    this.tokens -= count;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}

// LINE API 用インスタンス
// multicast は1回で500人に送れるため、実効レートは高い
export const lineApiLimiter = new RateLimiter(
  100,   // 最大100リクエストまでバースト可能
  50     // 秒あたり50リクエストに制限
);
```

**対策3: DB コネクション管理**

```typescript
// Supavisor 接続プール経由のアクセスを徹底
// supabase/config.toml で接続プール設定

// 一斉配信時のDB負荷を軽減するための設計原則:
//
// 1. SELECT は broadcast_targets テーブルの claim_broadcast_batch 関数で
//    バッチ取得し、個別 SELECT を発行しない
//
// 2. UPDATE は WHERE ... IN (ids) でバッチ更新
//    個別 UPDATE を発行しない
//
// 3. INSERT (ログ系) はバッファリングしてバッチ INSERT
//    即時性不要のログは配列に溜めてまとめて挿入

export class BatchLogger {
  private buffer: Record<string, unknown>[] = [];

  constructor(
    private tableName: string,
    private flushSize: number = 100,
  ) {}

  add(record: Record<string, unknown>): void {
    this.buffer.push(record);
    if (this.buffer.length >= this.flushSize) {
      // fire-and-forget で flush（await しない）
      this.flush().catch(console.error);
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const records = [...this.buffer];
    this.buffer = [];

    await supabaseAdmin.from(this.tableName).insert(records);
  }
}
```

**対策4: 配信前のセグメント事前計算**

```sql
-- セグメント条件に基づく配信対象リストを事前に生成する Cron ジョブ
-- /api/cron/segment-update で6時間ごとに実行

-- 例: 「30日以内に購入し、かつ特定タグを持つ顧客」のセグメント
INSERT INTO broadcast_targets (broadcast_id, line_user_id, customer_id)
SELECT
  :broadcast_id,
  c.line_user_id,
  c.id
FROM customers c
JOIN customer_tags ct ON ct.customer_id = c.id
WHERE ct.tag = :target_tag
  AND c.last_purchase_at > NOW() - INTERVAL '30 days'
  AND c.line_user_id IS NOT NULL
  AND c.blocked = false
ON CONFLICT (broadcast_id, customer_id) DO NOTHING;
```

---

## 付録: 技術スタック一覧

| カテゴリ | 技術 | バージョン | 用途 |
|---|---|---|---|
| フレームワーク | Next.js | 15.x (App Router) | フロントエンド/API |
| ホスティング | Vercel | - | デプロイ・CDN |
| データベース | Supabase (PostgreSQL) | 15+ | データ永続化 |
| 認証 | Supabase Auth | - | ユーザー認証・セッション管理 |
| AI | Google Gemini API | 1.5 flash/pro | 応答生成・分析 |
| メッセージング | LINE Messaging API | v2 | メッセージ送受信 |
| フロントエンド(LINE) | LIFF SDK | 2.x | LINE内WebView |
| CI/CD | GitHub Actions | - | 自動テスト・デプロイ |
| テスト | Vitest | 2.x | ユニット・結合テスト |
| Linter | ESLint + Prettier | - | コード品質 |
| 言語 | TypeScript | 5.x | 型安全 |
| パッケージ管理 | npm | 10.x | 依存管理 |
