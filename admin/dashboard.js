// OPTIMIZED Admin Dashboard - Fast & Secure
// Session management with local validation first
let sessionToken = localStorage.getItem('admin_session');
let sessionExpiry = localStorage.getItem('admin_session_expires');
let isAuthenticated = false;

// OPTIMIZED: Check expiry locally first (no API call needed!)
async function checkAuth() {
  if (!sessionToken || !sessionExpiry) {
    redirectToLogin();
    return false;
  }

  // Fast local check: Is token expired?
  const now = Date.now();
  if (now > parseInt(sessionExpiry)) {
    redirectToLogin();
    return false;
  }

  // Token is valid locally, skip API verification
  // Real verification happens on first API call
  isAuthenticated = true;
  return true;
}

function redirectToLogin() {
  localStorage.removeItem('admin_session');
  localStorage.removeItem('admin_session_expires');
  window.location.replace('/admin/login'); // Faster than .href
}

// API helper with authentication
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

  // Handle unauthorized
  if (response.status === 401) {
    showNotification('error', 'Session Expired', 'Please login again');
    setTimeout(redirectToLogin, 1500);
    throw new Error('Unauthorized');
  }

  return response;
}

// Elements
const tableBody = document.querySelector('#licensesTable tbody');
const addBtn = document.getElementById('addLicense');
const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const closeModal = document.querySelector('.close');
const cancelEdit = document.getElementById('cancelEdit');
const saveEdit = document.getElementById('saveEdit');
const notificationContainer = document.getElementById('notificationContainer');
const logoutBtn = document.getElementById('logoutBtn');

// Delete modal elements
const deleteModal = document.getElementById('deleteModal');
const closeDeleteModal = document.getElementById('closeDeleteModal');
const cancelDelete = document.getElementById('cancelDelete');
const confirmDelete = document.getElementById('confirmDelete');
const deleteLicenseKey = document.getElementById('deleteLicenseKey');
const deleteAccountId = document.getElementById('deleteAccountId');
const deleteHardwareId = document.getElementById('deleteHardwareId');

// 🔔 Notification System
function showNotification(type, title, message, duration = 4000) {
  const notification = document.createElement('div');
  notification.className = `notification ${type} auto-dismiss`;
  
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  
  notification.innerHTML = `
    <div class="notification-icon">${icons[type] || icons.info}</div>
    <div class="notification-content">
      <div class="notification-title">${title}</div>
      <div class="notification-message">${message}</div>
    </div>
    <button class="notification-close" onclick="removeNotification(this)">&times;</button>
  `;
  
  notificationContainer.appendChild(notification);
  
  // Trigger animation
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);
  
  // Auto remove after duration
  setTimeout(() => {
    removeNotification(notification.querySelector('.notification-close'));
  }, duration);
}

function removeNotification(closeBtn) {
  const notification = closeBtn.closest('.notification');
  if (notification) {
    notification.classList.remove('show');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }
}

// Make removeNotification globally available
window.removeNotification = removeNotification;

// 🗑️ Delete Modal Management
let currentDeleteLicenseKey = null;

