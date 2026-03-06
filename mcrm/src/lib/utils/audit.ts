import { createAdminClient } from "@/lib/supabase/admin";

interface LogAuditParams {
  actorType: "admin" | "system" | "cron";
  actorId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Insert an entry into the audit_logs table.
 * Uses the admin client (service role) so it bypasses RLS.
 *
 * This function intentionally does not throw on failure —
 * audit logging should never break the primary operation.
 */
export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase.from("audit_logs").insert({
      actor_type: params.actorType,
      actor_id: params.actorId ?? null,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId ?? null,
      details: params.details ?? null,
      ip_address: params.ipAddress ?? null,
      user_agent: params.userAgent ?? null,
    });

    if (error) {
      console.error("[audit] Failed to write audit log:", error.message);
    }
  } catch (err) {
    console.error("[audit] Unexpected error writing audit log:", err);
  }
}
