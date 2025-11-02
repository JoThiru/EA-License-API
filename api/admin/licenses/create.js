// Create License API
// Secure server-side endpoint with authentication
import { createClient } from '@supabase/supabase-js';
import { verifySession } from '../auth/verify.js';

// Helper function to get IST time in format: YYYY-MM-DD HH:mm:ss.SSS
function getISTTime() {
  const now = new Date();
  
  // IST is UTC+5:30, so add 5 hours and 30 minutes (5.5 * 60 * 60 * 1000 milliseconds)
  const ISTOffset = 5.5 * 60 * 60 * 1000;
  const ISTTime = new Date(now.getTime() + ISTOffset);
  
  // Format: YYYY-MM-DD HH:mm:ss.SSS
  // Since we added the offset, we use UTC methods to get the IST time components
  const year = ISTTime.getUTCFullYear();
  const month = String(ISTTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(ISTTime.getUTCDate()).padStart(2, '0');
  const hours = String(ISTTime.getUTCHours()).padStart(2, '0');
  const minutes = String(ISTTime.getUTCMinutes()).padStart(2, '0');
  const seconds = String(ISTTime.getUTCSeconds()).padStart(2, '0');
  const milliseconds = String(ISTTime.getUTCMilliseconds()).padStart(3, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
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
  const verification = verifySession(req);
  if (!verification.valid) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Please login to access this resource' 
    });
  }

  // Get request data
  const { licenseKey, accountId, accountServer, hardwareId, ea_name, expiryDate, status } = req.body;

  // Validate required fields
  if (!licenseKey || !accountId || !accountServer || !hardwareId || !ea_name || !expiryDate) {
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
    // Check for existing license key
    const { data: existingKey } = await supabase
      .from('licenses')
      .select('license_key')
      .eq('license_key', licenseKey)
      .maybeSingle();

    if (existingKey) {
      return res.status(409).json({ 
        error: 'Duplicate license key',
        message: `License key "${licenseKey}" already exists` 
      });
    }

    // Check for existing hardware ID + account ID combination
    const { data: existingCombination } = await supabase
      .from('licenses')
      .select('hardware_id, account_id')
      .eq('hardware_id', hardwareId)
      .eq('account_id', accountId)
      .maybeSingle();

    if (existingCombination) {
      return res.status(409).json({ 
        error: 'Duplicate combination',
        message: `Combination of Hardware ID "${hardwareId}" and Account ID "${accountId}" already exists` 
      });
    }

    // Insert new license
    const { data, error } = await supabase
      .from('licenses')
      .insert([{
        license_key: licenseKey,
        account_id: accountId,
        account_server: accountServer,
        hardware_id: hardwareId,
        ea_name: ea_name,
        expiry_date: expiryDate,
        status: status || 'active',
        created_at: getISTTime()
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
      message: 'License created successfully',
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

