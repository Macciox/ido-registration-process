// Questo è un esempio di come dovrebbe essere la funzione Edge
// Copia e incolla questo codice nella tua funzione Edge su Supabase

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

// Definisci gli header CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Gestisci le richieste preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verifica che la richiesta sia POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 405 
        }
      );
    }

    // Estrai i parametri dalla richiesta
    const { email, code } = await req.json();

    // Verifica che i parametri siano presenti
    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: 'Email and code are required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Verifica che l'API key sia presente
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set');
      return new Response(
        JSON.stringify({ error: 'Email service configuration error' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    // Invia l'email
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'verification@ido-registration-process.vercel.app',
        to: email,
        subject: 'Verify your email for Decubate IDO',
        html: `
          <h2>Verify your email</h2>
          <p>Thank you for registering with Decubate IDO. To complete your registration, please enter the following verification code:</p>
          <h3 style="font-size: 24px; letter-spacing: 2px; text-align: center; padding: 10px; background-color: #f0f0f0; border-radius: 4px;">${code}</h3>
          <p>This code will expire in 30 minutes.</p>
          <p>If you did not request this verification, please ignore this email.</p>
        `,
      }),
    });

    // Gestisci la risposta
    const data = await res.json();
    
    // Aggiungi log per debug
    console.log('Resend API response:', data);
    
    return new Response(
      JSON.stringify(data),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: res.status 
      }
    );
  } catch (error) {
    // Log dell'errore per debug
    console.error('Error in Edge Function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});