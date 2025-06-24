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
      // Update whitelist status and create profile
      const { data: adminWhitelist } = await supabase
        .from('admin_whitelist')
        .select('id')
        .eq('email', req.query.email || '')
        .maybeSingle()
      
      const { data: projectOwners } = await supabase
        .from('project_owners')
        .select('id')
        .eq('email', req.query.email || '')
      
      // Get user info from token
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        if (adminWhitelist) {
          await supabase
            .from('admin_whitelist')
            .update({ status: 'registered' })
            .eq('id', adminWhitelist.id)
          
          await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              role: 'admin'
            })
        }
        
        if (projectOwners && projectOwners.length > 0) {
          for (const owner of projectOwners) {
            await supabase
              .from('project_owners')
              .update({ status: 'registered' })
              .eq('id', owner.id)
          }
          
          await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              role: 'project_owner'
            })
        }
      }
      
      return res.redirect(redirectTo)
    }
  }

  return res.redirect('/login?error=confirmation_failed')
}
