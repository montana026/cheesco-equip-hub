import { supabase } from '@/lib/supabase/client';
import { supabaseServer } from '@/lib/supabase/server';
import type { UserRole } from '@/lib/types';

export interface SignUpInput {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  businessName?: string; // For merchants
}

export interface SignInInput {
  email: string;
  password: string;
}

export const authService = {
  /**
   * Sign up new user
   */
  async signUp(input: SignUpInput) {
    // Create auth user
    let authData;
    const { data, error: authError } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
    });

    if (authError) {
      // If user is already registered in auth.users, check if they have a profile
      if (authError.message.toLowerCase().includes('already registered')) {
        const { data: usersData } = await supabaseServer.auth.admin.listUsers();
        const existingAuthUser = usersData?.users.find(
          (u) => u.email?.toLowerCase() === input.email.toLowerCase()
        );

        if (existingAuthUser) {
          const { data: existingProfile } = await supabaseServer
            .from('users')
            .select('id')
            .eq('id', existingAuthUser.id)
            .maybeSingle();

          if (!existingProfile) {
            // Orphaned auth user from a previously failed profile creation — clean up and retry
            await supabaseServer.auth.admin.deleteUser(existingAuthUser.id);
            const retry = await supabase.auth.signUp({
              email: input.email,
              password: input.password,
            });
            if (retry.error) throw retry.error;
            authData = retry.data;
          } else {
            throw authError;
          }
        } else {
          throw authError;
        }
      } else {
        throw authError;
      }
    } else {
      authData = data;
    }

    if (!authData?.user) throw new Error('Failed to create user');

    // Handle case where Supabase returns obfuscated user with empty identities (already exists)
    if (authData.user.identities && authData.user.identities.length === 0) {
      const { data: usersData } = await supabaseServer.auth.admin.listUsers();
      const existingAuthUser = usersData?.users.find(
        (u) => u.email?.toLowerCase() === input.email.toLowerCase()
      );

      if (existingAuthUser) {
        const { data: existingProfile } = await supabaseServer
          .from('users')
          .select('id')
          .eq('id', existingAuthUser.id)
          .maybeSingle();

        if (!existingProfile) {
          await supabaseServer.auth.admin.deleteUser(existingAuthUser.id);
          const retry = await supabase.auth.signUp({
            email: input.email,
            password: input.password,
          });
          if (retry.error) throw retry.error;
          authData = retry.data;
        } else {
          throw new Error('An account with this email already exists.');
        }
      }
    }

    if (!authData?.user) throw new Error('Failed to create user');

    // Create user profile using supabaseServer (service role key bypasses RLS)
    const { error: profileError } = await supabaseServer.from('users').upsert({
      id: authData.user.id,
      email: input.email,
      full_name: input.fullName,
      phone: input.phone,
      role: input.role,
    });

    if (profileError) throw profileError;

    // If merchant, create merchant profile using supabaseServer
    if (input.role === 'MERCHANT' && input.businessName) {
      const { error: merchantError } = await supabaseServer
        .from('merchant_profiles')
        .upsert(
          {
            user_id: authData.user.id,
            business_name: input.businessName,
          },
          { onConflict: 'user_id' }
        );

      if (merchantError) throw merchantError;
    }

    return authData;
  },

  /**
   * Sign in user
   */
  async signIn(input: SignInInput) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error) throw error;
    return data;
  },

  /**
   * Sign out
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Get current session
   */
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  /**
   * Get current user with profile
   */
  async getCurrentUser() {
    const session = await this.getSession();
    if (!session) return null;

    const { data: user, error } = await supabaseServer
      .from('users')
      .select(`
        *,
        merchant_profile:merchant_profiles!merchant_profiles_user_id_fkey(*)
      `)
      .eq('id', session.user.id)
      .single();

    if (error) throw error;
    return user;
  },

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
    });

    if (error) throw error;
  },

  /**
   * Update password
   */
  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  },

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updates: Partial<{
    full_name: string;
    phone: string;
    avatar_url: string;
  }>) {
    const { data, error } = await supabaseServer
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
