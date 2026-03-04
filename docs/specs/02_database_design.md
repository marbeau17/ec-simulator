# データベース設計書

**プロジェクト**: 武居商店「AI搭載型 独自LINEマーケティングシステム」
**バージョン**: 1.0
**最終更新**: 2026-03-04
**基盤**: Supabase (PostgreSQL 15+) / pgcrypto拡張 / RLS有効

---

## 目次

1. [テーブル一覧と関連図](#1-テーブル一覧と関連図)
2. [各テーブルスキーマ定義](#2-各テーブルスキーマ定義)
3. [暗号化設計](#3-暗号化設計)
4. [RLS（Row Level Security）ポリシー設計](#4-rlsrow-level-securityポリシー設計)
5. [インデックス設計](#5-インデックス設計)

---

## 1. テーブル一覧と関連図

### 1.1 テーブル一覧

| # | テーブル名 | 概要 | レコード規模目安 |
|---|-----------|------|----------------|
| 1 | `users` | LINE連携ユーザー（PII暗号化） | ~10,000 |
| 2 | `user_tags` | AIによるユーザータグ付け | ~50,000 |
| 3 | `conversations` | チャットセッション管理 | ~30,000 |
| 4 | `messages` | 個別メッセージ本文 | ~500,000 |
| 5 | `events` | イベント・セミナー管理 | ~500 |
| 6 | `event_registrations` | イベント参加申込 | ~5,000 |
| 7 | `reservation_slots` | 個別相談予約枠カレンダー | ~10,000 |
| 8 | `reservations` | 個別相談予約 | ~3,000 |
| 9 | `ai_hearings` | AIヒアリング結果 | ~10,000 |
| 10 | `broadcast_jobs` | 一斉配信ジョブ | ~2,000 |
| 11 | `broadcast_logs` | 配信ログ（送信先別） | ~500,000 |
| 12 | `ec_insights` | AIアナリスト分析結果 | ~5,000 |
| 13 | `audit_logs` | 操作監査ログ | ~1,000,000 |

### 1.2 ER図（テキスト表現）

```
users (1)─────(N) user_tags
  │
  ├──(1)─────(N) conversations (1)─────(N) messages
  │
  ├──(1)─────(N) event_registrations (N)─────(1) events
  │
  ├──(1)─────(N) reservations (N)─────(1) reservation_slots
  │
  ├──(1)─────(N) ai_hearings
  │
  ├──(1)─────(N) broadcast_logs (N)─────(1) broadcast_jobs
  │
  └──(1)─────(N) audit_logs

events (1)─────(N) reservation_slots

ec_insights ─────(FK) users (nullable: 全体分析の場合)
```

### 1.3 関連図詳細

```
┌─────────────┐       ┌──────────────┐
│   users     │1────N│  user_tags   │
│             │       └──────────────┘
│  PK: id     │
│  UQ: line_uid│      ┌──────────────┐      ┌──────────────┐
│             │1────N│conversations │1────N│  messages    │
│             │       └──────────────┘      └──────────────┘
│             │
│             │       ┌──────────────┐      ┌──────────────┐
│             │1────N│event_        │N────1│   events     │
│             │       │registrations│       │              │
│             │       └──────────────┘      │              │1──┐
│             │                             └──────────────┘   │
│             │       ┌──────────────┐      ┌──────────────┐   │
│             │1────N│ reservations │N────1│reservation_  │N──┘
│             │       └──────────────┘      │   slots      │
│             │                             └──────────────┘
│             │       ┌──────────────┐
│             │1────N│ ai_hearings  │
│             │       └──────────────┘
│             │
│             │       ┌──────────────┐      ┌──────────────┐
│             │1────N│broadcast_logs│N────1│broadcast_jobs│
│             │       └──────────────┘      └──────────────┘
│             │
│             │       ┌──────────────┐
│             │0..1──N│ ec_insights  │
│             │       └──────────────┘
│             │
│             │       ┌──────────────┐
│             │1────N│ audit_logs   │
└─────────────┘       └──────────────┘
```

---

## 2. 各テーブルスキーマ定義

### 2.0 前提：拡張の有効化

```sql
-- 必須拡張
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Supabase Vault（暗号化キー管理用）
-- Supabase Dashboardから有効化、またはSQL:
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
```

### 2.1 users（ユーザー）

LINE UIDを軸にした統合ユーザーテーブル。個人情報（PII）カラムはpgcryptoで暗号化して格納する。

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    line_uid        TEXT NOT NULL UNIQUE,
    line_display_name TEXT,                    -- LINEプロフィール名（平文）
    name_encrypted  BYTEA,                     -- 氏名（暗号化）
    email_encrypted BYTEA,                     -- メールアドレス（暗号化）
    phone_encrypted BYTEA,                     -- 電話番号（暗号化）
    address_encrypted BYTEA,                   -- 住所（暗号化）
    postal_code_encrypted BYTEA,               -- 郵便番号（暗号化）
    date_of_birth   DATE,                      -- 生年月日（任意取得）
    gender          TEXT CHECK (gender IN ('male', 'female', 'other', 'undisclosed')),
    membership_tier TEXT NOT NULL DEFAULT 'free'
                    CHECK (membership_tier IN ('free', 'light', 'standard', 'premium')),
    ai_persona_summary TEXT,                   -- AI生成の顧客要約
    line_follow_status TEXT NOT NULL DEFAULT 'following'
                    CHECK (line_follow_status IN ('following', 'blocked', 'unfollowed')),
    last_interaction_at TIMESTAMPTZ,           -- 最終やり取り日時
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE users IS 'LINE連携ユーザーマスタ。PIIカラムはpgcrypto AES256で暗号化';
COMMENT ON COLUMN users.line_uid IS 'LINE Messaging APIのユーザーID（U+32桁hex）';
COMMENT ON COLUMN users.name_encrypted IS 'pgp_sym_encrypt()で暗号化された氏名';
COMMENT ON COLUMN users.ai_persona_summary IS 'AIが会話履歴から生成した顧客プロフィール要約';
```

### 2.2 user_tags（ユーザータグ）

AIが会話内容から自動付与するタグ、および管理者が手動付与するタグを管理する。

```sql
CREATE TABLE user_tags (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tag_name    TEXT NOT NULL,                -- タグ名（例: 'リフォーム興味', '高予算'）
    tag_category TEXT NOT NULL DEFAULT 'ai_generated'
                CHECK (tag_category IN ('ai_generated', 'manual', 'system')),
    confidence  NUMERIC(3,2) CHECK (confidence >= 0 AND confidence <= 1),
                                              -- AI付与時の確信度 0.00〜1.00
    source      TEXT,                         -- タグ付与元（例: 'hearing_session_xxx'）
    expires_at  TIMESTAMPTZ,                  -- タグ有効期限（NULL=無期限）
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, tag_name)                 -- 同一ユーザーに同名タグは重複不可
);

COMMENT ON TABLE user_tags IS 'AIまたは管理者が付与するユーザー属性タグ';
COMMENT ON COLUMN user_tags.confidence IS 'AI付与時の確信度。手動付与時はNULL';
```

### 2.3 conversations（チャットセッション）

LINEチャットのセッション（会話スレッド）管理。一定時間無操作でセッションを区切る。

```sql
CREATE TABLE conversations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel         TEXT NOT NULL DEFAULT 'line'
                    CHECK (channel IN ('line', 'web', 'admin')),
    status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'closed', 'escalated')),
    escalated_to    TEXT,                      -- エスカレーション先（管理者名等）
    ai_summary      TEXT,                      -- AIによる会話要約
    session_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    session_ended_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE conversations IS 'チャットセッション管理。セッション単位で会話を区切る';
```

### 2.4 messages（メッセージ）

各会話セッション内の個別メッセージを格納する。

```sql
CREATE TABLE messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_type     TEXT NOT NULL
                    CHECK (sender_type IN ('user', 'ai', 'admin')),
    sender_id       TEXT,                      -- user: line_uid, admin: admin_email, ai: 'system'
    message_type    TEXT NOT NULL DEFAULT 'text'
                    CHECK (message_type IN ('text', 'image', 'sticker', 'location',
                                            'template', 'flex', 'rich_menu_action')),
    content         TEXT,                      -- テキストメッセージ本文
    media_url       TEXT,                      -- 画像等のURL（Supabase Storage）
    metadata        JSONB DEFAULT '{}'::jsonb, -- LINE固有情報（stickerId等）
    line_message_id TEXT,                      -- LINE Messaging APIのメッセージID
    tokens_used     INTEGER,                   -- AI応答時のトークン消費量
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE messages IS '個別メッセージ。conversation_idでセッションに紐付く';
COMMENT ON COLUMN messages.tokens_used IS 'AI応答時のLLMトークン消費量。コスト計算用';
```

### 2.5 events（イベント管理）

セミナー、見学会、相談会などのイベントを管理する。

```sql
CREATE TABLE events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           TEXT NOT NULL,
    description     TEXT,
    event_type      TEXT NOT NULL
                    CHECK (event_type IN ('seminar', 'tour', 'consultation',
                                          'workshop', 'campaign', 'other')),
    location        TEXT,                      -- 開催場所
    location_url    TEXT,                      -- Google Maps URL等
    start_at        TIMESTAMPTZ NOT NULL,
    end_at          TIMESTAMPTZ NOT NULL,
    capacity        INTEGER,                   -- 定員（NULL=無制限）
    registration_deadline TIMESTAMPTZ,         -- 申込締切
    image_url       TEXT,                      -- イベント画像URL
    flex_message_json JSONB,                   -- LINE Flex Message用JSON
    status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
    notify_before_hours INTEGER DEFAULT 24,    -- リマインド通知（イベントN時間前）
    created_by      TEXT,                      -- 作成者（admin email）
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE events IS 'セミナー・見学会等のイベントマスタ';
COMMENT ON COLUMN events.flex_message_json IS 'LINE配信用Flex Messageテンプレート';
```

### 2.6 event_registrations（イベント参加申込）

```sql
CREATE TABLE event_registrations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status          TEXT NOT NULL DEFAULT 'registered'
                    CHECK (status IN ('registered', 'waitlisted', 'cancelled', 'attended', 'no_show')),
    number_of_guests INTEGER NOT NULL DEFAULT 0,
    note            TEXT,                      -- 備考（ユーザー入力）
    reminder_sent   BOOLEAN NOT NULL DEFAULT FALSE,
    registered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cancelled_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(event_id, user_id)                  -- 同一イベントに重複登録不可
);

CREATE TRIGGER trigger_event_registrations_updated_at
    BEFORE UPDATE ON event_registrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE event_registrations IS 'イベント参加申込。キャンセル・出欠も管理';
```

### 2.7 reservation_slots（予約枠カレンダー）

個別相談の空き枠カレンダーを管理する。events と関連付けて特定イベント内の枠としても利用可能。

```sql
CREATE TABLE reservation_slots (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id        UUID REFERENCES events(id) ON DELETE SET NULL,
                                               -- 関連イベント（NULL=汎用相談枠）
    slot_date       DATE NOT NULL,
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    capacity        INTEGER NOT NULL DEFAULT 1,-- 同時予約可能数
    booked_count    INTEGER NOT NULL DEFAULT 0,-- 予約済み数
    location        TEXT,                      -- 相談場所
    staff_name      TEXT,                      -- 担当者名
    is_available    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_time_range CHECK (start_time < end_time),
    CONSTRAINT valid_booked_count CHECK (booked_count >= 0 AND booked_count <= capacity)
);

CREATE TRIGGER trigger_reservation_slots_updated_at
    BEFORE UPDATE ON reservation_slots
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE reservation_slots IS '個別相談予約枠。日時・定員・担当者を管理';
```

### 2.8 reservations（個別相談予約）

```sql
CREATE TABLE reservations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slot_id         UUID NOT NULL REFERENCES reservation_slots(id) ON DELETE RESTRICT,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status          TEXT NOT NULL DEFAULT 'confirmed'
                    CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
    purpose         TEXT,                      -- 相談目的（AI/ユーザー入力）
    ai_pre_summary  TEXT,                      -- AIが事前生成した顧客情報要約
    admin_note      TEXT,                      -- 管理者メモ
    reminder_sent   BOOLEAN NOT NULL DEFAULT FALSE,
    cancelled_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(slot_id, user_id)                   -- 同一枠に同一ユーザーの重複予約不可
);

