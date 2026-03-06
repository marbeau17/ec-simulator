-- =============================================================================
-- MCRM: LINE Marketing AI CRM for 武居商店
-- Migration: 00008_ai_hearings.sql
-- Description: AI hearing sessions table
-- =============================================================================

CREATE TABLE ai_hearings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    hearing_type TEXT NOT NULL DEFAULT 'initial' CHECK (hearing_type IN ('initial', 'needs_assessment', 'budget', 'timeline', 'follow_up')),
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    questions_answers JSONB DEFAULT '[]',
    ai_analysis JSONB DEFAULT '{}',
    extracted_tags TEXT[] DEFAULT '{}',
    model_used TEXT,
    total_tokens INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_ai_hearings_updated_at
    BEFORE UPDATE ON ai_hearings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
