import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "platform_admin" | "salon_admin";

type AuthCtx = {
  session: Session | null;
  user: User | null;
  roles: Role[];
  loading: boolean;
  isPlatformAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const lastRoleUserId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadingFallback = window.setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 2500);

    // Listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      window.clearTimeout(loadingFallback);
      setSession(sess);
      setUser(sess?.user ?? null);
      setLoading(false);
      if (sess?.user) {
        // Defer role fetch to avoid deadlock
        queueRoleFetch(sess.user.id);
      } else {
        lastRoleUserId.current = null;
        setRoles([]);
      }
    });

    // Then existing session. Never let auth hydration hold the whole app spinner forever.
    supabase.auth.getSession()
      .then(({ data: { session: sess } }) => {
        setSession(sess);
        setUser(sess?.user ?? null);
        if (sess?.user) queueRoleFetch(sess.user.id);
      })
      .catch(() => {
        setSession(null);
        setUser(null);
        lastRoleUserId.current = null;
        setRoles([]);
      })
      .finally(() => {
        window.clearTimeout(loadingFallback);
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(loadingFallback);
      subscription.unsubscribe();
    };
  }, []);

  function queueRoleFetch(userId: string) {
    if (lastRoleUserId.current === userId) return;
    lastRoleUserId.current = userId;
    setTimeout(() => fetchRoles(userId), 0);
  }

  async function fetchRoles(userId: string) {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    setRoles((data ?? []).map((r) => r.role as Role));
  }

  const signIn: AuthCtx["signIn"] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp: AuthCtx["signUp"] = async (email, password, fullName) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: { full_name: fullName },
      },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        roles,
        loading,
        isPlatformAdmin: roles.includes("platform_admin"),
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
