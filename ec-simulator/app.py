"""
EC 3大モール売上・利益シミュレーションダッシュボード v2.0
Amazon / 楽天市場 / Yahoo!ショッピング 12ヶ月売上・限界利益シミュレーター
UXガイド機能付き
"""

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots

# ──────────────────────────────────────────────
# Page Config
# ──────────────────────────────────────────────
st.set_page_config(
    page_title="EC 3大モール 売上・利益シミュレーター",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ──────────────────────────────────────────────
# Session State Initialization
# ──────────────────────────────────────────────
if "show_onboarding" not in st.session_state:
    st.session_state["show_onboarding"] = True
if "onboarding_step" not in st.session_state:
    st.session_state["onboarding_step"] = 0
if "csv_downloaded" not in st.session_state:
    st.session_state["csv_downloaded"] = False

# ──────────────────────────────────────────────
# Custom CSS
# ──────────────────────────────────────────────
st.markdown(
    """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700&display=swap');

    html, body, [class*="css"] {
        font-family: 'Noto Sans JP', sans-serif;
    }

    .block-container {
        padding-top: 1.5rem;
        padding-bottom: 1rem;
    }

    /* Header band */
    .header-band {
        background: linear-gradient(135deg, #0f1b2d 0%, #1a3a5c 50%, #234e78 100%);
        color: #ffffff;
        padding: 1.6rem 2rem 1.2rem 2rem;
        border-radius: 12px;
        margin-bottom: 0.6rem;
        box-shadow: 0 4px 20px rgba(15, 27, 45, 0.25);
    }
    .header-band h1 {
        margin: 0; font-size: 1.65rem; font-weight: 700; letter-spacing: 0.02em;
    }
    .header-band p {
        margin: 0.4rem 0 0 0; font-size: 0.88rem; opacity: 0.82; line-height: 1.55;
    }

    /* ── Flow Indicator (Feature C) ── */
    .flow-bar {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0;
        padding: 0.7rem 1rem;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        margin-bottom: 1rem;
        box-shadow: 0 1px 4px rgba(0,0,0,0.04);
    }
    .flow-step {
        display: flex;
        flex-direction: column;
        align-items: center;
        flex: 1;
        position: relative;
    }
    .flow-dot {
        width: 32px; height: 32px;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 0.75rem; font-weight: 700; color: #fff;
        margin-bottom: 0.3rem;
        transition: all 0.3s ease;
    }
    .flow-dot-done { background: #10b981; }
    .flow-dot-active { background: #2563eb; box-shadow: 0 0 0 4px rgba(37,99,235,0.2); }
    .flow-dot-pending { background: #cbd5e1; }
    .flow-label {
        font-size: 0.7rem; font-weight: 500; text-align: center; line-height: 1.2;
    }
    .flow-label-done { color: #10b981; }
    .flow-label-active { color: #2563eb; font-weight: 700; }
    .flow-label-pending { color: #94a3b8; }
    .flow-connector {
        flex: 0.5;
        height: 2px;
        margin-bottom: 1.2rem;
    }
    .flow-conn-done { background: #10b981; }
    .flow-conn-pending { background: #e2e8f0; }

    /* ── Onboarding Modal (Feature A) ── */
    .onboarding-box {
        background: #f0f7ff;
        border-left: 4px solid #2563eb;
        border-radius: 8px;
        padding: 1.2rem 1.5rem;
        margin-bottom: 1rem;
        box-shadow: 0 2px 10px rgba(37,99,235,0.08);
    }
    .onboarding-box h3 {
        margin: 0 0 0.5rem 0; font-size: 1.05rem; color: #1e40af; font-weight: 700;
    }
    .onboarding-box p, .onboarding-box li {
        margin: 0.2rem 0; font-size: 0.88rem; color: #334155; line-height: 1.6;
    }
    .onboarding-box .ob-hint {
        background: #dbeafe; border-radius: 6px; padding: 0.5rem 0.8rem;
        margin-top: 0.5rem; font-size: 0.82rem; color: #1e3a5f;
    }

    /* Metric cards */
    div[data-testid="stMetric"] {
        background: #ffffff !important;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 1rem 1.2rem;
        box-shadow: 0 1px 6px rgba(0,0,0,0.06);
    }
    div[data-testid="stMetric"] label {
        font-weight: 600 !important;
        color: #475569 !important;
        font-size: 0.82rem !important;
    }
    div[data-testid="stMetric"] [data-testid="stMetricValue"] {
        font-size: 1.5rem !important;
        font-weight: 700 !important;
        color: #0f172a !important;
    }

    /* Force light theme on main area */
    .stApp, [data-testid="stAppViewContainer"], .main .block-container {
        background-color: #f9fafb !important;
        color: #1e293b !important;
    }

    /* Tabs text color */
    .stTabs [data-baseweb="tab"] {
        color: #1e293b !important;
    }
    .stTabs [aria-selected="true"] {
        color: #2563eb !important;
    }

    /* Selectbox / input text */
    .stSelectbox div[data-baseweb="select"] span {
        color: #1e293b !important;
    }
    div[data-baseweb="input"] input {
        color: #1e293b !important;
    }

    /* Table header and cells */
    .stDataFrame th {
        color: #1e293b !important;
    }
    .stDataFrame td {
        color: #334155 !important;
    }

    /* Header band - keep white text on dark bg */
    .header-band, .header-band h1, .header-band p {
        color: #ffffff !important;
    }
    .header-band p {
        opacity: 0.82;
    }

    /* Sidebar - force light theme */
    section[data-testid="stSidebar"], section[data-testid="stSidebar"] > div {
        background: #f8fafc !important;
        color: #1e293b !important;
    }
    section[data-testid="stSidebar"] .stMarkdown h3 {
        font-size: 0.95rem;
        color: #1e3a5f !important;
        border-bottom: 2px solid #1e3a5f;
        padding-bottom: 0.3rem;
        margin-top: 0.5rem;
    }
    section[data-testid="stSidebar"] label {
        color: #334155 !important;
    }
    section[data-testid="stSidebar"] .stMarkdown p,
    section[data-testid="stSidebar"] .stMarkdown span {
        color: #334155 !important;
    }
    section[data-testid="stSidebar"] summary span {
        color: #1e293b !important;
    }

    /* Section headers */
    .section-header {
        font-size: 1.1rem;
        font-weight: 700;
        color: #1e293b !important;
        border-left: 4px solid #2563eb;
        padding-left: 0.7rem;
        margin: 1.4rem 0 0.8rem 0;
    }

    /* Force dark text globally on light backgrounds */
    .stMarkdown, .stMarkdown p, .stMarkdown li, .stMarkdown td, .stMarkdown th {
        color: #1e293b !important;
    }
    div[data-testid="stExpander"] summary span {
        color: #1e293b !important;
    }
    div[data-testid="stExpander"] .stMarkdown p,
    div[data-testid="stExpander"] .stMarkdown li,
    div[data-testid="stExpander"] .stMarkdown td,
    div[data-testid="stExpander"] .stMarkdown th {
        color: #334155 !important;
    }
    .stSelectbox label, .stNumberInput label, .stSlider label {
        color: #334155 !important;
    }
    .stCaption, .stCaption p {
        color: #64748b !important;
    }

    /* Plotly chart container - force white background */
    .js-plotly-plot, .plot-container {
        background: #ffffff !important;
    }

    /* Mall badge pills */
    .mall-badge {
        display: inline-block;
        padding: 0.2rem 0.65rem;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
        color: #fff;
        margin-right: 0.3rem;
    }

    .stDataFrame { border-radius: 8px; overflow: hidden; }

    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    </style>
    """,
    unsafe_allow_html=True,
)

# ──────────────────────────────────────────────
# Header
# ──────────────────────────────────────────────
st.markdown(
    """
    <div class="header-band">
        <h1>📊 EC 3大モール 売上・利益シミュレーター</h1>
        <p>Amazon・楽天市場・Yahoo!ショッピングの12ヶ月間の売上・限界利益を、モール固有イベント・広告予算・季節指数を加味してシミュレーションします。<br>
        左側のパネルで各パラメータを調整し、リアルタイムで結果をご確認ください。</p>
    </div>
    """,
    unsafe_allow_html=True,
)

# ──────────────────────────────────────────────
# Sidebar – Input Parameters (with Tooltips §6)
# ──────────────────────────────────────────────
with st.sidebar:
    st.markdown("### ⚙️ シミュレーション設定")

    # --- Mall Selection ---
    with st.expander("🏬 参画モール選択", expanded=True):
        st.caption("シミュレーション対象のモールを選択してください。")
        use_amazon = st.checkbox("🟠 Amazon", value=True, key="use_amazon")
        use_rakuten = st.checkbox("🔴 楽天市場", value=True, key="use_rakuten")
        use_yahoo = st.checkbox("🔵 Yahoo!ショッピング", value=True, key="use_yahoo")

        active_malls = []
        if use_amazon:
            active_malls.append("Amazon")
        if use_rakuten:
            active_malls.append("楽天市場")
        if use_yahoo:
            active_malls.append("Yahoo!")

        if not active_malls:
            st.error("⚠️ 最低1つのモールを選択してください。")
            active_malls = ["Amazon"]  # fallback

    # --- General Settings ---
    with st.expander("🏪 STEP1: 基本設定", expanded=True):
        current_monthly_sales = st.number_input(
            "現状月商 (円)", min_value=0, value=5_000_000, step=100_000, format="%d",
            help="クライアントの直近3ヶ月の平均月商を入力してください。初回は概算でOKです。",
        )
        average_order_value = st.number_input(
            "客単価 (円)", min_value=1, value=5_000, step=100, format="%d",
            help="1注文あたりの平均購入金額。モール管理画面のレポートで確認できます。",
        )
        cogs_rate = st.slider(
            "原価率", 0.0, 1.0, 0.30, 0.01, format="%.2f",
            help="商品仕入原価 ÷ 売上。一般的なEC物販は0.25〜0.40が多いです。",
        )
        organic_traffic_base = st.number_input(
            "月間自然流入数 (UU)", min_value=0, value=30_000, step=1_000, format="%d",
            help="広告を除いた自然検索・お気に入り・リピート等のアクセス数。GAやモールのアクセス解析で確認。",
        )
        base_cvr = st.slider(
            "基礎転換率", 0.001, 0.10, 0.02, 0.001, format="%.3f",
            help="購入数 ÷ アクセス数。ECモールの平均は1〜3%（0.01〜0.03）程度です。",
        )

    # --- Marketing ---
    with st.expander("📣 STEP2: マーケティング設定", expanded=True):
        ad_budget_monthly = st.number_input(
            "月間広告予算 (円)", min_value=0, value=500_000, step=50_000, format="%d",
            help="RPP広告・SP広告等の月間投下予定額。0にすると広告なしのシミュレーションになります。",
        )
        target_cpc = st.number_input(
            "想定CPC (円)", min_value=0, value=50, step=5, format="%d",
            help="広告1クリックあたりの平均費用。モール広告管理画面の実績CPCを参考にしてください。⚠️ 0にはしないでください。",
        )
        expected_roas = st.slider(
            "目標ROAS (倍)", 0.5, 10.0, 3.0, 0.1, format="%.1f",
            help="広告費に対する売上倍率。一般的な目標は3〜5倍。ROAS 3.0 = 広告費1万円で売上3万円。",
        )

    # --- Amazon ---
    if use_amazon:
        with st.expander("🟠 STEP3-a: Amazon 固有設定"):
            buy_box_pct = st.slider(
                "カート取得率", 0.0, 1.0, 0.90, 0.01, format="%.2f",
                help="Amazonで自社商品がカートボックス（Buy Box）を獲得している割合。ビジネスレポートで確認可能。",
            )
            fba_usage = st.slider(
                "FBA利用率", 0.0, 1.0, 0.80, 0.01, format="%.2f",
                help="出荷数に対するFBA（Amazonフルフィルメント）の利用割合。高いほどCVRが向上します。",
            )
            prime_day_boost = st.slider(
                "プライムデー跳ね上げ率 (7月)", 1.0, 5.0, 2.5, 0.1, format="%.1f",
                help="7月のプライムデー期間中のアクセス・売上倍率。過去実績がない場合は2.0〜3.0が目安。",
            )
    else:
        buy_box_pct, fba_usage, prime_day_boost = 0.90, 0.80, 2.5

    # --- Rakuten ---
    if use_rakuten:
        with st.expander("🔴 STEP3-b: 楽天 固有設定"):
            ss_boost = st.slider(
                "楽天SS跳ね上げ率 (3,6,9,12月)", 1.0, 5.0, 3.0, 0.1, format="%.1f",
                help="楽天スーパーSALE（3,6,9,12月）期間中の売上倍率。実績がない場合は2.0〜4.0が目安。",
            )
            point_mult = st.slider(
                "店舗負担ポイント倍率", 1.0, 10.0, 5.0, 0.5, format="%.1f",
                help="店舗独自で設定するポイント倍率。高いほどCVRが上がりますが、原価負担も増えます。",
            )
    else:
        ss_boost, point_mult = 3.0, 5.0

    # --- Yahoo ---
    if use_yahoo:
        with st.expander("🔵 STEP3-c: Yahoo! 固有設定"):
            five_day_boost = st.slider(
                "5のつく日係数", 1.0, 3.0, 1.5, 0.1, format="%.1f",
                help="Yahoo!ショッピングの5のつく日（5,15,25日）によるアクセス増加効果。",
            )
            pr_option_rate = st.slider(
                "PRオプション料率", 0.0, 0.30, 0.05, 0.01, format="%.2f",
                help="Yahoo!ショッピングの検索結果上位表示オプション料率。売上に対して課金されます。",
            )
    else:
        five_day_boost, pr_option_rate = 1.5, 0.05

    # --- Seasonality ---
    with st.expander("📅 STEP3-d: 季節指数 (月別)"):
        st.caption("1.0 = 平月。1.5 = 50%増。0.8 = 20%減。")
        default_seasonality = [0.9, 0.8, 1.2, 1.0, 1.0, 1.3, 1.2, 0.9, 1.2, 1.0, 1.1, 1.5]
        month_labels = [
            "1月", "2月", "3月", "4月", "5月", "6月",
            "7月", "8月", "9月", "10月", "11月", "12月",
        ]
        seasonality = []
        cols = st.columns(2)
        for i in range(12):
            with cols[i % 2]:
                val = st.number_input(
                    month_labels[i], min_value=0.1, max_value=5.0,
                    value=default_seasonality[i], step=0.1, format="%.1f",
                    key=f"season_{i}",
                )
                seasonality.append(val)

    # Onboarding re-trigger button
    st.markdown("---")
    if st.button("❓ 使い方ガイドを表示", use_container_width=True):
        st.session_state["show_onboarding"] = True
        st.session_state["onboarding_step"] = 0
        st.rerun()


# ──────────────────────────────────────────────
# Step Calculation for Flow Indicator
# ──────────────────────────────────────────────
def get_current_step() -> int:
    """Determine which step the user is on based on input state."""
    basic_filled = current_monthly_sales > 0 and average_order_value > 0
    marketing_filled = ad_budget_monthly > 0
    if not basic_filled:
        return 1
    if not marketing_filled:
        return 2
    return 4  # Mall settings always have defaults -> jump to results


current_step = get_current_step()

# ──────────────────────────────────────────────
# Feature C: Flow Indicator
# ──────────────────────────────────────────────
STEPS = [
    ("1", "基本設定"),
    ("2", "広告設定"),
    ("3", "モール設定"),
    ("4", "結果確認"),
    ("5", "出力・共有"),
]


def render_flow_indicator(current: int) -> str:
    """Build the HTML for the step flow bar."""
    html_parts = ['<div class="flow-bar">']
    for i, (num, label) in enumerate(STEPS):
        step_num = int(num)
        if step_num < current:
            dot_cls, lbl_cls = "flow-dot-done", "flow-label-done"
            icon = "✓"
        elif step_num == current:
            dot_cls, lbl_cls = "flow-dot-active", "flow-label-active"
            icon = num
        else:
            dot_cls, lbl_cls = "flow-dot-pending", "flow-label-pending"
            icon = num

        html_parts.append(
            f'<div class="flow-step">'
            f'  <div class="flow-dot {dot_cls}">{icon}</div>'
            f'  <div class="flow-label {lbl_cls}">{label}</div>'
            f'</div>'
        )
        if i < len(STEPS) - 1:
            conn_cls = "flow-conn-done" if step_num < current else "flow-conn-pending"
            html_parts.append(f'<div class="flow-connector {conn_cls}"></div>')

    html_parts.append('</div>')
    return "\n".join(html_parts)


st.markdown(render_flow_indicator(current_step), unsafe_allow_html=True)

# ──────────────────────────────────────────────
# Feature A: Onboarding Tour
# ──────────────────────────────────────────────
ONBOARDING_CONTENT = [
    {
        "title": "🎯 ようこそ！EC 3大モール シミュレーターへ",
        "body": (
            "このダッシュボードでは、Amazon・楽天市場・Yahoo!ショッピングの "
            "12ヶ月間の売上・限界利益を <b>5つのステップ</b> でシミュレーションできます。"
        ),
        "hint": "所要時間：約3〜5分。パラメータを変えるとリアルタイムで結果が更新されます。",
    },
    {
        "title": "🏪 STEP 1/5 : 基本設定を入力",
        "body": (
            "左のサイドバー「🏪 STEP1: 基本設定」を開いて、クライアントの現状数値を入力してください。<br>"
            "<b>📌 ポイント:</b>"
            "<ul>"
            "<li>「現状月商」は直近3ヶ月の平均値が目安です</li>"
            "<li>「基礎転換率」はGoogleアナリティクスやモール管理画面の数値を参照</li>"
            "<li>不明な項目はデフォルト値のままでOKです</li>"
            "</ul>"
        ),
        "hint": "各入力欄の右にある「?」マークにカーソルを合わせると、詳しい説明が表示されます。",
    },
    {
        "title": "📣 STEP 2/5 : マーケティング設定を入力",
        "body": (
            "広告投資のシナリオを設定します。「📣 STEP2: マーケティング設定」を開いてください。<br>"
            "<b>📌 ポイント:</b>"
            "<ul>"
            "<li>CPCは各モールの広告管理画面で確認できます</li>"
            "<li>ROASは過去実績 or 業界水準を入力</li>"
            "<li>広告予算を0にすればオーガニックのみの試算も可能です</li>"
            "</ul>"
        ),
        "hint": "広告費を変えた場合の利益への影響をリアルタイムで確認できます。",
    },
    {
        "title": "🏬 STEP 3/5 : モール固有設定を調整",
        "body": (
            "各モールの特性に応じたパラメータです。デフォルト値は業界標準に基づく推奨値が入っています。<br>"
            "<b>📌 ポイント:</b>"
            "<ul>"
            "<li><b>Amazon</b>: カート取得率が売上に直結します</li>"
            "<li><b>楽天</b>: スーパーSALE月(3,6,9,12月)の効果が非常に大きいです</li>"
            "<li><b>Yahoo!</b>: PRオプション料率はCVR改善に有効です</li>"
            "<li><b>季節指数</b>: クライアントの商材に合わせて月別に調整してください</li>"
            "</ul>"
        ),
        "hint": "上級者向け設定です。まずはデフォルト値で結果を確認し、必要に応じて調整しましょう。",
    },
    {
        "title": "📊 STEP 4/5 : 結果を確認・分析",
        "body": (
            "メイン画面に結果が表示されています。各セクションの見方：<br>"
            "<ul>"
            "<li><b>① サマリー</b>: 年間KPIの全体像を把握</li>"
            "<li><b>② モール別比較</b>: どのモールが最も効率的かを判断</li>"
            "<li><b>③ 月別チャート</b>: トレンドとイベント効果を可視化</li>"
            "<li><b>④ コスト構成</b>: 利益を圧迫する要因を特定</li>"
            "<li><b>⑤ データ表</b>: 細かい数値を確認</li>"
            "</ul>"
        ),
        "hint": "💡 パラメータを変えると全てのグラフ・数値が即時更新されます。プレゼン中のリアルタイムシミュレーションに最適です。",
    },
    {
        "title": "📥 STEP 5/5 : 結果を出力・共有",
        "body": (
            "シミュレーション結果を活用しましょう。<br>"
            "<ul>"
            "<li><b>CSVダウンロード</b> → Excelで追加分析・加工が可能</li>"
            "<li><b>画面キャプチャ</b> → 提案書・報告書に貼付</li>"
            "<li><b>URLをクライアントに共有</b> → 相手自身がパラメータを調整可能</li>"
            "</ul>"
        ),
        "hint": "これでガイドは完了です！各セクションの「ℹ️」を開くと、いつでも詳しい解説を確認できます。",
    },
]


def render_onboarding():
    """Render the onboarding modal step."""
    step = st.session_state["onboarding_step"]
    content = ONBOARDING_CONTENT[step]
    total = len(ONBOARDING_CONTENT)

    st.markdown(
        f'<div class="onboarding-box">'
        f'  <h3>{content["title"]}</h3>'
        f'  <p>{content["body"]}</p>'
        f'  <div class="ob-hint">💡 {content["hint"]}</div>'
        f'</div>',
        unsafe_allow_html=True,
    )

    btn_cols = st.columns([1, 1, 2, 1, 1])
    with btn_cols[1]:
        if step > 0:
            if st.button("← 戻る", key="ob_prev"):
                st.session_state["onboarding_step"] = step - 1
                st.rerun()
    with btn_cols[2]:
        st.caption(f"ステップ {step + 1} / {total}")
    with btn_cols[3]:
        if step < total - 1:
            if st.button("次へ →", key="ob_next"):
                st.session_state["onboarding_step"] = step + 1
                st.rerun()
        else:
            if st.button("✅ 完了", key="ob_done"):
                st.session_state["show_onboarding"] = False
                st.rerun()
    with btn_cols[4]:
        if step < total - 1:
            if st.button("スキップ", key="ob_skip"):
                st.session_state["show_onboarding"] = False
                st.rerun()


if st.session_state["show_onboarding"]:
    render_onboarding()


# ──────────────────────────────────────────────
# Simulation Engine
# ──────────────────────────────────────────────
def run_simulation() -> pd.DataFrame:
    """Run the 12-month simulation for all three malls."""
    records = []
    ad_traffic = (ad_budget_monthly / target_cpc) if target_cpc > 0 else 0

    for m_idx in range(12):
        month_num = m_idx + 1
        s_idx = seasonality[m_idx]

        organic = organic_traffic_base * s_idx
        base_traffic = organic + ad_traffic

        for mall in active_malls:
            traffic = base_traffic
            if mall == "Amazon" and month_num == 7:
                traffic *= prime_day_boost
            elif mall == "楽天市場" and month_num in (3, 6, 9, 12):
                traffic *= ss_boost
            elif mall == "Yahoo!":
                traffic *= five_day_boost

            cvr = base_cvr
            cvr *= (1 + point_mult * 0.01)
            cvr *= (1 + fba_usage * 0.1)

            bb = buy_box_pct if mall == "Amazon" else 1.0
            gross_sales = traffic * cvr * average_order_value * bb

            cogs = gross_sales * cogs_rate
            if mall == "Amazon":
                fee_rate = 0.10
            elif mall == "楽天市場":
                fee_rate = 0.06
            else:
                fee_rate = 0.03 + pr_option_rate
            mall_fee = gross_sales * fee_rate
            contribution = gross_sales - cogs - mall_fee - ad_budget_monthly

            records.append({
                "月": month_labels[m_idx],
                "月番号": month_num,
                "モール": mall,
                "季節指数": s_idx,
                "アクセス数": int(round(traffic)),
                "CVR": round(cvr, 4),
                "売上 (円)": round(gross_sales),
                "原価 (円)": round(cogs),
                "モール手数料 (円)": round(mall_fee),
                "広告費 (円)": ad_budget_monthly,
                "限界利益 (円)": round(contribution),
                "手数料率": fee_rate,
            })
    return pd.DataFrame(records)


df = run_simulation()

# Pre-calculate key metrics
total_sales = df["売上 (円)"].sum()
total_profit = df["限界利益 (円)"].sum()
total_ad = df["広告費 (円)"].sum()
overall_roas = total_sales / total_ad if total_ad > 0 else 0
profit_rate = total_profit / total_sales * 100 if total_sales > 0 else 0

all_mall_colors = {"Amazon": "#FF9900", "楽天市場": "#BF0000", "Yahoo!": "#FF0033"}
mall_colors = {k: v for k, v in all_mall_colors.items() if k in active_malls}


# ──────────────────────────────────────────────
# Feature §7: Context Alerts
# ──────────────────────────────────────────────
def render_context_alerts():
    """Display automatic insight alerts based on simulation results."""
    # Check per-mall annual profit
    for mall in active_malls:
        mall_profit = df[df["モール"] == mall]["限界利益 (円)"].sum()
        if mall_profit < 0:
            st.warning(f"⚠️ **{mall}** の年間限界利益がマイナス（¥{mall_profit:,.0f}）です。広告予算の配分見直しを検討してください。")

    # ROAS check
    if overall_roas < 2.0 and total_ad > 0:
        st.warning(f"⚠️ 全体ROASが **{overall_roas:.2f}倍** と2.0倍を下回っています。CPC改善またはCVR向上施策が必要です。")

    # High profit rate
    if profit_rate > 40:
        st.success(f"✅ 利益率が **{profit_rate:.1f}%** と非常に良好です。広告投資を増やして売上拡大を狙える余地があります。")

    # Single mall dependency
    if len(active_malls) >= 2:
        for mall in active_malls:
            mall_sales = df[df["モール"] == mall]["売上 (円)"].sum()
            share = mall_sales / total_sales * 100 if total_sales > 0 else 0
            if share > 60:
                st.info(f"ℹ️ **{mall}** の売上依存度が **{share:.1f}%** です。リスク分散のため、他モール強化を検討してください。")

    # Red months check
    red_months = []
    for mall in active_malls:
        mall_df = df[df["モール"] == mall]
        neg_months = mall_df[mall_df["限界利益 (円)"] < 0]["月"].tolist()
        for m in neg_months:
            red_months.append(f"{mall}/{m}")
    if red_months and len(red_months) <= 6:
        st.warning(f"⚠️ 赤字月があります: **{', '.join(red_months)}**。季節指数と広告費の関係を確認してください。")
    elif red_months:
        st.warning(f"⚠️ **{len(red_months)}件** の赤字月が検出されました。広告予算の調整を検討してください。")


# ──────────────────────────────────────────────
# Executive Summary
# ──────────────────────────────────────────────
st.markdown('<div class="section-header">📋 エグゼクティブサマリー（年間合計）</div>', unsafe_allow_html=True)

# Feature B: Section Banner
with st.expander("ℹ️ この数値の見方", expanded=False):
    st.markdown(
        """
        | 指標 | 説明 | 目安 |
        |------|------|------|
        | **年間売上合計** | 3モール合算の12ヶ月累計売上 | クライアントの年商目標と比較 |
        | **年間限界利益** | 売上 − 原価 − モール手数料 − 広告費（人件費・固定費は含みません） | プラスであることが最低条件 |
        | **全体ROAS** | 広告費1円あたりの売上 | 3.0倍以上が健全 |
        | **利益率** | 売上に対する限界利益の割合 | EC事業では15〜30%が目安 |
        """
    )

col1, col2, col3, col4 = st.columns(4)
col1.metric("年間売上合計", f"¥{total_sales:,.0f}")
col2.metric("年間限界利益", f"¥{total_profit:,.0f}")
col3.metric("全体ROAS", f"{overall_roas:.2f} 倍")
col4.metric("利益率", f"{profit_rate:.1f}%")

# Context Alerts (§7) - placed after summary
render_context_alerts()

# ──────────────────────────────────────────────
# Mall Summary
# ──────────────────────────────────────────────
st.markdown('<div class="section-header">🏬 モール別 年間サマリー</div>', unsafe_allow_html=True)

with st.expander("ℹ️ モール比較のポイント", expanded=False):
    st.markdown(
        """
        - **売上が最も大きいモール ≠ 利益が最も大きいモール** の場合があります。利益ベースで評価しましょう。
        - **ROAS**: 広告効率を比較。高いモールに予算を寄せる判断材料になります。
        - **構成比**: 売上の偏りを可視化。1モール依存はリスクです（目安: 1モール60%以下が望ましい）。
        """
    )

mall_cols = st.columns(len(mall_colors))
for idx, (mall, color) in enumerate(mall_colors.items()):
    mall_df = df[df["モール"] == mall]
    ms = mall_df["売上 (円)"].sum()
    mp = mall_df["限界利益 (円)"].sum()
    mr = ms / mall_df["広告費 (円)"].sum() if mall_df["広告費 (円)"].sum() > 0 else 0
    share = ms / total_sales * 100 if total_sales > 0 else 0
    with mall_cols[idx]:
        st.markdown(
            f'<span class="mall-badge" style="background:{color};">{mall}</span>',
            unsafe_allow_html=True,
        )
        st.metric("年間売上", f"¥{ms:,.0f}")
        st.metric("年間利益", f"¥{mp:,.0f}")
        st.metric("ROAS / 売上構成比", f"{mr:.2f}倍 / {share:.1f}%")

# ──────────────────────────────────────────────
# Charts
# ──────────────────────────────────────────────
st.markdown('<div class="section-header">📈 月別売上推移</div>', unsafe_allow_html=True)

with st.expander("ℹ️ チャートの読み方", expanded=False):
    st.markdown(
        """
        | タブ | 内容 | 使いどころ |
        |------|------|-----------|
        | **積上げ棒グラフ** | 3モール合計の月間売上規模 | 全体のトレンドを一目で把握 |
        | **折れ線グラフ** | モール別の売上推移を重ねて表示 | モール間の勝ち負けを比較 |
        | **限界利益推移** | モール別の月次利益をグループ表示 | 赤字月の特定、広告費回収の確認 |

        **注目ポイント**: 楽天SS月（3,6,9,12月）やAmazonプライムデー（7月）で売上が跳ねているか確認しましょう。
        """
    )

chart_tab1, chart_tab2, chart_tab3 = st.tabs(["📊 積上げ棒グラフ", "📉 折れ線グラフ", "💰 限界利益推移"])

with chart_tab1:
    fig_bar = px.bar(
        df, x="月", y="売上 (円)", color="モール",
        color_discrete_map=mall_colors, barmode="stack", text_auto=".3s",
        category_orders={"月": month_labels},
    )
    fig_bar.update_layout(
        plot_bgcolor="#fafbfc", paper_bgcolor="#ffffff",
        font=dict(family="Noto Sans JP, sans-serif", size=12, color="#1e293b"),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="center", x=0.5, font=dict(color="#1e293b")),
        yaxis_title="売上 (円)", xaxis_title="",
        margin=dict(l=20, r=20, t=40, b=20), height=420,
        xaxis=dict(tickfont=dict(color="#1e293b")), yaxis=dict(tickfont=dict(color="#1e293b")),
    )
    fig_bar.update_traces(textposition="inside", textfont_size=10)
    st.plotly_chart(fig_bar, use_container_width=True)