function showDeleteModal(licenseKey, accountId, hardwareId) {
  currentDeleteLicenseKey = licenseKey;
  deleteLicenseKey.textContent = licenseKey;
  deleteAccountId.textContent = accountId;
  deleteHardwareId.textContent = hardwareId;
  
  deleteModal.style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function closeDeleteModalFunc() {
  deleteModal.style.display = 'none';
  document.body.style.overflow = 'auto';
  currentDeleteLicenseKey = null;
}

// Delete modal event listeners
closeDeleteModal.addEventListener('click', closeDeleteModalFunc);
cancelDelete.addEventListener('click', closeDeleteModalFunc);
window.addEventListener('click', (event) => {
  if (event.target === deleteModal) {
    closeDeleteModalFunc();
  }
});

// Confirm delete action
confirmDelete.addEventListener('click', async () => {
  if (!currentDeleteLicenseKey) return;
  
  // Disable button
  confirmDelete.disabled = true;
  confirmDelete.textContent = '🗑️ Deleting...';
  
  try {
    const response = await authenticatedFetch(`/api/admin/licenses/delete?licenseKey=${encodeURIComponent(currentDeleteLicenseKey)}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (response.ok) {
      showNotification('success', 'License Deleted', data.message || 'License deleted successfully.');
      closeDeleteModalFunc();
      loadLicenses();
    } else {
      showNotification('error', 'Delete Failed', data.message || 'Failed to delete license.');
    }
  } catch (err) {
    if (err.message !== 'Unauthorized') {
      showNotification('error', 'Unexpected Error', 'An unexpected error occurred');
    }
  } finally {
    confirmDelete.disabled = false;
    confirmDelete.textContent = '🗑️ Delete License';
  }
});

// 📜 Table Scroll Management
function updateScrollIndicators() {
  const tableContainer = document.querySelector('.table-container');
  if (!tableContainer) return;
  
  const isScrollable = tableContainer.scrollHeight > tableContainer.clientHeight;
  const isScrollableRight = tableContainer.scrollWidth > tableContainer.clientWidth;
  
  if (isScrollable) {
    tableContainer.classList.add('scrollable');
  } else {
    tableContainer.classList.remove('scrollable');
  }
  
  if (isScrollableRight) {
    tableContainer.classList.add('scrollable-right');
  } else {
    tableContainer.classList.remove('scrollable-right');
  }
  
  // Check if scrolled to bottom
  const isAtBottom = tableContainer.scrollTop + tableContainer.clientHeight >= tableContainer.scrollHeight - 5;
  if (isAtBottom) {
    tableContainer.classList.remove('scrollable-bottom');
  } else {
    tableContainer.classList.add('scrollable-bottom');
  }
}

// Add scroll event listener
document.addEventListener('DOMContentLoaded', () => {
  const tableContainer = document.querySelector('.table-container');
  if (tableContainer) {
    tableContainer.addEventListener('scroll', updateScrollIndicators);
    // Initial check
    setTimeout(updateScrollIndicators, 100);
  }
});

// OPTIMIZED: Load licenses with loading indicator
async function loadLicenses() {
  // Show loading indicator
  if (tableBody) {
    tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 30px;"><div style="font-size: 20px; margin-bottom: 10px;">⏳</div><div>Loading licenses...</div></td></tr>';
  }
  
  try {
    const response = await authenticatedFetch('/api/admin/licenses/list');
    const result = await response.json();

    if (!response.ok) {
      showNotification('error', 'Error Loading Licenses', result.message || 'Failed to load licenses');
      if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #f56565;">❌ Error loading licenses</td></tr>';
      }
      return;
    }
    
    const data = result.data;
    
    if (!tableBody) {
      return;
    }

    if (!data || data.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">No licenses found</td></tr>';
      return;
    }

    // OPTIMIZED: Use DocumentFragment for single DOM update
    const fragment = document.createDocumentFragment();
    
    data.forEach(row => {
      const tr = document.createElement('tr');
      // Escape HTML to prevent XSS
      const esc = str => String(str || 'N/A').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]);
      
      tr.innerHTML = `
        <td>${esc(row.license_key)}</td>
        <td>${esc(row.account_id)}</td>
        <td>${esc(row.hardware_id)}</td>
        <td>${esc(row.expiry_date)}</td>
        <td>${esc(row.status)}</td>
        <td>${row.created_at ? new Date(row.created_at).toLocaleString() : 'N/A'}</td>
        <td>
          <button onclick="editLicense('${esc(row.license_key)}', '${esc(row.account_id)}', '${esc(row.hardware_id)}', '${esc(row.expiry_date)}', '${esc(row.status)}')">✏️ Edit</button>
          <button onclick="deleteLicense('${esc(row.license_key)}', '${esc(row.account_id)}', '${esc(row.hardware_id)}')">🗑️ Delete</button>
        </td>
      `;
      fragment.appendChild(tr);
    });
    
    // Single DOM update for better performance
    tableBody.innerHTML = '';
    tableBody.appendChild(fragment);
    
    // Update scroll indicators
    requestAnimationFrame(updateScrollIndicators);
    
  } catch (err) {
    if (err.message !== 'Unauthorized') {
      if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #f56565;">❌ Error loading data</td></tr>';
      }
    }
  }
}

// 🟢 Add new license
addBtn.addEventListener('click', async () => {
  const licenseKey = document.getElementById('licenseKey').value.trim();
  const accountId = document.getElementById('accountId').value.trim();
  const hardwareId = document.getElementById('hardwareId').value.trim();
  const expiryDate = document.getElementById('expiry').value;
  const status = document.getElementById('status').value;

  // Validate
  if (!licenseKey || !accountId || !hardwareId || !expiryDate) {
    showNotification('warning', 'Validation Error', 'Please fill all fields before adding a license.');
    return;
  }

  // Disable button
  addBtn.disabled = true;
  addBtn.textContent = 'Adding...';

  try {
    const response = await authenticatedFetch('/api/admin/licenses/create', {
      method: 'POST',
      body: JSON.stringify({
        licenseKey,
        accountId,
        hardwareId,
        expiryDate,
        status
      })
    });

    const data = await response.json();

    if (response.ok) {
      showNotification('success', 'License Added', data.message || 'License added successfully!');
      clearForm();
      loadLicenses();
    } else {
      showNotification('error', 'Error Adding License', data.message || 'Failed to add license');
    }
  } catch (err) {
    if (err.message !== 'Unauthorized') {
      showNotification('error', 'Error Adding License', 'Failed to add license');
    }
  } finally {
    addBtn.disabled = false;
    addBtn.textContent = 'Add License';
  }
});

// 🧹 Clear input fields
function clearForm() {
  document.getElementById('licenseKey').value = '';
  document.getElementById('accountId').value = '';
  document.getElementById('hardwareId').value = '';
  document.getElementById('expiry').value = '';
  document.getElementById('status').value = 'active';
}

// 🟠 Delete a license (shows custom modal)
window.deleteLicense = (licenseKey, accountId, hardwareId) => {
  showDeleteModal(licenseKey, accountId, hardwareId);
};

// 🔵 Edit license modal
window.editLicense = (licenseKey, accountId, hardwareId, expiryDate, status) => {
  // Populate form with current values
  document.getElementById('editLicenseKey').value = licenseKey;
  document.getElementById('editAccountId').value = accountId;
  document.getElementById('editHardwareId').value = hardwareId;
  document.getElementById('editExpiry').value = expiryDate;
  
  // Set radio button based on status
  const statusRadios = document.querySelectorAll('input[name="editStatus"]');
  statusRadios.forEach(radio => {
    radio.checked = radio.value === status;
  });
  
  // Show modal
  editModal.style.display = 'block';
  document.body.style.overflow = 'hidden'; // Prevent background scrolling
};

// Modal event listeners
closeModal.addEventListener('click', closeEditModal);
cancelEdit.addEventListener('click', closeEditModal);
window.addEventListener('click', (event) => {
  if (event.target === editModal) {
    closeEditModal();
  }
});

function closeEditModal() {
  editModal.style.display = 'none';
  document.body.style.overflow = 'auto'; // Restore scrolling
  editForm.reset();
}

// Edit form submission
editForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const licenseKey = document.getElementById('editLicenseKey').value;
  const accountId = document.getElementById('editAccountId').value.trim();
  const hardwareId = document.getElementById('editHardwareId').value.trim();
  const expiryDate = document.getElementById('editExpiry').value;
  const status = document.querySelector('input[name="editStatus"]:checked').value;
  
  // Validate
  if (!accountId || !hardwareId || !expiryDate) {
    showNotification('warning', 'Validation Error', 'Please fill all fields.');
    return;
  }
  
  // Disable save button
  saveEdit.disabled = true;
  saveEdit.textContent = '💾 Saving...';
  
  try {
    const response = await authenticatedFetch('/api/admin/licenses/update', {
      method: 'PUT',
      body: JSON.stringify({
        licenseKey,
        accountId,
        hardwareId,
        expiryDate,
        status
      })
    });

    const data = await response.json();

    if (response.ok) {
      showNotification('success', 'License Updated', data.message || 'License updated successfully!');
      closeEditModal();
      loadLicenses();
    } else {
      showNotification('error', 'Update Failed', data.message || 'Error updating license');
    }
  } catch (err) {
    if (err.message !== 'Unauthorized') {
      showNotification('error', 'Update Error', 'Failed to update license');
    }
  } finally {
    saveEdit.disabled = false;
    saveEdit.textContent = '💾 Save Changes';
  }
});

// Logout functionality
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    try {
      await authenticatedFetch('/api/admin/auth/logout', {
        method: 'POST'
      });
    } catch (err) {
      // Silent fail, redirect anyway
    } finally {
      redirectToLogin();
    }
  });
}

// Load data on startup
document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication first, then load licenses
  const authenticated = await checkAuth();
  if (authenticated) {
    loadLicenses();
  }
});
