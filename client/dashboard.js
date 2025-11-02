// Client Dashboard Script
// Ensure logo fallback shows if image fails to load
document.addEventListener('DOMContentLoaded', () => {
  const logoImages = document.querySelectorAll('.logo-image');
  logoImages.forEach(img => {
    const checkImage = () => {
      if (img.complete) {
        if (img.naturalHeight === 0) {
          // Image failed to load
          img.style.display = 'none';
          const fallback = img.nextElementSibling;
          if (fallback && fallback.classList.contains('logo-fallback')) {
            fallback.style.display = 'flex';
          }
        }
      } else {
        img.addEventListener('error', () => {
          img.style.display = 'none';
          const fallback = img.nextElementSibling;
          if (fallback && fallback.classList.contains('logo-fallback')) {
            fallback.style.display = 'flex';
          }
        });
      }
    };
    checkImage();
  });
});

let sessionToken = localStorage.getItem('client_session');
let sessionExpiry = localStorage.getItem('client_session_expires');
const userEmail = localStorage.getItem('client_email');

// Check authentication
async function checkAuth() {
  if (!sessionToken || !sessionExpiry) {
    redirectToLogin();
    return false;
  }

  const now = Date.now();
  if (now > parseInt(sessionExpiry)) {
    redirectToLogin();
    return false;
  }

  // Verify with server
  try {
    const response = await fetch('/api/client/auth/verify', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      },
      credentials: 'include'
    });

    if (!response.ok) {
      redirectToLogin();
      return false;
    }

    return true;
  } catch (err) {
    redirectToLogin();
    return false;
  }
}

function redirectToLogin() {
  localStorage.removeItem('client_session');
  localStorage.removeItem('client_session_expires');
  localStorage.removeItem('client_email');
  window.location.href = '/client/login';
}

// API helper
async function authenticatedFetch(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${sessionToken}`,
    ...options.headers
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include'
  });

  if (response.status === 401) {
    redirectToLogin();
    throw new Error('Unauthorized');
  }

  return response;
}

// Set user email
if (userEmail) {
  const userEmailEl = document.getElementById('userEmail');
  const menuUserEmail = document.getElementById('menuUserEmail');
  if (userEmailEl) {
    userEmailEl.textContent = userEmail;
  }
  if (menuUserEmail) {
    menuUserEmail.textContent = userEmail;
  }
}

// Profile dropdown functionality
const profileTrigger = document.getElementById('profileTrigger');
const profileMenu = document.getElementById('profileMenu');
const logoutBtnProfile = document.getElementById('logoutBtnProfile');
const logoutBtn = document.getElementById('logoutBtn');

if (profileTrigger) {
  profileTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    profileTrigger.closest('.profile-dropdown').classList.toggle('active');
  });
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (profileMenu && profileTrigger && !profileTrigger.contains(e.target) && !profileMenu.contains(e.target)) {
    profileTrigger.closest('.profile-dropdown')?.classList.remove('active');
  }
});

// Logout handlers
async function handleLogout() {
  try {
    await authenticatedFetch('/api/client/auth/logout', {
      method: 'POST'
    });
  } catch (err) {
    // Silent fail
  } finally {
    redirectToLogin();
  }
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', handleLogout);
}

if (logoutBtnProfile) {
  logoutBtnProfile.addEventListener('click', handleLogout);
}

// License Request Form
const licenseRequestForm = document.getElementById('licenseRequestForm');
const submitBtn = document.getElementById('submitBtn');
const successMessage = document.getElementById('successMessage');
const errorMessage = document.getElementById('errorMessage');
const licenseKeyDisplay = document.getElementById('licenseKeyDisplay');
const copyLicenseBtn = document.getElementById('copyLicenseBtn');
const copyFeedback = document.getElementById('copyFeedback');

// Show error message function
function showErrorMessage(message, existingLicenseKey = null) {
  errorMessage.innerHTML = '';
  
  if (existingLicenseKey) {
    errorMessage.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <span style="font-size: 20px;">⚠️</span>
        <div style="flex: 1;">
          <div style="margin-bottom: 8px;"><strong>${message}</strong></div>
          <div>Existing License Key: <span class="license-key">${existingLicenseKey}</span></div>
        </div>
      </div>
    `;
  } else {
    errorMessage.innerHTML = `<strong>⚠️</strong> ${message}`;
  }
  
  errorMessage.classList.add('show');
  successMessage.classList.remove('show');
  
  // Scroll to error message
  errorMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  
  // Hide error message after 8 seconds
  setTimeout(() => {
    errorMessage.classList.remove('show');
  }, 8000);
}

// Show success message function
function showSuccessMessage(message) {
  successMessage.textContent = message;
  successMessage.classList.add('show');
  errorMessage.classList.remove('show');
  
  // Scroll to success message
  successMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  
  // Hide success message after 10 seconds
  setTimeout(() => {
    successMessage.classList.remove('show');
  }, 10000);
}