with chart_tab2:
    fig_line = px.line(
        df, x="月", y="売上 (円)", color="モール", markers=True,
        color_discrete_map=mall_colors, category_orders={"月": month_labels},
    )
    fig_line.update_layout(
        plot_bgcolor="#fafbfc", paper_bgcolor="#ffffff",
        font=dict(family="Noto Sans JP, sans-serif", size=12, color="#1e293b"),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="center", x=0.5, font=dict(color="#1e293b")),
        yaxis_title="売上 (円)", xaxis_title="",
        margin=dict(l=20, r=20, t=40, b=20), height=420,
        xaxis=dict(tickfont=dict(color="#1e293b")), yaxis=dict(tickfont=dict(color="#1e293b")),
    )
    st.plotly_chart(fig_line, use_container_width=True)

with chart_tab3:
    fig_profit = px.bar(
        df, x="月", y="限界利益 (円)", color="モール",
        color_discrete_map=mall_colors, barmode="group", text_auto=".3s",
        category_orders={"月": month_labels},
    )
    fig_profit.update_layout(
        plot_bgcolor="#fafbfc", paper_bgcolor="#ffffff",
        font=dict(family="Noto Sans JP, sans-serif", size=12, color="#1e293b"),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="center", x=0.5, font=dict(color="#1e293b")),
        yaxis_title="限界利益 (円)", xaxis_title="",
        margin=dict(l=20, r=20, t=40, b=20), height=420,
        xaxis=dict(tickfont=dict(color="#1e293b")), yaxis=dict(tickfont=dict(color="#1e293b")),
    )
    st.plotly_chart(fig_profit, use_container_width=True)

