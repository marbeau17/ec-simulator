"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

interface UseSessionReturn {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

/**
 * React hook that tracks the current Supabase auth session.
 * Automatically updates when the user signs in or out.
 */
export function useSession(): UseSessionReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Get the initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    user: session?.user ?? null,
    loading,
  };
}

interface UseRoleReturn {
  role: string | null;
  isOwner: boolean;
  isAdmin: boolean;
  isOperator: boolean;
  loading: boolean;
}

/**
 * React hook that fetches the current user's admin role.
 * Returns role flags for convenience.
 */
export function useRole(): UseRoleReturn {
  const { user, loading: sessionLoading } = useSession();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (sessionLoading) return;

    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      const { data: adminUser } = await supabase
        .from("admin_users")
        .select("role")
        .eq("auth_user_id", user.id)
        .single();

      setRole(adminUser?.role ?? null);
      setLoading(false);
    };

    fetchRole();
  }, [user, sessionLoading]);

  return {
    role,
    isOwner: role === "owner",
    isAdmin: role === "owner" || role === "admin",
    isOperator: role === "owner" || role === "admin" || role === "operator",
    loading: loading || sessionLoading,
  };
}
