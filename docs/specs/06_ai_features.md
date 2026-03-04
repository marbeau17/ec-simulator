# AI機能仕様書

武居商店「AI搭載型 独自LINEマーケティングシステム」

- **使用モデル**: Gemini API (`gemini-1.5-flash` / `gemini-1.5-pro`)
- **主要技術**: Function Calling、構造化出力（JSON Schema）

---

## 1. AIチャットボット機能

### 1.1 システムプロンプト設計

```text
あなたは武居商店のLINE接客アシスタント「たけいコンシェルジュ」です。

【役割】
- 武居商店の商品（食品・調味料・地域特産品）に関する質問対応
- 来店予約・取り置き予約の受付
- 顧客の好み・アレルギー等のヒアリング

【制約】
- 回答は日本語、丁寧語で簡潔に（150文字以内目安）
- 商品情報はsearch_products関数で取得し、推測で回答しない
- 価格・在庫は必ず関数経由で最新情報を返す
- 対応不能な場合はescalate_to_humanを呼び出す
- 競合他社の商品は推奨しない

【トーン】
- 親しみやすく温かみのある口調
- 絵文字は控えめに使用（1メッセージに1-2個まで）
```

### 1.2 Function Calling定義

```typescript
// ユーザーにタグを付与（セグメント管理用）
interface AddUserTag {
  name: "add_user_tag";
  parameters: {
    line_uid: string;        // LINEユーザーID
    tag: string;             // タグ名（例: "味噌好き", "贈答用"）
    source: "ai_chat" | "ai_hearing"; // 付与元
  };
}

// ヒアリング結果を保存
interface SaveHearingResult {
  name: "save_hearing_result";
  parameters: {
    line_uid: string;
    hearing_type: "initial" | "seasonal" | "gift"; // ヒアリング種別
    answers: Record<string, string>;               // 質問ID→回答マップ
    summary: string;                               // AI生成の要約
    tags: string[];                                 // 抽出タグ一覧
  };
}

// 商品検索
interface SearchProducts {
  name: "search_products";
  parameters: {
    query?: string;           // 自然言語クエリ
    category?: string;        // カテゴリID
    price_min?: number;       // 最低価格
    price_max?: number;       // 最高価格
    in_stock_only?: boolean;  // 在庫ありのみ（default: true）
    limit?: number;           // 取得件数（default: 5, max: 10）
  };
}

// 来店・取り置き予約作成
interface CreateReservation {
  name: "create_reservation";
  parameters: {
    line_uid: string;
    type: "visit" | "product_hold";          // 来店予約 or 取り置き
    preferred_date: string;                  // ISO 8601日付
    preferred_time_slot?: string;            // 時間帯（例: "10:00-12:00"）
    product_ids?: string[];                  // 取り置き対象商品ID
    note?: string;                           // 備考
  };
}

// 有人対応へエスカレーション
interface EscalateToHuman {
  name: "escalate_to_human";
  parameters: {
    line_uid: string;
    reason: "complaint" | "complex_inquiry" | "payment_issue" | "other";
    conversation_summary: string;  // AIが生成した会話要約
    urgency: "low" | "medium" | "high";
  };
}
```

### 1.3 会話フロー制御（AI→有人切替トリガー）

| トリガー条件 | urgency | 動作 |
|---|---|---|
| ユーザーが「人と話したい」等を明示 | medium | 即時切替 |
| クレーム・不満の検出（感情分析） | high | 即時切替＋管理者通知 |
| 同一質問3回ループ（AI解決不能） | medium | 切替提案→同意後切替 |
| 決済・返金に関する問い合わせ | high | 即時切替 |
| AI確信度が低い回答が2回連続 | low | 切替提案 |

切替時の処理フロー:

```
1. escalate_to_human() 呼出
2. conversation_historyをDBに保存
3. ユーザーへ「担当者におつなぎします」メッセージ送信
4. 管理画面に通知（Pusher経由リアルタイム）
5. 担当者が応答するまでAIは待機メッセージのみ返す
```

---

