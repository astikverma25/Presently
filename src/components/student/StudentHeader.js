import { renderStudentThumbnail } from '../../utils/avatarUtils.js';

/**
 * Top App Bar & Segmented Navigation Component for Student Portal
 */
export const renderStudentHeader = (profile, currentTab = 'overview', isLive = false, historyCount = 0) => {
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
          <span class="student-brand-logo" style="display: flex; align-items: center; gap: 7px;">
            <svg viewBox="0 0 32 32" width="22" height="22" style="border-radius: 6px; flex-shrink: 0;" aria-hidden="true">
              <defs>
                <linearGradient id="studentLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#4F46E5"/>
                  <stop offset="100%" stop-color="#3730A3"/>
                </linearGradient>
              </defs>
              <rect width="32" height="32" rx="8" fill="url(#studentLogoGrad)"/>
              <rect x="6" y="6" width="8" height="8" rx="2" fill="none" stroke="#FFFFFF" stroke-width="2"/>
              <rect x="18" y="6" width="8" height="8" rx="2" fill="none" stroke="#FFFFFF" stroke-width="2"/>
              <rect x="6" y="18" width="8" height="8" rx="2" fill="none" stroke="#FFFFFF" stroke-width="2"/>
              <circle cx="22" cy="22" r="3" fill="#10B981"/>
            </svg>
            Presently
          </span>
          <span class="student-portal-tag">Student</span>
        </div>
      </div>

      <div class="topbar-right">
        <button type="button" class="student-avatar-btn" id="btn-open-profile-menu" title="${profile?.name || 'Student Profile'}" aria-label="Open profile menu" style="padding: 0; background: none; border: none;">
          ${renderStudentThumbnail(profile || {}, { size: 38 })}
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
