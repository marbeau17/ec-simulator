# 武居商店「AI搭載型 独自LINEマーケティングシステム」開発ロードマップとMVP定義

## 概要

| 項目 | 内容 |
|------|------|
| プロジェクト名 | 武居商店 AI搭載型 独自LINEマーケティングシステム |
| 技術スタック | Next.js 14 (App Router) / Vercel / Supabase / Gemini API / LINE Messaging API / LIFF |
| CI/CD | GitHub Actions → Vercel (Preview + Production) |
| 主要機能 | CRM、チャット（AI+有人）、イベント管理、予約、AIヒアリング、一斉配信、AIアナリスト |

---

## 1. MVP（Minimum Viable Product）定義

### 1.1 MVPに含める機能スコープ

MVPでは「LINE友だち追加 → AI対話 → 顧客情報蓄積 → 管理画面で確認」の一連のフローを最小限で動作させる。

| # | 機能 | MVPスコープ | 詳細 |
|---|------|------------|------|
| 1 | LINE Webhook受信 | **含む** | テキスト・フォロー・ポストバックイベントの受信・パース |
| 2 | LINE Login認証 | **含む** | LIFF経由のLINE Login → Supabase Auth連携、JWT発行 |
| 3 | ユーザー登録・CRM | **含む** | LINE UID自動登録、プロフィール取得、`customers`テーブルへの保存 |
| 4 | AIチャットボット | **含む** | Gemini APIによる自動応答（商品案内・FAQ応答）、会話履歴保存 |
| 5 | 有人チャット切替 | **含む** | `ESCALATE`判定による有人フラグ切替、管理画面からの返信 |
| 6 | 管理画面ダッシュボード | **含む** | 顧客一覧、チャット履歴閲覧、有人対応キュー |
| 7 | 基本的な一斉配信 | **含む** | 全ユーザーまたはタグベースの簡易セグメント配信 |
| 8 | CI/CDパイプライン | **含む** | GitHub Actions: lint → test → Preview Deploy → Production Deploy |

### 1.2 MVPに含めない機能（Phase 2以降）

| # | 機能 | 先送り理由 | 予定Phase |
|---|------|-----------|-----------|
| 1 | イベント管理CRUD | コアフロー確立を優先 | Phase 3 |
| 2 | 予約枠管理・LIFF予約UI | コアフロー確立を優先 | Phase 3 |
| 3 | AIヒアリング（構造化質問フロー） | AIチャット基盤の安定稼働後に実装 | Phase 3 |
| 4 | リマインド自動配信（Cron） | イベント・予約実装後に依存 | Phase 3 |
| 5 | 高度なセグメント配信 | 行動データ蓄積後に効果を発揮 | Phase 4 |
| 6 | AIアナリスト（ECコンサルティング） | 十分なデータ蓄積が前提 | Phase 4 |
| 7 | パフォーマンス最適化 | 本番トラフィック計測後に対応 | Phase 4 |
| 8 | RLS詳細ポリシー最適化 | MVP段階では基本ポリシーのみ | Phase 4 |

### 1.3 MVPの完了基準・受入条件

| # | 受入条件 | 検証方法 |
|---|---------|---------|
| AC-1 | LINEで友だち追加すると`customers`テーブルにレコードが作成される | LINE公式アカウントからフォロー → Supabase Dashboardで確認 |
| AC-2 | LINEでテキスト送信するとGemini APIによるAI応答が返る | 3パターン以上の質問で正常応答を確認 |
| AC-3 | AIが対応不能と判定した場合、有人チャットに自動切替される | 「人間と話したい」等のトリガー文言で有人フラグがONになる |
| AC-4 | 管理画面にログインし、顧客一覧・チャット履歴が閲覧できる | Supabase Auth管理者ロールでログイン → データ表示を確認 |
| AC-5 | 管理画面から有人返信を送ると、LINEユーザーにメッセージが届く | 管理画面で返信 → LINEアプリで受信確認 |
| AC-6 | 管理画面からタグ指定で一斉配信ができる | タグ付きユーザー群にメッセージ送信 → 全員の受信確認 |
| AC-7 | GitHub mainブランチへのマージで自動デプロイされる | PR作成 → マージ → Vercel本番反映を確認 |
| AC-8 | 主要APIのレスポンスタイムが3秒以内 | Vercel Functions Logで計測 |
| AC-9 | E2Eテスト（主要フロー3本以上）がCIで通過する | GitHub Actionsのテスト結果を確認 |

---

## 2. 開発フェーズ分け

### 全体スケジュール概要

```
Phase 1: 基盤構築         [Week 1-2]  ████░░░░░░░░░░░░
Phase 2: コアCRM+チャット   [Week 3-5]  ░░░░████████░░░░
Phase 3: イベント・予約等    [Week 6-8]  ░░░░░░░░░░██████
Phase 4: 配信・分析・最適化  [Week 9-11] ░░░░░░░░░░░░░░██████
受入テスト・本番移行        [Week 12]   ░░░░░░░░░░░░░░░░░░██
```

---

### Phase 1: 基盤構築（Week 1-2）

#### 1-1. Supabase プロジェクト・DB構築

