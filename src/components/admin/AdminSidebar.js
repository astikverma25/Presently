/**
 * Sidebar Navigation Component for Admin Panel
 */
export const renderAdminSidebar = (currentTab = 'add-student') => `
  <aside class="admin-sidebar">
    <div class="admin-sidebar-brand">
      <div class="admin-brand-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
      </div>
      <div>
        <span class="admin-brand-title">Presently</span>
        <span class="admin-badge-tag">Admin</span>
      </div>
    </div>

    <ul class="admin-nav">
      <li class="admin-nav-item ${currentTab === 'overview' ? 'active' : ''}">
        <button type="button" data-tab="overview">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          Overview
        </button>
      </li>

      <li class="admin-nav-item ${currentTab === 'add-student' ? 'active' : ''}">
        <button type="button" data-tab="add-student">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="8.5" cy="7" r="4"></circle>
            <line x1="20" y1="8" x2="20" y2="14"></line>
            <line x1="23" y1="11" x2="17" y2="11"></line>
          </svg>
          Add Student
        </button>
      </li>

      <li class="admin-nav-item ${currentTab === 'add-faculty' ? 'active' : ''}">
        <button type="button" data-tab="add-faculty">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          Add Faculty
        </button>
      </li>

      <li class="admin-nav-item ${currentTab === 'add-class' ? 'active' : ''}">
        <button type="button" data-tab="add-class">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
          Add Lecture
        </button>
      </li>

      <li class="admin-nav-item ${currentTab === 'add-section' ? 'active' : ''}">
        <button type="button" data-tab="add-section">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="3" y1="9" x2="21" y2="9"></line>
            <line x1="9" y1="21" x2="9" y2="9"></line>
          </svg>
          Create Classroom
        </button>
      </li>

      <li class="admin-nav-item ${currentTab === 'assign-class' ? 'active' : ''}">
        <button type="button" data-tab="assign-class">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          Assign Lecture
        </button>
      </li>
    </ul>

    <div style="margin-top: auto; padding: 16px 8px; display: flex; flex-direction: column; gap: 8px;">
      <button type="button" id="btn-admin-logout" style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #B91C1C; background: none; border: none; padding: 0; cursor: pointer; text-align: left;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
        <span>Log out</span>
      </button>
    </div>
  </aside>
`;
