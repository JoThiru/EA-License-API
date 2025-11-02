// Get Client's Licenses API
import { createClient } from '@supabase/supabase-js';
import { verifyClientSession } from '../auth/verify.js';

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

  // Verify authentication
  const verification = verifyClientSession(req);
  if (!verification.valid) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Please login to access this resource'
    });
  }

  // Initialize Supabase client
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'Database credentials not configured'
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get client ID from session
    const { data: session } = await supabase
      .from('client_sessions')
      .select('client_id')
      .eq('session_token', verification.sessionToken)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    const clientId = session?.client_id;

    // Get client email
    const { data: client } = await supabase
      .from('clients')
      .select('email')
      .eq('id', clientId)
      .maybeSingle();

    // Get licenses for this client
    // requested_by is TEXT in your schema, so we compare as strings
    const clientIdStr = clientId ? String(clientId) : '';
    const clientEmail = client?.email || '';
    
    let licensesQuery = supabase
      .from('licenses')
      .select('*');
    
    // Build OR query for requested_by OR requested_email
    if (clientIdStr && clientEmail) {
      licensesQuery = licensesQuery.or(`requested_by.eq.${clientIdStr},requested_email.eq.${clientEmail}`);
    } else if (clientIdStr) {
      licensesQuery = licensesQuery.eq('requested_by', clientIdStr);
    } else if (clientEmail) {
      licensesQuery = licensesQuery.eq('requested_email', clientEmail);
    }
    
    const { data: licenses, error } = await licensesQuery
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        error: 'Database error',
        message: error.message
      });
    }

    return res.status(200).json({
      success: true,
      licenses: licenses || []
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({
      error: 'Server error',
      message: err.message
    });
  }
}


