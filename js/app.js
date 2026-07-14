// Sidebar collapse/expand
const sidebar = document.getElementById('sidebar');
const collapseBtn = document.getElementById('collapseBtn');
const toggleBtn = document.getElementById('toggleSidebar');

collapseBtn.addEventListener('click', () => {
  sidebar.classList.add('collapsed');
});

toggleBtn.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
});