# ──────────────────────────────────────────────
# Cost Composition
# ──────────────────────────────────────────────
st.markdown('<div class="section-header">🧩 コスト構成分析</div>', unsafe_allow_html=True)

with st.expander("ℹ️ コスト構成の見方", expanded=False):
    st.markdown(
        """
        | チャート | 内容 | アクション |
        |----------|------|-----------|
        | **左: 年間コスト構成** | 売上がどのように分配されるかの全体構造 | 原価率が高い → 商品戦略見直し / 手数料が高い → モール選定見直し / 広告費が高い → CPC改善 or オーガニック強化 |
        | **右: モール別売上構成比** | 3モール間の売上シェア | 偏りがないか確認。1モール依存はリスク |
        """
    )

cost_col1, cost_col2 = st.columns(2)

with cost_col1:
    cost_data = {
        "項目": ["原価", "モール手数料", "広告費", "限界利益"],
        "金額": [
            df["原価 (円)"].sum(),
            df["モール手数料 (円)"].sum(),
            df["広告費 (円)"].sum(),
            max(df["限界利益 (円)"].sum(), 0),
        ],
    }
    fig_pie = px.pie(
        pd.DataFrame(cost_data), values="金額", names="項目", color="項目",
        color_discrete_map={
            "原価": "#64748b", "モール手数料": "#f59e0b",
            "広告費": "#3b82f6", "限界利益": "#10b981",
        },
        hole=0.45,
    )
    fig_pie.update_layout(
        font=dict(family="Noto Sans JP, sans-serif", size=12, color="#1e293b"),
        margin=dict(l=10, r=10, t=30, b=10), height=350,
        title=dict(text="年間コスト構成", font_size=14, font_color="#1e293b"),
        legend=dict(font=dict(color="#1e293b")),
    )
    fig_pie.update_traces(textinfo="label+percent", textfont_size=11)
    st.plotly_chart(fig_pie, use_container_width=True)

