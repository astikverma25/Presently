/**
 * Mobile Top Bar Component for Student Portal
 */
export const renderStudentHeader = (profile) => `
  <header class="student-topbar">
    <div class="student-brand-badge">
      <span class="student-brand-logo">Presently</span>
      <span class="student-portal-tag">Student</span>
    </div>

    <div class="student-profile-pill">
      <div class="student-name-roll" style="text-align: right;">
        <span class="student-name-text">${profile?.name || 'Student'}</span>
        <span class="student-roll-text">Roll ${profile?.rollNumber || profile?.rollNo || '—'}</span>
      </div>
      <div class="student-avatar-circle">
        ${profile?.name ? profile.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'ST'}
      </div>
      <button type="button" id="btn-student-logout" style="background: none; border: none; color: #94A3B8; cursor: pointer; padding: 4px; display: flex; align-items: center;" title="Log out">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
      </button>
    </div>
  </header>
`;
