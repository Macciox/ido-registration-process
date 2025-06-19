import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Hook che aggiorna lo status della mail in admin_whitelist a 'verified'
 * dopo il primo login dell'utente (dopo la verifica email).
 * Da usare in un componente che ha accesso all'utente loggato (user.email).
 */
// Hook che aggiorna lo status della mail in admin_whitelist a 'verified'
// e assegna il ruolo admin solo dopo la verifica email
export function useVerifyAdminWhitelist(user?: { email?: string, email_confirmed_at?: string, confirmed_at?: string }) {
  useEffect(() => {
    if (!user?.email) return;
    // Cerca la proprietà che indica la verifica email
    const isVerified = !!(user.email_confirmed_at || user.confirmed_at);
    if (!isVerified) return;
    // Aggiorna lo status solo se è ancora pending e la mail è verificata
    const updateWhitelistStatus = async () => {
      const { data, error } = await supabase
        .from('admin_whitelist')
        .select('id, status')
        .eq('email', user.email)
        .single();
      if (data && data.status === 'pending') {
        await supabase
          .from('admin_whitelist')
          .update({ status: 'verified' })
          .eq('email', user.email);
        // Aggiorna anche il ruolo nel profilo se necessario
        await supabase
          .from('profiles')
          .update({ role: 'admin' })
          .eq('email', user.email);
      }
    };
    updateWhitelistStatus();
  }, [user?.email, user?.email_confirmed_at, user?.confirmed_at]);
}
