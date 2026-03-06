-- =============================================================================
-- MCRM: LINE Marketing AI CRM for 武居商店
-- Migration: 00014_indexes.sql
-- Description: Performance indexes for all tables
-- =============================================================================

-- =============================================================================
-- users indexes
-- =============================================================================
CREATE INDEX idx_users_line_uid ON users (line_uid);
CREATE INDEX idx_users_membership_tier ON users (membership_tier);
CREATE INDEX idx_users_line_follow_status ON users (line_follow_status);
CREATE INDEX idx_users_last_interaction_at ON users (last_interaction_at DESC);
CREATE INDEX idx_users_created_at ON users (created_at DESC);

-- =============================================================================
-- user_tags indexes
-- =============================================================================
CREATE INDEX idx_user_tags_user_id ON user_tags (user_id);
CREATE INDEX idx_user_tags_tag_name ON user_tags (tag_name);
CREATE INDEX idx_user_tags_tag_category ON user_tags (tag_category);
CREATE INDEX idx_user_tags_expires_at ON user_tags (expires_at) WHERE expires_at IS NOT NULL;

-- =============================================================================
-- conversations indexes
-- =============================================================================
CREATE INDEX idx_conversations_user_id ON conversations (user_id);
CREATE INDEX idx_conversations_status ON conversations (status);
CREATE INDEX idx_conversations_channel ON conversations (channel);
CREATE INDEX idx_conversations_created_at ON conversations (created_at DESC);
CREATE INDEX idx_conversations_user_status ON conversations (user_id, status);

-- =============================================================================
-- messages indexes
-- =============================================================================
CREATE INDEX idx_messages_conversation_id ON messages (conversation_id);
CREATE INDEX idx_messages_sender_type ON messages (sender_type);
CREATE INDEX idx_messages_created_at ON messages (created_at DESC);
CREATE INDEX idx_messages_line_message_id ON messages (line_message_id) WHERE line_message_id IS NOT NULL;
CREATE INDEX idx_messages_conversation_created ON messages (conversation_id, created_at DESC);

-- =============================================================================
-- events indexes
-- =============================================================================
CREATE INDEX idx_events_status ON events (status);
CREATE INDEX idx_events_event_type ON events (event_type);
CREATE INDEX idx_events_start_at ON events (start_at);
CREATE INDEX idx_events_status_start ON events (status, start_at);
CREATE INDEX idx_events_created_at ON events (created_at DESC);

-- =============================================================================
-- event_registrations indexes
-- =============================================================================
CREATE INDEX idx_event_registrations_event_id ON event_registrations (event_id);
CREATE INDEX idx_event_registrations_user_id ON event_registrations (user_id);
CREATE INDEX idx_event_registrations_status ON event_registrations (status);
CREATE INDEX idx_event_registrations_event_status ON event_registrations (event_id, status);
CREATE INDEX idx_event_registrations_reminder ON event_registrations (reminder_sent) WHERE reminder_sent = false AND status = 'registered';

-- =============================================================================
-- reservation_slots indexes
-- =============================================================================
CREATE INDEX idx_reservation_slots_event_id ON reservation_slots (event_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_reservation_slots_slot_date ON reservation_slots (slot_date);
CREATE INDEX idx_reservation_slots_available ON reservation_slots (is_available, slot_date) WHERE is_available = true;
CREATE INDEX idx_reservation_slots_date_time ON reservation_slots (slot_date, start_time);

-- =============================================================================
-- reservations indexes
-- =============================================================================
CREATE INDEX idx_reservations_slot_id ON reservations (slot_id);
CREATE INDEX idx_reservations_user_id ON reservations (user_id);
CREATE INDEX idx_reservations_status ON reservations (status);
CREATE INDEX idx_reservations_reminder ON reservations (reminder_sent) WHERE reminder_sent = false AND status = 'confirmed';

-- =============================================================================
-- ai_hearings indexes
-- =============================================================================
CREATE INDEX idx_ai_hearings_user_id ON ai_hearings (user_id);
CREATE INDEX idx_ai_hearings_conversation_id ON ai_hearings (conversation_id) WHERE conversation_id IS NOT NULL;
CREATE INDEX idx_ai_hearings_hearing_type ON ai_hearings (hearing_type);
CREATE INDEX idx_ai_hearings_status ON ai_hearings (status);
CREATE INDEX idx_ai_hearings_created_at ON ai_hearings (created_at DESC);

-- =============================================================================
-- broadcast_jobs indexes
-- =============================================================================
CREATE INDEX idx_broadcast_jobs_status ON broadcast_jobs (status);
CREATE INDEX idx_broadcast_jobs_scheduled_at ON broadcast_jobs (scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_broadcast_jobs_created_at ON broadcast_jobs (created_at DESC);
CREATE INDEX idx_broadcast_jobs_created_by ON broadcast_jobs (created_by) WHERE created_by IS NOT NULL;

-- =============================================================================
-- broadcast_logs indexes
-- =============================================================================
CREATE INDEX idx_broadcast_logs_job_id ON broadcast_logs (job_id);
CREATE INDEX idx_broadcast_logs_user_id ON broadcast_logs (user_id);
CREATE INDEX idx_broadcast_logs_status ON broadcast_logs (status);
CREATE INDEX idx_broadcast_logs_job_status ON broadcast_logs (job_id, status);
CREATE INDEX idx_broadcast_logs_created_at ON broadcast_logs (created_at DESC);

-- =============================================================================
-- ec_insights indexes
-- =============================================================================
CREATE INDEX idx_ec_insights_insight_type ON ec_insights (insight_type);
CREATE INDEX idx_ec_insights_user_id ON ec_insights (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_ec_insights_period ON ec_insights (period_start, period_end);
CREATE INDEX idx_ec_insights_is_pinned ON ec_insights (is_pinned) WHERE is_pinned = true;
CREATE INDEX idx_ec_insights_created_at ON ec_insights (created_at DESC);

-- =============================================================================
-- audit_logs indexes
-- =============================================================================
CREATE INDEX idx_audit_logs_actor_type ON audit_logs (actor_type);
CREATE INDEX idx_audit_logs_actor_id ON audit_logs (actor_id) WHERE actor_id IS NOT NULL;
CREATE INDEX idx_audit_logs_action ON audit_logs (action);
CREATE INDEX idx_audit_logs_resource ON audit_logs (resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at DESC);
