// List Licenses API (Combined: All licenses and Pending requests)
// Use ?pending=true to get only pending requests
import { createClient } from '@supabase/supabase-js';

// Verify session function
function verifySession(req, userType = 'admin') {
  const cookieHeader = req.headers.cookie;
  const authHeader = req.headers.authorization;

  let sessionToken = null;
  const cookieName = userType === 'admin' ? 'admin_session' : 'client_session';

  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});
    sessionToken = cookies[cookieName];
  }

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

  // Verify authentication
  const verification = verifySession(req, 'admin');
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
    const isPending = req.query.pending === 'true';
    
    let query = supabase
      .from('licenses')
      .select('*');

    if (isPending) {
      query = query.eq('status', 'pending');
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        error: 'Database error',
        message: error.message
      });
    }

    if (isPending) {
      return res.status(200).json({
        success: true,
        pendingRequests: data || [],
        count: data?.length || 0
      });
    }

    return res.status(200).json({
      success: true,
      data: data || []
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({
      error: 'Server error',
      message: err.message
    });
  }
}
