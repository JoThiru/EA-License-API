// Client Login API with Supabase Authentication
import { createClient } from '@supabase/supabase-js';
import { serialize } from 'cookie';
import crypto from 'crypto';

export default async function handler(req, res) {
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

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'Validation error',
      message: 'Email and password are required'
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
    // Check if client exists in clients table (using UUID)
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, email, password_hash, name, status')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (clientError) {
      console.error('Database error fetching client:', clientError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Error checking credentials'
      });
    }

    if (!client) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Invalid email or password'
      });
    }

    // Check if client is active
    if (client.status !== 'active') {
      return res.status(403).json({
        error: 'Account inactive',
        message: 'Your account is not active. Please contact administrator.'
      });
    }

    // Check if password_hash exists
    if (!client.password_hash) {
      console.error('Client found but password_hash is missing for email:', email);
      return res.status(500).json({
        error: 'Account error',
        message: 'Account configuration error. Please contact administrator.'
      });
    }

    // For now, using simple password comparison
    // In production, use bcrypt or similar for password hashing
    // For this implementation, we'll use a simple approach
    // TODO: Implement proper password hashing (bcrypt)
    let passwordMatch = false;
    try {
      passwordMatch = password === client.password_hash || 
                     await comparePassword(password, client.password_hash);
    } catch (pwdErr) {
      console.error('Password comparison error:', pwdErr);
      return res.status(500).json({
        error: 'Authentication error',
        message: 'Error verifying password'
      });
    }

    if (!passwordMatch) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Invalid email or password'
      });
    }

    // Generate session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours

    // Store session in database
    const { error: sessionError } = await supabase
      .from('client_sessions')
      .insert([{
        client_id: client.id,
        session_token: sessionToken,
        expires_at: new Date(expiresAt).toISOString(),
        created_at: new Date().toISOString()
      }]);

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      // Continue anyway - session cookie is set, database session is optional
      // But log it for debugging
    }

    // Create session cookie
    const cookie = serialize('client_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/'
    });

    res.setHeader('Set-Cookie', cookie);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      sessionToken,
      expiresAt,
      client: {
        id: client.id,
        email: client.email,
        name: client.name
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    console.error('Error stack:', err.stack);
    return res.status(500).json({
      error: 'Server error',
      message: err.message || 'An error occurred during login',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}

// Simple password comparison (replace with bcrypt in production)
async function comparePassword(password, hash) {
  try {
    // Handle null/undefined hash
    if (!hash || typeof hash !== 'string') {
      return false;
    }
    
    // For now, if password_hash doesn't start with $2b$, it's plain text (dev only)
    if (!hash.startsWith('$2b$')) {
      return password === hash;
    }
    
    // TODO: Implement bcrypt comparison for production
    // const bcrypt = require('bcrypt');
    // return await bcrypt.compare(password, hash);
    
    // If it's a bcrypt hash but we don't have bcrypt, fail
    return false;
  } catch (err) {
    console.error('Password comparison error:', err);
    return false;
  }
}


