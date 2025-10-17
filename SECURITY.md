# Security Architecture

## 🔒 Overview

This license management system implements a **secure, server-side architecture** with proper authentication and authorization. All sensitive operations are protected and database credentials are never exposed to the frontend.

## 🛡️ Security Features

### 1. **Authentication System**

- **Password-based authentication** for admin access
- **Session tokens** with 24-hour expiration
- **Secure cookie management** (HttpOnly, SameSite, Secure flags)
- **Session verification** on every protected API call

### 2. **Server-Side Security**

```
Frontend (Browser)          Backend (Vercel Serverless)
     │                              │
     ├─ No DB credentials           ├─ SUPABASE_URL (env)
     ├─ No direct DB access         ├─ SUPABASE_KEY (env)
     ├─ Session token only          ├─ ADMIN_PASSWORD (env)
     │                              │
     └──── API Calls ────────────>  └─ Auth verification
                                           │
                                           ├─ Valid → Process request
                                           └─ Invalid → 401 Unauthorized
```

### 3. **API Security**

#### Public APIs (No Auth Required)
- `POST /api/license/validate` - License validation for end-users

#### Protected APIs (Auth Required)
- `POST /api/admin/auth/login` - Login endpoint
- `GET /api/admin/auth/verify` - Session verification
- `POST /api/admin/auth/logout` - Logout
- `GET /api/admin/licenses/list` - List all licenses
- `POST /api/admin/licenses/create` - Create license
- `PUT /api/admin/licenses/update` - Update license
- `DELETE /api/admin/licenses/delete` - Delete license

All protected APIs verify the session token before processing the request.

### 4. **Request Flow**

```
1. User visits /admin/login
   ↓
2. Enters password
   ↓
3. Frontend sends POST /api/admin/auth/login
   ↓
4. Backend verifies password against ADMIN_PASSWORD (env)
   ↓
5. If valid: Generate session token + Set HttpOnly cookie
   ↓
6. Frontend stores token in localStorage (backup)
   ↓
7. Redirect to /admin/dashboard
   ↓
8. Dashboard checks auth via GET /api/admin/auth/verify
   ↓
9. All subsequent API calls include session token in Authorization header
   ↓
10. Backend verifies token on each request
```

### 5. **What's Protected**

✅ **Database Credentials**
- Never sent to frontend
- Only accessible in server-side API functions
- Stored in environment variables

✅ **Admin Password**
- Stored in environment variables
- Never logged or exposed
- Only compared server-side

✅ **Session Management**
- Tokens are cryptographically random (32 bytes)
- HttpOnly cookies prevent XSS attacks
- 24-hour expiration
- SameSite=strict prevents CSRF

✅ **API Endpoints**
- All admin operations require authentication
- 401 errors redirect to login
- Proper error messages without leaking info

## 🔐 Security Best Practices Implemented

### ✅ Already Implemented

1. **Environment Variables** - All secrets in env vars, not code
2. **Server-Side Operations** - DB operations only in backend
3. **Session Tokens** - Secure random tokens with expiration
4. **HttpOnly Cookies** - Prevents JavaScript access to cookies
5. **Authorization Headers** - Bearer token for API calls
6. **Input Validation** - Validates all inputs before processing
7. **Error Handling** - Proper error messages without info leakage
8. **CORS Configuration** - Proper CORS headers
9. **No Credential Exposure** - Frontend never sees DB credentials

### 🔄 Recommended Additional Security

1. **HTTPS Only** - Ensure Vercel deployment uses HTTPS (automatic)
2. **Rate Limiting** - Add rate limiting to prevent brute force
3. **Supabase RLS** - Enable Row Level Security in Supabase
4. **Password Complexity** - Use strong admin password (20+ chars)
5. **Regular Rotation** - Rotate admin password periodically
6. **Audit Logging** - Log all admin actions for review
7. **2FA** - Consider adding two-factor authentication
8. **IP Whitelisting** - Restrict admin access to known IPs (optional)

## 🚨 Security Comparison

### ❌ INSECURE (Before)

```javascript
// Frontend directly accessing database
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Anyone can view source and get credentials!
// Anyone can call database directly from browser console!
```

**Problems:**
- Credentials visible in browser
- No authentication for admin operations
- Direct database access from frontend
- Security depends only on Supabase RLS

### ✅ SECURE (After)

```javascript
// Frontend calls authenticated API
const response = await fetch('/api/admin/licenses/list', {
  headers: {
    'Authorization': `Bearer ${sessionToken}`
  }
});

// Backend verifies auth, then accesses database
const supabase = createClient(
  process.env.SUPABASE_URL,  // Server-side only
  process.env.SUPABASE_KEY    // Server-side only
);
```

**Benefits:**
- Credentials never leave server
- Authentication required for all operations
- Frontend can't bypass security
- Multiple layers of protection

## 🔍 Security Checklist

Before deploying to production:

- [ ] Set strong `ADMIN_PASSWORD` (20+ characters, mixed case, numbers, symbols)
- [ ] Verify `SUPABASE_KEY` is the anon key, not service_role key
- [ ] Ensure `.env` and `admin/config.js` are in `.gitignore`
- [ ] Enable Supabase Row Level Security (RLS) policies
- [ ] Test login flow works correctly
- [ ] Verify unauthorized access returns 401
- [ ] Test session expiration after 24 hours
- [ ] Ensure HTTPS is enabled (automatic on Vercel)
- [ ] Review Vercel environment variables are set
- [ ] Test logout functionality
- [ ] Verify no credentials in browser dev tools

## 📊 Threat Model

| Threat | Mitigation |
|--------|-----------|
| Credential theft | Credentials only in env vars, not code |
| XSS attacks | HttpOnly cookies, proper escaping |
| CSRF attacks | SameSite=strict cookies |
| Brute force login | Can add rate limiting |
| SQL injection | Supabase parameterized queries |
| Session hijacking | Short-lived tokens, secure cookies |
| Man-in-the-middle | HTTPS enforced by Vercel |
| Direct DB access | All operations through auth'd APIs |

## 🎓 Educational Notes

### Why Server-Side?

**Frontend Security Limitations:**
- All frontend code is visible in browser
- Users can modify JavaScript in dev tools
- Can't trust frontend validation alone
- Need server authority for security

**Server-Side Benefits:**
- Code and credentials hidden from users
- Server is trusted authority
- Can enforce security policies
- Multiple layers of protection

### Session vs JWT

This implementation uses simple session tokens instead of JWT:

**Pros:**
- Simpler implementation
- Can invalidate tokens server-side
- Smaller token size

**Cons:**
- Requires session storage (or JWT for stateless)
- Tokens can't be validated without server call

For production at scale, consider using JWT with:
- Short expiration (1 hour)
- Refresh tokens
- Token blacklist for logout

## 📞 Security Contact

If you discover a security vulnerability:
1. Do NOT open a public issue
2. Contact the repository maintainer directly
3. Provide detailed information about the vulnerability
4. Allow time for a fix before public disclosure

---

**Remember: Security is a process, not a product. Keep reviewing and improving!**