| タスク | 詳細 | 完了条件 |
|--------|------|---------|
| Supabaseプロジェクト作成 | リージョン: `ap-northeast-1`（東京）、プラン: Free → 本番時Proへ移行 | ダッシュボードにアクセス可能 |
| マイグレーション基盤構築 | `supabase/migrations/` ディレクトリにSQLファイルを配置、`supabase db push`で適用 | `supabase db push` が成功する |
| 初期テーブル作成 | `customers`, `conversations`, `messages`, `tags`, `customer_tags`, `admin_users` | 全テーブルが作成され、RLSが有効 |
| RLS基本ポリシー設定 | 管理者ロール（`service_role`）は全操作可、匿名は読取不可 | RLSポリシーが適用され、匿名アクセスが拒否される |
| Storage Bucket作成 | `avatars`, `attachments` バケットを作成、10MB上限 | ファイルアップロード・取得が可能 |

**初期テーブル定義（抜粋）:**

```sql
-- customers テーブル
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_uid TEXT UNIQUE NOT NULL,
  display_name TEXT,
  picture_url TEXT,
  status_message TEXT,
  email TEXT,
  phone TEXT,
  memo TEXT,
  tags TEXT[] DEFAULT '{}',
  first_contact_at TIMESTAMPTZ DEFAULT now(),
  last_contact_at TIMESTAMPTZ DEFAULT now(),
  is_blocked BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- conversations テーブル
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'ai' CHECK (status IN ('ai', 'human', 'closed')),
  assigned_admin_id UUID REFERENCES admin_users(id),
  started_at TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- messages テーブル
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'ai', 'admin')),
  sender_id TEXT,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'sticker', 'flex', 'system')),
  line_message_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- admin_users テーブル
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'operator' CHECK (role IN ('owner', 'admin', 'operator')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- tags テーブル
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  color TEXT DEFAULT '#6B7280',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- customer_tags 中間テーブル
CREATE TABLE customer_tags (
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (customer_id, tag_id)
);
```

#### 1-2. Next.js プロジェクト初期化・Vercel設定

| タスク | 詳細 | 完了条件 |
|--------|------|---------|
| Next.js 14 App Router初期化 | `npx create-next-app@latest --typescript --tailwind --eslint --app --src-dir` | `npm run dev` で起動確認 |
| ディレクトリ構成策定 | 下記ディレクトリ構成に従い初期ファイルを配置 | 全ディレクトリが存在する |
| 環境変数設定 | `.env.local` + Vercel Environment Variables | ローカル・Vercel両方で環境変数が読める |
| Vercelプロジェクト連携 | GitHubリポジトリとVercelプロジェクトを接続 | pushでPreview Deployが動作する |
| Tailwind CSS + shadcn/ui導入 | `npx shadcn-ui@latest init`、基本コンポーネント追加 | UIコンポーネントが表示される |

**ディレクトリ構成:**

```
src/
├── app/
│   ├── (admin)/              # 管理画面（認証必須レイアウト）
│   │   ├── dashboard/
│   │   ├── customers/
│   │   ├── chat/
│   │   ├── broadcast/
│   │   ├── events/           # Phase 3
│   │   ├── reservations/     # Phase 3
│   │   └── analytics/        # Phase 4
│   ├── api/
│   │   ├── webhook/line/     # LINE Webhook エンドポイント
│   │   ├── chat/             # チャットAPI
│   │   ├── customers/        # 顧客API
│   │   ├── broadcast/        # 配信API
│   │   └── auth/             # 認証API
│   ├── liff/                 # LIFF用ページ
│   └── layout.tsx
├── components/
│   ├── ui/                   # shadcn/ui コンポーネント
│   ├── admin/                # 管理画面固有コンポーネント
│   └── liff/                 # LIFF固有コンポーネント
├── lib/
│   ├── supabase/
│   │   ├── client.ts         # ブラウザ用クライアント
│   │   ├── server.ts         # サーバー用クライアント
│   │   └── admin.ts          # service_role用クライアント
│   ├── line/
│   │   ├── client.ts         # LINE Messaging APIクライアント
│   │   ├── webhook.ts        # Webhook署名検証・パース
│   │   └── liff.ts           # LIFF SDK初期化
│   ├── gemini/
│   │   ├── client.ts         # Gemini APIクライアント
│   │   ├── prompts.ts        # システムプロンプト定義
│   │   └── chat.ts           # チャット処理ロジック
│   └── utils/
│       ├── date.ts
│       └── validation.ts
├── types/
│   ├── database.ts           # Supabase型定義（自動生成）
│   ├── line.ts               # LINE API型定義
│   └── index.ts
└── middleware.ts              # 認証ミドルウェア
```

**環境変数一覧:**

| 変数名 | 用途 | 設定先 |
|--------|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase APIエンドポイント | `.env.local` + Vercel |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase匿名キー | `.env.local` + Vercel |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase管理キー（サーバーのみ） | `.env.local` + Vercel |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging APIアクセストークン | `.env.local` + Vercel |
| `LINE_CHANNEL_SECRET` | LINE Webhook署名検証用シークレット | `.env.local` + Vercel |
| `NEXT_PUBLIC_LIFF_ID` | LIFF アプリID | `.env.local` + Vercel |
| `GEMINI_API_KEY` | Google Gemini APIキー | `.env.local` + Vercel |
| `NEXT_PUBLIC_APP_URL` | アプリケーションURL | `.env.local` + Vercel |
| `CRON_SECRET` | Cron Job認証シークレット（Phase 3） | Vercel |

