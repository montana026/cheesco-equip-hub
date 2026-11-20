import { createAuthClient, supabaseServer } from '@/lib/supabase/server';
import type { UserRole } from '@/lib/types';
import type { NextRequest } from 'next/server';

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
    // Determine application base URL for email verification callback
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const emailRedirectTo = `${appUrl}/auth/callback?next=/login?verified=true`;

    const signUpOptions = {
      emailRedirectTo,
      data: {
        full_name: input.fullName,
        role: input.role,
      },
    };

    // Create auth user via stateless createAuthClient()
    let authData;
    const authClient = createAuthClient();
    const { data, error: authError } = await authClient.auth.signUp({
      email: input.email,
      password: input.password,
      options: signUpOptions,
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
            const retry = await createAuthClient().auth.signUp({
              email: input.email,
              password: input.password,
              options: signUpOptions,
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
          const retry = await createAuthClient().auth.signUp({
            email: input.email,
            password: input.password,
            options: signUpOptions,
          });
          if (retry.error) throw retry.error;
          authData = retry.data;
        } else {
          throw new Error('An account with this email already exists.');
        }
      }
    }

    if (!authData?.user) throw new Error('Failed to create user');

    // Privilege escalation prevention: public signups are strictly CUSTOMER or MERCHANT
    const safeRole: UserRole = input.role === 'MERCHANT' ? 'MERCHANT' : 'CUSTOMER';

    // Create user profile using supabaseServer (service role key bypasses RLS)
    const { error: profileError } = await supabaseServer.from('users').upsert({
      id: authData.user.id,
      email: input.email,
      full_name: input.fullName,
      phone: input.phone,
      role: safeRole,
    });

    if (profileError) throw profileError;

    // Sync role to app_metadata so Supabase Auth and JWT reflect the authoritative role
    try {
      await supabaseServer.auth.admin.updateUserById(authData.user.id, {
        app_metadata: { role: safeRole },
      });
    } catch (metaErr) {
      console.warn('[authService.signUp] Could not update app_metadata:', metaErr);
    }

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
    const { data, error } = await createAuthClient().auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error) throw error;
    return data;
  },

  /**
   * Sign out: invalidates the user's session token via admin API without affecting server state
   */
  async signOut(accessToken?: string) {
    if (accessToken) {
      try {
        await supabaseServer.auth.admin.signOut(accessToken, 'local');
      } catch (err) {
        console.warn('[authService.signOut] admin signOut warning:', err);
      }
    }
  },

  /**
   * Get current session
   */
  async getSession() {
    const { data, error } = await createAuthClient().auth.getSession();
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
   * Get user from NextRequest (Authorization header or cookie) or active session
   */
  async getUserFromRequest(request?: NextRequest) {
    let token: string | null = null;

    if (request) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      }
      if (!token) {
        token =
          request.cookies.get('sb-access-token')?.value ||
          request.cookies.get('auth_token')?.value ||
          null;
      }
    }

    let authUser: any = null;

    if (token) {
      const {
        data: { user },
        error: authErr,
      } = await supabaseServer.auth.getUser(token);

      if (user && !authErr) {
        authUser = user;
      }
    }

    if (authUser) {
      const { data: userProfile } = await supabaseServer
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      const { data: merchantProfiles } = await supabaseServer
        .from('merchant_profiles')
        .select('*')
        .eq('user_id', authUser.id);

      if (userProfile) {
        return {
          ...userProfile,
          merchant_profile: merchantProfiles || [],
        };
      }

      // Role MUST come only from users table or app_metadata, NEVER user_metadata
      return {
        id: authUser.id,
        email: authUser.email,
        role: (authUser.app_metadata?.role as UserRole) || 'CUSTOMER',
        full_name: authUser.user_metadata?.full_name || authUser.email,
        merchant_profile: merchantProfiles || [],
      };
    }

    try {
      return await this.getCurrentUser();
    } catch {
      return null;
    }
  },

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string) {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const { error } = await createAuthClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/reset-password`,
    });

    if (error) throw error;
  },

  /**
   * Update password
   */
  async updatePassword(newPassword: string) {
    const { error } = await createAuthClient().auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  },

  /**
   * Update user profile - strictly allowlist only safe fields: ['full_name', 'phone', 'avatar_url']
   */
  async updateProfile(userId: string, updates: Partial<{
    full_name: string;
    phone: string;
    avatar_url: string;
  }>) {
    const ALLOWED_FIELDS = ['full_name', 'phone', 'avatar_url'] as const;
    const safeUpdates: Record<string, any> = {};

    for (const key of ALLOWED_FIELDS) {
      if (key in updates && updates[key] !== undefined) {
        safeUpdates[key] = updates[key];
      }
    }

    if (Object.keys(safeUpdates).length === 0) {
      throw new Error('No valid profile fields provided for update');
    }

    const { data, error } = await supabaseServer
      .from('users')
      .update(safeUpdates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
