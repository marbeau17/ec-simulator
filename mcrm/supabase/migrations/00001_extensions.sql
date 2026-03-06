-- =============================================================================
-- MCRM: LINE Marketing AI CRM for 武居商店
-- Migration: 00001_extensions.sql
-- Description: Enable required PostgreSQL extensions
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