with cost_col2:
    share_data = df.groupby("モール")["売上 (円)"].sum().reset_index()
    fig_share = px.pie(
        share_data, values="売上 (円)", names="モール", color="モール",
        color_discrete_map=mall_colors, hole=0.45,
    )
    fig_share.update_layout(
        font=dict(family="Noto Sans JP, sans-serif", size=12, color="#1e293b"),
        margin=dict(l=10, r=10, t=30, b=10), height=350,
        title=dict(text="モール別売上構成比", font_size=14, font_color="#1e293b"),
        legend=dict(font=dict(color="#1e293b")),
    )
    fig_share.update_traces(textinfo="label+percent", textfont_size=11)
    st.plotly_chart(fig_share, use_container_width=True)

# ──────────────────────────────────────────────
# Detailed Data Table
# ──────────────────────────────────────────────
st.markdown('<div class="section-header">📋 月別詳細データ</div>', unsafe_allow_html=True)

with st.expander("ℹ️ データテーブルの使い方", expanded=False):
    st.markdown(
        """
        - **モール選択**: プルダウンで特定モールに絞り込めます。
        - **列ヘッダークリック**: ソート（昇順/降順）が可能です。
        - **CVR列**: 転換率が低い月は集客の質に課題がある可能性があります。
        - **限界利益がマイナスの月**: 広告投資の見直しポイントです。
        - CSVダウンロードしてExcelで追加分析も可能です。
        """
    )

