// Update License API
// Secure server-side endpoint with authentication
import { createClient } from '@supabase/supabase-js';
import { verifySession } from '../auth/verify.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'PUT') {
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

  // Get request data
  const { licenseKey, accountId, hardwareId, expiryDate, status } = req.body;

  // Validate required fields
  if (!licenseKey || !accountId || !hardwareId || !expiryDate) {
    return res.status(400).json({ 
      error: 'Validation error',
      message: 'All fields are required' 
    });
  }

  // Initialize Supabase client (server-side only)
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
    // Check for duplicate hardware ID + account ID combination (excluding current license)
    const { data: existingCombination } = await supabase
      .from('licenses')
      .select('hardware_id, account_id')
      .eq('hardware_id', hardwareId)
      .eq('account_id', accountId)
      .neq('license_key', licenseKey)
      .maybeSingle();

    if (existingCombination) {
      return res.status(409).json({ 
        error: 'Duplicate combination',
        message: `Combination of Hardware ID "${hardwareId}" and Account ID "${accountId}" already exists in another license` 
      });
    }

    // Update license
    const { data, error } = await supabase
      .from('licenses')
      .update({
        account_id: accountId,
        hardware_id: hardwareId,
        expiry_date: expiryDate,
        status: status || 'active'
      })
      .eq('license_key', licenseKey)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ 
        error: 'Database error',
        message: error.message 
      });
    }

    if (!data) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'License not found' 
      });
    }

    return res.status(200).json({ 
      success: true,
      message: 'License updated successfully',
      data 
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ 
      error: 'Server error',
      message: err.message 
    });
  }
}