#### 1-3. LINE Webhook受信基盤

| タスク | 詳細 | 完了条件 |
|--------|------|---------|
| Webhookエンドポイント実装 | `POST /api/webhook/line` → 署名検証 → イベント振り分け | LINE Developersコンソールで検証成功 |
| 署名検証ミドルウェア | `X-Line-Signature`ヘッダのHMAC-SHA256検証 | 不正署名で`401`、正常署名で`200`返却 |
| イベントルーター実装 | `follow`, `message`, `postback` イベントをハンドラに振り分け | 各イベントタイプが正しいハンドラに到達 |
| フォローイベント処理 | LINE UIDでcustomer作成/更新、プロフィール取得・保存 | 友だち追加でDBにレコード作成 |
| エラーハンドリング | Webhook処理失敗時もLINEに`200`を返す（再送防止） | エラー時もステータス200、ログにエラー記録 |

**Webhookエンドポイント実装イメージ:**

```typescript
// src/app/api/webhook/line/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifySignature, parseEvents } from '@/lib/line/webhook';
import { handleFollow } from './handlers/follow';
import { handleMessage } from './handlers/message';
import { handlePostback } from './handlers/postback';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('x-line-signature') ?? '';

  if (!verifySignature(body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const events = parseEvents(body);

  // 非同期で処理（LINEには即座に200を返す）
  const promises = events.map(async (event) => {
    try {
      switch (event.type) {
        case 'follow':
          return handleFollow(event);
        case 'message':
          return handleMessage(event);
        case 'postback':
          return handlePostback(event);
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      console.error(`Error handling event: ${event.type}`, error);
    }
  });

  // Vercel Functionsのタイムアウト前に処理完了を待つ
  await Promise.allSettled(promises);

  return NextResponse.json({ status: 'ok' });
}
```

#### 1-4. 認証基盤（LINE Login + Supabase Auth）

| タスク | 詳細 | 完了条件 |
|--------|------|---------|
| LIFF初期化モジュール | `liff.init()` → `liff.getProfile()` → Supabase Auth連携 | LIFFブラウザ内でプロフィール取得成功 |
| Supabase Auth設定 | メール+パスワード認証（管理者用）、カスタムJWT（LINEユーザー用） | 両方のログインフローが動作 |
| 管理画面認証ミドルウェア | `middleware.ts`で`/admin/*`へのアクセスにセッション検証 | 未認証で`/login`へリダイレクト |
| RBAC（ロール管理） | `admin_users.role`に基づくアクセス制御: `owner` > `admin` > `operator` | ロールごとに操作範囲が制限される |

**ロール権限マトリクス:**

| 機能 | owner | admin | operator |
|------|-------|-------|----------|
| 顧客一覧閲覧 | o | o | o |
| 顧客情報編集 | o | o | o |
| チャット対応 | o | o | o |
| 一斉配信作成・送信 | o | o | x |
| イベント管理 | o | o | x |
| 管理者アカウント管理 | o | x | x |
| システム設定変更 | o | x | x |

#### 1-5. CI/CDパイプライン構築

| タスク | 詳細 | 完了条件 |
|--------|------|---------|
| GitHub Actions Workflow作成 | `.github/workflows/ci.yml` | PRでワークフローが実行される |
| Lint + 型チェック | `eslint` + `tsc --noEmit` | エラー0で通過 |
| ユニットテスト | Vitest実行 | テスト通過 |
| E2Eテスト | Playwright（主要フロー） | テスト通過 |
| Preview Deploy | Vercel GitHub Integration（PR単位） | PRにPreview URLコメントが付く |
| Production Deploy | `main`マージ → Vercel Production | 自動デプロイ成功 |

**GitHub Actions Workflow:**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit

  unit-test:
    runs-on: ubuntu-latest
    needs: lint-and-type-check
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test

  e2e-test:
    runs-on: ubuntu-latest
    needs: unit-test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
    env:
      NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
