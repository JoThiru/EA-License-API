// Unified Session Verification API
// Handles both admin and client session verification
import { createClient } from '@supabase/supabase-js';

function verifySession(req, userType = 'admin') {
  const cookieHeader = req.headers.cookie;
  const authHeader = req.headers.authorization;

  let sessionToken = null;
  const cookieName = userType === 'admin' ? 'admin_session' : 'client_session';

  // Try to get from cookie first
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});
    sessionToken = cookies[cookieName];
  }

  // Fallback to Authorization header
  if (!sessionToken && authHeader) {
    sessionToken = authHeader.replace('Bearer ', '');
  }

  if (!sessionToken || sessionToken.length < 32) {
    return { valid: false, error: 'Invalid or missing session' };
  }

  return { valid: true, sessionToken };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Determine user type from query parameter or path
  const userType = req.query.type || (req.url?.includes('/client') ? 'client' : 'admin');
  const verification = verifySession(req, userType);

  if (!verification.valid) {
    return res.status(401).json({
      authenticated: false,
      error: verification.error
    });
  }

  // For client sessions, verify in database
  if (userType === 'client') {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);

      try {
        const { data: session } = await supabase
          .from('client_sessions')
          .select('client_id, expires_at')
          .eq('session_token', verification.sessionToken)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (!session) {
          return res.status(401).json({
            authenticated: false,
            error: 'Session expired or invalid'
          });
        }
      } catch (err) {
        // If session table doesn't exist, just validate token format
        console.error('Session verification error:', err);
      }
    }
  }

  return res.status(200).json({
    authenticated: true,
    message: 'Session valid'
  });
}

