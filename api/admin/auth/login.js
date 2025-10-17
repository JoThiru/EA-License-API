// Admin Login API
// Handles authentication and session creation
import { serialize } from 'cookie';
import crypto from 'crypto';

// In-memory session store (for Vercel serverless, you might want Redis for production)
// For simplicity, using JWT-style approach
const sessions = new Map();

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body;

  // Verify admin password from environment variable
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return res.status(500).json({ 
      error: 'Server configuration error',
      message: 'Admin password not configured' 
    });
  }

  // Check password
  if (password !== adminPassword) {
    return res.status(401).json({ 
      error: 'Invalid credentials',
      message: 'Incorrect password' 
    });
  }

  // Generate secure session token
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours

  // Create session cookie
  const cookie = serialize('admin_session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60, // 24 hours
    path: '/'
  });

  res.setHeader('Set-Cookie', cookie);

  // Return session token for client-side storage as backup
  return res.status(200).json({ 
    success: true,
    message: 'Login successful',
    sessionToken,
    expiresAt
  });
}