```

---

### Phase 2: コアCRM + チャット（Week 3-5）

#### 2-1. ユーザー登録・LINE UID統合

| タスク | 詳細 | 完了条件 |
|--------|------|---------|
| フォローイベントハンドラ強化 | LINE Profile API呼び出し → `customers`テーブルへUPSERT | 再フォローで既存レコードが更新される |
| プロフィール同期バッチ | 定期的にLINE Profile APIで最新情報を取得（Phase 3でCron化） | 手動実行で全顧客のプロフィールが更新される |
| タグ管理機能 | タグCRUD API + 顧客へのタグ付け・解除 | 管理画面からタグ操作が可能 |
| 顧客検索・フィルタ | 名前・タグ・最終接触日でのフィルタリング | 管理画面で検索結果が正しく表示される |

#### 2-2. 管理画面ダッシュボード

| タスク | 詳細 | 完了条件 |
|--------|------|---------|
| レイアウト・ナビゲーション | サイドバー + ヘッダー + メインコンテンツ領域 | 全ページで共通レイアウト適用 |
| ダッシュボードトップ | KPI表示: 総顧客数、本日メッセージ数、未対応チャット数、今月配信数 | リアルタイムデータが表示される |
| 顧客一覧ページ | テーブル表示、ページネーション、検索、タグフィルタ | 100件以上の顧客でも問題なく動作 |
| 顧客詳細ページ | プロフィール、タグ、チャット履歴、メモ編集 | 全情報が正しく表示・編集可能 |

**KPIカード コンポーネント仕様:**

```typescript
// src/components/admin/KpiCard.tsx
interface KpiCardProps {
  title: string;          // "総顧客数"
  value: number;          // 1234
  change?: number;        // 前日比: +12
  changeLabel?: string;   // "昨日比"
  icon: React.ReactNode;
}
```

#### 2-3. AIチャットボット基本機能

| タスク | 詳細 | 完了条件 |
|--------|------|---------|
| Gemini APIクライアント実装 | `gemini-2.0-flash` モデル使用、ストリーミング無効（LINE応答用） | API呼び出しでテキスト応答が返る |
| システムプロンプト設計 | 武居商店のコンテキスト・応答ルール・エスカレーション判定ルールを定義 | 想定シナリオで適切な応答が生成される |
| 会話コンテキスト管理 | 直近10メッセージを会話履歴としてGemini APIに送信 | 文脈を踏まえた応答ができる |
| メッセージ保存 | 顧客メッセージ・AI応答を`messages`テーブルに保存 | チャット履歴が完全に記録される |
| エスカレーション判定 | Geminiの応答に`[ESCALATE]`タグが含まれる場合、有人切替 | トリガー条件で自動切替される |
| LINE応答送信 | Gemini応答をLINE Reply APIで送信（1000文字以内に分割） | LINEアプリで応答を確認 |

**システムプロンプト設計方針:**

```typescript
// src/lib/gemini/prompts.ts
export const SYSTEM_PROMPT = `
あなたは「武居商店」のAIアシスタントです。

## 役割
- お客様からの商品に関するお問い合わせに丁寧に回答します
- 在庫状況、営業時間、配送に関する基本情報を案内します
- 複雑な要望やクレーム対応は人間のスタッフに引き継ぎます

## 応答ルール
- 常に敬語で、親しみやすい口調で応答してください
- 回答は200文字以内を目安にしてください
- 不明な点は正直に「確認いたします」と伝えてください
- 価格の断言は避け、概算として案内してください

## エスカレーション条件
以下の場合、応答の先頭に [ESCALATE] タグを付けてください:
- クレームや強い不満の表明
- 返品・返金の要望
- 個別の注文状況の問い合わせ
- 「人間と話したい」「スタッフに代わって」等の明示的要望
- AIでは適切に回答できないと判断した場合

## 店舗情報
（武居商店の基本情報をここに記載）
`;
```

#### 2-4. 有人チャット切替

| タスク | 詳細 | 完了条件 |
|--------|------|---------|
| 会話ステータス管理 | `conversations.status`: `ai` → `human` → `closed` の遷移 | ステータス遷移が正しく動作 |
| 有人切替トリガー | AI応答内`[ESCALATE]`検出 or 管理者手動切替 | 両方のトリガーで切替成功 |
| 管理画面チャットUI | リアルタイム受信（Supabase Realtime）、返信フォーム | メッセージ送受信がリアルタイム反映 |
| 通知機能 | 有人切替発生時、管理画面にブラウザ通知 | Push通知が表示される |
| AI復帰 | 管理者が会話をクローズ → 次回メッセージからAI対応に戻る | クローズ後の新規メッセージがAI処理される |

**チャットUI リアルタイム接続:**

```typescript
// src/lib/supabase/realtime.ts
import { createClient } from '@/lib/supabase/client';

export function subscribeToMessages(conversationId: string, callback: (message: Message) => void) {
  const supabase = createClient();

  return supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => callback(payload.new as Message)
    )
    .subscribe();
}
```

---

### Phase 3: イベント・予約・ヒアリング（Week 6-8）

#### 3-1. イベント管理CRUD + LIFF

| タスク | 詳細 | 完了条件 |
|--------|------|---------|
| `events`テーブル作成 | id, title, description, date, location, capacity, status, image_url, created_at | マイグレーション適用成功 |
| `event_participants`テーブル作成 | event_id, customer_id, status(registered/attended/cancelled), registered_at | マイグレーション適用成功 |
| イベントCRUD API | `GET/POST/PUT/DELETE /api/events` | 全CRUD操作が正常動作 |
| 管理画面イベント管理ページ | 一覧、作成フォーム、編集、参加者一覧 | 全操作が管理画面から可能 |
| LIFFイベント詳細ページ | `/liff/events/[id]` → イベント情報表示 + 参加申込ボタン | LINEアプリ内ブラウザで表示・申込動作 |
| 参加申込処理 | LIFF内でボタン押下 → `event_participants`にINSERT → LINE確認メッセージ送信 | 申込完了後にLINE通知が届く |

**イベントテーブル定義:**

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  location TEXT,
  capacity INTEGER,
  current_participants INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed', 'cancelled')),
  image_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'attended', 'cancelled')),
  registered_at TIMESTAMPTZ DEFAULT now(),
  cancelled_at TIMESTAMPTZ,
  UNIQUE (event_id, customer_id)
);
```

