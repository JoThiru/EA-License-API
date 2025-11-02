// Client License Request API
import { createClient } from '@supabase/supabase-js';
import { verifyClientSession } from '../auth/verify.js';
import crypto from 'crypto';

// Helper function to get IST time
function getISTTime() {
  const now = new Date();
  const ISTOffset = 5.5 * 60 * 60 * 1000;
  const ISTTime = new Date(now.getTime() + ISTOffset);
  
  const year = ISTTime.getUTCFullYear();
  const month = String(ISTTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(ISTTime.getUTCDate()).padStart(2, '0');
  const hours = String(ISTTime.getUTCHours()).padStart(2, '0');
  const minutes = String(ISTTime.getUTCMinutes()).padStart(2, '0');
  const seconds = String(ISTTime.getUTCSeconds()).padStart(2, '0');
  const milliseconds = String(ISTTime.getUTCMilliseconds()).padStart(3, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
}

// Generate license key
function generateLicenseKey() {
  const prefix = 'ALGO';
  const randomPart = crypto.randomBytes(8).toString('hex').toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  return `${prefix}-${randomPart}-${timestamp}`;
}

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
  const verification = verifyClientSession(req);
  if (!verification.valid) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Please login to access this resource'
    });
  }

  // Get request data
  const { accountId, accountServer, ea_name, hardwareId } = req.body;

  // Validate required fields
  if (!accountId || !accountServer || !ea_name || !hardwareId) {
    return res.status(400).json({
      error: 'Validation error',
      message: 'All fields are required'
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

    // Generate license key
    const licenseKey = generateLicenseKey();

    // Get client email
    const { data: client } = await supabase
      .from('clients')
      .select('email')
      .eq('id', clientId)
      .maybeSingle();

    // Check if account_id + hardware_id combination already exists
    // This prevents duplicate license requests
    const { data: existingLicense, error: checkError } = await supabase
      .from('licenses')
      .select('license_key, status, account_id, hardware_id')
      .eq('account_id', accountId.toString())
      .eq('hardware_id', hardwareId)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is fine
      console.error('Error checking existing license:', checkError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Error checking for existing licenses'
      });
    }

    if (existingLicense) {
      // Check status
      if (existingLicense.status === 'active') {
        return res.status(409).json({
          error: 'Duplicate license',
          message: `A license with Account ID "${accountId}" and Hardware ID "${hardwareId}" already exists and is active. License Key: ${existingLicense.license_key}`,
          existingLicenseKey: existingLicense.license_key
        });
      } else if (existingLicense.status === 'pending') {
        return res.status(409).json({
          error: 'Duplicate request',
          message: `A pending license request with Account ID "${accountId}" and Hardware ID "${hardwareId}" already exists. Please wait for admin approval.`,
          existingLicenseKey: existingLicense.license_key
        });
      }
      // If status is inactive/rejected, allow new request
    }

    // Insert license request with status 'pending'
    // Note: requested_by is TEXT in your schema, so we store client_id as text
    const { data, error } = await supabase
      .from('licenses')
      .insert([{
        license_key: licenseKey,
        account_id: accountId,
        account_server: accountServer,
        hardware_id: hardwareId,
        ea_name: ea_name,
        expiry_date: null, // Will be set by admin
        status: 'pending',
        created_at: getISTTime(),
        requested_by: clientId ? String(clientId) : null, // Convert UUID to text
        requested_email: client?.email || null
      }])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        error: 'Database error',
        message: error.message
      });
    }

    return res.status(201).json({
      success: true,
      message: 'License request submitted successfully. Awaiting admin approval.',
      licenseKey,
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