table_mall = st.selectbox("モール選択", ["全モール"] + active_malls)

display_df = df.copy()
if table_mall != "全モール":
    display_df = display_df[display_df["モール"] == table_mall]

display_cols = [
    "月", "モール", "季節指数", "アクセス数", "CVR",
    "売上 (円)", "原価 (円)", "モール手数料 (円)", "広告費 (円)", "限界利益 (円)",
]
styled = display_df[display_cols].style.format({
    "季節指数": "{:.1f}",
    "アクセス数": "{:,.0f}",
    "CVR": "{:.3f}",
    "売上 (円)": "¥{:,.0f}",
    "原価 (円)": "¥{:,.0f}",
    "モール手数料 (円)": "¥{:,.0f}",
    "広告費 (円)": "¥{:,.0f}",
    "限界利益 (円)": "¥{:,.0f}",
})

st.dataframe(styled, use_container_width=True, height=460)

# ──────────────────────────────────────────────
# CSV Download
# ──────────────────────────────────────────────
csv_data = df[display_cols].to_csv(index=False).encode("utf-8-sig")
st.download_button(
    label="📥 CSVダウンロード",
    data=csv_data,
    file_name="ec_simulation_result.csv",
    mime="text/csv",
)

# ──────────────────────────────────────────────
# Glossary
# ──────────────────────────────────────────────
st.markdown('<div class="section-header">📖 用語集</div>', unsafe_allow_html=True)

