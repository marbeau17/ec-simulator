import streamlit as st
import google.generativeai as genai
import pandas as pd
import random
import time
import json
from datetime import datetime, timedelta

# --- 1. 固定パスワード設定 (本番環境ではsecrets管理を推奨) ---
FIXED_PASSWORD = "password123"  # 閲覧用パスワード

# --- ページ設定 ---
st.set_page_config(layout="wide", page_title="AI Insight Dashboard B2B")

# --- 2. 認証機能 (Login) ---
def check_password():
    """パスワード認証が通っていればTrueを返す"""
    if "password_correct" not in st.session_state:
        st.session_state.password_correct = False

    if st.session_state.password_correct:
        return True

    st.markdown("## 🔒 Access Verification")
    password_input = st.text_input("Enter Access Password", type="password")
    
    if st.button("Login"):
        if password_input == FIXED_PASSWORD:
            st.session_state.password_correct = True
            st.rerun()
        else:
            st.error("Incorrect password.")
    return False

if not check_password():
    st.stop()  # 認証未完了ならここで停止

# ==========================================
# メインアプリケーション (認証通過後に表示)
# ==========================================

# --- サイドバー設定 ---
st.sidebar.title("🛠 Control Panel")

# 3. Gemini API Key User Input
st.sidebar.subheader("🔑 API Settings")
user_api_key = st.sidebar.text_input("Gemini API Key", type="password", help="Google AI Studioで取得したキーを入力")
model_name = st.sidebar.selectbox("Model", ["gemini-2.0-flash", "gemini-1.5-pro"])

# 期間設定
period = st.sidebar.selectbox("Period", ["Daily", "Weekly", "Monthly"])

# --- Mock Data Generation ---
@st.cache_data(ttl=3600)
def fetch_mock_data():
    """時系列サマリと人気ページランキングを生成"""
    # 1. 時系列データ
    dates = pd.date_range(end=datetime.today(), periods=30).strftime("%Y-%m-%d").tolist()
    ts_data = {
        "date": dates,
        "users": [100 + i*5 + random.randint(-20, 50) for i in range(30)],
        "sessions": [120 + i*6 + random.randint(-10, 60) for i in range(30)],
        "revenue": [i * 150 + random.randint(0, 500) for i in range(30)],
        "engagement_rate": [0.55 + (i*0.003) for i in range(30)]
    }
    
    # 2. ページランキングデータ
    pages = [
        "/", "/pricing", "/features", "/blog/ai-trends", "/contact",
        "/about", "/blog/streamlit-tips", "/products/dashboard", "/login", "/signup",
        "/docs/api", "/docs/start", "/careers", "/blog/seo", "/features/analytics",
        "/features/report", "/faq", "/case-a", "/case-b", "/terms"
    ]
    page_data = []
    for p in pages:
        views = random.randint(500, 10000)
        page_data.append({
            "Page Path": p,
            "Page Title": f"Title for {p}",
            "Views": views,
            "Active Users": int(views * 0.7),
            "Engagement Rate": round(random.uniform(0.3, 0.9), 2)
        })
    df_pages = pd.DataFrame(page_data).sort_values("Views", ascending=False).reset_index(drop=True)
    df_pages.index += 1
    
    return pd.DataFrame(ts_data), df_pages

df_ts, df_pages = fetch_mock_data()

# --- AI Analysis Function ---
def run_ai_analysis(api_key, model, data_summary):
    if not api_key:
        return {"error": "API Key is missing. Please enter it in the sidebar."}
    
    try:
        genai.configure(api_key=api_key)
        gemini = genai.GenerativeModel(
            model_name=model,
            generation_config={"response_mime_type": "application/json"}
        )
        
        prompt = f"""
        あなたはWebコンサルタントチームです。以下のWebサイトデータを分析し、UI、SEO、Analystの3つの視点で評価してください。
        
        データ: {data_summary}
        
        必ず以下のJSON形式で回答してください:
        {{
            "agents": {{
                "ui": "UI視点のコメント(50文字以内)",
                "seo": "SEO視点のコメント(50文字以内)",
                "analyst": "分析視点のコメント(50文字以内)"
            }},
            "matrix": [
                {{ "priority": 1, "task": "施策名", "ui_score": "S/A/B", "seo_score": "S/A/B", "analyst_score": "S/A/B", "total": "S/A/B", "detail": "詳細" }},
                {{ "priority": 2, "task": "施策名", "ui_score": "...", "seo_score": "...", "analyst_score": "...", "total": "...", "detail": "..." }}
            ]
        }}
        """
        
        response = gemini.generate_content(prompt)
        return json.loads(response.text)
        
    except Exception as e:
        return {"error": str(e)}

# --- UI Layout ---
st.title("📊 AI Insight Dashboard (B2B SaaS)")

# Metrics
curr = df_ts.iloc[-1]
prev = df_ts.iloc[-2]

col1, col2, col3, col4 = st.columns(4)
col1.metric("Users", f"{curr['users']}", f"{curr['users'] - prev['users']}")
col2.metric("Sessions", f"{curr['sessions']}", f"{curr['sessions'] - prev['sessions']}")
col3.metric("Engagement", f"{curr['engagement_rate']:.1%}", f"{(curr['engagement_rate'] - prev['engagement_rate']):.1%}")
col4.metric("Revenue", f"${curr['revenue']}", f"${curr['revenue'] - prev['revenue']}")

# Tabs
tab1, tab2 = st.tabs(["📈 Report & Ranking", "🤖 AI Consultant"])

with tab1:
    st.subheader("Traffic Trend")
    st.line_chart(df_ts.set_index("date")[["users", "sessions"]])
    
    st.markdown("---")
    st.subheader("🏆 Top 20 Popular Pages")
    st.dataframe(
        df_pages.head(20),
        column_config={
            "Views": st.column_config.ProgressColumn("Views", format="%d", min_value=0, max_value=int(df_pages["Views"].max())),
            "Engagement Rate": st.column_config.NumberColumn("Eng. Rate", format="%.0f%%")
        },
        use_container_width=True,
        height=500
    )

with tab2:
    st.header("Multi-Agent Analysis")
    st.write("Gemini APIを使って、UI/SEO/分析の3視点からサイトを診断します。")
    
    if st.button("Start AI Analysis"):
        if not user_api_key:
            st.error("⚠️ サイドバーにGemini API Keyを入力してください。")
        else:
            with st.spinner("AI Agents are discussing..."):
                # データ量削減のため直近7日分のみ送信
                summary_json = df_ts.tail(7).to_json(orient="records")
                result = run_ai_analysis(user_api_key, model_name, summary_json)
                
                if "error" in result:
                    st.error(f"Analysis Failed: {result['error']}")
                else:
                    # 結果表示
                    r1, r2, r3 = st.columns(3)
                    r1.info(f"🎨 UI: {result['agents']['ui']}")
                    r2.warning(f"🔍 SEO: {result['agents']['seo']}")
                    r3.success(f"📈 Analyst: {result['agents']['analyst']}")
                    
                    st.subheader("Cross-Evaluation Matrix")
                    st.dataframe(pd.DataFrame(result["matrix"]))