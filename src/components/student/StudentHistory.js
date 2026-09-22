/**
 * Student Attendance History Screen Component
 * Shows personal chronological records matching Docs/Database_Schema_QR_Attendance_System.md
 */
export const renderStudentHistory = (historyList = []) => {
  const itemsHTML = historyList.map(item => `
    <div class="history-item-card">
      <div class="history-left-info">
        <h4>${item.subjectName}</h4>
        <p>${item.date} • ${item.time !== '—' ? item.time : 'No Scan Record'}</p>
      </div>
      <span class="history-status-badge ${item.status}">
        ${item.status === 'present' ? '● Present' : 'Absent'}
      </span>
    </div>
  `).join('');

  return `
    <div class="history-container">
      <div class="history-card-header">
        <h3>Attendance History</h3>
        <span style="font-size: 0.8rem; color: #64748B; font-weight: 600;">${historyList.length} Sessions</span>
      </div>

      <div style="display: flex; flex-direction: column; gap: 10px;">
        ${itemsHTML}
      </div>
    </div>
  `;
};
