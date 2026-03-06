-- =============================================================================
-- MCRM: LINE Marketing AI CRM for 武居商店
-- Migration: 00002_helper_functions.sql
-- Description: Helper trigger functions
-- =============================================================================

-- Automatically update updated_at column on row modification
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Prevent any modification (UPDATE or DELETE) on audit_logs
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs cannot be modified or deleted';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
