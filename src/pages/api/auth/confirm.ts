import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { token_hash, type, next } = req.query
  const redirectTo = (next as string) || '/dashboard'

  console.log('Confirm API called with:', { token_hash, type, next })

  if (token_hash && type) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log('Attempting to verify OTP...')
    const { error, data } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash: token_hash as string,
    })

    console.log('Verification result:', { error, data })

    if (!error) {
      console.log('Email verified successfully, redirecting to:', redirectTo)
      return res.redirect(redirectTo)
    } else {
      console.error('Verification failed:', error)
    }
  }

  console.log('Redirecting to login with error')
  return res.redirect('/login?error=confirmation_failed')
}