with st.expander("ℹ️ ダッシュボードで使用する用語の説明", expanded=False):
    st.markdown(
        """
        | 用語 | 説明 |
        |------|------|
        | **限界利益** | 売上から変動費（原価・手数料・広告費）を引いた利益。固定費（人件費・家賃等）は含まない |
        | **ROAS** | Return On Advertising Spend。広告費に対する売上の倍率 |
        | **CVR** | Conversion Rate（転換率）。アクセスに対する購入の割合 |
        | **CPC** | Cost Per Click。広告1クリックあたりの費用 |
        | **カート取得率** | Amazonで自社がBuy Boxを獲得している割合 |
        | **FBA** | Fulfillment by Amazon。Amazonの倉庫・配送サービス |
        | **楽天SS** | 楽天スーパーSALE。年4回（3,6,9,12月）開催される大型セール |
        | **PRオプション** | Yahoo!ショッピングの検索結果上位表示の有料オプション |
        | **季節指数** | 月ごとの需要変動を表す係数（1.0 = 平月） |
        """
    )

# ──────────────────────────────────────────────
# Footer
# ──────────────────────────────────────────────
st.markdown("---")
st.markdown(
    "<div style='text-align:center; color:#94a3b8; font-size:0.78rem;'>"
    "EC 3大モール売上・利益シミュレーター v2.0 ｜ シミュレーション結果は概算値です。実績と異なる場合があります。"
    "</div>",
    unsafe_allow_html=True,
)
