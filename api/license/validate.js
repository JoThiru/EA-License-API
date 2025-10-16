import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  const { licenseKey, accountId, hardwareId } = req.body;

  console.log("🟡 Request Received:", licenseKey, accountId, hardwareId);

  const { data, error } = await supabase
    .from('licenses')
    .select('*')
    .eq('license_key', licenseKey)
    .eq('account_id', accountId.toString())
    .eq('hardware_id', hardwareId)
    .single();

  console.log("🟢 Supabase Data:", data);
  console.log("🔴 Supabase Error:", error);

  if (error || !data) {
    return res.status(403).json({ status: 'invalid', message: 'License not found' });
  }

  const today = new Date();
  const expiry = new Date(data.expiry_date);

  if (today > expiry || data.status !== 'active') {
    return res.status(403).json({ status: 'expired', message: 'License expired or inactive' });
  }

  return res.json({ status: 'ok', expiry: data.expiry_date });
}