-- 予約作成時にslotのbooked_countを自動更新するトリガー
CREATE OR REPLACE FUNCTION update_slot_booked_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE reservation_slots
        SET booked_count = booked_count + 1,
            is_available = CASE
                WHEN booked_count + 1 >= capacity THEN FALSE
                ELSE TRUE
            END
        WHERE id = NEW.slot_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
        UPDATE reservation_slots
        SET booked_count = booked_count - 1,
            is_available = TRUE
        WHERE id = NEW.slot_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reservation_slot_count
    AFTER INSERT OR UPDATE ON reservations
    FOR EACH ROW
    EXECUTE FUNCTION update_slot_booked_count();

CREATE TRIGGER trigger_reservations_updated_at
    BEFORE UPDATE ON reservations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE reservations IS '個別相談予約。予約枠と連動してbooked_countを自動管理';
```

### 2.9 ai_hearings（AIヒアリング結果）

AIチャットボットによる自動ヒアリングの質問・回答・分析結果を格納する。

```sql
CREATE TABLE ai_hearings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    hearing_type    TEXT NOT NULL
                    CHECK (hearing_type IN ('initial', 'needs_assessment',
                                            'budget', 'timeline', 'follow_up')),
    status          TEXT NOT NULL DEFAULT 'in_progress'
                    CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    questions_answers JSONB NOT NULL DEFAULT '[]'::jsonb,
                    -- [{question: "...", answer: "...", asked_at: "..."}, ...]
    ai_analysis     JSONB,
                    -- {needs: [...], budget_range: "...", urgency: "...", recommendations: [...]}
    extracted_tags  TEXT[],                     -- ヒアリングから抽出されたタグ名配列
    model_used      TEXT,                      -- 使用したAIモデル名
    total_tokens    INTEGER,                   -- 総トークン消費量
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_ai_hearings_updated_at
    BEFORE UPDATE ON ai_hearings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE ai_hearings IS 'AIヒアリングセッション結果。質問応答と分析結果をJSONBで格納';
