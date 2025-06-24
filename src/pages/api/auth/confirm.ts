import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextApiRequest, type NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).end();
    return;
  }
  const { token_hash, type, next } = req.query;
  if (token_hash && type) {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash: token_hash as string,
    });
    if (!error) {
      res.redirect(next ? String(next) : '/');
      return;
    }
  }
  res.redirect('/auth/auth-code-error');
}
