import { renderStudentThumbnail } from '../../utils/avatarUtils.js';

/**
 * Student Side Navigation Drawer Component (Hamburger Menu)
 * Matches the sleek light rounded sidebar design with profile card, search, modern nav pills, target card, and footer actions.
 */
export const renderStudentDrawer = (profile, currentTab = 'overview', historyCount = 0) => {
  const pct = profile?.attendancePercentage !== undefined ? profile.attendancePercentage : 88;
  const isEligible = pct >= 75;

  return `
    <!-- Drawer Backdrop Overlay -->
    <div class="student-drawer-backdrop" id="student-drawer-backdrop"></div>

    <!-- Slide-out Side Drawer -->
    <aside class="student-drawer" id="student-drawer">
      
      <!-- 1. Top Brand Header & Close -->
      <div class="drawer-top-brand">
        <div class="drawer-brand-badge">
          <svg viewBox="0 0 32 32" width="28" height="28" style="border-radius: 8px; flex-shrink: 0;" aria-hidden="true">
            <defs>
              <linearGradient id="drawerLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#4F46E5"/>
                <stop offset="100%" stop-color="#3730A3"/>
              </linearGradient>
            </defs>
            <rect width="32" height="32" rx="8" fill="url(#drawerLogoGrad)"/>
            <rect x="6" y="6" width="8" height="8" rx="2" fill="none" stroke="#FFFFFF" stroke-width="2"/>
            <rect x="18" y="6" width="8" height="8" rx="2" fill="none" stroke="#FFFFFF" stroke-width="2"/>
            <rect x="6" y="18" width="8" height="8" rx="2" fill="none" stroke="#FFFFFF" stroke-width="2"/>
            <circle cx="22" cy="22" r="3" fill="#10B981"/>
          </svg>
          <span class="drawer-brand-title">Presently</span>
        </div>
        <button type="button" class="drawer-close-btn" id="btn-close-drawer" aria-label="Close menu" title="Close Menu">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- 2. User Profile Card -->
      <div class="drawer-user-card" id="btn-drawer-profile" title="Click to view/edit profile">
        <div class="drawer-user-avatar-wrap">
          ${renderStudentThumbnail(profile || {}, { size: 44 })}
        </div>
        <div class="drawer-user-meta">
          <h4 class="drawer-user-name">${profile?.name || 'Arjun Mehta'}</h4>
          <p class="drawer-user-role">
            ${profile?.branch || 'CSE'} • Sec ${profile?.sectionName || '2A'} • Roll: ${profile?.rollNumber || profile?.rollNo || '2A-046'}
          </p>
        </div>
      </div>

      <!-- 3. Navigation Menu Items -->
      <nav class="drawer-menu-list">
        
        <!-- Home / Overview -->
        <button type="button" class="drawer-menu-item ${currentTab === 'overview' ? 'active' : ''}" data-tab="overview">
          <div class="drawer-menu-icon">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </div>
          <span class="drawer-menu-label">Home</span>
        </button>

        <!-- Scan Classroom QR -->
        <button type="button" class="drawer-menu-item" id="btn-drawer-scan">
          <div class="drawer-menu-icon">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
              <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
              <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
              <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
              <rect x="7" y="7" width="10" height="10" rx="1.5"></rect>
            </svg>
          </div>
          <span class="drawer-menu-label">Scan QR</span>
          <span class="drawer-badge-pill" style="background: #ECFDF5; color: #059669;">Live</span>
        </button>

        <!-- Attendance History -->
        <button type="button" class="drawer-menu-item ${currentTab === 'history' ? 'active' : ''}" data-tab="history">
          <div class="drawer-menu-icon">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <span class="drawer-menu-label">History</span>
          ${historyCount > 0 ? `<span class="drawer-badge-pill">${historyCount}</span>` : `<span class="drawer-badge-pill" style="background: #F1F5F9; color: #64748B;">Logs</span>`}
        </button>

        <!-- Subject Attendance Report -->
        <button type="button" class="drawer-menu-item ${currentTab === 'report' ? 'active' : ''}" data-tab="report">
          <div class="drawer-menu-icon">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 20V10"></path>
              <path d="M12 20V4"></path>
              <path d="M6 20v-6"></path>
            </svg>
          </div>
          <span class="drawer-menu-label">Subject Report</span>
          <span class="drawer-badge-pill purple">${pct}%</span>
        </button>

        <!-- Refresh / Sync -->
        <button type="button" class="drawer-menu-item" id="btn-drawer-refresh">
          <div class="drawer-menu-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
          </div>
          <span class="drawer-menu-label">Sync Data</span>
        </button>

      </nav>

      <!-- 4. Bottom Utility Actions -->
      <div class="drawer-bottom-actions">
        <button type="button" class="drawer-bottom-link" id="btn-drawer-help">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <span>Help & Information</span>
        </button>

        <button type="button" class="drawer-bottom-link logout" id="btn-drawer-logout">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
          <span>Log Out</span>
        </button>
      </div>

    </aside>
  `;
};

