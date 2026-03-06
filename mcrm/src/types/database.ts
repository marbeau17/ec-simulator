// ============================================================================
// Database row types (as returned from queries)
// ============================================================================

export interface User {
  id: string;
  line_user_id: string;
  display_name: string;
  picture_url: string | null;
  status_message: string | null;
  email: string | null;
  phone: string | null;
  membership_tier: "free" | "bronze" | "silver" | "gold" | "platinum";
  total_purchase_amount: number;
  visit_count: number;
  last_visit_at: string | null;
  first_contacted_at: string | null;
  notes: string | null;
  is_blocked: boolean;
  is_followed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
  created_at: string;
}

export interface UserTag {
  id: string;
  user_id: string;
  tag_id: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  status: "active" | "resolved" | "pending";
  assigned_admin_id: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: "user" | "admin" | "bot";
  sender_id: string | null;
  message_type: "text" | "image" | "sticker" | "flex" | "template" | "audio" | "video";
  content: string | null;
  line_message_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_at: string;
  end_at: string;
  capacity: number | null;
  registered_count: number;
  location: string | null;
  image_url: string | null;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventRegistration {
  id: string;
  event_id: string;
  user_id: string;
  status: "registered" | "cancelled" | "attended";
  registered_at: string;
  cancelled_at: string | null;
  attended_at: string | null;
}

export interface ReservationSlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: string;
  slot_id: string;
  user_id: string;
  status: "confirmed" | "cancelled" | "completed" | "no_show";
  purpose: string | null;
  reminder_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface AiHearing {
  id: string;
  user_id: string;
  conversation_id: string | null;
  question: string;
  answer: string | null;
  category: string | null;
  ai_summary: string | null;
  created_at: string;
}

export interface BroadcastJob {
  id: string;
  title: string;
  message_type: "text" | "flex" | "image" | "template";
  message_content: Record<string, unknown>;
  target_filter: Record<string, unknown> | null;
  target_count: number;
  sent_count: number;
  failed_count: number;
  status: "draft" | "scheduled" | "sending" | "completed" | "failed";
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BroadcastLog {
  id: string;
  broadcast_job_id: string;
  user_id: string;
  status: "sent" | "failed";
  error_message: string | null;
  sent_at: string;
}

export interface EcInsight {
  id: string;
  user_id: string;
  insight_type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_type: "admin" | "system" | "cron";
  actor_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AdminUser {
  id: string;
  auth_user_id: string;
  email: string;
  display_name: string;
  role: "owner" | "admin" | "operator";
  avatar_url: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Insert types (omit auto-generated fields)
// ============================================================================

export type UserInsert = Omit<User, "id" | "created_at" | "updated_at">;
export type TagInsert = Omit<Tag, "id" | "created_at">;
export type UserTagInsert = Omit<UserTag, "id" | "created_at">;
export type ConversationInsert = Omit<Conversation, "id" | "created_at" | "updated_at">;
export type MessageInsert = Omit<Message, "id" | "created_at">;
export type EventInsert = Omit<Event, "id" | "created_at" | "updated_at" | "registered_count">;
export type EventRegistrationInsert = Omit<EventRegistration, "id" | "registered_at">;
export type ReservationSlotInsert = Omit<ReservationSlot, "id" | "created_at" | "updated_at" | "booked_count">;
export type ReservationInsert = Omit<Reservation, "id" | "created_at" | "updated_at">;
export type AiHearingInsert = Omit<AiHearing, "id" | "created_at">;
export type BroadcastJobInsert = Omit<BroadcastJob, "id" | "created_at" | "updated_at" | "sent_count" | "failed_count">;
export type BroadcastLogInsert = Omit<BroadcastLog, "id">;
export type EcInsightInsert = Omit<EcInsight, "id" | "created_at">;
export type AuditLogInsert = Omit<AuditLog, "id" | "created_at">;
export type AdminUserInsert = Omit<AdminUser, "id" | "created_at" | "updated_at">;

// ============================================================================
// Update types (all fields optional)
// ============================================================================

export type UserUpdate = Partial<Omit<User, "id" | "created_at">>;
export type TagUpdate = Partial<Omit<Tag, "id" | "created_at">>;
export type ConversationUpdate = Partial<Omit<Conversation, "id" | "created_at">>;
export type MessageUpdate = Partial<Omit<Message, "id" | "created_at">>;
export type EventUpdate = Partial<Omit<Event, "id" | "created_at">>;
export type EventRegistrationUpdate = Partial<Omit<EventRegistration, "id" | "registered_at">>;
export type ReservationSlotUpdate = Partial<Omit<ReservationSlot, "id" | "created_at">>;
export type ReservationUpdate = Partial<Omit<Reservation, "id" | "created_at">>;
export type AiHearingUpdate = Partial<Omit<AiHearing, "id" | "created_at">>;
export type BroadcastJobUpdate = Partial<Omit<BroadcastJob, "id" | "created_at">>;
export type EcInsightUpdate = Partial<Omit<EcInsight, "id" | "created_at">>;
export type AuditLogUpdate = Partial<Omit<AuditLog, "id" | "created_at">>;
export type AdminUserUpdate = Partial<Omit<AdminUser, "id" | "created_at">>;

// ============================================================================
// Supabase Database type mapping (for createClient<Database>)
// ============================================================================

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: UserInsert;
        Update: UserUpdate;
      };
      tags: {
        Row: Tag;
        Insert: TagInsert;
        Update: TagUpdate;
      };
      user_tags: {
        Row: UserTag;
        Insert: UserTagInsert;
        Update: Partial<UserTag>;
      };
      conversations: {
        Row: Conversation;
        Insert: ConversationInsert;
        Update: ConversationUpdate;
      };
      messages: {
        Row: Message;
        Insert: MessageInsert;
        Update: MessageUpdate;
      };
      events: {
        Row: Event;
        Insert: EventInsert;
        Update: EventUpdate;
      };
      event_registrations: {
        Row: EventRegistration;
        Insert: EventRegistrationInsert;
        Update: EventRegistrationUpdate;
      };
      reservation_slots: {
        Row: ReservationSlot;
        Insert: ReservationSlotInsert;
        Update: ReservationSlotUpdate;
      };
      reservations: {
        Row: Reservation;
        Insert: ReservationInsert;
        Update: ReservationUpdate;
      };
      ai_hearings: {
        Row: AiHearing;
        Insert: AiHearingInsert;
        Update: AiHearingUpdate;
      };
      broadcast_jobs: {
        Row: BroadcastJob;
        Insert: BroadcastJobInsert;
        Update: BroadcastJobUpdate;
      };
      broadcast_logs: {
        Row: BroadcastLog;
        Insert: BroadcastLogInsert;
        Update: Partial<BroadcastLog>;
      };
      ec_insights: {
        Row: EcInsight;
        Insert: EcInsightInsert;
        Update: EcInsightUpdate;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: AuditLogInsert;
        Update: AuditLogUpdate;
      };
      admin_users: {
        Row: AdminUser;
        Insert: AdminUserInsert;
        Update: AdminUserUpdate;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      membership_tier: "free" | "bronze" | "silver" | "gold" | "platinum";
      conversation_status: "active" | "resolved" | "pending";
      sender_type: "user" | "admin" | "bot";
      message_type: "text" | "image" | "sticker" | "flex" | "template" | "audio" | "video";
      event_registration_status: "registered" | "cancelled" | "attended";
      reservation_status: "confirmed" | "cancelled" | "completed" | "no_show";
      broadcast_status: "draft" | "scheduled" | "sending" | "completed" | "failed";
      broadcast_log_status: "sent" | "failed";
      admin_role: "owner" | "admin" | "operator";
      actor_type: "admin" | "system" | "cron";
    };
  };
}
