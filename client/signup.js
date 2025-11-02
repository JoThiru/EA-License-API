// Client Signup Script
const signupForm = document.getElementById('signupForm');
const signupBtn = document.getElementById('signupBtn');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const togglePassword = document.getElementById('togglePassword');
const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');

// Show error message with smooth animation
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.add('show');
  successMessage.classList.remove('show');
  setTimeout(() => {
    errorMessage.classList.remove('show');
  }, 6000);
}

// Show success message
function showSuccess(message) {
  successMessage.textContent = message;
  successMessage.classList.add('show');
  errorMessage.classList.remove('show');
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

// Toggle confirm password visibility
if (toggleConfirmPassword) {
  toggleConfirmPassword.addEventListener('click', () => {
    const type = confirmPasswordInput.type === 'password' ? 'text' : 'password';
    confirmPasswordInput.type = type;
    toggleConfirmPassword.textContent = type === 'password' ? '👁️' : '🙈';
    toggleConfirmPassword.setAttribute('aria-label', 
      type === 'password' ? 'Show password' : 'Hide password'
    );
  });
}

// Handle form submission
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim().toLowerCase();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  // Validation
  if (!name || !email || !password || !confirmPassword) {
    showError('Please fill in all fields');
    return;
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showError('Please enter a valid email address');
    return;
  }

  if (password.length < 6) {
    showError('Password must be at least 6 characters long');
    return;
  }

  if (password !== confirmPassword) {
    showError('Passwords do not match');
    confirmPasswordInput.focus();
    return;
  }

  // Disable button and show loading state
  signupBtn.disabled = true;
  signupBtn.innerHTML = '<span class="spinner"></span> Creating account...';
  errorMessage.classList.remove('show');
  successMessage.classList.remove('show');

  try {
    const response = await fetch('/api/client/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ name, email, password })
    });

    const data = await response.json();

    if (response.ok) {
      // Show success message
      showSuccess('✅ Account created successfully! Redirecting to login...');
      signupBtn.innerHTML = '✓ Account Created!';
      signupBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        window.location.href = '/client/login';
      }, 2000);
    } else {
      // Show error message from server
      const errorMsg = data.message || data.error || 'Failed to create account. Email may already be in use.';
      showError(errorMsg);
      
      // Reset password fields
      passwordInput.value = '';
      confirmPasswordInput.value = '';
      passwordInput.focus();
      
      signupBtn.disabled = false;
      signupBtn.innerHTML = 'Create Account';
      signupBtn.style.background = '';
    }
  } catch (err) {
    console.error('Signup request error:', err);
    showError('Connection error. Please check your network and try again.');
    passwordInput.value = '';
    confirmPasswordInput.value = '';
    signupBtn.disabled = false;
    signupBtn.innerHTML = 'Create Account';
    signupBtn.style.background = '';
  }
});

// Focus name field on load
setTimeout(() => {
  document.getElementById('name').focus();
}, 100);
