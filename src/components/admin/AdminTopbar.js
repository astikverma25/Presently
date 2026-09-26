/**
 * Topbar Component for Admin Panel
 */
export const renderAdminTopbar = (profile) => {
  const rawName = profile?.name || 'Vishal Gupta';
  const greetingName = rawName.startsWith('Hi,') ? rawName : `Hi, ${rawName}`;
  const initials = profile?.avatarInitials || (rawName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'VG');

  return `
  <header class="admin-topbar">
    <div class="admin-search-wrapper">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <input type="text" class="admin-search-input" placeholder="Search students, faculty, classes...">
    </div>

    <div class="admin-profile-badge">
      <div class="admin-avatar">${initials}</div>
      <div>
        <div class="admin-profile-name">${greetingName}</div>
        <div class="admin-profile-role">${profile?.role || 'Super Admin'}</div>
      </div>
    </div>
  </header>
`;
};
