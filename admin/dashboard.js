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
const addLicenseForm = document.getElementById('addLicenseForm');
const licenseForm = document.getElementById('licenseForm');
const cancelAddBtn = document.getElementById('cancelAdd');
const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const closeModal = document.querySelectorAll('.close');
const cancelEdit = document.getElementById('cancelEdit');
const saveEdit = document.getElementById('saveEdit');
const notificationContainer = document.getElementById('notificationContainer');
const profileTrigger = document.getElementById('profileTrigger');
const profileMenu = document.getElementById('profileMenu');
const logoutBtnProfile = document.getElementById('logoutBtnProfile');
const navMainDashboard = document.getElementById('navMainDashboard');
const navDashboard = document.getElementById('navDashboard');
const navPending = document.getElementById('navPending');
const navSettings = document.getElementById('navSettings');
const pendingBadge = document.getElementById('pendingBadge');
const totalLicensesEl = document.getElementById('totalLicenses');
const activeLicensesEl = document.getElementById('activeLicenses');
const expiredLicensesEl = document.getElementById('expiredLicenses');
const pendingRequestsModal = document.getElementById('pendingRequestsModal');
const closePendingModal = document.getElementById('closePendingModal');
const pendingRequestsList = document.getElementById('pendingRequestsList');
const reviewRequestModal = document.getElementById('reviewRequestModal');
const closeReviewModal = document.getElementById('closeReviewModal');
const reviewForm = document.getElementById('reviewForm');
const rejectRequestBtn = document.getElementById('rejectRequestBtn');
const cancelReviewBtn = document.getElementById('cancelReviewBtn');
let currentReviewLicenseKey = null;

// Delete modal elements
const deleteModal = document.getElementById('deleteModal');
const closeDeleteModal = document.getElementById('closeDeleteModal');
const cancelDelete = document.getElementById('cancelDelete');
const confirmDelete = document.getElementById('confirmDelete');
const deleteLicenseKey = document.getElementById('deleteLicenseKey');
const deleteAccountId = document.getElementById('deleteAccountId');
const deleteAccountServer = document.getElementById('deleteAccountServer');
const deleteHardwareId = document.getElementById('deleteHardwareId');
const deleteEaName = document.getElementById('deleteEaName');

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

