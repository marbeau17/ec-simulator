-- =============================================================================
-- MCRM: LINE Marketing AI CRM for 武居商店
-- Migration: 00004_user_tags.sql
-- Description: User tags and tags master table
-- =============================================================================

CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    color TEXT DEFAULT '#6B7280',
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tag_name TEXT NOT NULL,
    tag_category TEXT NOT NULL DEFAULT 'manual' CHECK (tag_category IN ('ai_generated', 'manual', 'system')),
    confidence NUMERIC(3,2) DEFAULT 1.00,
    source TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, tag_name)
);
