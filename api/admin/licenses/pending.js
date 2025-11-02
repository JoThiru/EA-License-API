// Get Pending License Requests API
import { createClient } from '@supabase/supabase-js';
import { verifySession } from '../auth/verify.js';

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
  const verification = verifySession(req);
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
    // Get pending license requests
    const { data: pendingLicenses, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('status', 'pending')
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
      pendingRequests: pendingLicenses || [],
      count: pendingLicenses?.length || 0
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({
      error: 'Server error',
      message: err.message
    });
  }
}


