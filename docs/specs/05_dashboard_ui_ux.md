# 管理画面 UI/UX 要件定義書

武居商店「AI搭載型 独自LINEマーケティングシステム」

- フレームワーク: Next.js (App Router / SPA)
- 認証: Supabase Auth (メール+パスワード)
- UIライブラリ: shadcn/ui + Tailwind CSS
- レスポンシブ対応: モバイル〜デスクトップ

---

## 1. 画面一覧とサイトマップ

| # | 画面名 | URL | 概要 |
|---|--------|-----|------|
| 1 | ログイン | `/login` | Supabase Auth認証 |
| 2 | ダッシュボードホーム | `/dashboard` | KPIサマリー・AIインサイト |
| 3 | 顧客一覧 | `/dashboard/customers` | 顧客リスト・検索・フィルタ |
| 4 | 顧客詳細 | `/dashboard/customers/[id]` | 個別顧客情報・対応履歴 |
| 5 | セグメント管理 | `/dashboard/customers/segments` | セグメント作成・編集 |
| 6 | チャット対応 | `/dashboard/chat` | リアルタイムチャット一覧 |
| 7 | チャット詳細 | `/dashboard/chat/[threadId]` | 個別スレッド・AI/有人切替 |
| 8 | メッセージ配信 | `/dashboard/messages` | 配信一覧・ステータス |
| 9 | メッセージ作成 | `/dashboard/messages/new` | リッチメッセージエディタ |
| 10 | 配信履歴 | `/dashboard/messages/history` | 配信結果・開封率 |
| 11 | イベント一覧 | `/dashboard/events` | イベントリスト |
| 12 | イベント詳細 | `/dashboard/events/[id]` | 参加者・チケット管理 |
| 13 | イベント作成/編集 | `/dashboard/events/new` `/dashboard/events/[id]/edit` | イベントCRUD |
| 14 | 予約管理 | `/dashboard/reservations` | カレンダービュー |
| 15 | 予約詳細 | `/dashboard/reservations/[id]` | 予約情報・ヒアリング結果 |
| 16 | 予約枠設定 | `/dashboard/reservations/slots` | 予約可能枠の設定 |
| 17 | AIアナリスト | `/dashboard/analytics` | レポート・施策提案 |
| 18 | 設定 | `/dashboard/settings` | システム設定・ユーザー管理 |

---

## 2. 各画面の詳細要件

### 2.1 ダッシュボードホーム (`/dashboard`)

- **KPIカード**: 友だち数、月間メッセージ数、予約数、イベント参加数、売上（前月比付き）
- **AIインサイト**: GPTが生成した直近の分析サマリー（カード形式、最大3件）
- **グラフ**: 友だち数推移（折れ線）、メッセージ開封率（棒）、予約数推移（折れ線）
- **直近アクティビティ**: 新規友だち追加、予約、チャット未対応件数
- **期間フィルタ**: 7日 / 30日 / 90日 / カスタム

### 2.2 顧客管理

#### 顧客一覧 (`/dashboard/customers`)
- テーブル表示: LINE名、登録日、セグメント、最終アクション、LTV
- 検索: フリーテキスト、セグメントフィルタ、登録日範囲
- 一括操作: セグメント付与、メッセージ配信、CSV出力
- ページネーション: 20件/ページ

#### 顧客詳細 (`/dashboard/customers/[id]`)
- プロフィール: LINEアイコン、名前、登録日、セグメントタグ
- タイムライン: メッセージ履歴、予約履歴、イベント参加履歴、購買履歴
- メモ: スタッフメモ（CRUD）
- AIサマリー: 顧客行動の自動要約

#### セグメント管理 (`/dashboard/customers/segments`)
- セグメント一覧: 名前、条件、該当人数
- 条件ビルダー: AND/OR条件、属性・行動ベース
- プレビュー: 条件に該当する顧客数のリアルタイム表示

### 2.3 チャット対応

#### チャット一覧 (`/dashboard/chat`)
- スレッドリスト: 左ペイン、未読バッジ、最終メッセージプレビュー
- フィルタ: 未対応 / AI対応中 / 有人対応中 / 解決済み
- リアルタイム更新: Supabase Realtimeでプッシュ

#### チャット詳細 (`/dashboard/chat/[threadId]`)
- メッセージエリア: 吹き出しUI、画像・スタンプ対応
- AI/有人切替トグル: ワンクリックで切替、切替履歴表示
- AI提案: AIが下書きを提案 → スタッフが承認/編集して送信
- 顧客情報サイドパネル: 右ペインに顧客プロフィール・履歴

### 2.4 メッセージ配信

#### メッセージ作成 (`/dashboard/messages/new`)
- リッチメッセージエディタ: テキスト、画像、ボタン、カルーセル
- プレビュー: LINE上の表示をシミュレート
- 配信先: セグメント選択 or 個別選択
- 配信タイミング: 即時 / 予約配信（日時指定）
- AIコピー提案: 件名・本文のAI生成

#### 配信一覧 (`/dashboard/messages`)
- テーブル: タイトル、配信先、ステータス（下書き/予約/配信済）、配信日時
- ステータスバッジで視覚的に区別

