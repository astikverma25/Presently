/**
 * Mobile Bottom Tab Bar Component for Student Dashboard
 */
export const renderStudentBottomNav = (currentTab = 'overview') => `
  <nav class="student-bottom-nav">
    <button type="button" class="bottom-nav-item ${currentTab === 'overview' ? 'active' : ''}" data-tab="overview">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
      </svg>
      Overview
    </button>

    <button type="button" class="bottom-nav-item ${currentTab === 'history' ? 'active' : ''}" data-tab="history">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>
      History
    </button>
  </nav>
`;
