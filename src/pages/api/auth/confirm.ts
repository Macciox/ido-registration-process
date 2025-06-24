import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@/utils/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { token_hash, type, next } = req.query
  const redirectTo = (next as string) || '/dashboard'

  if (token_hash && type) {
    const supabase = createClient(req.cookies)

    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash: token_hash as string,
    })

    if (!error) {
      return res.redirect(redirectTo)
    }
  }

  return res.redirect('/login?error=confirmation_failed')
}