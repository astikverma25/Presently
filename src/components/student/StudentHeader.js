/**
 * Top App Bar & Segmented Navigation Component for Student Portal
 */
export const renderStudentHeader = (profile, currentTab = 'overview', isLive = false, historyCount = 0) => {
  const initials = profile?.name 
    ? profile.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() 
    : 'ST';

  return `
    <!-- 1. Top Navbar -->
    <header class="student-topbar">
      <div class="topbar-left">
        <!-- Hamburger Menu Toggle Button -->
        <button type="button" class="btn-hamburger" id="btn-student-menu-toggle" aria-label="Open menu" title="Open Menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        <div class="student-brand-badge">
          <span class="student-brand-logo">Presently</span>
          <span class="student-portal-tag">Student</span>
        </div>
      </div>

      <div class="topbar-right">
        <button type="button" class="student-avatar-btn" id="btn-open-profile-menu" title="${profile?.name || 'Student Profile'}" aria-label="Open profile menu">
          <div class="student-avatar-circle">
            ${initials}
          </div>
        </button>
      </div>
    </header>

    <!-- 2. Modern Segmented Tab Switcher -->
    <div class="student-tab-switcher-wrapper">
      <div class="student-tab-switcher">
        <button type="button" class="tab-switch-btn ${currentTab === 'overview' ? 'active' : ''}" data-tab="overview" id="tab-btn-overview">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          <span>Overview</span>
        </button>

        <button type="button" class="tab-switch-btn ${currentTab === 'history' ? 'active' : ''}" data-tab="history" id="tab-btn-history">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span>History</span>
          ${historyCount > 0 ? `<span class="tab-count-badge">${historyCount}</span>` : ''}
        </button>
      </div>
    </div>
  `;
};
