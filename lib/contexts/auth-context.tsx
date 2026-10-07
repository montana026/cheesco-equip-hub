"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { setLocalSession, getSession } from "@/lib/auth";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select(`
          *,
          merchant_profile:merchant_profiles!merchant_profiles_user_id_fkey(*)
        `)
        .eq("id", userId)
        .single();

      if (error) throw error;
      if (data) {
        const normalized = {
          ...data,
          name: data.full_name || data.name || data.email,
        };
        setProfile(normalized);
        setLocalSession({
          id: normalized.id,
          name: normalized.name,
          email: normalized.email,
          role: normalized.role,
        });
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      await fetchUserProfile(session.user.id);
    } else {
      const local = getSession();
      if (local) {
        setUser({ id: local.id, email: local.email } as User);
        setProfile(local);
      }
    }
  };

  useEffect(() => {
    // Get initial session
    const loadSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await fetchUserProfile(session.user.id);
      } else {
        const local = getSession();
        if (local) {
          setUser({ id: local.id, email: local.email } as User);
          setProfile(local);
        }
      }
      setLoading(false);
    };
    
    loadSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.id);

      // Only update state on actual sign-in/sign-out events
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (session?.user) {
          setUser(session.user);
          await fetchUserProfile(session.user.id);
        } else {
          const local = getSession();
          if (local) {
            setUser({ id: local.id, email: local.email } as User);
            setProfile(local);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
      } else if (event === 'TOKEN_REFRESHED') {
        // Token refresh should not clear the user
        if (session?.user && !user) {
          setUser(session.user);
          await fetchUserProfile(session.user.id);
        }
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    try {
      localStorage.removeItem("cheesco.session.v1");
      localStorage.removeItem("auth_token");
    } catch {}
    setUser(null);
    setProfile(null);
    router.push("/");
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
