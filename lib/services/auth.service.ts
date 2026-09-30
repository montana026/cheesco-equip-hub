import { supabase } from '@/lib/supabase/client';
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
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Failed to create user');

    // Create user profile
    const { error: profileError } = await supabase.from('users').insert({
      id: authData.user.id,
      email: input.email,
      full_name: input.fullName,
      phone: input.phone,
      role: input.role,
    });

    if (profileError) throw profileError;

    // If merchant, create merchant profile
    if (input.role === 'MERCHANT' && input.businessName) {
      const { error: merchantError } = await supabase
        .from('merchant_profiles')
        .insert({
          user_id: authData.user.id,
          business_name: input.businessName,
        });

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

    const { data: user, error } = await supabase
      .from('users')
      .select(`
        *,
        merchant_profile:merchant_profiles(*)
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
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