function showDeleteModal(licenseKey, accountId, accountServer, hardwareId, eaName) {
  currentDeleteLicenseKey = licenseKey;
  deleteLicenseKey.textContent = licenseKey;
  deleteAccountId.textContent = accountId;
  deleteAccountServer.textContent = accountServer || 'N/A';
  deleteHardwareId.textContent = hardwareId;
  deleteEaName.textContent = eaName || 'N/A';
  
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
    tableBody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 30px;"><div style="font-size: 20px; margin-bottom: 10px;">⏳</div><div>Loading licenses...</div></td></tr>';
  }
  
  try {
    const response = await authenticatedFetch('/api/admin/licenses/list');
    const result = await response.json();

    if (!response.ok) {
      showNotification('error', 'Error Loading Licenses', result.message || 'Failed to load licenses');
      if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px; color: #f56565;">❌ Error loading licenses</td></tr>';
      }
      return;
    }
    
    const data = result.data;
    
    if (!tableBody) {
      return;
    }

    if (!data || data.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px;">No licenses found</td></tr>';
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
        <td>${esc(row.account_server || 'N/A')}</td>
        <td>${esc(row.hardware_id)}</td>
        <td>${esc(row.ea_name || 'N/A')}</td>
        <td>${esc(row.expiry_date)}</td>
        <td><span class="status-${row.status === 'active' ? 'active' : 'inactive'}">${esc(row.status)}</span></td>
        <td>${row.created_at ? new Date(row.created_at).toLocaleString() : 'N/A'}</td>
        <td>
          <button onclick="editLicense('${esc(row.license_key)}', '${esc(row.account_id)}', '${esc(row.account_server || '')}', '${esc(row.hardware_id)}', '${esc(row.ea_name || '')}', '${esc(row.expiry_date)}', '${esc(row.status)}')">✏️ Edit</button>
          <button onclick="deleteLicense('${esc(row.license_key)}', '${esc(row.account_id)}', '${esc(row.account_server || '')}', '${esc(row.hardware_id)}', '${esc(row.ea_name || '')}')">🗑️ Delete</button>
        </td>
      `;
      fragment.appendChild(tr);
    });
    
    // Single DOM update for better performance
    tableBody.innerHTML = '';
    tableBody.appendChild(fragment);
    
    // Update scroll indicators
    requestAnimationFrame(updateScrollIndicators);
    
    // Update summary cards
    updateSummaryCards(data);
    
  } catch (err) {
    if (err.message !== 'Unauthorized') {
      if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px; color: #f56565;">❌ Error loading data</td></tr>';
      }
    }
  }
}

// Toggle add license form
if (addBtn) {
  addBtn.addEventListener('click', () => {
    if (addLicenseForm) {
      addLicenseForm.style.display = addLicenseForm.style.display === 'none' ? 'block' : 'none';
      if (addLicenseForm.style.display === 'block') {
        addLicenseForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  });
}

// Cancel add license
if (cancelAddBtn) {
  cancelAddBtn.addEventListener('click', () => {
    if (addLicenseForm) {
      addLicenseForm.style.display = 'none';
    }
    clearForm();
  });
}

// Form submission handler
if (licenseForm) {
  licenseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const licenseKey = document.getElementById('licenseKey').value.trim();
    const accountId = document.getElementById('accountId').value.trim();
    const accountServer = document.getElementById('accountServer').value.trim();
    const hardwareId = document.getElementById('hardwareId').value.trim();
    const eaName = document.getElementById('eaName').value.trim();
    const expiryDate = document.getElementById('expiry').value;
    const status = document.getElementById('status').value;

    // Validate
    if (!licenseKey || !accountId || !accountServer || !hardwareId || !eaName || !expiryDate) {
      showNotification('warning', 'Validation Error', 'Please fill all fields before adding a license.');
      return;
    }

    // Disable button
    const submitBtn = licenseForm.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Adding...';
    }

    try {
      const response = await authenticatedFetch('/api/admin/licenses/create', {
        method: 'POST',
        body: JSON.stringify({
          licenseKey,
          accountId,
          accountServer,
          hardwareId,
          ea_name: eaName,
          expiryDate,
          status
        })
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', 'License Added', data.message || 'License added successfully!');
        clearForm();
        if (addLicenseForm) {
          addLicenseForm.style.display = 'none';
        }
        loadLicenses();
      } else {
        showNotification('error', 'Error Adding License', data.message || 'Failed to add license');
      }
    } catch (err) {
      if (err.message !== 'Unauthorized') {
        showNotification('error', 'Error Adding License', 'Failed to add license');
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add License';
      }
    }
  });
}

// 🧹 Clear input fields
function clearForm() {
  document.getElementById('licenseKey').value = '';
  document.getElementById('accountId').value = '';
  document.getElementById('accountServer').value = '';
  document.getElementById('hardwareId').value = '';
  document.getElementById('eaName').value = '';
  document.getElementById('expiry').value = '';
  document.getElementById('status').value = 'active';
}

// 🟠 Delete a license (shows custom modal)
window.deleteLicense = (licenseKey, accountId, accountServer, hardwareId, eaName) => {
  showDeleteModal(licenseKey, accountId, accountServer, hardwareId, eaName);
};

// 🔵 Edit license modal
window.editLicense = (licenseKey, accountId, accountServer, hardwareId, eaName, expiryDate, status) => {
  // Populate form with current values
  document.getElementById('editLicenseKey').value = licenseKey;
  document.getElementById('editAccountId').value = accountId;
  document.getElementById('editAccountServer').value = accountServer || '';
  document.getElementById('editHardwareId').value = hardwareId;
  document.getElementById('editEaName').value = eaName || '';
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

// Update summary cards
function updateSummaryCards(licenses) {
  if (!licenses || !Array.isArray(licenses)) return;
  
  const total = licenses.length;
  const active = licenses.filter(l => l.status === 'active').length;
  
  const today = new Date();
  const expired = licenses.filter(l => {
    if (l.status !== 'active') return false;
    const expiry = new Date(l.expiry_date);
    return expiry < today;
  }).length;
  
  if (totalLicensesEl) totalLicensesEl.textContent = total;
  if (activeLicensesEl) activeLicensesEl.textContent = active;
  if (expiredLicensesEl) expiredLicensesEl.textContent = expired;
}

// Modal event listeners
if (closeModal.length > 0) {
  closeModal.forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (e.target.id === 'closeDeleteModal') {
        closeDeleteModalFunc();
      } else {
        closeEditModal();
      }
    });
  });
}

if (cancelEdit) {
  cancelEdit.addEventListener('click', closeEditModal);
}

if (editModal) {
  window.addEventListener('click', (event) => {
    if (event.target === editModal) {
      closeEditModal();
    }
  });
}

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
  const accountServer = document.getElementById('editAccountServer').value.trim();
  const hardwareId = document.getElementById('editHardwareId').value.trim();
  const eaName = document.getElementById('editEaName').value.trim();
  const expiryDate = document.getElementById('editExpiry').value;
  const status = document.querySelector('input[name="editStatus"]:checked').value;
  
  // Validate
  if (!accountId || !accountServer || !hardwareId || !eaName || !expiryDate) {
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
        accountServer,
        hardwareId,
        ea_name: eaName,
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

// Profile dropdown functionality
if (profileTrigger) {
  profileTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    profileTrigger.closest('.profile-dropdown').classList.toggle('active');
  });
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (profileMenu && !profileTrigger.contains(e.target) && !profileMenu.contains(e.target)) {
    profileTrigger.closest('.profile-dropdown')?.classList.remove('active');
  }
});

// Navigation handlers
function showMainDashboard() {
  // Show main dashboard with summary cards and form
  const summaryCards = document.querySelector('.summary-cards');
  const formCard = document.querySelector('.form-card');
  const tableCard = document.querySelector('.table-card');
  const pendingContainer = document.getElementById('pendingRequestsContainer');
  const headerTitle = document.querySelector('.header-left h1');
  
  // Update header
  if (headerTitle) headerTitle.textContent = 'Dashboard';
  
  // Show all dashboard sections
  if (summaryCards) summaryCards.style.display = 'grid';
  if (formCard) formCard.style.display = 'block';
  if (tableCard) tableCard.style.display = 'block';
  if (pendingContainer) pendingContainer.style.display = 'none';
  
  // Reload data
  loadLicenses();
  checkPendingRequests();
}

function showAllLicenses() {
  // Show all licenses table, hide dashboard sections
  const summaryCards = document.querySelector('.summary-cards');
  const formCard = document.querySelector('.form-card');
  const tableCard = document.querySelector('.table-card');
  const pendingContainer = document.getElementById('pendingRequestsContainer');
  const headerTitle = document.querySelector('.header-left h1');
  
  // Update header
  if (headerTitle) headerTitle.textContent = 'All Licenses';
  
  // Hide summary and form
  if (summaryCards) summaryCards.style.display = 'none';
  if (formCard) formCard.style.display = 'none';
  
  // Show licenses table - make sure it's visible
  if (tableCard) {
    tableCard.style.display = 'block';
    // Ensure table body exists
    const tableBodyEl = tableCard.querySelector('#licensesTable tbody');
    if (tableBodyEl && !tableBodyEl.querySelector('tr')) {
      // Table is empty, trigger reload
      loadLicenses();
    } else {
      // Just make sure it's visible
      loadLicenses();
    }
  }
  if (pendingContainer) pendingContainer.style.display = 'none';
  
  // Always reload licenses to ensure fresh data
  loadLicenses();
}

if (navMainDashboard) {
  navMainDashboard.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    navMainDashboard.classList.add('active');
    showMainDashboard();
  });
}

if (navDashboard) {
  navDashboard.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    navDashboard.classList.add('active');
    showAllLicenses();
  });
}

if (navPending) {
  navPending.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    navPending.classList.add('active');
    showPendingView();
  });
}

if (navSettings) {
  navSettings.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    navSettings.classList.add('active');
    showNotification('info', 'Settings', 'Settings page coming soon!');
  });
}

// Show pending requests view
async function showPendingView() {
  try {
    // Hide dashboard sections, show pending table
    const summaryCards = document.querySelector('.summary-cards');
    const formCard = document.querySelector('.form-card');
    const tableCard = document.querySelector('.table-card');
    const headerTitle = document.querySelector('.header-left h1');
    
    // Update header
    if (headerTitle) headerTitle.textContent = 'Pending License Requests';
    
    // Hide other sections
    if (summaryCards) summaryCards.style.display = 'none';
    if (formCard) formCard.style.display = 'none';
    
    // Create or show pending container
    let pendingContainer = document.getElementById('pendingRequestsContainer');
    if (!pendingContainer) {
      pendingContainer = document.createElement('div');
      pendingContainer.id = 'pendingRequestsContainer';
      pendingContainer.className = 'table-card';
      pendingContainer.style.margin = '0 32px 32px 32px';
      
      const contentSection = document.querySelector('.content-section');
      if (contentSection) {
        contentSection.insertBefore(pendingContainer, contentSection.firstChild);
      }
    }
    
    pendingContainer.style.display = 'block';
    if (tableCard) tableCard.style.display = 'none';
    
    // Load and display pending requests
    const response = await authenticatedFetch('/api/admin/licenses/pending');
    const result = await response.json();

    if (response.ok && result.pendingRequests) {
      displayPendingRequestsTable(result.pendingRequests, pendingContainer);
    } else {
      pendingContainer.innerHTML = '<p style="text-align: center; padding: 40px; color: var(--text-tertiary);">No pending requests</p>';
    }
  } catch (err) {
    console.error('Error loading pending requests:', err);
  }
}

function displayPendingRequestsTable(requests, container) {
  const esc = str => String(str || 'N/A').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]);
  
  if (requests.length === 0) {
    container.innerHTML = '<p style="text-align: center; padding: 40px; color: var(--text-tertiary);">No pending requests</p>';
    return;
  }
  
  const tableHTML = `
    <div class="section-header">
      <h2>Pending License Requests (${requests.length})</h2>
    </div>
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>License Key</th>
            <th>Account ID</th>
            <th>Account Server</th>
            <th>EA Name</th>
            <th>Hardware ID</th>
            <th>Requested By</th>
            <th>Requested At</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${requests.map(req => `
            <tr>
              <td>${esc(req.license_key)}</td>
              <td>${esc(req.account_id)}</td>
              <td>${esc(req.account_server || 'N/A')}</td>
              <td>${esc(req.ea_name || 'N/A')}</td>
              <td>${esc(req.hardware_id)}</td>
              <td>${esc(req.requested_email || 'N/A')}</td>
              <td>${req.created_at ? new Date(req.created_at).toLocaleString() : 'N/A'}</td>
              <td>
                <button onclick="window.reviewRequest('${esc(req.license_key)}', '${esc(req.account_id)}', '${esc(req.account_server || '')}', '${esc(req.hardware_id)}', '${esc(req.ea_name || '')}', '${esc(req.requested_email || '')}', '${req.created_at || ''}')" class="btn-primary" style="padding: 6px 12px; font-size: 12px;">Review</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  
  container.innerHTML = tableHTML;
}

function attachPendingViewListeners() {
  // Re-attach profile dropdown
  const profileTrigger = document.getElementById('profileTrigger');
  const profileMenu = document.getElementById('profileMenu');
  const logoutBtnProfile = document.getElementById('logoutBtnProfile');
  
  if (profileTrigger) {
    profileTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      profileTrigger.closest('.profile-dropdown').classList.toggle('active');
    });
  }
  
  if (logoutBtnProfile) {
    logoutBtnProfile.addEventListener('click', handleAdminLogout);
  }
}

// Logout functionality
async function handleAdminLogout() {
  try {
    await authenticatedFetch('/api/admin/auth/logout', {
      method: 'POST'
    });
  } catch (err) {
    // Silent fail, redirect anyway
  } finally {
    redirectToLogin();
  }
}

if (logoutBtnProfile) {
  logoutBtnProfile.addEventListener('click', handleAdminLogout);
}

// Check for pending requests and update badge
async function checkPendingRequests() {
  try {
    const response = await authenticatedFetch('/api/admin/licenses/pending');
    const result = await response.json();

    if (response.ok && result.pendingRequests) {
      const count = result.pendingRequests.length;
      if (pendingBadge) {
        if (count > 0) {
          pendingBadge.textContent = count;
          pendingBadge.style.display = 'inline-block';
        } else {
          pendingBadge.style.display = 'none';
        }
      }
    }
  } catch (err) {
    // Silent fail - don't interrupt dashboard loading
  }
}

// Show pending requests modal
function showPendingRequestsModal(requests) {
  if (!pendingRequestsList) return;

  if (requests.length === 0) {
    pendingRequestsList.innerHTML = '<p style="text-align: center; padding: 40px; color: #64748b;">No pending requests</p>';
    return;
  }

  const esc = str => String(str || 'N/A').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]);

  pendingRequestsList.innerHTML = `
    <div style="margin-bottom: 20px; padding: 12px; background: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
      <strong>You have ${requests.length} pending license request(s) that need your review.</strong>
    </div>
    <div style="max-height: 400px; overflow-y: auto;">
      ${requests.map(req => `
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 12px; background: #f8fafc;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 12px;">
            <div><strong>License Key:</strong><br>${esc(req.license_key)}</div>
            <div><strong>Account ID:</strong><br>${esc(req.account_id)}</div>
            <div><strong>Account Server:</strong><br>${esc(req.account_server || 'N/A')}</div>
            <div><strong>EA Name:</strong><br>${esc(req.ea_name || 'N/A')}</div>
            <div><strong>Hardware ID:</strong><br>${esc(req.hardware_id)}</div>
            <div><strong>Requested By:</strong><br>${esc(req.requested_email || 'N/A')}</div>
            <div><strong>Requested At:</strong><br>${req.created_at ? new Date(req.created_at).toLocaleString() : 'N/A'}</div>
          </div>
          <button onclick="reviewRequest('${esc(req.license_key)}', '${esc(req.account_id)}', '${esc(req.account_server || '')}', '${esc(req.hardware_id)}', '${esc(req.ea_name || '')}', '${esc(req.requested_email || '')}', '${req.created_at || ''}')" 
                  style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
            📋 Review Request
          </button>
        </div>
      `).join('')}
    </div>
  `;

  if (pendingRequestsModal) {
    pendingRequestsModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }
}

// Review request
window.reviewRequest = function(licenseKey, accountId, accountServer, hardwareId, eaName, requestedBy, requestedAt) {
  currentReviewLicenseKey = licenseKey;
  
  document.getElementById('reviewLicenseKey').value = licenseKey;
  document.getElementById('reviewAccountId').value = accountId;
  document.getElementById('reviewAccountServer').value = accountServer;
  document.getElementById('reviewHardwareId').value = hardwareId;
  document.getElementById('reviewEaName').value = eaName;
  document.getElementById('reviewRequestedBy').value = requestedBy;
  document.getElementById('reviewRequestedAt').value = requestedAt ? new Date(requestedAt).toLocaleString() : 'N/A';
  
  if (pendingRequestsModal) pendingRequestsModal.style.display = 'none';
  if (reviewRequestModal) {
    reviewRequestModal.style.display = 'block';
  }
};

// Close pending modal
if (closePendingModal) {
  closePendingModal.addEventListener('click', () => {
    if (pendingRequestsModal) {
      pendingRequestsModal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  });
}

// Close review modal
if (closeReviewModal) {
  closeReviewModal.addEventListener('click', closeReviewModalFunc);
}

if (cancelReviewBtn) {
  cancelReviewBtn.addEventListener('click', closeReviewModalFunc);
}

function closeReviewModalFunc() {
  if (reviewRequestModal) {
    reviewRequestModal.style.display = 'none';
    document.body.style.overflow = 'auto';
  }
  currentReviewLicenseKey = null;
  if (reviewForm) reviewForm.reset();
}

// Approve request
if (reviewForm) {
  reviewForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const expiryDate = document.getElementById('reviewExpiryDate').value;
    if (!expiryDate) {
      alert('Please select an expiry date');
      return;
    }

    const approveBtn = document.getElementById('approveRequestBtn');
    approveBtn.disabled = true;
    approveBtn.textContent = 'Approving...';

    try {
      const response = await authenticatedFetch('/api/admin/licenses/approve', {
        method: 'POST',
        body: JSON.stringify({
          licenseKey: currentReviewLicenseKey,
          expiryDate
        })
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', 'License Approved', 'License has been approved and activated.');
        closeReviewModalFunc();
        loadLicenses();
        checkPendingRequests();
      } else {
        if (data.autoRejected) {
          showNotification('warning', 'Duplicate License - Auto Rejected', data.message || 'License rejected due to duplicate account_id + hardware_id combination.');
        } else {
          showNotification('error', 'Approval Failed', data.message || 'Failed to approve license');
        }
        closeReviewModalFunc();
        loadLicenses();
        checkPendingRequests();
      }
    } catch (err) {
      if (err.message !== 'Unauthorized') {
        showNotification('error', 'Approval Error', 'Failed to approve license');
      }
    } finally {
      approveBtn.disabled = false;
      approveBtn.textContent = '✅ Approve';
    }
  });
}

// Reject request
if (rejectRequestBtn) {
  rejectRequestBtn.addEventListener('click', async () => {
    if (!currentReviewLicenseKey) return;

    if (!confirm('Are you sure you want to reject this license request?')) {
      return;
    }

    rejectRequestBtn.disabled = true;
    rejectRequestBtn.textContent = 'Rejecting...';

    try {
      const response = await authenticatedFetch('/api/admin/licenses/reject', {
        method: 'POST',
        body: JSON.stringify({
          licenseKey: currentReviewLicenseKey
        })
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', 'Request Rejected', 'License request has been rejected.');
        closeReviewModalFunc();
        loadLicenses();
        checkPendingRequests();
      } else {
        showNotification('error', 'Rejection Failed', data.message || 'Failed to reject request');
      }
    } catch (err) {
      if (err.message !== 'Unauthorized') {
        showNotification('error', 'Rejection Error', 'Failed to reject request');
      }
    } finally {
      rejectRequestBtn.disabled = false;
      rejectRequestBtn.textContent = '❌ Reject';
    }
  });
}

// Close modals when clicking outside
if (pendingRequestsModal) {
  window.addEventListener('click', (event) => {
    if (event.target === pendingRequestsModal) {
      pendingRequestsModal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  });
}

if (reviewRequestModal) {
  window.addEventListener('click', (event) => {
    if (event.target === reviewRequestModal) {
      closeReviewModalFunc();
    }
  });
}

// Load data on startup
// Ensure logo fallback shows if image fails to load
document.addEventListener('DOMContentLoaded', () => {
  const logoImages = document.querySelectorAll('.logo-image');
  logoImages.forEach(img => {
    if (img.complete && img.naturalHeight === 0) {
      // Image failed to load
      img.style.display = 'none';
      const fallback = img.nextElementSibling;
      if (fallback && fallback.classList.contains('logo-fallback')) {
        fallback.style.display = 'flex';
      }
    }
  });
});

document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication first, then load licenses
  const authenticated = await checkAuth();
  if (authenticated) {
    loadLicenses();
    // Check for pending requests after a short delay
    setTimeout(() => {
      checkPendingRequests();
    }, 1000);
  }
});