## 2. AI事前ヒアリング機能

### 2.1 ヒアリングシナリオ

**初回ヒアリング（initial）**

```yaml
questions:
  - id: purpose
    text: "武居商店をどのようにご利用されますか？"
    options: ["自宅用", "贈答用", "両方"]
    required: true

  - id: food_preference
    text: "お好きな食べ物のジャンルを教えてください"
    options: ["和食", "洋食", "中華", "エスニック", "特にこだわりなし"]
    multiple: true
    required: true

  - id: allergy
    text: "食物アレルギーはございますか？"
    type: free_text
    required: false

  - id: budget
    text: "1回のお買い物の目安はどのくらいですか？"
    options: ["〜1,000円", "1,000〜3,000円", "3,000〜5,000円", "5,000円〜"]
    required: false

  - id: frequency
    text: "どのくらいの頻度でお買い物されますか？"
    options: ["週1回以上", "月2-3回", "月1回", "不定期"]
    required: false

completion_condition:
  required_all: true       # 必須項目すべて回答
  min_questions: 3         # 最低3問回答
```

分岐ルール:
- `purpose = "贈答用"` → 追加質問「贈る相手の年齢層」「予算帯」を挿入
- `allergy` に回答あり → タグ自動付与（例: `アレルギー:小麦`）

### 2.2 プロンプト例

```text
あなたはヒアリング担当です。以下のシナリオに従い、ユーザーに1問ずつ質問してください。

【ルール】
- 1メッセージにつき1問のみ
- 選択肢がある場合は番号付きで提示
- ユーザーの回答が選択肢外でも柔軟に解釈しタグ化
- 全質問完了後、save_hearing_result関数で結果を保存
- 途中離脱時は回答済み分のみ保存

【現在のシナリオ】
{scenario_json}

【回答済み】
{answered_json}

【次の質問ID】
{next_question_id}
```

### 2.3 データ構造化（非構造→構造化変換）

自由回答テキストをGeminiで構造化:

```typescript
// 入力（ユーザーの自由回答）
const freeText = "小麦と卵がダメです。あと甲殻類も少し...";

// Gemini呼出（JSON Schema指定）
const schema = {
  type: "object",
  properties: {
    allergies: {
      type: "array",
      items: {
        type: "object",
        properties: {
          allergen: { type: "string" },
          severity: { type: "string", enum: ["confirmed", "suspected"] }
        }
      }
    }
  }
};

// 出力
{
  "allergies": [
    { "allergen": "小麦", "severity": "confirmed" },
    { "allergen": "卵", "severity": "confirmed" },
    { "allergen": "甲殻類", "severity": "suspected" }
  ]
}
```

---

## 3. ECコンサルティング（AIアナリスト）

### 3.1 定期分析ジョブ

Vercel Cronで日次・週次実行:

```typescript
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/ai-analysis",
      "schedule": "0 3 * * *"    // 毎日AM3:00
    },
    {
      "path": "/api/cron/ai-weekly-report",
      "schedule": "0 4 * * 1"   // 毎週月曜AM4:00
    }
  ]
}
```

| ジョブ | 頻度 | 分析対象 |
|---|---|---|
| 日次分析 | 毎日 | 売上推移、在庫アラート、チャット対応件数 |
| 週次レポート | 毎週月曜 | 売上トレンド、人気商品、顧客セグメント変動、配信効果 |
| 月次戦略提案 | 毎月1日 | 月次KPI、季節商品提案、セグメント別施策案 |

### 3.2 分析プロンプト例とJSON Schema出力

```typescript
const analysisPrompt = `
あなたはECコンサルタントです。以下のデータを分析し、指定JSON形式で出力してください。

【データ】
- 期間: {period}
- 売上データ: {sales_json}
- 商品別実績: {products_json}
- 顧客セグメント: {segments_json}
- LINE配信実績: {broadcast_json}

