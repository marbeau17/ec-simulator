-- =============================================================================
-- MCRM: LINE Marketing AI CRM for 武居商店
-- Migration: 00007_reservations.sql
-- Description: Reservation slots and reservations tables
-- =============================================================================

CREATE TABLE reservation_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 1,
    booked_count INTEGER NOT NULL DEFAULT 0,
    location TEXT,
    staff_name TEXT,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_time_range CHECK (end_time > start_time),
    CONSTRAINT chk_booked_count CHECK (booked_count >= 0 AND booked_count <= capacity)
);

CREATE TRIGGER trg_reservation_slots_updated_at
    BEFORE UPDATE ON reservation_slots
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slot_id UUID NOT NULL REFERENCES reservation_slots(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
    purpose TEXT,
    ai_pre_summary TEXT,
    admin_note TEXT,
    reminder_sent BOOLEAN NOT NULL DEFAULT FALSE,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (slot_id, user_id)
);

CREATE TRIGGER trg_reservations_updated_at
    BEFORE UPDATE ON reservations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger function to update booked_count on reservation_slots
CREATE OR REPLACE FUNCTION update_slot_booked_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.status = 'confirmed' THEN
            UPDATE reservation_slots
            SET booked_count = booked_count + 1
            WHERE id = NEW.slot_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Status changed from confirmed to cancelled
        IF OLD.status = 'confirmed' AND NEW.status = 'cancelled' THEN
            UPDATE reservation_slots
            SET booked_count = booked_count - 1
            WHERE id = NEW.slot_id;
        -- Status changed from cancelled to confirmed
        ELSIF OLD.status = 'cancelled' AND NEW.status = 'confirmed' THEN
            UPDATE reservation_slots
            SET booked_count = booked_count + 1
            WHERE id = NEW.slot_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.status = 'confirmed' THEN
            UPDATE reservation_slots
            SET booked_count = booked_count - 1
            WHERE id = OLD.slot_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_slot_booked_count
    AFTER INSERT OR UPDATE OR DELETE ON reservations
    FOR EACH ROW
    EXECUTE FUNCTION update_slot_booked_count();
