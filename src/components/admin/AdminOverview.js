/**
 * Admin Overview Placeholder View
 * (Kept minimal as requested: "keep tab now limited in overview currently don't show anything later wil will tyhen add")
 */
export const renderAdminOverview = () => `
  <div class="overview-empty-card">
    <div style="width: 54px; height: 54px; border-radius: 50%; background: #EEF2FF; color: #4338CA; display: flex; align-items: center; justify-content: center; margin: 0 auto 18px auto;">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="7" height="7"></rect>
        <rect x="14" y="3" width="7" height="7"></rect>
        <rect x="14" y="14" width="7" height="7"></rect>
        <rect x="3" y="14" width="7" height="7"></rect>
      </svg>
    </div>
    <h2>Admin Overview</h2>
    <p>Administrative analytics and institutional metrics will be configured here. Use the sidebar tabs to manage Students, Faculty, Lectures, Classrooms, and Timetable Assignments.</p>
  </div>
`;
