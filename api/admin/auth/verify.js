// Session Verification Utility
// Verifies admin session tokens

export function verifySession(req) {
  // Check for session token in cookie or Authorization header
  const cookieHeader = req.headers.cookie;
  const authHeader = req.headers.authorization;

  let sessionToken = null;

  // Try to get from cookie first
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});
    sessionToken = cookies.admin_session;
  }

  // Fallback to Authorization header
  if (!sessionToken && authHeader) {
    sessionToken = authHeader.replace('Bearer ', '');
  }

  // For simplicity, we'll validate that a token exists
  // In production, you'd want to verify against a session store or JWT
  if (!sessionToken || sessionToken.length < 32) {
    return { valid: false, error: 'Invalid or missing session' };
  }

  return { valid: true, sessionToken };
}

// Middleware-style verification endpoint
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

  const verification = verifySession(req);

  if (!verification.valid) {
    return res.status(401).json({ 
      authenticated: false,
      error: verification.error 
    });
  }

  return res.status(200).json({ 
    authenticated: true,
    message: 'Session valid' 
  });
}