COMMENT ON COLUMN ai_hearings.questions_answers IS 'Q&A配列: [{question, answer, asked_at}]';
COMMENT ON COLUMN ai_hearings.ai_analysis IS 'AI分析結果: {needs, budget_range, urgency, recommendations}';
```

### 2.10 broadcast_jobs（一斉配信ジョブ）

LINEの一斉配信（セグメント配信含む）のジョブ管理。

```sql
CREATE TABLE broadcast_jobs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           TEXT NOT NULL,             -- 配信タイトル（管理用）
    message_type    TEXT NOT NULL DEFAULT 'flex'
                    CHECK (message_type IN ('text', 'flex', 'template', 'imagemap')),
    message_content JSONB NOT NULL,            -- 配信メッセージ本文（LINE Messaging API形式）
    target_filter   JSONB,                     -- セグメント条件
                    -- {tags: ["リフォーム興味"], membership: ["standard","premium"],
                    --  last_interaction_within_days: 30}
    target_count    INTEGER,                   -- 対象者数（配信前に算出）
    status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'scheduled', 'sending', 'sent',
                                      'partially_failed', 'cancelled')),
    scheduled_at    TIMESTAMPTZ,               -- 配信予定日時（即時の場合はNULL）
    sent_at         TIMESTAMPTZ,               -- 実際の配信開始日時
    completed_at    TIMESTAMPTZ,               -- 配信完了日時
    success_count   INTEGER DEFAULT 0,
    failure_count   INTEGER DEFAULT 0,
    created_by      TEXT,                      -- 作成者
    approved_by     TEXT,                      -- 承認者（承認フロー用）
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_broadcast_jobs_updated_at
    BEFORE UPDATE ON broadcast_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE broadcast_jobs IS 'LINE一斉配信ジョブ。セグメント条件・配信状態を管理';
