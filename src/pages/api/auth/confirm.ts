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

    if (!error && data.user) {
      console.log('Email verified successfully for user:', data.user.email)
      
      // Update projectowner_whitelist status to 'registered'
      if (data.user.email) {
        try {
          const { error: updateError } = await supabase
            .from('projectowner_whitelist')
            .update({ status: 'registered' })
            .eq('email', data.user.email)
            .eq('status', 'pending_verification')
          
          if (updateError) {
            console.error('Error updating projectowner_whitelist:', updateError)
          } else {
            console.log('Updated projectowner_whitelist status to registered for:', data.user.email)
          }
        } catch (err) {
          console.error('Error in projectowner_whitelist update:', err)
        }
      }
      
      console.log('Redirecting to:', redirectTo)
      return res.redirect(redirectTo)
    } else {
      console.error('Verification failed:', error)
    }
  }

  console.log('Redirecting to login with error')
  return res.redirect('/login?error=confirmation_failed')
}