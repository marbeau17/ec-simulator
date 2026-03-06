-- =============================================================================
-- MCRM: LINE Marketing AI CRM for 武居商店
-- Migration: 00013_rls_policies.sql
-- Description: Row Level Security policies for all tables
-- =============================================================================

-- =============================================================================
-- Helper functions for RLS
-- =============================================================================

-- Extract LINE UID from JWT claims
CREATE OR REPLACE FUNCTION get_current_line_uid()
RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE(
        current_setting('request.jwt.claims', true)::json->>'line_uid',
        ''
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Get the current user's UUID from their LINE UID
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
DECLARE
    uid UUID;
BEGIN
    SELECT id INTO uid FROM users WHERE line_uid = get_current_line_uid();
    RETURN uid;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================================================
-- Enable RLS on all tables
-- =============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_hearings ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ec_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- users table policies
-- =============================================================================

-- Users can read their own profile
CREATE POLICY users_select_own ON users
    FOR SELECT
    USING (line_uid = get_current_line_uid());

-- Users can update their own profile
CREATE POLICY users_update_own ON users
    FOR UPDATE
    USING (line_uid = get_current_line_uid());

-- =============================================================================
-- admin_users table policies
-- =============================================================================

-- Only service_role can manage admin_users (no anon/authenticated access)
CREATE POLICY admin_users_service_only ON admin_users
    FOR ALL
    USING (false);

-- =============================================================================
-- tags table policies
-- =============================================================================

-- Tags are readable by all authenticated users
CREATE POLICY tags_select_all ON tags
    FOR SELECT
    USING (true);

-- Only service_role can insert/update/delete tags
CREATE POLICY tags_modify_service_only ON tags
    FOR INSERT
    WITH CHECK (false);

CREATE POLICY tags_update_service_only ON tags
    FOR UPDATE
    USING (false);

CREATE POLICY tags_delete_service_only ON tags
    FOR DELETE
    USING (false);

-- =============================================================================
-- user_tags table policies
-- =============================================================================

-- Users can see their own tags
CREATE POLICY user_tags_select_own ON user_tags
    FOR SELECT
    USING (user_id = get_current_user_id());

-- Only service_role can manage user_tags
CREATE POLICY user_tags_insert_service ON user_tags
    FOR INSERT
    WITH CHECK (false);

CREATE POLICY user_tags_update_service ON user_tags
    FOR UPDATE
    USING (false);

CREATE POLICY user_tags_delete_service ON user_tags
    FOR DELETE
    USING (false);

-- =============================================================================
-- conversations table policies
-- =============================================================================

-- Users can see their own conversations
CREATE POLICY conversations_select_own ON conversations
    FOR SELECT
    USING (user_id = get_current_user_id());

-- Users can create conversations for themselves
CREATE POLICY conversations_insert_own ON conversations
    FOR INSERT
    WITH CHECK (user_id = get_current_user_id());

-- =============================================================================
-- messages table policies
-- =============================================================================

-- Users can see messages in their own conversations
CREATE POLICY messages_select_own ON messages
    FOR SELECT
    USING (
        conversation_id IN (
            SELECT id FROM conversations WHERE user_id = get_current_user_id()
        )
    );

-- Users can insert messages into their own conversations
CREATE POLICY messages_insert_own ON messages
    FOR INSERT
    WITH CHECK (
        conversation_id IN (
            SELECT id FROM conversations WHERE user_id = get_current_user_id()
        )
    );

-- =============================================================================
-- events table policies
-- =============================================================================

-- Published events are visible to everyone
CREATE POLICY events_select_published ON events
    FOR SELECT
    USING (status = 'published');

-- Only service_role can manage events
CREATE POLICY events_modify_service ON events
    FOR INSERT
    WITH CHECK (false);

CREATE POLICY events_update_service ON events
    FOR UPDATE
    USING (false);

CREATE POLICY events_delete_service ON events
    FOR DELETE
    USING (false);

-- =============================================================================
-- event_registrations table policies
-- =============================================================================

-- Users can see their own registrations
CREATE POLICY event_registrations_select_own ON event_registrations
    FOR SELECT
    USING (user_id = get_current_user_id());

-- Users can register themselves for events
CREATE POLICY event_registrations_insert_own ON event_registrations
    FOR INSERT
    WITH CHECK (user_id = get_current_user_id());

-- Users can update their own registrations (e.g., cancel)
CREATE POLICY event_registrations_update_own ON event_registrations
    FOR UPDATE
    USING (user_id = get_current_user_id());

-- =============================================================================
-- reservation_slots table policies
-- =============================================================================

-- Available slots are visible to everyone
CREATE POLICY reservation_slots_select_available ON reservation_slots
    FOR SELECT
    USING (is_available = true);

-- Only service_role can manage slots
CREATE POLICY reservation_slots_modify_service ON reservation_slots
    FOR INSERT
    WITH CHECK (false);

CREATE POLICY reservation_slots_update_service ON reservation_slots
    FOR UPDATE
    USING (false);

CREATE POLICY reservation_slots_delete_service ON reservation_slots
    FOR DELETE
    USING (false);

-- =============================================================================
-- reservations table policies
-- =============================================================================

-- Users can see their own reservations
CREATE POLICY reservations_select_own ON reservations
    FOR SELECT
    USING (user_id = get_current_user_id());

-- Users can create reservations for themselves
CREATE POLICY reservations_insert_own ON reservations
    FOR INSERT
    WITH CHECK (user_id = get_current_user_id());

-- Users can update their own reservations
CREATE POLICY reservations_update_own ON reservations
    FOR UPDATE
    USING (user_id = get_current_user_id());

-- =============================================================================
-- ai_hearings table policies
-- =============================================================================

-- Users can see their own hearings
CREATE POLICY ai_hearings_select_own ON ai_hearings
    FOR SELECT
    USING (user_id = get_current_user_id());

-- Only service_role can manage hearings
CREATE POLICY ai_hearings_modify_service ON ai_hearings
    FOR INSERT
    WITH CHECK (false);

CREATE POLICY ai_hearings_update_service ON ai_hearings
    FOR UPDATE
    USING (false);

-- =============================================================================
-- broadcast_jobs table policies
-- =============================================================================

-- No direct user access to broadcast jobs
CREATE POLICY broadcast_jobs_service_only ON broadcast_jobs
    FOR ALL
    USING (false);

-- =============================================================================
-- broadcast_logs table policies
-- =============================================================================

-- No direct user access to broadcast logs
CREATE POLICY broadcast_logs_service_only ON broadcast_logs
    FOR ALL
    USING (false);

-- =============================================================================
-- ec_insights table policies
-- =============================================================================

-- Users can see insights related to them
CREATE POLICY ec_insights_select_own ON ec_insights
    FOR SELECT
    USING (user_id = get_current_user_id() OR user_id IS NULL);

-- Only service_role can manage insights
CREATE POLICY ec_insights_modify_service ON ec_insights
    FOR INSERT
    WITH CHECK (false);

-- =============================================================================
-- audit_logs table policies
-- =============================================================================

-- No direct user access to audit logs
CREATE POLICY audit_logs_service_only ON audit_logs
    FOR ALL
    USING (false);