if (licenseRequestForm) {
  licenseRequestForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const accountNumber = document.getElementById('accountNumber').value.trim();
    const accountServer = document.getElementById('accountServer').value.trim();
    const eaName = document.getElementById('eaName').value.trim();
    const hardwareId = document.getElementById('hardwareId').value.trim();

    // Hide previous messages
    errorMessage.classList.remove('show');
    successMessage.classList.remove('show');

    if (!accountNumber || !accountServer || !eaName || !hardwareId) {
      showErrorMessage('Please fill in all fields');
      return;
    }

    // Disable button
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span style="display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; margin-right: 8px; vertical-align: middle;"></span> Submitting...';

    try {
      const response = await authenticatedFetch('/api/client/license/request', {
        method: 'POST',
        body: JSON.stringify({
          accountId: accountNumber,
          accountServer,
          ea_name: eaName,
          hardwareId
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Show success message
        showSuccessMessage('✅ License request submitted successfully! Your license key will be sent after admin approval.');
        licenseKeyDisplay.style.display = 'block';
        const generatedKeyEl = document.getElementById('generatedLicenseKey');
        generatedKeyEl.textContent = data.licenseKey;
        
        // Reset copy button state
        if (copyLicenseBtn) {
          copyLicenseBtn.classList.remove('copied');
        }
        
        // Reset form
        licenseRequestForm.reset();
        
        // Reload licenses
        loadMyLicenses();
      } else {
        const errorMsg = data.message || 'Failed to submit license request';
        if (data.error === 'Duplicate license' || data.error === 'Duplicate request') {
          showErrorMessage(errorMsg, data.existingLicenseKey || 'N/A');
        } else {
          showErrorMessage(errorMsg);
        }
      }
    } catch (err) {
      if (err.message !== 'Unauthorized') {
        showErrorMessage('Failed to submit license request. Please try again.');
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Generate License Key Request';
    }
  });
}

// Copy License Key Functionality
if (copyLicenseBtn) {
  copyLicenseBtn.addEventListener('click', async () => {
    const generatedKeyEl = document.getElementById('generatedLicenseKey');
    const licenseKey = generatedKeyEl.textContent.trim();
    
    if (!licenseKey) {
      return;
    }

    try {
      await navigator.clipboard.writeText(licenseKey);
      
      // Update button state
      copyLicenseBtn.classList.add('copied');
      
      // Show feedback message
      if (copyFeedback) {
        copyFeedback.style.display = 'block';
        setTimeout(() => {
          copyFeedback.style.display = 'none';
        }, 2000);
      }
      
      // Reset button after 2 seconds
      setTimeout(() => {
        copyLicenseBtn.classList.remove('copied');
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = licenseKey;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        copyLicenseBtn.classList.add('copied');
        const copyTextEl = copyLicenseBtn.querySelector('.copy-text');
        if (copyTextEl) {
          copyTextEl.textContent = 'Copied!';
        }
        if (copyFeedback) {
          copyFeedback.style.display = 'block';
          setTimeout(() => {
            copyFeedback.style.display = 'none';
            copyLicenseBtn.classList.remove('copied');
            if (copyTextEl) {
              copyTextEl.textContent = 'Copy';
            }
          }, 2000);
        }
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  });
}

// Load my licenses
async function loadMyLicenses() {
  const licensesList = document.getElementById('licensesList');
  
  try {
    const response = await authenticatedFetch('/api/client/license/my-licenses');
    const data = await response.json();

    if (response.ok && data.licenses && data.licenses.length > 0) {
      const table = document.createElement('table');
      table.className = 'licenses-table';
      
      table.innerHTML = `
        <thead>
          <tr>
            <th>License Key</th>
            <th>Account ID</th>
            <th>Account Server</th>
            <th>EA Name</th>
            <th>Hardware ID</th>
            <th>Status</th>
            <th>Expiry</th>
          </tr>
        </thead>
        <tbody>
          ${data.licenses.map(license => `
            <tr>
              <td>${escapeHtml(license.license_key)}</td>
              <td>${escapeHtml(license.account_id)}</td>
              <td>${escapeHtml(license.account_server || 'N/A')}</td>
              <td>${escapeHtml(license.ea_name || 'N/A')}</td>
              <td>${escapeHtml(license.hardware_id)}</td>
              <td>
                <span class="status-badge status-${getStatusClass(license)}">
                  ${escapeHtml(license.status).toUpperCase()}
                </span>
              </td>
              <td>${escapeHtml(license.expiry_date || 'N/A')}</td>
            </tr>
          `).join('')}
        </tbody>
      `;
      
      licensesList.innerHTML = '';
      licensesList.appendChild(table);
    } else {
      licensesList.innerHTML = '<p class="no-data">No licenses found. Submit a request above to get started.</p>';
    }
  } catch (err) {
    if (err.message !== 'Unauthorized') {
      licensesList.innerHTML = '<p class="no-data">Error loading licenses. Please refresh the page.</p>';
    }
  }
}

function getStatusClass(license) {
  if (license.status === 'pending') return 'pending';
  if (license.status === 'active') {
    const expiry = new Date(license.expiry_date);
    const today = new Date();
    return expiry < today ? 'expired' : 'active';
  }
  return 'expired';
}

function escapeHtml(text) {
  if (!text) return 'N/A';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  const authenticated = await checkAuth();
  if (authenticated) {
    loadMyLicenses();
  }
});