#### 3-2. 予約枠管理 + LIFF予約UI

| タスク | 詳細 | 完了条件 |
|--------|------|---------|
| `reservation_slots`テーブル作成 | id, date, start_time, end_time, capacity, booked_count | マイグレーション適用成功 |
| `reservations`テーブル作成 | id, slot_id, customer_id, status, memo | マイグレーション適用成功 |
| 予約枠CRUD API | 管理者が日時・定員を設定 | 枠の作成・編集・削除が動作 |
| LIFF予約カレンダーUI | `/liff/reservations` → カレンダー表示 → 空き枠選択 → 予約確定 | LINEアプリ内で予約フロー完了 |
| 予約確定処理 | 楽観的ロック（`booked_count < capacity`チェック）→ INSERT → LINE確認メッセージ | 同時予約でもオーバーブッキングしない |
| 予約キャンセル処理 | LIFF内からキャンセル → `booked_count`デクリメント → LINE通知 | キャンセル後に枠が解放される |

**予約テーブル定義:**

```sql
CREATE TABLE reservation_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 1,
  booked_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID REFERENCES reservation_slots(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  cancelled_at TIMESTAMPTZ,
  UNIQUE (slot_id, customer_id)
);
```

**楽観的ロックによる予約処理:**

```sql
-- 予約確定（アトミック操作）
UPDATE reservation_slots
SET booked_count = booked_count + 1
WHERE id = $1
  AND booked_count < capacity
  AND is_active = TRUE
RETURNING *;
-- RETURNING が空の場合 → 満席エラーを返す
```

#### 3-3. AIヒアリング機能

| タスク | 詳細 | 完了条件 |
|--------|------|---------|
| ヒアリングフロー定義 | 質問テンプレート（JSONB）→ Geminiが文脈に応じて質問 | 定義された質問項目を自然な対話で収集 |
| `hearing_sessions`テーブル | session_id, customer_id, template_id, status, answers(JSONB) | マイグレーション適用成功 |
| ヒアリング開始トリガー | Postbackイベント or 管理者発動 or 特定キーワード | 3種類のトリガーで開始可能 |
| 回答構造化・保存 | Geminiが自由回答を構造化JSONに変換 → DB保存 | 回答データがJSON形式で保存される |
| 管理画面ヒアリング結果表示 | 顧客詳細内にヒアリング回答一覧を表示 | 構造化された回答が閲覧可能 |

**ヒアリングテンプレート例:**

```json
{
  "template_id": "new_customer_survey",
  "title": "新規顧客アンケート",
  "questions": [
    {
      "key": "purchase_purpose",
      "question": "今回のお買い物の目的を教えてください",
      "type": "free_text",
      "required": true
    },
    {
      "key": "discovery_channel",
      "question": "当店をどこでお知りになりましたか",
      "type": "single_choice",
      "options": ["Instagram", "友人紹介", "検索", "その他"],
      "required": true
    },
    {
      "key": "preferred_contact",
      "question": "ご連絡の希望時間帯はありますか",
      "type": "free_text",
      "required": false
    }
  ]
}
```

#### 3-4. リマインド自動配信

| タスク | 詳細 | 完了条件 |
|--------|------|---------|
| Vercel Cron Job設定 | `vercel.json`にcron定義: 毎朝9:00 JST | Cronが定刻に実行される |
| リマインド対象抽出 | イベント前日・予約前日の参加者/予約者を抽出 | 対象者リストが正しく生成される |
| LINE Push Message送信 | 対象者にリマインドメッセージ（Flex Message）を送信 | 前日にリマインドが届く |
| 配信ログ記録 | `broadcast_logs`テーブルに送信結果を記録 | 成功/失敗が記録される |

**Vercel Cron設定:**

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "0 0 * * *"
    }
  ]
}
```

```typescript
// src/app/api/cron/reminders/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Cron認証
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 明日のイベント参加者を取得
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  // リマインド送信処理...

  return NextResponse.json({ status: 'ok', sent: count });
}
```

---

### Phase 4: 配信・分析・最適化（Week 9-11）

#### 4-1. セグメント配信

| タスク | 詳細 | 完了条件 |
|--------|------|---------|
| `broadcasts`テーブル作成 | id, title, content, segment_conditions(JSONB), status, sent_count, scheduled_at | マイグレーション適用成功 |
| `broadcast_logs`テーブル作成 | broadcast_id, customer_id, status, sent_at, error_message | マイグレーション適用成功 |
| セグメント条件ビルダーUI | タグ・最終購入日・メッセージ回数等の条件をAND/ORで組み合わせ | 条件設定UIが動作する |
| 配信プレビュー | 条件に該当する顧客数・リストをプレビュー表示 | 対象者数が正しく表示される |
| 配信実行エンジン | LINE Multicast API（最大500件/リクエスト）でバッチ送信 | 大量配信が分割送信される |
| 配信スケジュール | 即時 or 日時指定配信 | 指定日時に配信が実行される |
| Flex Messageテンプレート | 画像+テキスト+ボタンのテンプレート5種 | テンプレート選択で送信可能 |

**セグメント条件スキーマ:**

```typescript
interface SegmentCondition {
  operator: 'AND' | 'OR';
  conditions: Array<{
    field: 'tags' | 'last_contact_days' | 'message_count' | 'created_days';
    comparator: 'includes' | 'excludes' | 'gt' | 'lt' | 'eq';
    value: string | number;
  }>;
}

