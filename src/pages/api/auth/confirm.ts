import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { token_hash, type, next } = req.query
  const redirectTo = (next as string) || '/dashboard'

  if (token_hash && type) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash: token_hash as string,
    })

    if (!error) {
      // Email verified successfully - trigger will handle profile creation
      return res.redirect(redirectTo)
    }
  }

  return res.redirect('/login?error=confirmation_failed')
}