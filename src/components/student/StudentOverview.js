import { getIndianDateString } from '../../utils/dateUtils.js';

/**
 * Student Overview Screen Component
 * Prominent Attendance Gauge & Main "Scan QR" CTA Button
 */
export const renderStudentOverview = (profile, currentLecture, historyList = []) => {
  const pct = profile?.attendancePercentage !== undefined ? profile.attendancePercentage : 100;
  const isEligible = pct >= 75;
  const isLive = currentLecture?.isLive;

  // Filter ONLY today's attendance records in Indian Standard Time
  const todayStr = getIndianDateString();
  const todayRecords = (historyList || []).filter(item => {
    if (item.rawDate && item.rawDate === todayStr) return true;
    if (item.date && (item.date.includes('Today') || item.date === todayStr)) return true;
    return false;
  });

  const recentItemsHTML = todayRecords.map(item => {
    const lecId = item.lecId || item.lec_id || '';
    return `
    <div class="history-item-card" style="margin-bottom: 8px;">
      <div class="history-left-info">
        <h4>${item.subjectName}</h4>
        <p>Today • ${item.time !== '—' ? item.time : 'Scanned'}</p>
      </div>
      <div class="history-right-info">
        ${lecId ? `<span class="history-lec-id">${lecId}</span>` : ''}
        <span class="history-status-badge ${item.status}">
          ${item.status === 'present' ? '● Present' : 'Absent'}
        </span>
      </div>
    </div>
  `;}).join('');

  // Format faculty name directly with 'Prof.' prefix (without 'Faculty:' label)
  let facultyDisplay = '';
  if (currentLecture?.facultyName && currentLecture.facultyName !== '—' && currentLecture.facultyName.trim() !== '') {
    const rawName = currentLecture.facultyName.trim().replace(/^Faculty:\s*/i, '');
    const cleanName = rawName.startsWith('Prof.') ? rawName : `Prof. ${rawName}`;
    facultyDisplay = `• ${cleanName}`;
  }

  return `
    <!-- 1. Overall Attendance Card -->
    <div class="student-stat-card">
      <div class="stat-left">
        <h3>Overall Attendance</h3>
        <div class="percent-big" style="color: ${isEligible ? '#FFFFFF' : '#FECDD3'};">${pct}%</div>
        <p style="color: ${isEligible ? '#6EE7B7' : '#FCA5A5'}; font-weight: 600;">
          ${isEligible ? 'Eligible for examinations (≥ 75%)' : 'Attendance below required 75% threshold'}
        </p>
      </div>
      <div class="stat-progress-dial">
        <span>${profile?.attendedClasses || 0}/${profile?.totalClasses || 0}</span>
      </div>
    </div>

    <!-- 2. Active Session Card -->
    <div class="active-lecture-card">
      <div class="lecture-header-row">
        <span class="${isLive ? 'lecture-status-live' : 'badge-standby'}" style="${!isLive ? 'background: #F1F5F9; color: #64748B; font-weight: 600; padding: 4px 10px; border-radius: 999px;' : ''}">
          ${currentLecture?.badgeText || (isLive ? 'Live Session Active' : 'Class Standby')}
        </span>
        <span style="font-size: 0.8rem; color: #4338CA; font-weight: 700;">${currentLecture?.roomNo || ''}</span>
      </div>

      <h4>${currentLecture?.subjectName || 'No Class Scheduled'}</h4>
      <p>${currentLecture?.timeWindow || ''} ${facultyDisplay}</p>

      <button type="button" class="btn-scan-main" id="btn-open-scanner">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <rect x="3" y="3" width="7" height="7" rx="1"></rect>
          <rect x="14" y="3" width="7" height="7" rx="1"></rect>
          <rect x="14" y="14" width="7" height="7" rx="1"></rect>
          <rect x="3" y="14" width="7" height="7" rx="1"></rect>
        </svg>
        Scan Classroom QR
      </button>
    </div>

    <!-- 3. Today's Attendance Activity -->
    <div style="margin-top: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h4 style="font-size: 0.95rem; font-weight: 700; color: #0F172A;">Today's Attendance</h4>
        <span style="font-size: 0.8rem; color: #6366F1; font-weight: 600;">${todayRecords.length} Recorded Today</span>
      </div>
      ${todayRecords.length > 0 ? recentItemsHTML : `
        <div style="background: #FFFFFF; border: 1px dashed var(--student-border); border-radius: 16px; padding: 20px; text-align: center; color: #64748B; font-size: 0.85rem;">
          No attendance records marked yet today. Scan the live QR above to mark your presence!
        </div>
      `}
    </div>
  `;
};

