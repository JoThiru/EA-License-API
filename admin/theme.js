// Theme Toggle Functionality with Toggle Switch
document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('themeToggle');
  const themeToggleLabel = document.getElementById('themeToggleLabel');
  const currentTheme = localStorage.getItem('theme') || 'light'; // Default to light

  document.documentElement.setAttribute('data-theme', currentTheme);
  
  if (themeToggle) {
    // Set checkbox state: checked = dark mode, unchecked = light mode
    themeToggle.checked = currentTheme === 'dark';
    updateToggleLabel(currentTheme);
  }
  
  if (themeToggle) {
    themeToggle.addEventListener('change', () => {
      const newTheme = themeToggle.checked ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      updateToggleLabel(newTheme);
    });
  }
  
  function updateToggleLabel(theme) {
    if (themeToggleLabel) {
      themeToggleLabel.textContent = theme === 'dark' ? 'Dark Mode' : 'Light Mode';
    }
  }
});
