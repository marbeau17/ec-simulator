-- =============================================================================
-- MCRM: LINE Marketing AI CRM for 武居商店
-- Migration: 00012_encryption.sql
-- Description: PII encryption/decryption functions
-- =============================================================================

-- Encrypt PII data using PGP symmetric encryption
-- The encryption key is stored in Supabase Vault (app.settings.pii_encryption_key)
CREATE OR REPLACE FUNCTION encrypt_pii(plain_text TEXT)
RETURNS BYTEA AS $$
DECLARE
    encryption_key TEXT;
BEGIN
    IF plain_text IS NULL THEN
        RETURN NULL;
    END IF;
    encryption_key := current_setting('app.settings.pii_encryption_key', true);
    IF encryption_key IS NULL OR encryption_key = '' THEN
        RAISE EXCEPTION 'PII encryption key is not configured';
    END IF;
    RETURN pgp_sym_encrypt(plain_text, encryption_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrypt PII data
CREATE OR REPLACE FUNCTION decrypt_pii(encrypted_data BYTEA)
RETURNS TEXT AS $$
DECLARE
    encryption_key TEXT;
BEGIN
    IF encrypted_data IS NULL THEN
        RETURN NULL;
    END IF;
    encryption_key := current_setting('app.settings.pii_encryption_key', true);
    IF encryption_key IS NULL OR encryption_key = '' THEN
        RAISE EXCEPTION 'PII encryption key is not configured';
    END IF;
    RETURN pgp_sym_decrypt(encrypted_data, encryption_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate a hash for searchable PII (e.g., lookup by phone number)
CREATE OR REPLACE FUNCTION generate_pii_hash(plain_text TEXT)
RETURNS TEXT AS $$
DECLARE
    hash_salt TEXT;
BEGIN
    IF plain_text IS NULL THEN
        RETURN NULL;
    END IF;
    hash_salt := current_setting('app.settings.pii_hash_salt', true);
    IF hash_salt IS NULL OR hash_salt = '' THEN
        RAISE EXCEPTION 'PII hash salt is not configured';
    END IF;
    RETURN encode(digest(plain_text || hash_salt, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restrict access to encryption functions: only service_role can execute
REVOKE ALL ON FUNCTION encrypt_pii(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION decrypt_pii(BYTEA) FROM PUBLIC;
REVOKE ALL ON FUNCTION generate_pii_hash(TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION encrypt_pii(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION decrypt_pii(BYTEA) TO service_role;
GRANT EXECUTE ON FUNCTION generate_pii_hash(TEXT) TO service_role;
