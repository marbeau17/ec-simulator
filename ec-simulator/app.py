"""
EC 3大モール売上・利益シミュレーションダッシュボード
Amazon / 楽天市場 / Yahoo!ショッピング 12ヶ月売上・限界利益シミュレーター
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
# Custom CSS for corporate / consulting look
# ──────────────────────────────────────────────
st.markdown(
    """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700&display=swap');

    html, body, [class*="css"] {
        font-family: 'Noto Sans JP', sans-serif;
    }

    /* Main container */
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
        margin-bottom: 1.2rem;
        box-shadow: 0 4px 20px rgba(15, 27, 45, 0.25);
    }
    .header-band h1 {
        margin: 0; font-size: 1.65rem; font-weight: 700; letter-spacing: 0.02em;
    }
    .header-band p {
        margin: 0.4rem 0 0 0; font-size: 0.88rem; opacity: 0.82; line-height: 1.55;
    }

    /* Metric cards */
    div[data-testid="stMetric"] {
        background: #ffffff;
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

    /* Sidebar */
    section[data-testid="stSidebar"] {
        background: #f8fafc;
    }
    section[data-testid="stSidebar"] .stMarkdown h3 {
        font-size: 0.95rem;
        color: #1e3a5f;
        border-bottom: 2px solid #1e3a5f;
        padding-bottom: 0.3rem;
        margin-top: 0.5rem;
    }

    /* Section headers in main */
    .section-header {
        font-size: 1.1rem;
        font-weight: 700;
        color: #1e293b;
        border-left: 4px solid #2563eb;
        padding-left: 0.7rem;
        margin: 1.4rem 0 0.8rem 0;
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
    .badge-amazon { background: #ff9900; }
    .badge-rakuten { background: #bf0000; }
    .badge-yahoo  { background: #ff0033; }

    /* Dataframe */
    .stDataFrame { border-radius: 8px; overflow: hidden; }

    /* Hide Streamlit branding */
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
# Sidebar – Input Parameters
# ──────────────────────────────────────────────
with st.sidebar:
    st.markdown("### ⚙️ シミュレーション設定")

    # --- General Settings ---
    with st.expander("🏪 基本設定", expanded=True):
        current_monthly_sales = st.number_input(
            "現状月商 (円)", min_value=0, value=5_000_000, step=100_000, format="%d"
        )
        average_order_value = st.number_input(
            "客単価 (円)", min_value=1, value=5_000, step=100, format="%d"
        )
        cogs_rate = st.slider("原価率", 0.0, 1.0, 0.30, 0.01, format="%.2f")
        organic_traffic_base = st.number_input(
            "月間自然流入数 (UU)", min_value=0, value=30_000, step=1_000, format="%d"
        )
        base_cvr = st.slider(
            "基礎転換率", 0.001, 0.10, 0.02, 0.001, format="%.3f",
            help="0.020 = 2.0%"
        )

    # --- Marketing ---
    with st.expander("📣 マーケティング設定", expanded=True):
        ad_budget_monthly = st.number_input(
            "月間広告予算 (円)", min_value=0, value=500_000, step=50_000, format="%d"
        )
        target_cpc = st.number_input(
            "想定CPC (円)", min_value=0, value=50, step=5, format="%d"
        )
        expected_roas = st.slider("目標ROAS (倍)", 0.5, 10.0, 3.0, 0.1, format="%.1f")

    # --- Amazon ---
    with st.expander("🟠 Amazon 固有設定"):
        buy_box_pct = st.slider("カート取得率", 0.0, 1.0, 0.90, 0.01, format="%.2f")
        fba_usage = st.slider("FBA利用率", 0.0, 1.0, 0.80, 0.01, format="%.2f")
        prime_day_boost = st.slider("プライムデー跳ね上げ率 (7月)", 1.0, 5.0, 2.5, 0.1, format="%.1f")

    # --- Rakuten ---
    with st.expander("🔴 楽天 固有設定"):
        ss_boost = st.slider("楽天SS跳ね上げ率 (3,6,9,12月)", 1.0, 5.0, 3.0, 0.1, format="%.1f")
        point_mult = st.slider("店舗負担ポイント倍率", 1.0, 10.0, 5.0, 0.5, format="%.1f")

    # --- Yahoo ---
    with st.expander("🔵 Yahoo! 固有設定"):
        five_day_boost = st.slider("5のつく日係数", 1.0, 3.0, 1.5, 0.1, format="%.1f")
        pr_option_rate = st.slider("PRオプション料率", 0.0, 0.30, 0.05, 0.01, format="%.2f")

    # --- Seasonality ---
    with st.expander("📅 季節指数 (月別)"):
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


# ──────────────────────────────────────────────
# Simulation Engine
# ──────────────────────────────────────────────
def run_simulation() -> pd.DataFrame:
    """Run the 12‑month simulation for all three malls and return a tidy DataFrame."""
    records = []

    # Ad traffic (safe division)
    ad_traffic = (ad_budget_monthly / target_cpc) if target_cpc > 0 else 0

    for m_idx in range(12):
        month_num = m_idx + 1
        s_idx = seasonality[m_idx]

        # --- Organic + Ad traffic base ---
        organic = organic_traffic_base * s_idx
        base_traffic = organic + ad_traffic

        for mall in ["Amazon", "楽天市場", "Yahoo!"]:
            # ----- Traffic adjustments -----
            traffic = base_traffic
            if mall == "Amazon" and month_num == 7:
                traffic *= prime_day_boost
            elif mall == "楽天市場" and month_num in (3, 6, 9, 12):
                traffic *= ss_boost
            elif mall == "Yahoo!":
                traffic *= five_day_boost

            # ----- CVR adjustments -----
            cvr = base_cvr
            cvr *= (1 + point_mult * 0.01)     # ポイント倍率効果
            cvr *= (1 + fba_usage * 0.1)        # FBA効果

            # ----- Sales -----
            bb = buy_box_pct if mall == "Amazon" else 1.0
            gross_sales = traffic * cvr * average_order_value * bb

            # ----- Costs -----
            cogs = gross_sales * cogs_rate

            if mall == "Amazon":
                fee_rate = 0.10
            elif mall == "楽天市場":
                fee_rate = 0.06
            else:  # Yahoo!
                fee_rate = 0.03 + pr_option_rate
            mall_fee = gross_sales * fee_rate

            contribution = gross_sales - cogs - mall_fee - ad_budget_monthly

            records.append(
                {
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
                }
            )

    return pd.DataFrame(records)


df = run_simulation()

# ──────────────────────────────────────────────
# Executive Summary
# ──────────────────────────────────────────────
st.markdown('<div class="section-header">📋 エグゼクティブサマリー（年間合計）</div>', unsafe_allow_html=True)

total_sales = df["売上 (円)"].sum()
total_profit = df["限界利益 (円)"].sum()
total_ad = df["広告費 (円)"].sum()
overall_roas = total_sales / total_ad if total_ad > 0 else 0
profit_rate = total_profit / total_sales * 100 if total_sales > 0 else 0

col1, col2, col3, col4 = st.columns(4)
col1.metric("年間売上合計", f"¥{total_sales:,.0f}")
col2.metric("年間限界利益", f"¥{total_profit:,.0f}")
col3.metric("全体ROAS", f"{overall_roas:.2f} 倍")
col4.metric("利益率", f"{profit_rate:.1f}%")

# Per‑mall summary
st.markdown('<div class="section-header">🏬 モール別 年間サマリー</div>', unsafe_allow_html=True)

mall_colors = {"Amazon": "#FF9900", "楽天市場": "#BF0000", "Yahoo!": "#FF0033"}
mall_cols = st.columns(3)

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

chart_tab1, chart_tab2, chart_tab3 = st.tabs(["📊 積上げ棒グラフ", "📉 折れ線グラフ", "💰 限界利益推移"])

with chart_tab1:
    fig_bar = px.bar(
        df,
        x="月",
        y="売上 (円)",
        color="モール",
        color_discrete_map=mall_colors,
        barmode="stack",
        text_auto=".3s",
        category_orders={"月": month_labels},
    )
    fig_bar.update_layout(
        plot_bgcolor="#fafbfc",
        paper_bgcolor="#ffffff",
        font=dict(family="Noto Sans JP, sans-serif", size=12),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="center", x=0.5),
        yaxis_title="売上 (円)",
        xaxis_title="",
        margin=dict(l=20, r=20, t=40, b=20),
        height=420,
    )
    fig_bar.update_traces(textposition="inside", textfont_size=10)
    st.plotly_chart(fig_bar, use_container_width=True)

with chart_tab2:
    fig_line = px.line(
        df,
        x="月",
        y="売上 (円)",
        color="モール",
        markers=True,
        color_discrete_map=mall_colors,
        category_orders={"月": month_labels},
    )
    fig_line.update_layout(
        plot_bgcolor="#fafbfc",
        paper_bgcolor="#ffffff",
        font=dict(family="Noto Sans JP, sans-serif", size=12),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="center", x=0.5),
        yaxis_title="売上 (円)",
        xaxis_title="",
        margin=dict(l=20, r=20, t=40, b=20),
        height=420,
    )
    st.plotly_chart(fig_line, use_container_width=True)

with chart_tab3:
    fig_profit = px.bar(
        df,
        x="月",
        y="限界利益 (円)",
        color="モール",
        color_discrete_map=mall_colors,
        barmode="group",
        text_auto=".3s",
        category_orders={"月": month_labels},
    )
    fig_profit.update_layout(
        plot_bgcolor="#fafbfc",
        paper_bgcolor="#ffffff",
        font=dict(family="Noto Sans JP, sans-serif", size=12),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="center", x=0.5),
        yaxis_title="限界利益 (円)",
        xaxis_title="",
        margin=dict(l=20, r=20, t=40, b=20),
        height=420,
    )
    st.plotly_chart(fig_profit, use_container_width=True)

# ──────────────────────────────────────────────
# Cost breakdown waterfall / Composition
# ──────────────────────────────────────────────
st.markdown('<div class="section-header">🧩 コスト構成分析</div>', unsafe_allow_html=True)

cost_col1, cost_col2 = st.columns(2)

with cost_col1:
    # Pie chart – cost composition
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
        pd.DataFrame(cost_data),
        values="金額",
        names="項目",
        color="項目",
        color_discrete_map={
            "原価": "#64748b",
            "モール手数料": "#f59e0b",
            "広告費": "#3b82f6",
            "限界利益": "#10b981",
        },
        hole=0.45,
    )
    fig_pie.update_layout(
        font=dict(family="Noto Sans JP, sans-serif", size=12),
        margin=dict(l=10, r=10, t=30, b=10),
        height=350,
        title=dict(text="年間コスト構成", font_size=14),
    )
    fig_pie.update_traces(textinfo="label+percent", textfont_size=11)
    st.plotly_chart(fig_pie, use_container_width=True)

with cost_col2:
    # Mall share pie
    share_data = df.groupby("モール")["売上 (円)"].sum().reset_index()
    fig_share = px.pie(
        share_data,
        values="売上 (円)",
        names="モール",
        color="モール",
        color_discrete_map=mall_colors,
        hole=0.45,
    )
    fig_share.update_layout(
        font=dict(family="Noto Sans JP, sans-serif", size=12),
        margin=dict(l=10, r=10, t=30, b=10),
        height=350,
        title=dict(text="モール別売上構成比", font_size=14),
    )
    fig_share.update_traces(textinfo="label+percent", textfont_size=11)
    st.plotly_chart(fig_share, use_container_width=True)

# ──────────────────────────────────────────────
# Detailed Data Table
# ──────────────────────────────────────────────
st.markdown('<div class="section-header">📋 月別詳細データ</div>', unsafe_allow_html=True)

table_mall = st.selectbox("モール選択", ["全モール", "Amazon", "楽天市場", "Yahoo!"])

display_df = df.copy()
if table_mall != "全モール":
    display_df = display_df[display_df["モール"] == table_mall]

display_cols = ["月", "モール", "季節指数", "アクセス数", "CVR", "売上 (円)", "原価 (円)", "モール手数料 (円)", "広告費 (円)", "限界利益 (円)"]
styled = display_df[display_cols].style.format(
    {
        "季節指数": "{:.1f}",
        "アクセス数": "{:,.0f}",
        "CVR": "{:.3f}",
        "売上 (円)": "¥{:,.0f}",
        "原価 (円)": "¥{:,.0f}",
        "モール手数料 (円)": "¥{:,.0f}",
        "広告費 (円)": "¥{:,.0f}",
        "限界利益 (円)": "¥{:,.0f}",
    }
)

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
# Footer
# ──────────────────────────────────────────────
st.markdown("---")
st.markdown(
    "<div style='text-align:center; color:#94a3b8; font-size:0.78rem;'>"
    "EC 3大モール売上・利益シミュレーター v1.0 ｜ シミュレーション結果は概算値です。実績と異なる場合があります。"
    "</div>",
    unsafe_allow_html=True,
)
