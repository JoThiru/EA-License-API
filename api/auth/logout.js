// Unified Logout API
// Handles both admin and client logout
import { serialize } from 'cookie';

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

  // Determine user type from query parameter or path
  const userType = req.query.type || (req.url?.includes('/client') ? 'client' : 'admin');
  const cookieName = userType === 'admin' ? 'admin_session' : 'client_session';

  // Clear session cookie
  const cookie = serialize(cookieName, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: -1, // Expire immediately
    path: '/'
  });

  res.setHeader('Set-Cookie', cookie);

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
}

