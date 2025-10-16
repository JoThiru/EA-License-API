import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Elements
const tableBody = document.querySelector('#licensesTable tbody');
const addBtn = document.getElementById('addLicense');

// 🟢 Load all licenses from Supabase
async function loadLicenses() {
  const { data, error } = await supabase
    .from('licenses')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching licenses:', error);
    alert('Error loading licenses.');
    return;
  }

  tableBody.innerHTML = '';
  data.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.license_key}</td>
      <td>${row.account_id}</td>
      <td>${row.hardware_id}</td>
      <td>${row.expiry_date}</td>
      <td>${row.status}</td>
      <td>${new Date(row.created_at).toLocaleString()}</td>
      <td>
        <button onclick="renewLicense('${row.license_key}')">♻️ Renew</button>
        <button onclick="deleteLicense('${row.license_key}')">🗑️ Delete</button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
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
    alert('⚠️ Please fill all fields before adding a license.');
    return;
  }

  // 2️⃣ Check for existing license
  const { data: existing } = await supabase
    .from('licenses')
    .select('license_key')
    .eq('license_key', licenseKey)
    .maybeSingle();

  if (existing) {
    alert(`⚠️ License key "${licenseKey}" already exists.`);
    return;
  }

  // 3️⃣ Disable button
  addBtn.disabled = true;
  addBtn.textContent = 'Adding...';

  // 4️⃣ Insert license
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
    alert('❌ Error adding license: ' + error.message);
  } else {
    alert('✅ License added successfully!');
    clearForm();
    loadLicenses();
  }

  // 5️⃣ Enable button again
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

// 🟠 Delete a license
window.deleteLicense = async (licenseKey) => {
  if (!confirm(`Are you sure you want to delete license "${licenseKey}"?`)) return;

  const { error } = await supabase
    .from('licenses')
    .delete()
    .eq('license_key', licenseKey);

  if (error) {
    console.error('Delete error:', error);
    alert('❌ Failed to delete license.');
  } else {
    alert('🗑️ License deleted successfully.');
    loadLicenses();
  }
};

// 🔵 Renew license (extend expiry or reactivate)
window.renewLicense = async (licenseKey) => {
  const newExpiry = prompt('Enter new expiry date (YYYY-MM-DD):');
  if (!newExpiry) return;

  const { error } = await supabase
    .from('licenses')
    .update({ expiry_date: newExpiry, status: 'active' })
    .eq('license_key', licenseKey);

  if (error) {
    console.error('Renew error:', error);
    alert('❌ Error renewing license: ' + error.message);
  } else {
    alert('♻️ License renewed successfully.');
    loadLicenses();
  }
};

// Load data on startup
loadLicenses();