【分析観点】
1. 売上トレンドと異常値
2. 商品カテゴリ別パフォーマンス
3. 顧客行動の変化
4. 次週の施策提案（具体的に3つ）
`;

// 出力JSON Schema
const insightSchema = {
  type: "object",
  properties: {
    period: { type: "string" },
    summary: { type: "string", description: "3行以内の総括" },
    metrics: {
      type: "object",
      properties: {
        total_revenue: { type: "number" },
        order_count: { type: "number" },
        avg_order_value: { type: "number" },
        revenue_change_pct: { type: "number" }
      }
    },
    insights: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: { type: "string", enum: ["sales", "product", "customer", "marketing"] },
          title: { type: "string" },
          description: { type: "string" },
          impact: { type: "string", enum: ["high", "medium", "low"] },
          action: { type: "string", description: "具体的なアクション提案" }
        }
      }
    },
    recommendations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          priority: { type: "number", minimum: 1, maximum: 3 },
          title: { type: "string" },
          detail: { type: "string" },
          expected_effect: { type: "string" }
        }
      },
      maxItems: 3
    }
  },
  required: ["period", "summary", "metrics", "insights", "recommendations"]
};
```

### 3.3 ec_insightsテーブル保存と表示

```sql
CREATE TABLE ec_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id),
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  summary TEXT NOT NULL,
  metrics JSONB NOT NULL,
  insights JSONB NOT NULL,
  recommendations JSONB NOT NULL,
  model_used TEXT NOT NULL,          -- 使用モデル名
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop_id, period_type, period_start)
);

CREATE INDEX idx_ec_insights_shop_period ON ec_insights(shop_id, period_type, period_start DESC);
```

管理画面での表示:

```
/admin/insights          → 一覧（期間フィルタ付き）
/admin/insights/[id]     → 詳細（グラフ+提案カード）
/api/insights            → GET: 一覧取得、クエリ: ?period_type=weekly&limit=10
```

---

## 4. AIモデル選択戦略

### 使い分け基準

| 用途 | モデル | 理由 |
|---|---|---|
| チャットボット応答 | `gemini-1.5-flash` | 低レイテンシ必須（ユーザー待ち時間） |
| ヒアリング会話 | `gemini-1.5-flash` | 定型シナリオ、速度優先 |
| 自由テキスト構造化 | `gemini-1.5-flash` | JSON Schema指定で精度十分 |
| 週次・月次分析 | `gemini-1.5-pro` | 複雑な分析、精度優先、バッチ処理 |
| 戦略提案生成 | `gemini-1.5-pro` | 高品質な文章生成が必要 |
| 感情分析（エスカレ判定） | `gemini-1.5-flash` | リアルタイム判定、簡易分類 |

### コスト見積もり（月間）

```
前提: 月間アクティブユーザー500人、1人平均5往復/月

【flash】
- チャット: 500人 × 5往復 × ~800トークン = 2Mトークン/月
- ヒアリング: 100人 × 5問 × ~500トークン = 0.25Mトークン/月
- 入力: $0.075/1Mトークン × 2.25M ≈ $0.17
- 出力: $0.30/1Mトークン × 1.0M ≈ $0.30
- flash小計: ≈ $0.50/月

【pro】
- 分析: 30回 × ~5,000トークン = 0.15Mトークン/月
- 入力: $1.25/1Mトークン × 0.15M ≈ $0.19
- 出力: $5.00/1Mトークン × 0.05M ≈ $0.25
- pro小計: ≈ $0.44/月

合計: ≈ $1.00/月（無料枠内で収まる可能性あり）
```

### レートリミット対策

```typescript
// lib/ai/rate-limiter.ts
const RATE_LIMITS = {
  flash: { rpm: 15, rpd: 1500, tpm: 1_000_000 },
  pro:   { rpm: 2,  rpd: 50,   tpm: 32_000 },
} as const;

// 対策
// 1. キューイング: BullMQまたはVercel KVベースの簡易キュー
// 2. リトライ: 429応答時にexponential backoff（最大3回）
// 3. フォールバック: pro → flash への自動降格
// 4. キャッシュ: 同一商品検索結果を5分間キャッシュ（Vercel KV）
```