// 例: 「VIPタグ付き」かつ「30日以内に接触あり」
const example: SegmentCondition = {
  operator: 'AND',
  conditions: [
    { field: 'tags', comparator: 'includes', value: 'VIP' },
    { field: 'last_contact_days', comparator: 'lt', value: 30 },
  ],
};
```

#### 4-2. AIアナリスト（ECコンサルティング）

| タスク | 詳細 | 完了条件 |
|--------|------|---------|
| 分析ダッシュボード | 顧客増減推移、メッセージ量推移、配信効果グラフ | グラフが正しく描画される |
| AIインサイト生成 | 蓄積データをGemini APIに投入 → 売上向上施策をテキスト生成 | 具体的なアクション提案が生成される |
| レポート自動生成 | 週次/月次レポートを自動生成 → 管理者にLINE通知 | レポートが定期生成・通知される |
| 顧客セグメント自動提案 | Geminiが行動パターンから最適なセグメントを提案 | 提案されたセグメントが妥当 |

**AIアナリスト プロンプト設計:**

```typescript
export const ANALYST_PROMPT = `
あなたはECマーケティングの専門アナリストです。
以下のデータを分析し、武居商店の売上向上に直結する具体的な施策を提案してください。

## 分析データ
{{data}}

## 出力フォーマット
1. 現状サマリー（3行以内）
2. 注目すべきトレンド（2-3点）
3. 推奨アクション（優先度付き、3-5点）
4. 来週実施すべきこと（1点に絞る）

## 制約
- 実行可能性が高い施策のみ提案
- 数値目標を可能な限り含める
- 武居商店の規模感（個人商店）を考慮する
`;
```

#### 4-3. パフォーマンス最適化

| タスク | 詳細 | 完了条件 |
|--------|------|---------|
| DBインデックス最適化 | 頻用クエリに対するインデックス追加 | Slow Query Logがゼロになる |
| APIレスポンスキャッシュ | `unstable_cache` or ISRによる静的データキャッシュ | 応答時間が50%改善 |
| 画像最適化 | Next.js `Image`コンポーネント + Vercel Image Optimization | LCP 2.5秒以内 |
| バンドルサイズ最適化 | Dynamic Import、Tree Shaking確認 | First Load JS < 100kB |
| Supabase接続プーリング | Transaction mode設定 | 同時接続数超過エラーが発生しない |

**推奨インデックス:**

```sql
CREATE INDEX idx_customers_line_uid ON customers(line_uid);
CREATE INDEX idx_customers_last_contact ON customers(last_contact_at DESC);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_conversations_customer_id ON conversations(customer_id);
CREATE INDEX idx_conversations_status ON conversations(status) WHERE status = 'human';
CREATE INDEX idx_event_participants_event ON event_participants(event_id);
CREATE INDEX idx_reservations_slot ON reservations(slot_id) WHERE status = 'confirmed';
CREATE INDEX idx_broadcast_logs_broadcast ON broadcast_logs(broadcast_id);
```

#### 4-4. 本番運用準備

| タスク | 詳細 | 完了条件 |
|--------|------|---------|
| Supabase Proプランへ移行 | 本番用プロジェクト作成、データ移行 | Proプランで稼働 |
| カスタムドメイン設定 | Vercelでドメイン設定 + SSL | HTTPSでアクセス可能 |
| 環境変数本番値設定 | 全環境変数をVercel Production環境に設定 | 本番デプロイが正常動作 |
| LINE公式アカウント本番設定 | Webhook URL本番切替、リッチメニュー設定 | 本番アカウントで全機能動作 |
| ロードテスト | 同時100ユーザー想定でk6テスト | P95レスポンス < 3秒 |
| セキュリティチェック | 依存パッケージ脆弱性スキャン、RLSポリシー再確認 | Critical脆弱性ゼロ |

---

## 3. 各フェーズの成果物・マイルストーン

### デリバラブル一覧

| Phase | 成果物 | 形式 | 確認者 |
|-------|--------|------|--------|
| **Phase 1** | Supabase初期スキーマ | SQLマイグレーションファイル | 開発リード |
| | Next.jsプロジェクト（ビルド通過） | GitHubリポジトリ | 開発リード |
| | LINE Webhook受信成功ログ | Vercel Functions Log | 開発リード |
| | CI/CDパイプライン動作確認 | GitHub Actions実行結果 | 開発リード |
| | 認証フロー動作確認 | 画面キャプチャ | プロジェクトオーナー |
| **Phase 2** | 管理画面ダッシュボード | Vercel Preview URL | プロジェクトオーナー |
| | AIチャットボット動作 | LINEでの対話デモ | プロジェクトオーナー |
| | 有人チャット切替動作 | デモ動画 | プロジェクトオーナー |
| | 顧客管理機能 | 管理画面操作デモ | プロジェクトオーナー |
| **Phase 3** | イベント管理機能 | 管理画面 + LIFFデモ | プロジェクトオーナー |
| | 予約管理機能 | 管理画面 + LIFFデモ | プロジェクトオーナー |
| | AIヒアリング機能 | LINEでの対話デモ | プロジェクトオーナー |
| | リマインド自動配信 | Cron実行ログ | 開発リード |
| **Phase 4** | セグメント配信機能 | 管理画面デモ | プロジェクトオーナー |
| | AIアナリスト機能 | レポートサンプル | プロジェクトオーナー |
| | 本番環境 | 本番URL | プロジェクトオーナー |
| | 運用マニュアル | ドキュメント | プロジェクトオーナー |

### テスト計画概要

| テスト種別 | 対象Phase | ツール | 対象範囲 |
|-----------|----------|-------|---------|
| ユニットテスト | Phase 1〜 | Vitest | ユーティリティ関数、APIロジック、Webhook処理 |
| コンポーネントテスト | Phase 2〜 | Vitest + Testing Library | UIコンポーネント単体 |
| 統合テスト | Phase 2〜 | Vitest | API → DB → レスポンスの一連フロー |
| E2Eテスト | Phase 2〜 | Playwright | 主要ユーザーフロー（ログイン、チャット、配信） |
| 負荷テスト | Phase 4 | k6 | Webhook受信、API応答速度 |
| セキュリティテスト | Phase 4 | npm audit + 手動確認 | 依存パッケージ、RLS、認証 |

**E2Eテストシナリオ（MVP最低限）:**

| # | シナリオ | 検証内容 |
|---|---------|---------|
| E2E-1 | 管理者ログイン → ダッシュボード表示 | 認証フロー、KPIデータ表示 |
| E2E-2 | 顧客一覧 → 詳細 → チャット履歴確認 | CRM基本操作 |
| E2E-3 | 有人チャット返信 → メッセージ表示 | リアルタイムメッセージング |
| E2E-4 | 一斉配信作成 → プレビュー → 送信 | 配信フロー |

---

## 4. 技術的リスクと対策一覧

| # | リスク | 影響度 | 発生確率 | 対策 |
|---|-------|-------|---------|------|
| R-1 | LINE Messaging API レート制限（無料: 200通/月、ライト: 5,000通/月） | **高** | 高 | MVPではライトプラン契約。配信数をダッシュボードで監視。月間配信数制限ロジックを実装 |
| R-2 | Gemini API レスポンス遅延（>5秒） | **高** | 中 | タイムアウト3秒設定。タイムアウト時は定型文で応答し、後続処理をバックグラウンドで実行 |
| R-3 | Gemini API の不適切な応答生成 | **高** | 中 | Safety Settings設定（BLOCK_MEDIUM_AND_ABOVE）。応答のバリデーション層を追加。NGワードフィルター実装 |
| R-4 | Supabase Free プランの制限（500MB DB、1GB Storage） | **中** | 中 | 本番移行前にProプランへ。画像はWebP変換で容量削減。古いログの定期アーカイブ |
| R-5 | Vercel Serverless Functions タイムアウト（Hobby: 10秒、Pro: 60秒） | **高** | 中 | Webhook処理は軽量化（重い処理はバックグラウンド化）。Pro プラン利用 |
| R-6 | LINE Webhook 再送による二重処理 | **中** | 高 | `line_message_id`によるべき等性（冪等性）チェック。処理済みメッセージIDをキャッシュ |
| R-7 | Supabase Realtime 接続数制限（Free: 200同時接続） | **低** | 低 | 管理画面のみRealtime使用のため問題なし。スケール時はProプランで対応 |
| R-8 | LIFF SDK バージョン非互換 | **中** | 低 | LIFF SDKバージョンを固定（`@line/liff@2.24.x`）。LINE Developersの更新情報を定期確認 |
| R-9 | Supabase認証トークン期限切れによるセッション断絶 | **中** | 中 | `supabase.auth.onAuthStateChange`でトークンリフレッシュ。有効期限切れ時の再ログイン誘導UI |
| R-10 | 本番データの誤削除・破損 | **高** | 低 | Supabase Point-in-Time Recovery有効化（Proプラン）。日次バックアップCron実装。CASCADE DELETE制限 |
| R-11 | 予約の同時アクセスによるオーバーブッキング | **高** | 中 | PostgreSQL行レベルロック（`SELECT FOR UPDATE`）と楽観的ロック（`booked_count < capacity`）の併用 |
| R-12 | GitHub ActionsシークレットのVercel環境変数との不整合 | **低** | 中 | 環境変数一覧をドキュメント管理。CI/CDでの環境変数バリデーションステップ追加 |

---

## 5. 運用・保守計画

### 5.1 監視項目

| 監視対象 | ツール | 監視項目 | 確認頻度 |
|---------|--------|---------|---------|
| Webアプリケーション | Vercel Analytics | レスポンスタイム、エラーレート、Core Web Vitals | 日次 |
| Serverless Functions | Vercel Functions Log | 実行時間、エラー数、タイムアウト数 | 日次 |
| データベース | Supabase Dashboard | DB容量、接続数、Slow Query | 週次 |
| Realtime | Supabase Dashboard | 同時接続数、メッセージスループット | 週次 |
| LINE API | カスタムダッシュボード | 配信数/残数、Webhook成功率、APIエラー数 | 日次 |
| Gemini API | カスタムダッシュボード | リクエスト数、平均レスポンスタイム、エラー率 | 日次 |
| CI/CD | GitHub Actions | ビルド成功率、テスト通過率、デプロイ時間 | PR毎 |

### 5.2 アラート設定

| アラート条件 | 重要度 | 通知先 | 通知方法 |
|-------------|-------|--------|---------|
| Vercel Functions エラーレート > 5% | **Critical** | 開発チーム全員 | Vercel Integration → Slack |
| API レスポンスタイム P95 > 5秒 | **Warning** | 開発リード | Vercel Integration → Slack |
| Supabase DB容量 > 80% | **Warning** | 開発リード | Supabase Alert → Email |
| LINE API 月間配信数 > 80% | **Warning** | プロジェクトオーナー + 開発リード | カスタムCron → LINE通知 |
| Gemini API エラー率 > 10% | **Critical** | 開発チーム全員 | カスタム監視 → Slack |
| Webhook処理失敗が5分間で10件以上 | **Critical** | 開発チーム全員 | カスタムログ監視 → Slack |
| 未対応有人チャットが30分以上放置 | **Warning** | オペレーター全員 | 管理画面ブラウザ通知 + LINE通知 |

### 5.3 バックアップ戦略

| 対象 | 方法 | 頻度 | 保持期間 | 復元手順 |
|------|------|------|---------|---------|
| Supabase DB | Point-in-Time Recovery（Proプラン） | 継続的 | 7日間 | Supabase Dashboard → Restore |
| Supabase DB | `pg_dump`による論理バックアップ（Cron Job） | 日次 03:00 JST | 30日間 | `pg_restore`で復元 |
| Supabase Storage | Storage APIでファイル一覧取得 → 外部Storage同期 | 週次 | 90日間 | Storage APIでアップロード |
| 環境変数 | 暗号化してGitHub Secretsに二重管理 | 変更時 | 無期限 | GitHub Secrets → Vercel再設定 |
| ソースコード | Git（GitHub） | コミット毎 | 無期限 | `git clone` |

**日次バックアップCron:**

```typescript
// src/app/api/cron/backup/route.ts
// Vercel Cron: 毎日 18:00 UTC (03:00 JST)
export async function GET(req: NextRequest) {
  // 1. 認証チェック
  // 2. Supabase管理APIで論理バックアップ取得
  // 3. バックアップファイルをSupabase Storageの専用バケットに保存
  // 4. 30日以前のバックアップを削除
  // 5. 結果ログを記録
}
```

### 5.4 スケーリング計画

| フェーズ | 想定ユーザー数 | Supabaseプラン | Vercelプラン | LINE APIプラン | 月額概算 |
|---------|-------------|---------------|-------------|---------------|---------|
| MVP・検証期 | 〜100人 | Free | Hobby | 無料（200通） | $0 |
| 初期運用 | 100〜500人 | Pro ($25) | Pro ($20) | ライト（5,000通） | $45 + LINE費用 |
| 成長期 | 500〜2,000人 | Pro ($25) | Pro ($20) | スタンダード（30,000通） | $45 + LINE費用 |
| 拡大期 | 2,000人〜 | Team ($599) | Enterprise | スタンダード+ | 要見積 |

**スケーリング時の技術対応:**

| ユーザー規模 | 技術対応 |
|------------|---------|
| 500人超 | Supabase接続プーリング（Transaction mode）有効化 |
| 1,000人超 | 配信処理のキューイング（Vercel KV or Supabase Edge Functions） |
| 2,000人超 | Supabase Read Replica追加、CDN最適化 |
| 5,000人超 | Vercel Edge Runtime移行検討、DBシャーディング検討 |

### 5.5 定期メンテナンス作業

| 作業 | 頻度 | 担当 | 手順 |
|------|------|------|------|
| 依存パッケージ更新 | 月次 | 開発リード | `npm outdated` → `npm update` → テスト → デプロイ |
| セキュリティ脆弱性スキャン | 週次 | CI自動 | `npm audit` → Critical/Highは即時対応 |
| 不要データクリーンアップ | 月次 | 自動Cron | 90日以上前のクローズ済み会話ログをアーカイブ |
| Supabase DBメンテナンス | 月次 | 開発リード | `VACUUM ANALYZE`実行、インデックス再構築 |
| LINE公式アカウント設定確認 | 月次 | プロジェクトオーナー | Webhook URL、リッチメニュー、自動応答設定の確認 |
| バックアップ復元テスト | 四半期 | 開発リード | ステージング環境でバックアップからの復元を実施 |