#### 配信履歴 (`/dashboard/messages/history`)
- 配信結果: 送信数、開封数、クリック数、開封率、クリック率
- グラフ: 時系列での配信パフォーマンス

### 2.5 イベント管理

#### イベント一覧 (`/dashboard/events`)
- カード or テーブル切替表示
- フィルタ: 開催前 / 開催中 / 終了
- 新規作成ボタン

#### イベント作成/編集 (`/dashboard/events/new`, `/dashboard/events/[id]/edit`)
- フォーム: タイトル、説明、日時、場所、定員、チケット種別、画像
- チケット設定: 無料 / 有料（価格設定）、枚数上限
- 公開設定: 下書き / 公開 / 非公開

#### イベント詳細 (`/dashboard/events/[id]`)
- 参加者一覧: 名前、チケット種別、ステータス（申込/支払済/キャンセル）
- 参加者CSV出力
- チケット販売状況: 残数、売上

### 2.6 予約管理

#### カレンダービュー (`/dashboard/reservations`)
- 月 / 週 / 日切替
- 予約ブロック: 顧客名、時間、ステータス色分け
- ドラッグ&ドロップで予約移動（デスクトップのみ）

#### 予約枠設定 (`/dashboard/reservations/slots`)
- 曜日別テンプレート: 営業時間、予約間隔（30分/60分等）
- 特定日の上書き: 休業日、特別営業
- 予約上限: 同時間帯の最大予約数

#### 予約詳細 (`/dashboard/reservations/[id]`)
- 予約情報: 顧客、日時、メニュー、ステータス
- AIヒアリング結果: LINE上で収集した事前情報の表示
- ステータス変更: 確定 / キャンセル / 完了

### 2.7 AIアナリスト (`/dashboard/analytics`)

- **自動レポート**: 週次/月次の自動生成レポート（GPT）
- **KPIトレンド**: 主要指標の推移グラフ
- **施策提案**: AIが分析に基づき次のアクションを提案（カード形式）
- **セグメント分析**: セグメント別のエンゲージメント比較
- **レポートエクスポート**: PDF出力

---

## 3. 共通UIコンポーネント

shadcn/ui ベース。プロジェクト固有の拡張コンポーネントを含む。

| コンポーネント | 用途 | ベース |
|---------------|------|--------|
| `AppShell` | サイドバー+ヘッダーのレイアウト | 独自 |
| `Sidebar` | ナビゲーション（折りたたみ対応） | Sheet + NavigationMenu |
| `KpiCard` | KPI表示カード（値・前期比・アイコン） | Card |
| `DataTable` | ソート・フィルタ・ページネーション付きテーブル | Table + @tanstack/react-table |
| `SearchInput` | デバウンス付き検索入力 | Input |
| `StatusBadge` | ステータス表示（色分け） | Badge |
| `DateRangePicker` | 期間選択 | Calendar + Popover |
| `RichMessageEditor` | LINEメッセージ編集 | 独自（Textarea + ImageUpload） |
| `LinePreview` | LINEメッセージプレビュー | 独自 |
| `ChatBubble` | チャット吹き出し | 独自 |
| `SegmentBuilder` | セグメント条件ビルダー | Select + Input + Button |
| `CalendarView` | 予約カレンダー | 独自（date-fns） |
| `AiInsightCard` | AIインサイト表示カード | Card |
| `ConfirmDialog` | 確認ダイアログ | AlertDialog |
| `FileUpload` | 画像アップロード（D&D対応） | 独自 |
| `EmptyState` | データなし時の表示 | 独自 |
| `LoadingSkeleton` | ローディング表示 | Skeleton |
| `Toast` | 通知トースト | Toast (Sonner) |

---

## 4. アクセス権限設計

### ロール定義

| ロール | 説明 |
|--------|------|
| `admin` | システム管理者。全機能にフルアクセス |
| `operator` | 運用担当者。日常業務操作が可能 |
| `viewer` | 閲覧者。データ参照のみ |

### 権限マトリクス

| 画面/機能 | admin | operator | viewer |
|-----------|-------|----------|--------|
| ダッシュボード閲覧 | o | o | o |
| 顧客一覧・詳細閲覧 | o | o | o |
| 顧客編集・メモ追加 | o | o | x |
| セグメント作成・編集 | o | o | x |
| チャット閲覧 | o | o | o |
| チャット返信・切替 | o | o | x |
| メッセージ作成・配信 | o | o | x |
| イベント作成・編集 | o | o | x |
| イベント閲覧 | o | o | o |
| 予約閲覧 | o | o | o |
| 予約作成・変更・キャンセル | o | o | x |
| 予約枠設定 | o | x | x |
| AIアナリスト閲覧 | o | o | o |
| 設定・ユーザー管理 | o | x | x |
| CSV/PDFエクスポート | o | o | x |

### 実装方針

- Supabase RLS (Row Level Security) でDB層を保護
- Next.js Middleware でルート単位のアクセス制御
- コンポーネント内で `useRole()` フックにより表示/非表示を制御
- APIルートで認可チェック（二重防御）
