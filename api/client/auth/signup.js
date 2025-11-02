// Client Signup API
import { createClient } from '@supabase/supabase-js';

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

  const { name, email, password } = req.body;

  // Validation
  if (!name || !email || !password) {
    return res.status(400).json({
      error: 'Validation error',
      message: 'Name, email, and password are required'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      error: 'Validation error',
      message: 'Password must be at least 6 characters long'
    });
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      error: 'Validation error',
      message: 'Please enter a valid email address'
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
    // Check if email already exists
    const { data: existingClient, error: checkError } = await supabase
      .from('clients')
      .select('email')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is fine
      console.error('Error checking existing client:', checkError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Error checking email availability'
      });
    }

    if (existingClient) {
      return res.status(409).json({
        error: 'Email already exists',
        message: 'An account with this email already exists. Please login instead.'
      });
    }

    // Hash password (for now, storing plain text - MUST use bcrypt in production!)
    // TODO: Implement bcrypt in production
    // const bcrypt = require('bcrypt');
    // const passwordHash = await bcrypt.hash(password, 10);
    const passwordHash = password; // TEMPORARY - Use bcrypt in production!

    // Create new client account
    const { data: newClient, error: insertError } = await supabase
      .from('clients')
      .insert([{
        email: email.toLowerCase(),
        password_hash: passwordHash,
        name: name.trim(),
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select('id, email, name')
      .single();

    if (insertError) {
      console.error('Error creating client:', insertError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to create account. Please try again.'
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Account created successfully! You can now login.',
      client: {
        id: newClient.id,
        email: newClient.email,
        name: newClient.name
      }
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({
      error: 'Server error',
      message: 'An error occurred during signup'
    });
  }
}

