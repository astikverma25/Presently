/**
 * Topbar Component for Faculty Dashboard
 */
export const renderFacultyTopbar = (profile) => `
  <header class="dashboard-topbar">
    <div class="search-box-wrapper">
      <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <input type="text" class="topbar-search-input" placeholder="Search sections, students...">
    </div>

    <div class="topbar-profile-actions">
      <button class="topbar-bell-btn" aria-label="Notifications">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
      </button>

      <div class="user-profile-badge">
        <div class="profile-avatar-circle">${profile?.avatarInitials || 'FM'}</div>
        <div class="profile-info">
          <span class="profile-name">${profile?.name || 'Faculty Member'}</span>
          <span class="profile-role">${profile?.role || 'Faculty'}</span>
        </div>
      </div>
    </div>
  </header>
`;
