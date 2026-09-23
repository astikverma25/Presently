/**
 * Student Side Navigation Drawer Component (Hamburger Menu)
 * Slide-out navigation with student profile summary and quick actions
 */
export const renderStudentDrawer = (profile, currentTab = 'overview', historyCount = 0) => {
  const initials = profile?.name 
    ? profile.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() 
    : 'ST';

  return `
    <!-- Drawer Backdrop Overlay -->
    <div class="student-drawer-backdrop" id="student-drawer-backdrop"></div>

    <!-- Slide-out Side Drawer -->
    <aside class="student-drawer" id="student-drawer">
      <!-- Drawer Header / Profile Card -->
      <div class="drawer-header">
        <div class="drawer-profile-row">
          <div class="drawer-avatar">
            ${initials}
          </div>
          <div class="drawer-profile-info">
            <h3 class="drawer-name">${profile?.name || 'Student'}</h3>
            <p class="drawer-roll">Roll: <strong>${profile?.rollNumber || profile?.rollNo || '—'}</strong></p>
            <span class="drawer-badge-sec">
              Sec ${profile?.sectionName || '2A'} • ${profile?.semester || '4th'} Sem
            </span>
          </div>
          <button type="button" class="drawer-close-btn" id="btn-close-drawer" aria-label="Close menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <!-- Drawer Navigation Menu -->
      <nav class="drawer-nav">
        <div class="drawer-section-label">Navigation</div>

        <button type="button" class="drawer-nav-item ${currentTab === 'overview' ? 'active' : ''}" data-tab="overview">
          <div class="drawer-item-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
          </div>
          <div class="drawer-item-content">
            <span class="drawer-item-title">Overview</span>
            <span class="drawer-item-desc">Attendance gauge & active lecture</span>
          </div>
        </button>

        <button type="button" class="drawer-nav-item ${currentTab === 'history' ? 'active' : ''}" data-tab="history">
          <div class="drawer-item-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div class="drawer-item-content">
            <span class="drawer-item-title">Attendance History</span>
            <span class="drawer-item-desc">All past classes & verify status</span>
          </div>
          ${historyCount > 0 ? `<span class="drawer-item-count">${historyCount}</span>` : ''}
        </button>

        <button type="button" class="drawer-nav-item ${currentTab === 'report' ? 'active' : ''}" data-tab="report">
          <div class="drawer-item-icon" style="background: #EEF2FF; color: #4338CA;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 20V10"></path>
              <path d="M12 20V4"></path>
              <path d="M6 20v-6"></path>
            </svg>
          </div>
          <div class="drawer-item-content">
            <span class="drawer-item-title" style="color: #4338CA; font-weight: 700;">Attendance Report</span>
            <span class="drawer-item-desc">Subject breakdown & semester metrics</span>
          </div>
        </button>

        <div class="drawer-section-label" style="margin-top: 20px;">Account & Quick Actions</div>

        <button type="button" class="drawer-nav-item" id="btn-drawer-profile">
          <div class="drawer-item-icon" style="background: #F0FDF4; color: #16A34A;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <div class="drawer-item-content">
            <span class="drawer-item-title" style="color: #16A34A; font-weight: 700;">Update Profile</span>
            <span class="drawer-item-desc">Name, contact & section details</span>
          </div>
        </button>

        <button type="button" class="drawer-nav-item" id="btn-drawer-scan">
          <div class="drawer-item-icon" style="background: #EEF2FF; color: #4338CA;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
              <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
              <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
              <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
              <rect x="7" y="7" width="10" height="10" rx="1"></rect>
            </svg>
          </div>
          <div class="drawer-item-content">
            <span class="drawer-item-title" style="color: #4338CA; font-weight: 700;">Scan Classroom QR</span>
            <span class="drawer-item-desc">Open instant camera scanner</span>
          </div>
        </button>

        <button type="button" class="drawer-nav-item" id="btn-drawer-refresh">
          <div class="drawer-item-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
          </div>
          <div class="drawer-item-content">
            <span class="drawer-item-title">Refresh Dashboard</span>
            <span class="drawer-item-desc">Sync with cloud database</span>
          </div>
        </button>
      </nav>

      <!-- Drawer Footer (Logout) -->
      <div class="drawer-footer">
        <button type="button" class="btn-drawer-logout" id="btn-drawer-logout">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          Sign Out of Portal
        </button>
      </div>
    </aside>
  `;
};
