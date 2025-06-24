import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    const { email, code } = await req.json();
    console.log('Verification email request:', { email, code });

    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: 'Email and code are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const subject = 'Verify your email address - IDO Platform';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; text-align: center;">Verify your email address</h2>
        <p>Thank you for registering with IDO Platform. Please use the verification code below to complete your registration:</p>
        <div style="background-color: #f5f5f5; padding: 30px; text-align: center; margin: 30px 0; border-radius: 8px;">
          <h1 style="color: #333; font-size: 36px; margin: 0; letter-spacing: 4px;">${code}</h1>
        </div>
        <p style="color: #666;">This code will expire in 30 minutes.</p>
        <p style="color: #666;">If you didn't request this verification, please ignore this email.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #999; font-size: 12px; text-align: center;">IDO Platform - Decubate</p>
      </div>
    `;

    console.log('Sending email via Resend...');
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'IDO Platform <noreply@decubateido.com>',
        to: [email],
        subject,
        html,
      }),
    });

    const data = await res.json();
    console.log('Resend response:', data);

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: res.status }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Edge Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

/* To invoke:
curl -i --location --request POST 'http://localhost:54321/functions/v1/send-verification-email' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{"email":"test@example.com","code":"123456"}'
*/