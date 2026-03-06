-- =============================================================================
-- MCRM: LINE Marketing AI CRM for 武居商店
-- Migration: 00010_ec_insights.sql
-- Description: EC/AI insights table
-- =============================================================================

CREATE TABLE ec_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    insight_type TEXT NOT NULL CHECK (insight_type IN ('daily_report', 'weekly_report', 'segment_analysis', 'churn_prediction', 'campaign_evaluation', 'trend_analysis', 'custom')),
    title TEXT NOT NULL,
    summary TEXT,
    detail JSONB DEFAULT '{}',
    data_sources TEXT[] DEFAULT '{}',
    period_start DATE,
    period_end DATE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    model_used TEXT,
    tokens_used INTEGER DEFAULT 0,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    created_by TEXT NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
