// Approve License Request API
import { createClient } from '@supabase/supabase-js';
import { verifySession } from '../auth/verify.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
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

  const { licenseKey, expiryDate } = req.body;

  if (!licenseKey) {
    return res.status(400).json({
      error: 'Validation error',
      message: 'License key is required'
    });
  }

  if (!expiryDate) {
    return res.status(400).json({
      error: 'Validation error',
      message: 'Expiry date is required'
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
    // First, get the license details to check for duplicates
    const { data: pendingLicense, error: fetchError } = await supabase
      .from('licenses')
      .select('account_id, hardware_id, account_server, ea_name')
      .eq('license_key', licenseKey)
      .eq('status', 'pending')
      .single();

    if (fetchError || !pendingLicense) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Pending license request not found'
      });
    }

    // Check if account_id + hardware_id combination already exists (active or pending)
    const { data: existingLicense, error: checkError } = await supabase
      .from('licenses')
      .select('license_key, status, account_id, hardware_id')
      .eq('account_id', pendingLicense.account_id.toString())
      .eq('hardware_id', pendingLicense.hardware_id)
      .neq('license_key', licenseKey) // Exclude the current request
      .in('status', ['active', 'pending'])
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing license:', checkError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Error checking for duplicate licenses'
      });
    }

    if (existingLicense) {
      // Auto-reject because duplicate exists
      await supabase
        .from('licenses')
        .update({
          status: 'rejected',
          expiry_date: null
        })
        .eq('license_key', licenseKey);

      return res.status(409).json({
        error: 'Duplicate license',
        message: `Cannot approve: A license with Account ID "${pendingLicense.account_id}" and Hardware ID "${pendingLicense.hardware_id}" already exists. Status: ${existingLicense.status}. License Key: ${existingLicense.license_key}`,
        existingLicenseKey: existingLicense.license_key,
        existingStatus: existingLicense.status,
        autoRejected: true
      });
    }

    // Update license status to active and set expiry date
    const { data, error } = await supabase
      .from('licenses')
      .update({
        status: 'active',
        expiry_date: expiryDate
      })
      .eq('license_key', licenseKey)
      .eq('status', 'pending')
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
        message: 'Pending license request not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'License approved successfully',
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