COMMENT ON COLUMN broadcast_jobs.target_filter IS 'セグメント条件JSON。タグ・会員ランク・最終接触日等で絞り込み';
```

### 2.11 broadcast_logs（配信ログ）

一斉配信の送信先ユーザーごとの送信結果を記録する。

```sql
CREATE TABLE broadcast_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id          UUID NOT NULL REFERENCES broadcast_jobs(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
    line_request_id TEXT,                      -- LINE API レスポンスのリクエストID
    error_code      TEXT,                      -- 失敗時のエラーコード
    error_message   TEXT,                      -- 失敗時のエラー詳細
    sent_at         TIMESTAMPTZ,
    delivered_at    TIMESTAMPTZ,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE broadcast_logs IS '一斉配信の送信先別配信結果ログ';
```

### 2.12 ec_insights（AIアナリスト分析結果）

EC・マーケティングデータのAI分析結果を格納する。

```sql
CREATE TABLE ec_insights (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    insight_type    TEXT NOT NULL
                    CHECK (insight_type IN ('daily_report', 'weekly_report',
                                            'segment_analysis', 'churn_prediction',
                                            'campaign_evaluation', 'trend_analysis',
                                            'custom')),
    title           TEXT NOT NULL,
    summary         TEXT NOT NULL,              -- 分析サマリー（自然言語）
    detail          JSONB NOT NULL DEFAULT '{}'::jsonb,
                    -- 分析結果の構造化データ
                    -- {metrics: {...}, charts_data: [...], recommendations: [...]}
    data_sources    TEXT[],                     -- 使用データソース名
    period_start    DATE,                       -- 分析対象期間（開始）
    period_end      DATE,                       -- 分析対象期間（終了）
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
                    -- 特定ユーザー向け分析時のみ設定
    model_used      TEXT,                       -- 使用AIモデル
    tokens_used     INTEGER,                    -- トークン消費量
    is_pinned       BOOLEAN NOT NULL DEFAULT FALSE, -- ダッシュボードピン留め
    created_by      TEXT DEFAULT 'system',      -- 'system' or admin email
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE ec_insights IS 'AIアナリストが生成した分析レポート・インサイト';
COMMENT ON COLUMN ec_insights.detail IS '構造化分析データ: {metrics, charts_data, recommendations}';
```

### 2.13 audit_logs（監査ログ）

管理者操作・データアクセスの監査ログ。WORM（Write Once Read Many）設計。

```sql
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_type      TEXT NOT NULL
                    CHECK (actor_type IN ('admin', 'system', 'ai', 'user')),
    actor_id        TEXT NOT NULL,              -- 操作者識別子（email / 'system' / line_uid）
    action          TEXT NOT NULL,              -- 操作種別
                    -- 命名規則: {resource}.{verb}
                    -- 例: 'user.view_pii', 'broadcast.send', 'event.create'
    resource_type   TEXT NOT NULL,              -- 対象テーブル名
    resource_id     UUID,                       -- 対象レコードID
    details         JSONB DEFAULT '{}'::jsonb,  -- 操作詳細（変更前後の値等）
    ip_address      INET,                       -- クライアントIP
    user_agent      TEXT,                       -- User-Agent
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- audit_logs は UPDATE/DELETE を禁止する（WORM設計）
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs テーブルの更新・削除は禁止されています';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_audit_log_update
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_modification();

COMMENT ON TABLE audit_logs IS '監査ログ（WORM）。全管理操作・PIIアクセスを記録。更新削除不可';
COMMENT ON COLUMN audit_logs.action IS '操作種別。命名規則: {resource}.{verb} 例: user.view_pii';
```

---

## 3. 暗号化設計

### 3.1 暗号化対象カラム

| テーブル | カラム | データ型 | 暗号化後の型 |
|---------|--------|---------|-------------|
| `users` | `name_encrypted` | TEXT | BYTEA |
| `users` | `email_encrypted` | TEXT | BYTEA |
| `users` | `phone_encrypted` | TEXT | BYTEA |
| `users` | `address_encrypted` | TEXT | BYTEA |
| `users` | `postal_code_encrypted` | TEXT | BYTEA |

### 3.2 暗号化方式

- **アルゴリズム**: AES-256-CBC（pgcrypto `pgp_sym_encrypt` / `pgp_sym_decrypt`）
- **キー管理**: Supabase Vault にマスターキーを格納
- **キー名**: `pii_encryption_key`

### 3.3 Vault へのキー登録

```sql
-- Supabase Vault にPII暗号化キーを登録
-- ※ Supabase Dashboard > Vault からも設定可能
SELECT vault.create_secret(
    'your-256-bit-secret-key-here-change-me',  -- 本番では十分な強度のキーに置換
    'pii_encryption_key',                        -- シークレット名
    'PII暗号化用マスターキー'                      -- 説明
);
```

### 3.4 暗号化・復号ヘルパー関数

アプリケーションから直接暗号化キーを扱わないよう、サーバーサイドのSQL関数でラップする。

```sql
-- 暗号化関数
CREATE OR REPLACE FUNCTION encrypt_pii(plain_text TEXT)
RETURNS BYTEA AS $$
DECLARE
    encryption_key TEXT;
BEGIN
    -- Vaultからキーを取得
    SELECT decrypted_secret INTO encryption_key
    FROM vault.decrypted_secrets
    WHERE name = 'pii_encryption_key'
    LIMIT 1;

    IF encryption_key IS NULL THEN
        RAISE EXCEPTION 'PII暗号化キーがVaultに存在しません';
    END IF;

    RETURN pgp_sym_encrypt(plain_text, encryption_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 復号関数
CREATE OR REPLACE FUNCTION decrypt_pii(encrypted_data BYTEA)
RETURNS TEXT AS $$
DECLARE
    encryption_key TEXT;
BEGIN
    IF encrypted_data IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT decrypted_secret INTO encryption_key
    FROM vault.decrypted_secrets
    WHERE name = 'pii_encryption_key'
    LIMIT 1;

    IF encryption_key IS NULL THEN
        RAISE EXCEPTION 'PII暗号化キーがVaultに存在しません';
    END IF;

    RETURN pgp_sym_decrypt(encrypted_data, encryption_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 関数の実行権限を制限（service_roleのみ実行可能）
REVOKE ALL ON FUNCTION encrypt_pii(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION decrypt_pii(BYTEA) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION encrypt_pii(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION decrypt_pii(BYTEA) TO service_role;
```

### 3.5 暗号化データの書き込み例

```sql
-- ユーザー登録時のPII暗号化挿入
INSERT INTO users (line_uid, line_display_name, name_encrypted, email_encrypted, phone_encrypted, address_encrypted, postal_code_encrypted)
VALUES (
    'U1234567890abcdef1234567890abcdef',
    '武居太郎',
    encrypt_pii('武居 太郎'),
    encrypt_pii('taro@example.com'),
    encrypt_pii('090-1234-5678'),
    encrypt_pii('埼玉県さいたま市大宮区1-2-3'),
    encrypt_pii('330-0801')
);
```

### 3.6 暗号化データの読み取り例

```sql
-- PII復号を含むユーザー情報取得（service_role経由でのみ実行可能）
SELECT
    id,
    line_uid,
    line_display_name,
    decrypt_pii(name_encrypted) AS name,
    decrypt_pii(email_encrypted) AS email,
    decrypt_pii(phone_encrypted) AS phone,
    decrypt_pii(address_encrypted) AS address,
    membership_tier,
    ai_persona_summary
FROM users
WHERE line_uid = 'U1234567890abcdef1234567890abcdef';
```

### 3.7 暗号化カラムでの検索

暗号化カラムは直接 WHERE 句で検索できないため、検索用ハッシュカラムを追加するパターンを採用する。

```sql
-- 検索用ハッシュカラムの追加（必要な場合のみ）
ALTER TABLE users ADD COLUMN email_hash TEXT;

-- ハッシュ生成関数
CREATE OR REPLACE FUNCTION generate_pii_hash(plain_text TEXT)
RETURNS TEXT AS $$
DECLARE
    hash_salt TEXT;
BEGIN
    SELECT decrypted_secret INTO hash_salt
    FROM vault.decrypted_secrets
    WHERE name = 'pii_hash_salt'
    LIMIT 1;

    RETURN encode(
        hmac(lower(trim(plain_text)), hash_salt, 'sha256'),
        'hex'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- メールアドレスでのユーザー検索例
SELECT id, line_uid, decrypt_pii(name_encrypted) AS name
FROM users
WHERE email_hash = generate_pii_hash('taro@example.com');
```

---

## 4. RLS（Row Level Security）ポリシー設計

### 4.1 方針

| ロール | 説明 | アクセス範囲 |
|--------|------|------------|
| `anon` | 未認証ユーザー | 一切アクセス不可 |
| `authenticated` | Supabase Auth認証済みユーザー（LINE経由） | 自分のデータのみ |
| `service_role` | バックエンドAPI / Edge Functions | 全データアクセス可能（RLSバイパス） |

### 4.2 RLS有効化

```sql
-- 全テーブルでRLSを有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_hearings ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ec_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- service_role は全テーブルでRLSをバイパス（Supabaseのデフォルト動作）
-- 明示的にポリシーを作成する必要はない
```

### 4.3 users テーブルのポリシー

```sql
-- ユーザーは自分のレコードのみ参照可能
CREATE POLICY "users_select_own"
    ON users FOR SELECT
    TO authenticated
    USING (
        line_uid = (
            SELECT raw_app_meta_data->>'line_uid'
            FROM auth.users
            WHERE id = auth.uid()
        )
    );

-- ユーザーは自分のレコードのみ更新可能（line_uid, membership_tierの変更は不可）
CREATE POLICY "users_update_own"
    ON users FOR UPDATE
    TO authenticated
    USING (
        line_uid = (
            SELECT raw_app_meta_data->>'line_uid'
            FROM auth.users
            WHERE id = auth.uid()
        )
    )
    WITH CHECK (
        line_uid = (
            SELECT raw_app_meta_data->>'line_uid'
            FROM auth.users
            WHERE id = auth.uid()
        )
    );

-- anon ロールは一切アクセス不可（ポリシーなし = 全拒否）
```

### 4.4 user_tags テーブルのポリシー

```sql
-- ユーザーは自分のタグのみ参照可能
CREATE POLICY "user_tags_select_own"
    ON user_tags FOR SELECT
    TO authenticated
    USING (
        user_id IN (
            SELECT u.id FROM users u
            WHERE u.line_uid = (
                SELECT raw_app_meta_data->>'line_uid'
                FROM auth.users
                WHERE id = auth.uid()
            )
        )
    );

-- タグの作成・更新・削除は service_role のみ（ポリシーなし = 拒否）
```

### 4.5 conversations / messages テーブルのポリシー

```sql
-- 自分の会話のみ参照可能
CREATE POLICY "conversations_select_own"
    ON conversations FOR SELECT
    TO authenticated
    USING (
        user_id IN (
            SELECT u.id FROM users u
            WHERE u.line_uid = (
                SELECT raw_app_meta_data->>'line_uid'
                FROM auth.users
                WHERE id = auth.uid()
            )
        )
    );

-- 自分の会話に属するメッセージのみ参照可能
CREATE POLICY "messages_select_own"
    ON messages FOR SELECT
    TO authenticated
    USING (
        conversation_id IN (
            SELECT c.id FROM conversations c
            JOIN users u ON c.user_id = u.id
            WHERE u.line_uid = (
                SELECT raw_app_meta_data->>'line_uid'
                FROM auth.users
                WHERE id = auth.uid()
            )
        )
    );
```

### 4.6 events テーブルのポリシー

```sql
-- 公開中のイベントは全認証ユーザーが参照可能
CREATE POLICY "events_select_published"
    ON events FOR SELECT
    TO authenticated
    USING (status = 'published');

-- イベントの作成・更新は service_role のみ
```

### 4.7 event_registrations テーブルのポリシー

```sql
-- 自分の申込のみ参照可能
CREATE POLICY "event_registrations_select_own"
    ON event_registrations FOR SELECT
    TO authenticated
    USING (
        user_id IN (
            SELECT u.id FROM users u
            WHERE u.line_uid = (
                SELECT raw_app_meta_data->>'line_uid'
                FROM auth.users
                WHERE id = auth.uid()
            )
        )
    );

-- 自分の申込の作成（INSERTは service_role 経由を推奨だが、直接も許可）
CREATE POLICY "event_registrations_insert_own"
    ON event_registrations FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id IN (
            SELECT u.id FROM users u
            WHERE u.line_uid = (
                SELECT raw_app_meta_data->>'line_uid'
                FROM auth.users
                WHERE id = auth.uid()
            )
        )
    );
```

### 4.8 reservation_slots テーブルのポリシー

```sql
-- 利用可能な予約枠は全認証ユーザーが参照可能
CREATE POLICY "reservation_slots_select_available"
    ON reservation_slots FOR SELECT
    TO authenticated
    USING (is_available = TRUE AND slot_date >= CURRENT_DATE);

-- 枠の作成・更新は service_role のみ
```

### 4.9 reservations テーブルのポリシー

```sql
-- 自分の予約のみ参照可能
CREATE POLICY "reservations_select_own"
    ON reservations FOR SELECT
    TO authenticated
    USING (
        user_id IN (
            SELECT u.id FROM users u
            WHERE u.line_uid = (
                SELECT raw_app_meta_data->>'line_uid'
                FROM auth.users
                WHERE id = auth.uid()
            )
        )
    );
```

### 4.10 ai_hearings テーブルのポリシー

```sql
-- 自分のヒアリング結果のみ参照可能
CREATE POLICY "ai_hearings_select_own"
    ON ai_hearings FOR SELECT
    TO authenticated
    USING (
        user_id IN (
            SELECT u.id FROM users u
            WHERE u.line_uid = (
                SELECT raw_app_meta_data->>'line_uid'
                FROM auth.users
                WHERE id = auth.uid()
            )
        )
    );
```

### 4.11 broadcast_jobs / broadcast_logs テーブルのポリシー

```sql
-- 配信ジョブは service_role のみアクセス可能（管理者機能）
-- authenticated ユーザーにはポリシーを作成しない = 全拒否

-- broadcast_logs も同様に service_role のみ
-- ユーザーが自分宛の配信履歴を参照する場合は Edge Function 経由
```

### 4.12 ec_insights テーブルのポリシー

```sql
-- 分析結果は service_role のみ（管理ダッシュボード経由）
-- authenticated ユーザーにはポリシーを作成しない = 全拒否
```

### 4.13 audit_logs テーブルのポリシー

```sql
-- 監査ログは service_role のみ参照・書き込み可能
-- INSERT は service_role のみ許可
CREATE POLICY "audit_logs_insert_service"
    ON audit_logs FOR INSERT
    TO service_role
    WITH CHECK (TRUE);

CREATE POLICY "audit_logs_select_service"
    ON audit_logs FOR SELECT
    TO service_role
    USING (TRUE);

-- UPDATE/DELETE はトリガーで防止済み
```

### 4.14 共通ヘルパー関数（RLSポリシー用）

RLS ポリシー内で繰り返し使う `line_uid` の取得をヘルパー関数化する。

```sql
-- 現在の認証ユーザーの line_uid を取得
CREATE OR REPLACE FUNCTION get_current_line_uid()
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT raw_app_meta_data->>'line_uid'
        FROM auth.users
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 現在の認証ユーザーの users.id を取得
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT u.id
        FROM users u
        WHERE u.line_uid = get_current_line_uid()
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

ヘルパー関数を利用したポリシーの簡略化例:

```sql
-- 上記のポリシーをヘルパー関数で簡略化した場合
CREATE POLICY "conversations_select_own_v2"
    ON conversations FOR SELECT
    TO authenticated
    USING (user_id = get_current_user_id());
```

---

## 5. インデックス設計

### 5.1 設計方針

- 主キー（PRIMARY KEY）には自動でユニークインデックスが作成される
- UNIQUE 制約にも自動でインデックスが作成される
- 外部キー参照カラムには原則インデックスを作成する
- 頻出クエリのWHERE句・JOIN条件・ORDER BY句に基づいてインデックスを設計する
- JSONB カラムには GIN インデックスを使用する

### 5.2 users テーブル

```sql
-- line_uid は UNIQUE制約で自動インデックス済み

-- フォロー状態でのフィルタリング
CREATE INDEX idx_users_follow_status ON users (line_follow_status);

-- 会員ランク別フィルタリング
CREATE INDEX idx_users_membership_tier ON users (membership_tier);

-- 最終接触日時でのソート・フィルタ（アクティブユーザー抽出等）
CREATE INDEX idx_users_last_interaction ON users (last_interaction_at DESC NULLS LAST);

-- メールアドレスハッシュ検索（暗号化対応）
CREATE INDEX idx_users_email_hash ON users (email_hash) WHERE email_hash IS NOT NULL;
```

### 5.3 user_tags テーブル

```sql
-- user_id + tag_name は UNIQUE制約で自動インデックス済み

-- タグ名での検索（セグメント配信のフィルタ条件）
CREATE INDEX idx_user_tags_tag_name ON user_tags (tag_name);

-- タグカテゴリ + タグ名の複合インデックス
CREATE INDEX idx_user_tags_category_name ON user_tags (tag_category, tag_name);

-- 有効期限付きタグの期限切れチェック
CREATE INDEX idx_user_tags_expires_at ON user_tags (expires_at)
    WHERE expires_at IS NOT NULL;

-- ユーザーIDでの外部キー結合
CREATE INDEX idx_user_tags_user_id ON user_tags (user_id);
```

### 5.4 conversations テーブル

```sql
-- ユーザーIDでの会話一覧取得
CREATE INDEX idx_conversations_user_id ON conversations (user_id);

-- ステータスでのフィルタ（アクティブ会話の取得）
CREATE INDEX idx_conversations_status ON conversations (status)
    WHERE status = 'active';

-- ユーザー×ステータスの複合（特定ユーザーのアクティブ会話取得）
CREATE INDEX idx_conversations_user_status ON conversations (user_id, status);

-- セッション開始日時でのソート
CREATE INDEX idx_conversations_started_at ON conversations (session_started_at DESC);
```

### 5.5 messages テーブル

```sql
-- 会話IDでのメッセージ一覧取得（時系列）
CREATE INDEX idx_messages_conversation_id ON messages (conversation_id, created_at);

-- 送信者タイプでのフィルタ
CREATE INDEX idx_messages_sender_type ON messages (sender_type);

-- LINE メッセージID での参照（Webhook受信時）
CREATE INDEX idx_messages_line_message_id ON messages (line_message_id)
    WHERE line_message_id IS NOT NULL;

-- メッセージ作成日時でのソート
CREATE INDEX idx_messages_created_at ON messages (created_at DESC);
```

### 5.6 events テーブル

```sql
-- ステータス + 開始日時（公開中イベントの時系列取得）
CREATE INDEX idx_events_status_start ON events (status, start_at)
    WHERE status = 'published';

-- イベントタイプでのフィルタ
CREATE INDEX idx_events_type ON events (event_type);

-- 開始日時でのソート
CREATE INDEX idx_events_start_at ON events (start_at DESC);
```

### 5.7 event_registrations テーブル

```sql
-- event_id + user_id は UNIQUE制約で自動インデックス済み

-- イベントIDでの参加者一覧取得
CREATE INDEX idx_event_registrations_event_id ON event_registrations (event_id);

-- ユーザーIDでの参加イベント一覧取得
CREATE INDEX idx_event_registrations_user_id ON event_registrations (user_id);

-- ステータスでのフィルタ（リマインド対象の抽出等）
CREATE INDEX idx_event_registrations_status ON event_registrations (status)
    WHERE status = 'registered';

-- リマインド未送信の参加者抽出
CREATE INDEX idx_event_registrations_reminder ON event_registrations (event_id, reminder_sent)
    WHERE reminder_sent = FALSE AND status = 'registered';
```

### 5.8 reservation_slots テーブル

```sql
-- 日付でのスロット一覧取得
CREATE INDEX idx_reservation_slots_date ON reservation_slots (slot_date);

-- 利用可能スロットの取得
CREATE INDEX idx_reservation_slots_available ON reservation_slots (slot_date, start_time)
    WHERE is_available = TRUE;

-- イベントIDでの紐付き
CREATE INDEX idx_reservation_slots_event_id ON reservation_slots (event_id)
    WHERE event_id IS NOT NULL;
```

### 5.9 reservations テーブル

```sql
-- slot_id + user_id は UNIQUE制約で自動インデックス済み

-- スロットIDでの予約一覧
CREATE INDEX idx_reservations_slot_id ON reservations (slot_id);

-- ユーザーIDでの予約一覧
CREATE INDEX idx_reservations_user_id ON reservations (user_id);

-- ステータスでのフィルタ
CREATE INDEX idx_reservations_status ON reservations (status)
    WHERE status = 'confirmed';

-- リマインド未送信の予約抽出
CREATE INDEX idx_reservations_reminder ON reservations (slot_id, reminder_sent)
    WHERE reminder_sent = FALSE AND status = 'confirmed';
```

### 5.10 ai_hearings テーブル

```sql
-- ユーザーIDでのヒアリング一覧
CREATE INDEX idx_ai_hearings_user_id ON ai_hearings (user_id);

-- ヒアリングタイプ + ステータスの複合
CREATE INDEX idx_ai_hearings_type_status ON ai_hearings (hearing_type, status);

-- 会話IDでの紐付き
CREATE INDEX idx_ai_hearings_conversation_id ON ai_hearings (conversation_id)
    WHERE conversation_id IS NOT NULL;

-- JSONB列に対するGINインデックス（分析結果の検索用）
CREATE INDEX idx_ai_hearings_analysis_gin ON ai_hearings USING GIN (ai_analysis);
```

### 5.11 broadcast_jobs テーブル

```sql
-- ステータスでのフィルタ（未送信・送信中ジョブの取得）
CREATE INDEX idx_broadcast_jobs_status ON broadcast_jobs (status);

-- 配信予定日時でのソート（スケジューラー用）
CREATE INDEX idx_broadcast_jobs_scheduled ON broadcast_jobs (scheduled_at)
    WHERE status = 'scheduled' AND scheduled_at IS NOT NULL;

-- ターゲットフィルタのJSONB検索用GINインデックス
CREATE INDEX idx_broadcast_jobs_filter_gin ON broadcast_jobs USING GIN (target_filter);
```

### 5.12 broadcast_logs テーブル

```sql
-- ジョブIDでのログ一覧取得
CREATE INDEX idx_broadcast_logs_job_id ON broadcast_logs (job_id);

-- ユーザーIDでの配信履歴取得
CREATE INDEX idx_broadcast_logs_user_id ON broadcast_logs (user_id);

-- ステータスでのフィルタ（失敗ログの抽出等）
CREATE INDEX idx_broadcast_logs_status ON broadcast_logs (status)
    WHERE status = 'failed';

-- ジョブ×ステータスの複合（配信結果集計用）
CREATE INDEX idx_broadcast_logs_job_status ON broadcast_logs (job_id, status);
```

### 5.13 ec_insights テーブル

```sql
-- インサイトタイプでのフィルタ
CREATE INDEX idx_ec_insights_type ON ec_insights (insight_type);

-- 分析対象期間でのフィルタ
CREATE INDEX idx_ec_insights_period ON ec_insights (period_start, period_end);

-- ピン留めインサイトの取得
CREATE INDEX idx_ec_insights_pinned ON ec_insights (is_pinned, created_at DESC)
    WHERE is_pinned = TRUE;

-- ユーザー別インサイト
CREATE INDEX idx_ec_insights_user_id ON ec_insights (user_id)
    WHERE user_id IS NOT NULL;

-- JSONB詳細データのGINインデックス
CREATE INDEX idx_ec_insights_detail_gin ON ec_insights USING GIN (detail);
```

### 5.14 audit_logs テーブル

```sql
-- 操作者での監査ログ検索
CREATE INDEX idx_audit_logs_actor ON audit_logs (actor_type, actor_id);

-- 操作種別での検索
CREATE INDEX idx_audit_logs_action ON audit_logs (action);

-- リソースでの検索（特定レコードの操作履歴）
CREATE INDEX idx_audit_logs_resource ON audit_logs (resource_type, resource_id);

-- 日時範囲での検索
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at DESC);

-- actor + 日時の複合（特定管理者の操作履歴を時系列で取得）
CREATE INDEX idx_audit_logs_actor_time ON audit_logs (actor_id, created_at DESC);

-- 詳細JSONBのGINインデックス
CREATE INDEX idx_audit_logs_details_gin ON audit_logs USING GIN (details);
```

### 5.15 インデックスメンテナンス

```sql
-- 定期的な統計情報更新（Supabase cron で週次実行を推奨）
ANALYZE users;
ANALYZE user_tags;
ANALYZE conversations;
ANALYZE messages;
ANALYZE events;
ANALYZE event_registrations;
ANALYZE reservation_slots;
ANALYZE reservations;
ANALYZE ai_hearings;
ANALYZE broadcast_jobs;
ANALYZE broadcast_logs;
ANALYZE ec_insights;
ANALYZE audit_logs;

-- 未使用インデックスの確認クエリ
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
```

---

## 付録: マイグレーション実行順序

本設計書のSQLを適用する際は、以下の順序で実行すること。

```
1. 拡張の有効化（pgcrypto, uuid-ossp, supabase_vault）
2. ヘルパー関数（update_updated_at_column, prevent_audit_log_modification）
3. テーブル作成（外部キー依存順）
   3.1 users
   3.2 user_tags
   3.3 conversations
   3.4 messages
   3.5 events
   3.6 event_registrations
   3.7 reservation_slots
   3.8 reservations（+ update_slot_booked_count トリガー）
   3.9 ai_hearings
   3.10 broadcast_jobs
   3.11 broadcast_logs
   3.12 ec_insights
   3.13 audit_logs（+ prevent_audit_log_modification トリガー）
4. 暗号化関数（encrypt_pii, decrypt_pii, generate_pii_hash）
5. Vault シークレット登録
6. RLS 有効化 + ポリシー作成
7. RLS ヘルパー関数（get_current_line_uid, get_current_user_id）
8. インデックス作成
```
