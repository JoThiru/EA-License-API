// Client Login Script
const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const errorMessage = document.getElementById('errorMessage');
const passwordInput = document.getElementById('password');
const togglePassword = document.getElementById('togglePassword');

// Check if already logged in
const checkAuth = async () => {
  const sessionToken = localStorage.getItem('client_session');
  const sessionExpiry = localStorage.getItem('client_session_expires');
  
  if (sessionToken && sessionExpiry) {
    const now = Date.now();
    if (now < parseInt(sessionExpiry)) {
      window.location.replace('/client/dashboard');
      return true;
    } else {
      localStorage.removeItem('client_session');
      localStorage.removeItem('client_session_expires');
      localStorage.removeItem('client_email');
    }
  }
  return false;
};

// Show error message with smooth animation
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.add('show');
  setTimeout(() => {
    errorMessage.classList.remove('show');
  }, 6000);
}

// Toggle password visibility
if (togglePassword) {
  togglePassword.addEventListener('click', () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    togglePassword.textContent = type === 'password' ? '👁️' : '🙈';
    togglePassword.setAttribute('aria-label', 
      type === 'password' ? 'Show password' : 'Hide password'
    );
  });
}

// Handle form submission
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showError('Please fill in all fields');
    return;
  }

  // Disable button and show loading state
  loginBtn.disabled = true;
  loginBtn.innerHTML = '<span class="spinner"></span> Signing in...';
  errorMessage.classList.remove('show');

  try {
    const response = await fetch('/api/client/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
      // Store session info
      localStorage.setItem('client_session', data.sessionToken);
      localStorage.setItem('client_session_expires', data.expiresAt);
      localStorage.setItem('client_email', email);
      
      // Add success state before redirect
      loginBtn.innerHTML = '✓ Success! Redirecting...';
      loginBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      
      // Smooth redirect
      setTimeout(() => {
        window.location.replace('/client/dashboard');
      }, 300);
    } else {
      // Show detailed error message from server
      const errorMsg = data.message || data.error || 'Invalid email or password';
      showError(errorMsg);
      passwordInput.value = '';
      passwordInput.focus();
    }
  } catch (err) {
    console.error('Login request error:', err);
    showError('Connection error. Please check your network and try again.');
  } finally {
    loginBtn.disabled = false;
    loginBtn.innerHTML = 'Sign In';
    loginBtn.style.background = '';
  }
});

// Check auth on load
checkAuth();

// Focus email field on load
setTimeout(() => {
  document.getElementById('email').focus();
}, 100);
