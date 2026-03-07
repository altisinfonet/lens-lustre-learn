import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getStoredReferralCode, clearStoredReferralCode } from "@/hooks/useReferral";
import { logAuthEvent } from "@/hooks/useActivityLog";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncProfile = async (user: User) => {
      const meta = user.user_metadata;
      if (!meta) return;

      const fullName = meta.full_name || meta.name || null;
      const avatarUrl = meta.avatar_url || meta.picture || null;

      const payload: { id: string; full_name?: string; avatar_url?: string } = {
        id: user.id,
      };

      if (fullName) payload.full_name = fullName;
      if (avatarUrl) payload.avatar_url = avatarUrl;

      // Prevent wiping existing profile fields (especially avatar_url) with null values.
      if (!payload.full_name && !payload.avatar_url) return;

      await supabase.from("profiles").upsert(payload, { onConflict: "id" });
    };

    const linkReferral = async (user: User) => {
      const code = getStoredReferralCode();
      if (!code) return;
      try {
        const { data: codeRow } = await (supabase
          .from("referral_codes" as any)
          .select("id, user_id")
          .eq("code", code)
          .maybeSingle() as any);
        if (codeRow && codeRow.user_id !== user.id) {
          await (supabase.from("referrals" as any).insert({
            referrer_id: codeRow.user_id,
            referred_id: user.id,
            referral_code_id: codeRow.id,
          } as any) as any);
        }
      } catch {} finally {
        clearStoredReferralCode();
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        setTimeout(() => syncProfile(session.user), 0);
        if (_event === 'SIGNED_IN') {
          setTimeout(() => linkReferral(session.user), 100);
          setTimeout(() => logAuthEvent(session.user.id, 'login'), 0);
        }
        if (_event === 'SIGNED_UP') {
          setTimeout(() => logAuthEvent(session.user.id, 'signup'), 0);
        }
        if (_event === 'PASSWORD_RECOVERY') {
          setTimeout(() => logAuthEvent(session.user.id, 'password_recovery'), 0);
        }
      }
    });

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        const lower = (error.message || "").toLowerCase();
        const isNetwork =
          lower.includes("failed to fetch") ||
          lower.includes("networkerror") ||
          lower.includes("load failed");

        // Clear corrupted/stale session to stop refresh loops, but avoid wiping state on transient network issues.
        if (!isNetwork) {
          supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        }
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        syncProfile(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    if (user) logAuthEvent(user.id, 'logout');
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
