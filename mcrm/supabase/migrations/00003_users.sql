-- =============================================================================
-- MCRM: LINE Marketing AI CRM for 武居商店
-- Migration: 00003_users.sql
-- Description: Users and admin_users tables
-- =============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    line_uid TEXT UNIQUE NOT NULL,
    line_display_name TEXT,
    name_encrypted BYTEA,
    email_encrypted BYTEA,
    phone_encrypted BYTEA,
    address_encrypted BYTEA,
    postal_code_encrypted BYTEA,
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('male', 'female', 'other', 'unspecified')),
    membership_tier TEXT NOT NULL DEFAULT 'free' CHECK (membership_tier IN ('free', 'light', 'standard', 'premium')),
    ai_persona_summary TEXT,
    line_follow_status TEXT NOT NULL DEFAULT 'following' CHECK (line_follow_status IN ('following', 'blocked', 'unfollowed')),
    last_interaction_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('owner', 'admin', 'operator')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_admin_users_updated_at
    BEFORE UPDATE ON admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
