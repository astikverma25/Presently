/**
 * Sidebar Navigation Component for Faculty Dashboard
 */
export const renderFacultySidebar = (currentTab = 'overview') => `
  <aside class="dashboard-sidebar">
    <div class="sidebar-brand">
      <div class="brand-icon" style="background: none; border-radius: 9px; width: 34px; height: 34px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.16); flex-shrink: 0;">
        <svg viewBox="0 0 32 32" width="34" height="34" style="border-radius: 9px; display: block;" aria-hidden="true">
          <defs>
            <linearGradient id="facultyLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#4F46E5"/>
              <stop offset="100%" stop-color="#3730A3"/>
            </linearGradient>
          </defs>
          <rect width="32" height="32" rx="8" fill="url(#facultyLogoGrad)"/>
          <rect x="6" y="6" width="8" height="8" rx="2" fill="none" stroke="#FFFFFF" stroke-width="2"/>
          <rect x="18" y="6" width="8" height="8" rx="2" fill="none" stroke="#FFFFFF" stroke-width="2"/>
          <rect x="6" y="18" width="8" height="8" rx="2" fill="none" stroke="#FFFFFF" stroke-width="2"/>
          <circle cx="22" cy="22" r="3" fill="#10B981"/>
        </svg>
      </div>
      <div>
        <span class="brand-title">Presently</span>
        <span class="admin-badge-tag" style="background: #EEF2FF; color: #4338CA; margin-left: 6px;">Faculty</span>
      </div>
    </div>

    <ul class="sidebar-nav">
      <li class="sidebar-nav-item ${currentTab === 'overview' ? 'active' : ''}">
        <button type="button" data-nav="overview">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          Overview
        </button>
      </li>
      <li class="sidebar-nav-item ${currentTab === 'my-lectures' ? 'active' : ''}">
        <button type="button" data-nav="my-lectures">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          My lectures
        </button>
      </li>
      <li class="sidebar-nav-item ${currentTab === 'students' ? 'active' : ''}">
        <button type="button" data-nav="students">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          Students
        </button>
      </li>
      <li class="sidebar-nav-item ${currentTab === 'qr-sessions' ? 'active' : ''}">
        <button type="button" data-nav="qr-sessions">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          QR sessions
        </button>
      </li>
      <li class="sidebar-nav-item ${currentTab === 'attendance' ? 'active' : ''}">
        <button type="button" data-nav="attendance">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="3" y1="9" x2="21" y2="9"></line>
            <line x1="9" y1="21" x2="9" y2="9"></line>
          </svg>
          Attendance
        </button>
      </li>
      <li class="sidebar-nav-item ${currentTab === 'reports' ? 'active' : ''}">
        <button type="button" data-nav="reports">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
          Reports
        </button>
      </li>
      <li class="sidebar-nav-item ${currentTab === 'settings' ? 'active' : ''}">
        <button type="button" data-nav="settings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          Settings
        </button>
      </li>
    </ul>

    <div style="margin-top: auto; padding: 16px 8px; display: flex; flex-direction: column; gap: 8px;">
      <button type="button" id="btn-faculty-logout" style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #B91C1C; background: none; border: none; padding: 0; cursor: pointer; text-align: left;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
        <span>Log out</span>
      </button>
    </div>
  </aside>
`;
