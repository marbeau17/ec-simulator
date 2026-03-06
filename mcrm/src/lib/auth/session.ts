import { createServerClient } from "@/lib/supabase/server";
import type { AdminUser } from "@/types/database";

const ROLE_HIERARCHY: Record<string, number> = {
  owner: 3,
  admin: 2,
  operator: 1,
};

/**
 * Get the current Supabase auth session.
 * Returns null if not authenticated.
 */
export async function getSession() {
  const supabase = await createServerClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    return null;
  }

  return session;
}

/**
 * Get the current admin user with role from the admin_users table.
 * Returns null if user is not an admin.
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: adminUser, error } = await supabase
    .from("admin_users")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  if (error || !adminUser) {
    return null;
  }

  return adminUser as AdminUser;
}

/**
 * Require a valid auth session. Throws if not authenticated.
 */
export async function requireAuth() {
  const session = await getSession();

  if (!session) {
    throw new Error("Authentication required");
  }

  return session;
}

/**
 * Require the current user to have at least the specified role.
 * Role hierarchy: owner > admin > operator
 * Throws if the user doesn't meet the role requirement.
 */
export async function requireRole(role: "owner" | "admin" | "operator") {
  await requireAuth();
  const adminUser = await getAdminUser();

  if (!adminUser) {
    throw new Error("Admin access required");
  }

  const requiredLevel = ROLE_HIERARCHY[role] ?? 0;
  const userLevel = ROLE_HIERARCHY[adminUser.role] ?? 0;

  if (userLevel < requiredLevel) {
    throw new Error(
      `Insufficient permissions. Required: ${role}, current: ${adminUser.role}`
    );
  }

  return adminUser;
}
