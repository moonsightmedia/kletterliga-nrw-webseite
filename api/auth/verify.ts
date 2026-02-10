/**
 * Vercel Serverless Function: Auth-Verify Proxy
 * 
 * Diese Funktion leitet Auth-Verifizierungsanfragen von unserer Domain
 * an Supabase weiter, damit die Links in E-Mails auf unsere Domain zeigen.
 * 
 * URL: https://kletterliga-nrw.de/api/auth/verify?token=...&type=...&redirect_to=...
 * 
 * Vercel erkennt automatisch Dateien im api/ Ordner als Serverless Functions.
 * Verwendet das Web Standard API Format für Vercel Functions.
 */

export default {
  async fetch(request: Request): Promise<Response> {
    // Nur GET-Anfragen erlauben (Supabase Auth verwendet GET)
    if (request.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Supabase Projekt-URL aus Environment-Variable
    // In Vercel Serverless Functions sind Environment-Variablen verfügbar
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    
    if (!supabaseUrl) {
      console.error('Missing SUPABASE_URL environment variable');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // URL-Parameter extrahieren
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    const type = url.searchParams.get('type');
    const redirectTo = url.searchParams.get('redirect_to');

    if (!token || !type) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameters: token and type are required' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Standard-Redirect-URL, falls nicht angegeben
    const defaultRedirectTo = 'https://kletterliga-nrw.de/app/auth/confirm';
    const finalRedirectTo = redirectTo || defaultRedirectTo;

    // Supabase Auth-Verify URL zusammenbauen
    const supabaseVerifyUrl = new URL('/auth/v1/verify', supabaseUrl);
    supabaseVerifyUrl.searchParams.set('token', token);
    supabaseVerifyUrl.searchParams.set('type', type);
    supabaseVerifyUrl.searchParams.set('redirect_to', finalRedirectTo);

    // Weiterleitung an Supabase
    return Response.redirect(supabaseVerifyUrl.toString(), 302);
  },
};
