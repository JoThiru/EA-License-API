import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

// Create a single supabase client for interacting with your database
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Elements
const tableBody = document.querySelector('#licensesTable tbody');
const addBtn = document.getElementById('addLicense');
const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const closeModal = document.querySelector('.close');
const cancelEdit = document.getElementById('cancelEdit');
const saveEdit = document.getElementById('saveEdit');
const notificationContainer = document.getElementById('notificationContainer');

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
    const { error } = await supabase
      .from('licenses')
      .delete()
      .eq('license_key', currentDeleteLicenseKey);

    if (error) {
      console.error('Delete error:', error);
      showNotification('error', 'Delete Failed', 'Failed to delete license.');
    } else {
      showNotification('success', 'License Deleted', 'License deleted successfully.');
      closeDeleteModalFunc();
      loadLicenses();
    }
  } catch (err) {
    console.error('Unexpected error:', err);
    showNotification('error', 'Unexpected Error', 'An unexpected error occurred: ' + err.message);
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

// 🟢 Load all licenses from Supabase
async function loadLicenses() {
  console.log("🟡 Loading licenses...");
  
  try {
  const { data, error } = await supabase
    .from('licenses')
    .select('*')
    .order('created_at', { ascending: false });

    console.log("🟢 Supabase Data:", data);
    console.log("🔴 Supabase Error:", error);

  if (error) {
    console.error('Error fetching licenses:', error);
      showNotification('error', 'Error Loading Licenses', error.message);
      return;
    }
    
    if (!tableBody) {
      console.error('Table body element not found!');
    return;
  }

  tableBody.innerHTML = '';
    
    if (!data || data.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="7" style="text-align: center; padding: 20px;">No licenses found</td>';
      tableBody.appendChild(tr);
      return;
    }

  data.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>${row.license_key || 'N/A'}</td>
        <td>${row.account_id || 'N/A'}</td>
        <td>${row.hardware_id || 'N/A'}</td>
        <td>${row.expiry_date || 'N/A'}</td>
        <td>${row.status || 'N/A'}</td>
        <td>${row.created_at ? new Date(row.created_at).toLocaleString() : 'N/A'}</td>
        <td>
          <button onclick="editLicense('${row.license_key}', '${row.account_id}', '${row.hardware_id}', '${row.expiry_date}', '${row.status}')">✏️ Edit</button>
          <button onclick="deleteLicense('${row.license_key}', '${row.account_id}', '${row.hardware_id}')">🗑️ Delete</button>
        </td>
    `;
    tableBody.appendChild(tr);
  });
    
    console.log('Licenses loaded successfully');
    
    // Update scroll indicators after loading
    setTimeout(updateScrollIndicators, 100);
  } catch (err) {
    console.error('Unexpected error loading licenses:', err);
    showNotification('error', 'Unexpected Error', 'Failed to load licenses: ' + err.message);
  }
}

// 🟢 Add new license
addBtn.addEventListener('click', async () => {
  const licenseKey = document.getElementById('licenseKey').value.trim();
  const accountId = document.getElementById('accountId').value.trim();
  const hardwareId = document.getElementById('hardwareId').value.trim();
  const expiry = document.getElementById('expiry').value;
  const status = document.getElementById('status').value;

  // 1️⃣ Validate
  if (!licenseKey || !accountId || !hardwareId || !expiry) {
    showNotification('warning', 'Validation Error', 'Please fill all fields before adding a license.');
    return;
  }

  // 2️⃣ Check for existing license key
  const { data: existingKey } = await supabase
    .from('licenses')
    .select('license_key')
    .eq('license_key', licenseKey)
    .maybeSingle();

  if (existingKey) {
    showNotification('warning', 'Duplicate License Key', `License key "${licenseKey}" already exists.`);
    return;
  }

  // 3️⃣ Check for existing hardware ID + account ID combination
  const { data: existingCombination } = await supabase
    .from('licenses')
    .select('hardware_id, account_id')
    .eq('hardware_id', hardwareId)
    .eq('account_id', accountId)
    .maybeSingle();

  if (existingCombination) {
    showNotification('warning', 'Duplicate Combination', `This combination of Hardware ID "${hardwareId}" and Account ID "${accountId}" already exists.`);
    return;
  }

  // 4️⃣ Disable button
  addBtn.disabled = true;
  addBtn.textContent = 'Adding...';

  // 5️⃣ Insert license
  const { error } = await supabase.from('licenses').insert([{
    license_key: licenseKey,
    account_id: accountId,
    hardware_id: hardwareId,
    expiry_date: expiry,
    status: status,
    created_at: new Date().toISOString()
  }]);

  if (error) {
    console.error('Insert error:', error);
    showNotification('error', 'Error Adding License', error.message);
  } else {
    showNotification('success', 'License Added', 'License added successfully!');
    clearForm();
    loadLicenses();
  }

  // 6️⃣ Enable button again
  addBtn.disabled = false;
  addBtn.textContent = 'Add License';
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
    // Check for duplicate hardware ID + account ID combination (excluding current license)
    const { data: existingCombination } = await supabase
      .from('licenses')
      .select('hardware_id, account_id')
      .eq('hardware_id', hardwareId)
      .eq('account_id', accountId)
      .neq('license_key', licenseKey)
      .maybeSingle();

    if (existingCombination) {
      showNotification('warning', 'Duplicate Combination', `This combination of Hardware ID "${hardwareId}" and Account ID "${accountId}" already exists in another license.`);
      saveEdit.disabled = false;
      saveEdit.textContent = '💾 Save Changes';
      return;
    }
    
    // Update license
  const { error } = await supabase
    .from('licenses')
      .update({
        account_id: accountId,
        hardware_id: hardwareId,
        expiry_date: expiryDate,
        status: status
      })
    .eq('license_key', licenseKey);

  if (error) {
      console.error('Update error:', error);
      showNotification('error', 'Update Failed', 'Error updating license: ' + error.message);
  } else {
      showNotification('success', 'License Updated', 'License updated successfully!');
      closeEditModal();
    loadLicenses();
    }
  } catch (err) {
    console.error('Unexpected error:', err);
    showNotification('error', 'Unexpected Error', 'An unexpected error occurred: ' + err.message);
  } finally {
    saveEdit.disabled = false;
    saveEdit.textContent = '💾 Save Changes';
  }
});

// Load data on startup
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing dashboard...');
  
  // Handle any unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.warn('Unhandled promise rejection:', event.reason);
    // Don't prevent the default behavior, just log it
  });
  
loadLicenses();
});
