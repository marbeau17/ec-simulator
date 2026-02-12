"""
EC 3大モール売上・利益シミュレーションダッシュボード v3.0
Amazon / 楽天市場 / Yahoo!ショッピング
3プラン比較機能（プラチナ・ゴールド・シルバー）付き
"""

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import numpy as np

# ══════════════════════════════════════════════
# Page Config
# ══════════════════════════════════════════════
st.set_page_config(
    page_title="EC 3大モール 売上・利益シミュレーター",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ══════════════════════════════════════════════
# Session State
# ══════════════════════════════════════════════
if "show_onboarding" not in st.session_state:
    st.session_state["show_onboarding"] = True
if "onboarding_step" not in st.session_state:
    st.session_state["onboarding_step"] = 0

# ══════════════════════════════════════════════
# Plan color constants
# ══════════════════════════════════════════════
PLAN_COLORS = {
    "🥈 シルバー": "#94a3b8",
    "🥇 ゴールド": "#f59e0b",
    "💎 プラチナ": "#6366f1",
}
PLAN_BG = {
    "🥈 シルバー": "#f1f5f9",
    "🥇 ゴールド": "#fffbeb",
    "💎 プラチナ": "#eef2ff",
}
ALL_MALL_COLORS = {"Amazon": "#FF9900", "楽天市場": "#BF0000", "Yahoo!": "#FF0033"}

# ══════════════════════════════════════════════
# CSS
# ══════════════════════════════════════════════
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700&display=swap');
html, body, [class*="css"] { font-family: 'Noto Sans JP', sans-serif; }
.block-container { padding-top: 1.5rem; padding-bottom: 1rem; }

/* Header */
.header-band {
    background: linear-gradient(135deg, #0f1b2d 0%, #1a3a5c 50%, #234e78 100%);
    color: #ffffff; padding: 1.6rem 2rem 1.2rem 2rem;
    border-radius: 12px; margin-bottom: 0.6rem;
    box-shadow: 0 4px 20px rgba(15,27,45,0.25);
}
.header-band h1 { margin:0; font-size:1.65rem; font-weight:700; }
.header-band p { margin:0.4rem 0 0 0; font-size:0.88rem; opacity:0.82; line-height:1.55; }
.header-band, .header-band h1, .header-band p { color: #ffffff !important; }

/* Flow Indicator */
.flow-bar { display:flex; align-items:center; justify-content:center; gap:0;
    padding:0.7rem 1rem; background:#fff; border:1px solid #e2e8f0;
    border-radius:10px; margin-bottom:1rem; box-shadow:0 1px 4px rgba(0,0,0,0.04); }
.flow-step { display:flex; flex-direction:column; align-items:center; flex:1; }
.flow-dot { width:32px; height:32px; border-radius:50%; display:flex;
    align-items:center; justify-content:center; font-size:0.75rem;
    font-weight:700; color:#fff; margin-bottom:0.3rem; }
.flow-dot-done { background:#10b981; }
.flow-dot-active { background:#2563eb; box-shadow:0 0 0 4px rgba(37,99,235,0.2); }
.flow-dot-pending { background:#cbd5e1; }
.flow-label { font-size:0.7rem; font-weight:500; text-align:center; }
.flow-label-done { color:#10b981; }
.flow-label-active { color:#2563eb; font-weight:700; }
.flow-label-pending { color:#94a3b8; }
.flow-connector { flex:0.5; height:2px; margin-bottom:1.2rem; }
.flow-conn-done { background:#10b981; }
.flow-conn-pending { background:#e2e8f0; }

/* Onboarding */
.onboarding-box { background:#f0f7ff; border-left:4px solid #2563eb;
    border-radius:8px; padding:1.2rem 1.5rem; margin-bottom:1rem; }
.onboarding-box h3 { margin:0 0 0.5rem 0; font-size:1.05rem; color:#1e40af; font-weight:700; }
.onboarding-box p, .onboarding-box li { margin:0.2rem 0; font-size:0.88rem; color:#334155; line-height:1.6; }
.onboarding-box .ob-hint { background:#dbeafe; border-radius:6px; padding:0.5rem 0.8rem;
    margin-top:0.5rem; font-size:0.82rem; color:#1e3a5f; }

/* Section headers */
.section-header { font-size:1.1rem; font-weight:700; color:#1e293b !important;
    border-left:4px solid #2563eb; padding-left:0.7rem; margin:1.4rem 0 0.8rem 0; }

/* Metric cards */
div[data-testid="stMetric"] { background:#fff !important; border:1px solid #e2e8f0;
    border-radius:10px; padding:1rem 1.2rem; box-shadow:0 1px 6px rgba(0,0,0,0.06); }
div[data-testid="stMetric"] label { font-weight:600 !important; color:#475569 !important; font-size:0.82rem !important; }
div[data-testid="stMetric"] [data-testid="stMetricValue"] { font-size:1.5rem !important; font-weight:700 !important; color:#0f172a !important; }

/* Plan cards */
.plan-card { border-radius:12px; padding:1.2rem; margin-bottom:0.5rem; border:1px solid #e2e8f0; }
.plan-card-silver { background:#f8fafc; border-color:#cbd5e1; }
.plan-card-gold { background:#fffbeb; border:2px solid #f59e0b; box-shadow:0 2px 12px rgba(245,158,11,0.15); }
.plan-card-platinum { background:#eef2ff; border-color:#a5b4fc; }
.plan-card h4 { margin:0 0 0.6rem 0; font-size:1rem; font-weight:700; }
.plan-card .plan-value { font-size:1.3rem; font-weight:700; color:#0f172a; margin:0.1rem 0; }
.plan-card .plan-label { font-size:0.75rem; color:#64748b; margin:0; }
.plan-card .plan-diff { font-size:0.78rem; padding:0.15rem 0.4rem; border-radius:4px; display:inline-block; margin-top:0.3rem; }
.plan-diff-up { background:#dcfce7; color:#166534; }
.plan-diff-down { background:#fee2e2; color:#991b1b; }
.recommend-badge { background:#f59e0b; color:#fff; font-size:0.7rem; font-weight:700;
    padding:0.15rem 0.5rem; border-radius:10px; margin-left:0.3rem; vertical-align:middle; }

/* Consultant box */
.consul-box { background:linear-gradient(135deg,#f0fdf4,#ecfdf5); border-left:4px solid #10b981;
    border-radius:8px; padding:1.2rem 1.5rem; margin:1rem 0; }
.consul-box h4 { margin:0 0 0.5rem 0; color:#065f46; font-size:0.95rem; }
.consul-box p, .consul-box li { font-size:0.88rem; color:#1e293b; line-height:1.7; margin:0.2rem 0; }

/* Force light theme */
.stApp, [data-testid="stAppViewContainer"], .main .block-container {
    background-color:#f9fafb !important; color:#1e293b !important; }
.stMarkdown, .stMarkdown p, .stMarkdown li, .stMarkdown td, .stMarkdown th { color:#1e293b !important; }
div[data-testid="stExpander"] summary span { color:#1e293b !important; }
div[data-testid="stExpander"] .stMarkdown p, div[data-testid="stExpander"] .stMarkdown li,
div[data-testid="stExpander"] .stMarkdown td, div[data-testid="stExpander"] .stMarkdown th { color:#334155 !important; }
.stSelectbox label, .stNumberInput label, .stSlider label { color:#334155 !important; }
.stTabs [data-baseweb="tab"] { color:#1e293b !important; }
.stTabs [aria-selected="true"] { color:#2563eb !important; }
.stDataFrame th { color:#1e293b !important; }
.stDataFrame td { color:#334155 !important; }
.js-plotly-plot, .plot-container { background:#ffffff !important; }

/* Sidebar */
section[data-testid="stSidebar"], section[data-testid="stSidebar"] > div {
    background:#f8fafc !important; color:#1e293b !important; }
section[data-testid="stSidebar"] .stMarkdown h3 { font-size:0.95rem; color:#1e3a5f !important;
    border-bottom:2px solid #1e3a5f; padding-bottom:0.3rem; margin-top:0.5rem; }
section[data-testid="stSidebar"] label { color:#334155 !important; }
section[data-testid="stSidebar"] summary span { color:#1e293b !important; }

.mall-badge { display:inline-block; padding:0.2rem 0.65rem; border-radius:20px;
    font-size:0.75rem; font-weight:600; color:#fff; margin-right:0.3rem; }
.stDataFrame { border-radius:8px; overflow:hidden; }
#MainMenu {visibility:hidden;} footer {visibility:hidden;} header {visibility:hidden;}
</style>
""", unsafe_allow_html=True)

# ══════════════════════════════════════════════
# Header
# ══════════════════════════════════════════════
st.markdown("""
<div class="header-band">
    <h1>📊 EC 3大モール 売上・利益シミュレーター</h1>
    <p>Amazon・楽天市場・Yahoo!ショッピングの12ヶ月間の売上・限界利益をシミュレーション。<br>
    3プラン（プラチナ・ゴールド・シルバー）の比較シミュレーションで、最適な投資プランを提案できます。</p>
</div>
""", unsafe_allow_html=True)

# ══════════════════════════════════════════════
# Sidebar
# ══════════════════════════════════════════════
with st.sidebar:
    st.markdown("### ⚙️ シミュレーション設定")

    # ── Mall Selection ──
    with st.expander("🏬 参画モール選択", expanded=True):
        st.caption("対象モールを選択してください。")
        use_amazon = st.checkbox("🟠 Amazon", value=True, key="use_amazon")
        use_rakuten = st.checkbox("🔴 楽天市場", value=True, key="use_rakuten")
        use_yahoo = st.checkbox("🔵 Yahoo!ショッピング", value=True, key="use_yahoo")
        active_malls = []
        if use_amazon: active_malls.append("Amazon")
        if use_rakuten: active_malls.append("楽天市場")
        if use_yahoo: active_malls.append("Yahoo!")
        if not active_malls:
            st.error("⚠️ 最低1つのモールを選択してください。")
            active_malls = ["Amazon"]

    # ── Simulation Mode ──
    with st.expander("📊 シミュレーションモード", expanded=True):
        sim_mode = st.radio(
            "モード選択", ["単一プラン（従来モード）", "3プラン比較モード"],
            help="3プラン比較では、シルバー/ゴールド/プラチナの3パターンを同時シミュレーションします。",
        )
        is_multi_plan = sim_mode == "3プラン比較モード"

    # ── Basic Settings ──
    with st.expander("🏪 STEP1: 基本設定", expanded=True):
        current_monthly_sales = st.number_input(
            "現状月商 (円)", min_value=0, value=5_000_000, step=100_000, format="%d",
            help="クライアントの直近3ヶ月の平均月商を入力してください。")
        average_order_value = st.number_input(
            "客単価 (円)", min_value=1, value=5_000, step=100, format="%d",
            help="1注文あたりの平均購入金額。")
        cogs_rate = st.slider("原価率", 0.0, 1.0, 0.30, 0.01, format="%.2f",
            help="商品仕入原価 ÷ 売上。EC物販は0.25〜0.40が目安。")
        organic_traffic_base = st.number_input(
            "月間自然流入数 (UU)", min_value=0, value=30_000, step=1_000, format="%d",
            help="広告を除いた自然検索等のアクセス数。")
        base_cvr = st.slider("基礎転換率", 0.001, 0.10, 0.02, 0.001, format="%.3f",
            help="購入数÷アクセス数。平均1〜3%。")

    # ── Marketing Settings ──
    with st.expander("📣 STEP2: マーケティング設定", expanded=True):
        ad_budget_monthly = st.number_input(
            "月間広告予算 (円)", min_value=0, value=500_000, step=50_000, format="%d",
            help="月間広告投下額。3プランモードではゴールドの基準額になります。")
        target_cpc = st.number_input(
            "想定CPC (円)", min_value=1, value=50, step=5, format="%d",
            help="広告1クリックあたりの費用。")
        expected_roas = st.slider("目標ROAS (倍)", 0.5, 10.0, 3.0, 0.1, format="%.1f")

    # ── Mall Specific ──
    if use_amazon:
        with st.expander("🟠 STEP3-a: Amazon 固有設定"):
            buy_box_pct = st.slider("カート取得率", 0.0, 1.0, 0.90, 0.01, format="%.2f",
                help="Buy Box獲得割合。")
            fba_usage = st.slider("FBA利用率", 0.0, 1.0, 0.80, 0.01, format="%.2f")
            prime_day_boost = st.slider("プライムデー跳ね上げ率 (7月)", 1.0, 5.0, 2.5, 0.1, format="%.1f")
    else:
        buy_box_pct, fba_usage, prime_day_boost = 0.90, 0.80, 2.5

    if use_rakuten:
        with st.expander("🔴 STEP3-b: 楽天 固有設定"):
            ss_boost = st.slider("楽天SS跳ね上げ率 (3,6,9,12月)", 1.0, 5.0, 3.0, 0.1, format="%.1f")
            point_mult = st.slider("店舗負担ポイント倍率", 1.0, 10.0, 5.0, 0.5, format="%.1f")
    else:
        ss_boost, point_mult = 3.0, 5.0

    if use_yahoo:
        with st.expander("🔵 STEP3-c: Yahoo! 固有設定"):
            five_day_boost = st.slider("5のつく日係数", 1.0, 3.0, 1.5, 0.1, format="%.1f")
            pr_option_rate = st.slider("PRオプション料率", 0.0, 0.30, 0.05, 0.01, format="%.2f")
    else:
        five_day_boost, pr_option_rate = 1.5, 0.05

    # ── Seasonality ──
    with st.expander("📅 季節指数 (月別)"):
        st.caption("1.0 = 平月。1.5 = 50%増。0.8 = 20%減。")
        default_seasonality = [0.9, 0.8, 1.2, 1.0, 1.0, 1.3, 1.2, 0.9, 1.2, 1.0, 1.1, 1.5]
        month_labels = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"]
        seasonality = []
        scols = st.columns(2)
        for i in range(12):
            with scols[i % 2]:
                val = st.number_input(month_labels[i], 0.1, 5.0, default_seasonality[i], 0.1,
                    format="%.1f", key=f"season_{i}")
                seasonality.append(val)

    # ── Plan Settings (3-plan mode only) ──
    if is_multi_plan:
        with st.expander("📋 STEP4: プラン設定", expanded=True):
            st.caption("各プランの倍率を調整。ゴールドが基準（×1.0）です。")

            st.markdown("**🥈 シルバー（現状維持）**")
            silver_ad = st.slider("広告予算倍率", 0.1, 2.0, 0.5, 0.1, key="s_ad", format="%.1f")
            silver_cvr = st.slider("CVR補正", 0.8, 1.5, 1.00, 0.05, key="s_cvr", format="%.2f")
            silver_trf = st.slider("流入補正", 0.8, 2.0, 1.00, 0.05, key="s_trf", format="%.2f")

            st.markdown("**🥇 ゴールド（成長投資）**")
            gold_ad = st.slider("広告予算倍率", 0.5, 3.0, 1.0, 0.1, key="g_ad", format="%.1f")
            gold_cvr = st.slider("CVR補正", 0.8, 1.5, 1.05, 0.05, key="g_cvr", format="%.2f")
            gold_trf = st.slider("流入補正", 0.8, 2.0, 1.10, 0.05, key="g_trf", format="%.2f")

            st.markdown("**💎 プラチナ（攻めの投資）**")
            plat_ad = st.slider("広告予算倍率", 1.0, 5.0, 2.0, 0.1, key="p_ad", format="%.1f")
            plat_cvr = st.slider("CVR補正", 0.8, 2.0, 1.15, 0.05, key="p_cvr", format="%.2f")
            plat_trf = st.slider("流入補正", 0.8, 3.0, 1.25, 0.05, key="p_trf", format="%.2f")
    else:
        silver_ad, silver_cvr, silver_trf = 0.5, 1.0, 1.0
        gold_ad, gold_cvr, gold_trf = 1.0, 1.05, 1.1
        plat_ad, plat_cvr, plat_trf = 2.0, 1.15, 1.25

    # ── Re-show guide ──
    st.markdown("---")
    if st.button("❓ 使い方ガイドを表示", use_container_width=True):
        st.session_state["show_onboarding"] = True
        st.session_state["onboarding_step"] = 0
        st.rerun()

# ══════════════════════════════════════════════
# Flow Indicator
# ══════════════════════════════════════════════
steps_def = [("1","基本設定"),("2","広告設定"),("3","モール設定"),
             ("4","プラン設定" if is_multi_plan else "結果確認"),("5","結果確認" if is_multi_plan else "出力")]
current_step = 4 if not is_multi_plan else 5

def render_flow(cur):
    h = ['<div class="flow-bar">']
    for i,(n,l) in enumerate(steps_def):
        sn = int(n)
        if sn < cur: dc,lc,ic = "flow-dot-done","flow-label-done","✓"
        elif sn == cur: dc,lc,ic = "flow-dot-active","flow-label-active",n
        else: dc,lc,ic = "flow-dot-pending","flow-label-pending",n
        h.append(f'<div class="flow-step"><div class="flow-dot {dc}">{ic}</div><div class="flow-label {lc}">{l}</div></div>')
        if i < len(steps_def)-1:
            cc = "flow-conn-done" if sn < cur else "flow-conn-pending"
            h.append(f'<div class="flow-connector {cc}"></div>')
    h.append('</div>')
    return "\n".join(h)

st.markdown(render_flow(current_step), unsafe_allow_html=True)

# ══════════════════════════════════════════════
# Onboarding (simplified for v3)
# ══════════════════════════════════════════════
if st.session_state["show_onboarding"]:
    OB = [
        ("🎯 ようこそ！EC 3大モール シミュレーターへ",
         "Amazon・楽天市場・Yahoo!ショッピングの12ヶ月間の売上・限界利益をシミュレーションできます。<br>"
         "<b>3プラン比較モード</b>では、シルバー/ゴールド/プラチナの投資プランを同時に比較できます。",
         "左サイドバーの「シミュレーションモード」で3プラン比較を選択してください。"),
    ]
    step = min(st.session_state["onboarding_step"], len(OB)-1)
    t, b, hint = OB[step]
    st.markdown(f'<div class="onboarding-box"><h3>{t}</h3><p>{b}</p>'
                f'<div class="ob-hint">💡 {hint}</div></div>', unsafe_allow_html=True)
    if st.button("✅ ガイドを閉じる", key="ob_close"):
        st.session_state["show_onboarding"] = False
        st.rerun()

# ══════════════════════════════════════════════
# Simulation Engine
# ══════════════════════════════════════════════
def run_sim(plan_name, ad_mult, cvr_mult, trf_mult):
    """Run 12-month simulation for a given plan and all active malls."""
    records = []
    plan_ad = ad_budget_monthly * ad_mult
    plan_organic = organic_traffic_base * trf_mult
    plan_cvr_base = base_cvr * cvr_mult
    ad_traffic = (plan_ad / target_cpc) if target_cpc > 0 else 0

    for m_idx in range(12):
        mn = m_idx + 1
        si = seasonality[m_idx]
        organic = plan_organic * si
        base_traffic = organic + ad_traffic

        for mall in active_malls:
            traffic = base_traffic
            if mall == "Amazon" and mn == 7: traffic *= prime_day_boost
            elif mall == "楽天市場" and mn in (3,6,9,12): traffic *= ss_boost
            elif mall == "Yahoo!": traffic *= five_day_boost

            cvr = plan_cvr_base * (1 + point_mult * 0.01) * (1 + fba_usage * 0.1)
            bb = buy_box_pct if mall == "Amazon" else 1.0
            sales = traffic * cvr * average_order_value * bb
            cogs = sales * cogs_rate
            if mall == "Amazon": fr = 0.10
            elif mall == "楽天市場": fr = 0.06
            else: fr = 0.03 + pr_option_rate
            fee = sales * fr
            profit = sales - cogs - fee - plan_ad

            records.append({
                "プラン": plan_name, "月": month_labels[m_idx], "月番号": mn,
                "モール": mall, "季節指数": si,
                "アクセス数": int(round(traffic)), "CVR": round(cvr, 4),
                "売上 (円)": round(sales), "原価 (円)": round(cogs),
                "モール手数料 (円)": round(fee), "広告費 (円)": round(plan_ad),
                "限界利益 (円)": round(profit), "手数料率": fr,
            })
    return records

# Build data
plan_configs = {
    "🥈 シルバー": (silver_ad, silver_cvr, silver_trf),
    "🥇 ゴールド": (gold_ad, gold_cvr, gold_trf),
    "💎 プラチナ": (plat_ad, plat_cvr, plat_trf),
}

if is_multi_plan:
    all_records = []
    for pname, (a, c, t) in plan_configs.items():
        all_records.extend(run_sim(pname, a, c, t))
    df_all = pd.DataFrame(all_records)
    plans_list = list(plan_configs.keys())
else:
    all_records = run_sim("単一プラン", 1.0, 1.0, 1.0)
    df_all = pd.DataFrame(all_records)
    plans_list = ["単一プラン"]

mall_colors = {k: v for k, v in ALL_MALL_COLORS.items() if k in active_malls}

# ══════════════════════════════════════════════
# Helper: Plan summary stats
# ══════════════════════════════════════════════
def plan_stats(df, plan_name):
    pdf = df[df["プラン"] == plan_name]
    s = pdf["売上 (円)"].sum()
    p = pdf["限界利益 (円)"].sum()
    a = pdf["広告費 (円)"].sum()
    r = s / a if a > 0 else 0
    pr = p / s * 100 if s > 0 else 0
    return {"sales": s, "profit": p, "ad": a, "roas": r, "profit_rate": pr}


# ██████████████████████████████████████████████
#  MULTI-PLAN MODE
# ██████████████████████████████████████████████
if is_multi_plan:

    # ── Plan Comparison Summary ──
    st.markdown('<div class="section-header">📋 3プラン比較サマリー（年間）</div>', unsafe_allow_html=True)

    with st.expander("ℹ️ プラン比較の見方", expanded=False):
        st.markdown("""
        | プラン | コンセプト | 特徴 |
        |--------|-----------|------|
        | **🥈 シルバー** | 現状維持 | 広告費を抑え、リスク最小。成長は緩やか |
        | **🥇 ゴールド** | 成長投資 | バランス型。着実な売上拡大を狙う（★推奨基準） |
        | **💎 プラチナ** | 攻めの投資 | 広告・施策をフル投入。急成長だが投資リスクあり |

        ゴールドを基準に、シルバー・プラチナの増減率を表示しています。
        """)

    stats = {p: plan_stats(df_all, p) for p in plans_list}
    gold_s = stats["🥇 ゴールド"]

    pcols = st.columns(3)
    for idx, (pname, css_cls) in enumerate([
        ("🥈 シルバー", "plan-card-silver"),
        ("🥇 ゴールド", "plan-card-gold"),
        ("💎 プラチナ", "plan-card-platinum"),
    ]):
        s = stats[pname]
        with pcols[idx]:
            badge = '<span class="recommend-badge">★推奨</span>' if pname == "🥇 ゴールド" else ""
            # Diff vs Gold
            if pname != "🥇 ゴールド" and gold_s["sales"] > 0:
                sd = (s["sales"] - gold_s["sales"]) / gold_s["sales"] * 100
                pd_ = (s["profit"] - gold_s["profit"]) / gold_s["profit"] * 100 if gold_s["profit"] != 0 else 0
                diff_cls_s = "plan-diff-up" if sd >= 0 else "plan-diff-down"
                diff_cls_p = "plan-diff-up" if pd_ >= 0 else "plan-diff-down"
                diff_html = (f'<p class="plan-label">対ゴールド</p>'
                             f'<span class="plan-diff {diff_cls_s}">売上 {sd:+.0f}%</span> '
                             f'<span class="plan-diff {diff_cls_p}">利益 {pd_:+.0f}%</span>')
            else:
                diff_html = '<p class="plan-label">── 基準プラン ──</p>'

            st.markdown(f"""
            <div class="plan-card {css_cls}">
                <h4>{pname}{badge}</h4>
                <p class="plan-label">年間売上</p>
                <p class="plan-value">¥{s["sales"]:,.0f}</p>
                <p class="plan-label">年間限界利益</p>
                <p class="plan-value">¥{s["profit"]:,.0f}</p>
                <p class="plan-label">年間広告費</p>
                <p class="plan-value">¥{s["ad"]:,.0f}</p>
                <p class="plan-label">ROAS: {s["roas"]:.2f}倍 ／ 利益率: {s["profit_rate"]:.1f}%</p>
                {diff_html}
            </div>
            """, unsafe_allow_html=True)

    # ── Investment ROI Summary ──
    st.markdown('<div class="section-header">💡 投資対効果分析</div>', unsafe_allow_html=True)

    silver_s = stats["🥈 シルバー"]
    roi_cols = st.columns(2)
    for idx, pname in enumerate(["🥇 ゴールド", "💎 プラチナ"]):
        s = stats[pname]
        inc_ad = s["ad"] - silver_s["ad"]
        inc_sales = s["sales"] - silver_s["sales"]
        inc_profit = s["profit"] - silver_s["profit"]
        inc_roas = inc_sales / inc_ad if inc_ad > 0 else 0
        inc_roi = inc_profit / inc_ad if inc_ad > 0 else 0
        with roi_cols[idx]:
            st.markdown(f"**{pname}（対シルバー）**")
            c1, c2 = st.columns(2)
            c1.metric("追加投資額/年", f"¥{inc_ad:,.0f}")
            c2.metric("追加売上/年", f"¥{inc_sales:,.0f}")
            c3, c4 = st.columns(2)
            c3.metric("追加利益/年", f"¥{inc_profit:,.0f}")
            c4.metric("追加投資ROAS", f"{inc_roas:.2f}倍")

    # ── Recommend & Consultant Comment ──
    def recommend():
        recs = []
        for pname in ["💎 プラチナ", "🥇 ゴールド"]:
            s = stats[pname]
            inc_ad = s["ad"] - silver_s["ad"]
            inc_roas = (s["sales"] - silver_s["sales"]) / inc_ad if inc_ad > 0 else 0
            if s["profit"] > 0 and inc_roas >= 3.0 and s["profit_rate"] >= 15:
                recs.append(pname)
        return recs if recs else ["🥈 シルバー"]

    recs = recommend()
    top_rec = recs[0]

    # Build comment
    top_s = stats[top_rec]
    inc_ad = top_s["ad"] - silver_s["ad"]
    inc_sales = top_s["sales"] - silver_s["sales"]
    inc_profit = top_s["profit"] - silver_s["profit"]
    inc_pct = inc_sales / silver_s["sales"] * 100 if silver_s["sales"] > 0 else 0
    inc_roi = inc_profit / inc_ad if inc_ad > 0 else 0

    comment_lines = [f"本シミュレーションの結果、<b>{top_rec}</b> を推奨します。"]
    if top_rec != "🥈 シルバー":
        comment_lines.append(f"シルバー比で年間売上 <b>+¥{inc_sales:,.0f}</b>（<b>+{inc_pct:.0f}%</b>）が見込めます。")
        comment_lines.append(f"追加投資 ¥{inc_ad:,.0f} に対し、追加利益 ¥{inc_profit:,.0f}（<b>{inc_roi:.1f}倍回収</b>）。")
    # Check for risk in platinum
    plat_s = stats["💎 プラチナ"]
    if plat_s["profit_rate"] < gold_s["profit_rate"] and top_rec != "💎 プラチナ":
        comment_lines.append(f"プラチナプランは利益率が {plat_s['profit_rate']:.1f}% に低下するためリスクがあります。")

    # Best mall
    mall_profit = df_all[df_all["プラン"] == top_rec].groupby("モール")["限界利益 (円)"].sum()
    if len(mall_profit) > 0:
        best_mall = mall_profit.idxmax()
        comment_lines.append(f"モール別では <b>{best_mall}</b> の利益貢献が最も高い結果となりました。")

    st.markdown(
        '<div class="consul-box"><h4>💡 コンサルタントの所見（自動生成）</h4>'
        + "".join(f"<p>・{l}</p>" for l in comment_lines)
        + '</div>', unsafe_allow_html=True)

    # ── Monthly Sales Comparison Charts ──
    st.markdown('<div class="section-header">📈 プラン別 月次売上推移</div>', unsafe_allow_html=True)

    with st.expander("ℹ️ チャートの読み方", expanded=False):
        st.markdown("""
        - **全モール合計**: 3プランの売上推移を折れ線で比較
        - **モール別内訳**: プラン×モール別の棒グラフ
        - **限界利益推移**: プラン別の月次利益を比較
        - **累積利益**: 12ヶ月間の利益の積み上がりの差を可視化
        """)

    t1, t2, t3, t4 = st.tabs(["📉 全モール合計", "📊 モール別内訳", "💰 限界利益推移", "📈 累積利益"])

    # Aggregate by plan+month
    monthly_plan = df_all.groupby(["プラン","月","月番号"]).agg(
        {"売上 (円)":"sum", "限界利益 (円)":"sum", "広告費 (円)":"sum"}).reset_index().sort_values("月番号")

    with t1:
        fig = px.line(monthly_plan, x="月", y="売上 (円)", color="プラン", markers=True,
            color_discrete_map=PLAN_COLORS, category_orders={"月": month_labels, "プラン": plans_list})
        fig.update_layout(plot_bgcolor="#fafbfc", paper_bgcolor="#fff", height=420,
            font=dict(family="Noto Sans JP", size=12, color="#1e293b"),
            legend=dict(orientation="h", y=1.08, x=0.5, xanchor="center", font=dict(color="#1e293b")),
            yaxis_title="売上 (円)", xaxis_title="",
            margin=dict(l=20,r=20,t=40,b=20),
            xaxis=dict(tickfont=dict(color="#1e293b")), yaxis=dict(tickfont=dict(color="#1e293b")))
        # Make gold line thicker
        for trace in fig.data:
            if "ゴールド" in trace.name:
                trace.line.width = 4
            elif "シルバー" in trace.name:
                trace.line.dash = "dash"
        st.plotly_chart(fig, use_container_width=True)

    with t2:
        fig2 = px.bar(df_all, x="月", y="売上 (円)", color="プラン", barmode="group",
            facet_col="モール", text_auto=".3s",
            color_discrete_map=PLAN_COLORS,
            category_orders={"月": month_labels, "プラン": plans_list})
        fig2.update_layout(plot_bgcolor="#fafbfc", paper_bgcolor="#fff", height=450,
            font=dict(family="Noto Sans JP", size=11, color="#1e293b"),
            legend=dict(orientation="h", y=1.12, x=0.5, xanchor="center", font=dict(color="#1e293b")),
            margin=dict(l=20,r=20,t=60,b=20))
        fig2.update_traces(textposition="outside", textfont_size=8)
        fig2.for_each_annotation(lambda a: a.update(text=a.text.split("=")[-1], font=dict(color="#1e293b")))
        st.plotly_chart(fig2, use_container_width=True)

    with t3:
        fig3 = px.bar(monthly_plan, x="月", y="限界利益 (円)", color="プラン", barmode="group",
            text_auto=".3s", color_discrete_map=PLAN_COLORS,
            category_orders={"月": month_labels, "プラン": plans_list})
        fig3.update_layout(plot_bgcolor="#fafbfc", paper_bgcolor="#fff", height=420,
            font=dict(family="Noto Sans JP", size=12, color="#1e293b"),
            legend=dict(orientation="h", y=1.08, x=0.5, xanchor="center", font=dict(color="#1e293b")),
            yaxis_title="限界利益 (円)", xaxis_title="",
            margin=dict(l=20,r=20,t=40,b=20),
            xaxis=dict(tickfont=dict(color="#1e293b")), yaxis=dict(tickfont=dict(color="#1e293b")))
        st.plotly_chart(fig3, use_container_width=True)

    with t4:
        # Cumulative profit
        cum_data = []
        for pname in plans_list:
            pdf = monthly_plan[monthly_plan["プラン"] == pname].sort_values("月番号")
            cum = pdf["限界利益 (円)"].cumsum().tolist()
            for i, row in enumerate(pdf.itertuples()):
                cum_data.append({"プラン": pname, "月": row.月, "月番号": row.月番号, "累積利益 (円)": cum[i]})
        cum_df = pd.DataFrame(cum_data)

        fig4 = px.area(cum_df, x="月", y="累積利益 (円)", color="プラン",
            color_discrete_map=PLAN_COLORS, category_orders={"月": month_labels, "プラン": plans_list})
        fig4.update_layout(plot_bgcolor="#fafbfc", paper_bgcolor="#fff", height=420,
            font=dict(family="Noto Sans JP", size=12, color="#1e293b"),
            legend=dict(orientation="h", y=1.08, x=0.5, xanchor="center", font=dict(color="#1e293b")),
            yaxis_title="累積限界利益 (円)", xaxis_title="",
            margin=dict(l=20,r=20,t=40,b=20),
            xaxis=dict(tickfont=dict(color="#1e293b")), yaxis=dict(tickfont=dict(color="#1e293b")))
        # Add end-point annotations
        for pname in plans_list:
            last = cum_df[cum_df["プラン"]==pname].iloc[-1]
            fig4.add_annotation(x=last["月"], y=last["累積利益 (円)"],
                text=f"¥{last['累積利益 (円)']:,.0f}", showarrow=True, arrowhead=2,
                font=dict(size=11, color=PLAN_COLORS[pname], family="Noto Sans JP"),
                bordercolor=PLAN_COLORS[pname], borderwidth=1, borderpad=3, bgcolor="#fff")
        st.plotly_chart(fig4, use_container_width=True)

    # ── Plan × Mall Matrix ──
    st.markdown('<div class="section-header">🧩 プラン×モール マトリクス（年間）</div>', unsafe_allow_html=True)

    matrix_sales = df_all.pivot_table(index="プラン", columns="モール", values="売上 (円)", aggfunc="sum")
    matrix_profit = df_all.pivot_table(index="プラン", columns="モール", values="限界利益 (円)", aggfunc="sum")
    matrix_sales["合計"] = matrix_sales.sum(axis=1)
    matrix_profit["合計"] = matrix_profit.sum(axis=1)

    # Reorder rows
    plan_order = [p for p in plans_list if p in matrix_sales.index]
    matrix_sales = matrix_sales.reindex(plan_order)
    matrix_profit = matrix_profit.reindex(plan_order)

    mt1, mt2 = st.tabs(["💰 売上", "📊 限界利益"])
    with mt1:
        st.dataframe(matrix_sales.style.format("¥{:,.0f}"), use_container_width=True)
    with mt2:
        st.dataframe(matrix_profit.style.format("¥{:,.0f}"), use_container_width=True)

    # ── Cost Composition ──
    st.markdown('<div class="section-header">🧩 コスト構成分析（ゴールド基準）</div>', unsafe_allow_html=True)

    gold_df = df_all[df_all["プラン"] == "🥇 ゴールド"]
    cc1, cc2 = st.columns(2)
    with cc1:
        cd = {"項目": ["原価","モール手数料","広告費","限界利益"],
              "金額": [gold_df["原価 (円)"].sum(), gold_df["モール手数料 (円)"].sum(),
                       gold_df["広告費 (円)"].sum(), max(gold_df["限界利益 (円)"].sum(), 0)]}
        fp = px.pie(pd.DataFrame(cd), values="金額", names="項目", hole=0.45,
            color_discrete_map={"原価":"#64748b","モール手数料":"#f59e0b","広告費":"#3b82f6","限界利益":"#10b981"})
        fp.update_layout(font=dict(family="Noto Sans JP", size=12, color="#1e293b"),
            margin=dict(l=10,r=10,t=30,b=10), height=350,
            title=dict(text="ゴールド コスト構成", font_size=14, font_color="#1e293b"),
            legend=dict(font=dict(color="#1e293b")))
        fp.update_traces(textinfo="label+percent", textfont_size=11)
        st.plotly_chart(fp, use_container_width=True)
    with cc2:
        sd = gold_df.groupby("モール")["売上 (円)"].sum().reset_index()
        fs = px.pie(sd, values="売上 (円)", names="モール", hole=0.45, color_discrete_map=mall_colors)
        fs.update_layout(font=dict(family="Noto Sans JP", size=12, color="#1e293b"),
            margin=dict(l=10,r=10,t=30,b=10), height=350,
            title=dict(text="ゴールド モール構成比", font_size=14, font_color="#1e293b"),
            legend=dict(font=dict(color="#1e293b")))
        fs.update_traces(textinfo="label+percent", textfont_size=11)
        st.plotly_chart(fs, use_container_width=True)

    # ── Detail Table ──
    st.markdown('<div class="section-header">📋 詳細データテーブル</div>', unsafe_allow_html=True)

    ft1, ft2 = st.columns(2)
    with ft1:
        sel_plan = st.selectbox("プラン選択", ["全プラン"] + plans_list)
    with ft2:
        sel_mall = st.selectbox("モール選択", ["全モール"] + active_malls, key="tbl_mall")

    tbl = df_all.copy()
    if sel_plan != "全プラン": tbl = tbl[tbl["プラン"] == sel_plan]
    if sel_mall != "全モール": tbl = tbl[tbl["モール"] == sel_mall]

    dcols = ["プラン","月","モール","アクセス数","CVR","売上 (円)","原価 (円)","モール手数料 (円)","広告費 (円)","限界利益 (円)"]
    st.dataframe(tbl[dcols].style.format({
        "アクセス数":"{:,.0f}","CVR":"{:.3f}","売上 (円)":"¥{:,.0f}","原価 (円)":"¥{:,.0f}",
        "モール手数料 (円)":"¥{:,.0f}","広告費 (円)":"¥{:,.0f}","限界利益 (円)":"¥{:,.0f}"}),
        use_container_width=True, height=460)

    csv = df_all[dcols].to_csv(index=False).encode("utf-8-sig")
    st.download_button("📥 全プランCSVダウンロード", csv, "ec_3plan_simulation.csv", "text/csv")


# ██████████████████████████████████████████████
#  SINGLE PLAN MODE (legacy compatible)
# ██████████████████████████████████████████████
else:
    df = df_all

    total_sales = df["売上 (円)"].sum()
    total_profit = df["限界利益 (円)"].sum()
    total_ad = df["広告費 (円)"].sum()
    overall_roas = total_sales / total_ad if total_ad > 0 else 0
    profit_rate = total_profit / total_sales * 100 if total_sales > 0 else 0

    # ── Summary ──
    st.markdown('<div class="section-header">📋 エグゼクティブサマリー（年間合計）</div>', unsafe_allow_html=True)
    with st.expander("ℹ️ この数値の見方", expanded=False):
        st.markdown("""
        | 指標 | 説明 | 目安 |
        |------|------|------|
        | **年間売上合計** | 全モール12ヶ月累計 | 年商目標と比較 |
        | **年間限界利益** | 売上−原価−手数料−広告費 | プラスが最低条件 |
        | **全体ROAS** | 広告費1円あたり売上 | 3.0倍以上が健全 |
        | **利益率** | 利益÷売上 | 15〜30%が目安 |
        """)

    c1,c2,c3,c4 = st.columns(4)
    c1.metric("年間売上合計", f"¥{total_sales:,.0f}")
    c2.metric("年間限界利益", f"¥{total_profit:,.0f}")
    c3.metric("全体ROAS", f"{overall_roas:.2f} 倍")
    c4.metric("利益率", f"{profit_rate:.1f}%")

    # ── Alerts ──
    for mall in active_malls:
        mp = df[df["モール"]==mall]["限界利益 (円)"].sum()
        if mp < 0: st.warning(f"⚠️ **{mall}** の年間限界利益がマイナスです。")
    if overall_roas < 2.0 and total_ad > 0:
        st.warning(f"⚠️ ROASが {overall_roas:.2f}倍 と低水準です。")
    if profit_rate > 40:
        st.success(f"✅ 利益率 {profit_rate:.1f}% と良好。広告拡大の余地があります。")

    # ── Mall Summary ──
    st.markdown('<div class="section-header">🏬 モール別 年間サマリー</div>', unsafe_allow_html=True)
    mcols = st.columns(len(mall_colors))
    for idx, (mall, color) in enumerate(mall_colors.items()):
        mdf = df[df["モール"]==mall]
        ms = mdf["売上 (円)"].sum(); mp = mdf["限界利益 (円)"].sum()
        mr = ms / mdf["広告費 (円)"].sum() if mdf["広告費 (円)"].sum() > 0 else 0
        share = ms / total_sales * 100 if total_sales > 0 else 0
        with mcols[idx]:
            st.markdown(f'<span class="mall-badge" style="background:{color};">{mall}</span>', unsafe_allow_html=True)
            st.metric("年間売上", f"¥{ms:,.0f}")
            st.metric("年間利益", f"¥{mp:,.0f}")
            st.metric("ROAS / 構成比", f"{mr:.2f}倍 / {share:.1f}%")

    # ── Charts ──
    st.markdown('<div class="section-header">📈 月別売上推移</div>', unsafe_allow_html=True)
    ct1,ct2,ct3 = st.tabs(["📊 積上げ棒","📉 折れ線","💰 限界利益"])
    with ct1:
        f1 = px.bar(df, x="月", y="売上 (円)", color="モール", barmode="stack", text_auto=".3s",
            color_discrete_map=mall_colors, category_orders={"月":month_labels})
        f1.update_layout(plot_bgcolor="#fafbfc", paper_bgcolor="#fff", height=420,
            font=dict(family="Noto Sans JP", size=12, color="#1e293b"),
            legend=dict(orientation="h",y=1.02,x=0.5,xanchor="center",font=dict(color="#1e293b")),
            yaxis_title="売上 (円)",xaxis_title="",margin=dict(l=20,r=20,t=40,b=20),
            xaxis=dict(tickfont=dict(color="#1e293b")),yaxis=dict(tickfont=dict(color="#1e293b")))
        f1.update_traces(textposition="inside",textfont_size=10)
        st.plotly_chart(f1, use_container_width=True)
    with ct2:
        f2 = px.line(df, x="月", y="売上 (円)", color="モール", markers=True,
            color_discrete_map=mall_colors, category_orders={"月":month_labels})
        f2.update_layout(plot_bgcolor="#fafbfc", paper_bgcolor="#fff", height=420,
            font=dict(family="Noto Sans JP", size=12, color="#1e293b"),
            legend=dict(orientation="h",y=1.02,x=0.5,xanchor="center",font=dict(color="#1e293b")),
            yaxis_title="売上 (円)",xaxis_title="",margin=dict(l=20,r=20,t=40,b=20),
            xaxis=dict(tickfont=dict(color="#1e293b")),yaxis=dict(tickfont=dict(color="#1e293b")))
        st.plotly_chart(f2, use_container_width=True)
    with ct3:
        f3 = px.bar(df, x="月", y="限界利益 (円)", color="モール", barmode="group", text_auto=".3s",
            color_discrete_map=mall_colors, category_orders={"月":month_labels})
        f3.update_layout(plot_bgcolor="#fafbfc", paper_bgcolor="#fff", height=420,
            font=dict(family="Noto Sans JP", size=12, color="#1e293b"),
            legend=dict(orientation="h",y=1.02,x=0.5,xanchor="center",font=dict(color="#1e293b")),
            yaxis_title="限界利益 (円)",xaxis_title="",margin=dict(l=20,r=20,t=40,b=20),
            xaxis=dict(tickfont=dict(color="#1e293b")),yaxis=dict(tickfont=dict(color="#1e293b")))
        st.plotly_chart(f3, use_container_width=True)

    # ── Cost Composition ──
    st.markdown('<div class="section-header">🧩 コスト構成分析</div>', unsafe_allow_html=True)
    cc1, cc2 = st.columns(2)
    with cc1:
        cd = {"項目":["原価","モール手数料","広告費","限界利益"],
              "金額":[df["原価 (円)"].sum(),df["モール手数料 (円)"].sum(),df["広告費 (円)"].sum(),max(total_profit,0)]}
        fp = px.pie(pd.DataFrame(cd),values="金額",names="項目",hole=0.45,
            color_discrete_map={"原価":"#64748b","モール手数料":"#f59e0b","広告費":"#3b82f6","限界利益":"#10b981"})
        fp.update_layout(font=dict(family="Noto Sans JP",size=12,color="#1e293b"),
            margin=dict(l=10,r=10,t=30,b=10),height=350,
            title=dict(text="年間コスト構成",font_size=14,font_color="#1e293b"),
            legend=dict(font=dict(color="#1e293b")))
        fp.update_traces(textinfo="label+percent",textfont_size=11)
        st.plotly_chart(fp, use_container_width=True)
    with cc2:
        sd = df.groupby("モール")["売上 (円)"].sum().reset_index()
        fs = px.pie(sd,values="売上 (円)",names="モール",hole=0.45,color_discrete_map=mall_colors)
        fs.update_layout(font=dict(family="Noto Sans JP",size=12,color="#1e293b"),
            margin=dict(l=10,r=10,t=30,b=10),height=350,
            title=dict(text="モール別売上構成比",font_size=14,font_color="#1e293b"),
            legend=dict(font=dict(color="#1e293b")))
        fs.update_traces(textinfo="label+percent",textfont_size=11)
        st.plotly_chart(fs, use_container_width=True)

    # ── Table ──
    st.markdown('<div class="section-header">📋 月別詳細データ</div>', unsafe_allow_html=True)
    sel_mall = st.selectbox("モール選択", ["全モール"] + active_malls, key="single_mall")
    tbl = df.copy()
    if sel_mall != "全モール": tbl = tbl[tbl["モール"] == sel_mall]
    dcols = ["月","モール","季節指数","アクセス数","CVR","売上 (円)","原価 (円)","モール手数料 (円)","広告費 (円)","限界利益 (円)"]
    st.dataframe(tbl[dcols].style.format({"季節指数":"{:.1f}","アクセス数":"{:,.0f}","CVR":"{:.3f}",
        "売上 (円)":"¥{:,.0f}","原価 (円)":"¥{:,.0f}","モール手数料 (円)":"¥{:,.0f}",
        "広告費 (円)":"¥{:,.0f}","限界利益 (円)":"¥{:,.0f}"}), use_container_width=True, height=460)
    csv = df[dcols].to_csv(index=False).encode("utf-8-sig")
    st.download_button("📥 CSVダウンロード", csv, "ec_simulation_result.csv", "text/csv")

# ══════════════════════════════════════════════
# Glossary & Footer (both modes)
# ══════════════════════════════════════════════
st.markdown('<div class="section-header">📖 用語集</div>', unsafe_allow_html=True)
with st.expander("ℹ️ 用語の説明", expanded=False):
    st.markdown("""
    | 用語 | 説明 |
    |------|------|
    | **限界利益** | 売上−変動費（原価・手数料・広告費）。固定費は含まない |
    | **ROAS** | 広告費に対する売上の倍率 |
    | **CVR** | アクセスに対する購入割合 |
    | **CPC** | 広告1クリックあたりの費用 |
    | **カート取得率** | Amazon Buy Box獲得割合 |
    | **FBA** | Amazonの倉庫・配送サービス |
    | **楽天SS** | 楽天スーパーSALE（年4回） |
    | **PRオプション** | Yahoo!の検索上位表示オプション |
    | **季節指数** | 月別需要変動係数（1.0=平月） |
    """)

st.markdown("---")
st.markdown(
    "<div style='text-align:center;color:#94a3b8;font-size:0.78rem;'>"
    "EC 3大モール売上・利益シミュレーター v3.0 ｜ 3プラン比較機能搭載 ｜ シミュレーション結果は概算値です。"
    "</div>", unsafe_allow_html=True)
