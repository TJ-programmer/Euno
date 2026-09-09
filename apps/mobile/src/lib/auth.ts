import { supabase } from '@/lib/supabase';

export async function sendMagicLink(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      emailRedirectTo: 'euno://auth/callback',
    },
  });

  if (error) {
    throw error;
  }
}
