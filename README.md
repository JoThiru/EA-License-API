# EA License API

A secure license management system with authentication and server-side API endpoints.

## 🔒 Security Features

- **Server-side authentication** - Password-protected admin dashboard
- **Session management** - Secure session tokens with 24-hour expiration
- **Protected APIs** - All database operations require authentication
- **No credential exposure** - Supabase credentials never sent to frontend
- **Secure CORS** - Proper CORS configuration

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file (or configure in Vercel/your hosting platform):

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key

# Admin Authentication
ADMIN_PASSWORD=your_secure_admin_password

# Environment
NODE_ENV=production
```

### 3. Deploy to Vercel

```bash
vercel
```

Or connect your GitHub repository to Vercel and add the environment variables in the Vercel dashboard.

## 📁 Project Structure

```
EA-License-API/
├── admin/
│   ├── index.html          # Redirects to login
│   ├── login.html          # Admin login page
│   ├── dashboard.html      # Main admin dashboard
│   ├── dashboard.js        # Frontend logic (secure)
│   ├── style.css           # Styles
│   └── config.js           # Local config (not committed)
├── api/
│   ├── admin/
│   │   ├── auth/
│   │   │   ├── login.js    # Login endpoint
│   │   │   ├── verify.js   # Session verification
│   │   │   └── logout.js   # Logout endpoint
│   │   └── licenses/
│   │       ├── list.js     # Get all licenses
│   │       ├── create.js   # Create license
│   │       ├── update.js   # Update license
│   │       └── delete.js   # Delete license
│   └── license/
│       └── validate.js     # Public license validation
├── .env.example            # Environment variables template
├── .gitignore             # Git ignore file
├── package.json           # Dependencies
└── vercel.json           # Vercel configuration
```

## 🔐 Admin Dashboard Access

1. Navigate to `/admin` or `/admin/login`
2. Enter the admin password (configured in `ADMIN_PASSWORD` env variable)
3. Manage licenses through the secure dashboard

## 📡 API Endpoints

### Public Endpoints

- `POST /api/license/validate` - Validate a license (no auth required)

### Admin Endpoints (Authentication Required)

- `POST /api/admin/auth/login` - Admin login
- `GET /api/admin/auth/verify` - Verify session
- `POST /api/admin/auth/logout` - Logout
- `GET /api/admin/licenses/list` - Get all licenses
- `POST /api/admin/licenses/create` - Create new license
- `PUT /api/admin/licenses/update` - Update existing license
- `DELETE /api/admin/licenses/delete` - Delete license

## 🛡️ Security Best Practices

1. **Never commit `.env` or `admin/config.js`** - These files contain sensitive credentials
2. **Use strong admin password** - Set a complex password in environment variables
3. **Keep Supabase RLS enabled** - Add Row Level Security policies in Supabase
4. **Use HTTPS only** - Ensure your deployment uses HTTPS
5. **Rotate credentials regularly** - Update passwords and keys periodically

## 📦 Dependencies

- `@supabase/supabase-js` - Supabase client for database operations
- `cookie` - Cookie parsing and serialization for sessions

## 🔧 Development

```bash
# Install dependencies
npm install

# Run locally with Vercel CLI
vercel dev
```

## 📝 License Validation Example

```javascript
// Example: Validate a license from your application
const response = await fetch('https://your-domain.vercel.app/api/license/validate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    licenseKey: 'YOUR-LICENSE-KEY',
    accountId: 'ACCOUNT-ID',
    hardwareId: 'HARDWARE-ID'
  })
});

const result = await response.json();
// Returns: { status: 'ok', expiry: '2025-12-31' }
// Or: { status: 'invalid', message: 'License not found' }
// Or: { status: 'expired', message: 'License expired or inactive' }
```

## 🎯 Features

- ✅ Secure admin authentication
- ✅ Session management with 24-hour expiration
- ✅ CRUD operations for licenses
- ✅ License validation API
- ✅ Beautiful, responsive UI
- ✅ Real-time notifications
- ✅ Server-side security
- ✅ No exposed credentials

## 🐛 Troubleshooting

### "Server configuration error"
- Ensure `SUPABASE_URL` and `SUPABASE_KEY` are set in environment variables

### "Admin password not configured"
- Set `ADMIN_PASSWORD` in environment variables

### Login not working
- Check browser console for errors
- Verify environment variables are set correctly
- Clear browser cache and cookies

## 📞 Support

For issues or questions, please check the code comments or create an issue in the repository.

---

**Built with ❤️ for secure license management**

