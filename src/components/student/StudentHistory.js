import { getLocalDateString } from '../../utils/dateUtils.js';

/**
 * Student Attendance History Screen Component
 * Shows personal chronological records matching Docs/Database_Schema_QR_Attendance_System.md
 * Supports date pill filtering (default: today)
 */
export const renderStudentHistory = (historyList = [], selectedDate = getLocalDateString()) => {
  // Filter by selectedDate if provided, or show all if empty
  const filteredList = selectedDate 
    ? historyList.filter(item => item.rawDate === selectedDate)
    : historyList;

  let contentHTML = '';

  if (filteredList.length === 0) {
    contentHTML = `
      <div class="history-empty-card">
        <div class="history-empty-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </div>
        <h4>No Sessions ${selectedDate ? `for ${selectedDate}` : ''}</h4>
        <p>No attendance scans were recorded on this date.</p>
        ${selectedDate ? `<button type="button" class="btn-history-view-all" id="btn-history-view-all">View All History</button>` : ''}
      </div>
    `;
  } else {
    contentHTML = `
      <div style="display: flex; flex-direction: column; gap: 10px;">
        ${filteredList.map(item => {
          const lecId = item.lecId || item.lec_id || '';
          const lecDate = item.lecDate || item.date || item.rawDate || '';
          
          // Format scan time only for right side
          const hasScanTime = item.time && item.time !== '—';
          const scanTimeDisplay = hasScanTime 
            ? item.time 
            : (item.status === 'present' ? 'Scanned' : 'No Scan Record');

          return `
          <div class="history-item-card">
            <div class="history-left-info">
              <h4>${item.subjectName}</h4>
              <div class="history-lec-meta-col">
                ${lecId ? `<span class="history-lec-id-inline">${lecId}</span>` : ''}
                <span class="history-lec-date-sub">${lecDate}</span>
              </div>
            </div>
            <div class="history-right-info">
              <span class="history-status-badge ${item.status}">
                ${item.status === 'present' ? '● Present' : 'Absent'}
              </span>
              <span class="history-scan-subtext">${scanTimeDisplay}</span>
            </div>
          </div>
        `;}).join('')}
      </div>
    `;
  }

  return `
    <div class="history-container">
      <div class="history-card-header">
        <div class="history-header-left">
          <h3>Attendance History</h3>
        </div>

        <div class="history-header-right">
          <!-- Small Date Select Pill (Default: Today) -->
          <div class="history-date-pill" title="Select date to filter history">
            <svg class="history-date-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <input type="date" class="history-date-input" id="input-history-date" value="${selectedDate || ''}">
          </div>

          <!-- All Dates Toggle Pill -->
          <button type="button" class="history-all-toggle-btn ${!selectedDate ? 'active' : ''}" id="btn-toggle-all-history" title="${!selectedDate ? 'Showing all dates' : 'Show all dates'}">
            All
          </button>

          <span class="history-sessions-count">${filteredList.length} Sessions</span>
        </div>
      </div>

      ${contentHTML}
    </div>
  `;
};

