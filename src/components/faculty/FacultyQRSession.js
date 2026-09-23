import { renderStudentStreamItem } from './StudentStreamItem.js';
import { getLocalDateString } from '../../utils/dateUtils.js';

/**
 * QR Session View Component
 * Supports realistic Standby (Idle) and Live Active states
 */
export const renderFacultyQRSession = (activeLecture = {}, studentList = [], assignedLectures = [], isSessionActive = false, currentQrDataUrl = '', sessionDate = '') => {
  const markedStudents = (studentList || []).filter(s => s.status === 'marked').length;
  const totalStudents = activeLecture?.studentsCount || (studentList || []).length || 0;
  const currentDate = sessionDate || getLocalDateString();

  // 1. Calculate Day of Week for the selected date
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dateParts = currentDate.split('-').map(Number);
  const parsedDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
  const selectedDayName = !isNaN(parsedDate.getTime()) ? dayNames[parsedDate.getDay()] : '';

  // 2. Filter assigned lectures strictly for the selected date
  const dateLectures = (assignedLectures || []).filter(l => {
    return l.lecDate === currentDate || l.rawLecDate === currentDate;
  });

  // 3. Unique Sections from assigned lectures on this selected date
  const dateSections = [...new Set(dateLectures.map(l => l.section).filter(Boolean))];

  const currentSection = activeLecture?.section || '';
  const currentLectureId = activeLecture?.id || '';

  let sectionOptionsHTML = '';
  if (dateSections.length === 0) {
    sectionOptionsHTML = `<option value="" disabled selected>No classes on ${currentDate}</option>`;
  } else {
    sectionOptionsHTML = `
      <option value="" disabled ${!currentSection || !dateSections.some(s => (s || '').toLowerCase() === currentSection.toLowerCase()) ? 'selected' : ''}>Select Section...</option>
    ` + dateSections.map(sec => {
      const isSel = currentSection && currentSection.toLowerCase() === sec.toLowerCase();
      return `<option value="${sec}" ${isSel ? 'selected' : ''}>Section ${sec}</option>`;
    }).join('');
  }

  // 4. Filter assigned lectures for the selected section ON the selected date
  const sectionDateLectures = currentSection 
    ? dateLectures.filter(l => (l.section || '').toLowerCase() === currentSection.toLowerCase())
    : [];

  let lectureOptionsHTML = '';
  if (!currentSection) {
    lectureOptionsHTML = `<option value="" disabled selected>Select Section first...</option>`;
  } else if (sectionDateLectures.length === 0) {
    lectureOptionsHTML = `<option value="" disabled selected>No lectures for Sec ${currentSection} on ${currentDate}</option>`;
  } else {
    lectureOptionsHTML = `
      <option value="" disabled ${!currentLectureId ? 'selected' : ''}>Select Lecture...</option>
    ` + sectionDateLectures.map(l => {
      const isSel = currentLectureId === l.id;
      const title = `${l.className || 'Lecture'} • ${l.time || 'Period'} (${selectedDayName || l.dayOfWeek || ''})`;
      return `<option value="${l.id}" ${isSel ? 'selected' : ''}>${title}</option>`;
    }).join('');
  }

  const isConfigured = Boolean(currentSection && currentLectureId && activeLecture?.className);

  const studentsHTML = studentList.length > 0
    ? studentList.map(renderStudentStreamItem).join('')
    : `
      <div class="stream-empty-box">
        <div class="stream-empty-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        </div>
        <h4>Waiting for check-ins...</h4>
        <p>Students scanning the dynamic QR code will appear here instantly.</p>
      </div>
    `;

  return `
    <div class="qr-session-view-container">
      <!-- Consolidated Single-Line Header: Title & All Controls -->
      <div class="qr-single-line-header">
        <div class="qr-header-left">
          <h1 class="qr-title-inline">
            QR Session
            ${isSessionActive 
              ? '<span class="badge-live-pulse" style="font-size: 0.72rem; padding: 2px 8px; margin-left: 8px;">LIVE</span>' 
              : '<span class="badge-standby" style="font-size: 0.72rem; padding: 2px 8px; margin-left: 8px;">STANDBY</span>'
            }
          </h1>
        </div>

        <div class="qr-header-controls">
          <!-- 1. Date (Default Today) -->
          <div class="filter-item-inline">
            <span class="filter-inline-label">Date</span>
            <div class="date-input-wrapper">
              <input type="date" class="config-date-input" id="input-qr-date" value="${currentDate}" ${isSessionActive ? 'disabled style="opacity: 0.75;"' : ''}>
            </div>
          </div>

          <!-- 2. Section Dropdown -->
          <div class="filter-item-inline">
            <span class="filter-inline-label">Section</span>
            <select class="config-select" id="select-qr-section" ${isSessionActive ? 'disabled style="opacity: 0.75;"' : ''}>
              ${sectionOptionsHTML}
            </select>
          </div>

          <!-- 3. Lecture Dropdown (Filtered by Section) -->
          <div class="filter-item-inline">
            <span class="filter-inline-label">Lecture</span>
            <select class="config-select" id="select-qr-lecture" ${isSessionActive || !currentSection ? 'disabled style="opacity: 0.75;"' : ''}>
              ${lectureOptionsHTML}
            </select>
          </div>

          <!-- 4. Expiry Input -->
          <div class="filter-item-inline">
            <span class="filter-inline-label">Expiry</span>
            <input type="number" class="config-input" id="input-expiry" value="${activeLecture?.expirySeconds || 15}" min="10" max="60" style="width: 58px; min-width: 58px; padding: 5px 8px; font-size: 0.80rem; border-radius: 8px; border: 1px solid var(--dash-border); text-align: center;" ${isSessionActive ? 'disabled style="opacity: 0.75;"' : ''}>
          </div>

          ${isSessionActive 
            ? `
              <button type="button" class="btn-end-qr-header" id="btn-end-live-session">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"></rect></svg>
                End Session
              </button>
            `
            : `
              <button type="button" class="btn-start-qr-stream" id="btn-start-live-session" ${!isConfigured ? 'disabled style="opacity: 0.6; cursor: not-allowed;"' : ''}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                Start Session
              </button>
            `
          }
        </div>
      </div>

      <!-- 2-Column Live Session Layout -->
      <div class="qr-live-workspace-grid">
        <!-- Left: QR Display Card -->
        <div class="qr-live-display-card">
          <div class="qr-live-card-header">
            <h3>${isConfigured ? `${activeLecture.className} - Sec ${activeLecture.section}` : 'Launch Live QR Attendance'}</h3>
            ${isSessionActive 
              ? '<span class="badge-live-pulse">Live</span>' 
              : (isConfigured ? '<span class="badge-standby">Ready to Launch</span>' : '<span class="badge-standby" style="opacity:0.6;">Awaiting Selection</span>')
            }
          </div>

          <!-- Projector QR Frame -->
          ${isSessionActive ? `
            <div class="qr-projector-frame" id="dynamic-qr-box">
              ${currentQrDataUrl ? `
                <img id="qr-img-canvas" src="${currentQrDataUrl}" alt="Dynamic QR Code" style="width: 100%; height: 100%; object-fit: contain; border-radius: 12px;" />
              ` : `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #64748B; font-size: 0.88rem;">Generating QR...</div>
              `}
            </div>

            <!-- Progress Countdown Bar -->
            <div class="qr-refresh-indicator">
              <div class="qr-refresh-track">
                <div class="qr-refresh-bar" id="qr-progress-bar" style="width: 100%;"></div>
              </div>
              <span class="qr-refresh-text" id="qr-refresh-label">Refreshes in ${activeLecture?.expirySeconds || 15}s</span>
            </div>

            <p class="qr-meta-text">${activeLecture?.room || 'Room 201'} • ${activeLecture?.time || ''} • Session Active</p>
            <button type="button" class="btn-end-qr-session" id="btn-end-live-session-card">End & Submit Session</button>
          ` : `
            <div class="qr-standby-frame">
              <div class="qr-standby-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4338CA" stroke-width="1.8">
                  <rect x="3" y="3" width="7" height="7" rx="1.5"></rect>
                  <rect x="14" y="3" width="7" height="7" rx="1.5"></rect>
                  <rect x="14" y="14" width="7" height="7" rx="1.5"></rect>
                  <rect x="3" y="14" width="7" height="7" rx="1.5"></rect>
                  <circle cx="7" cy="7" r="1.5" fill="#4338CA"></circle>
                  <circle cx="17.5" cy="7" r="1.5" fill="#4338CA"></circle>
                  <circle cx="17.5" cy="17.5" r="1.5" fill="#4338CA"></circle>
                  <circle cx="7" cy="17.5" r="1.5" fill="#4338CA"></circle>
                </svg>
              </div>
              <h4>${isConfigured ? 'Session Ready' : 'Session Inactive'}</h4>
              <p>${isConfigured ? `Ready to launch rolling anti-proxy QR code for ${activeLecture.className} (Sec ${activeLecture.section}).` : 'Please select Date, Section, and Lecture above to launch the live QR session.'}</p>
            </div>

            <p class="qr-meta-text">${isConfigured ? `${activeLecture.room || 'Room 201'} • ${activeLecture.time || ''} • Standby Mode` : 'Standby Mode'}</p>
            <button type="button" class="btn-start-qr-stream" id="btn-start-live-session-card" style="padding: 10px 24px;" ${!isConfigured ? 'disabled style="opacity: 0.6; cursor: not-allowed;"' : ''}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              Launch Live Attendance
            </button>
          `}
        </div>

        <!-- Right: Real-time Student Attendance Stream -->
        <div class="qr-students-stream-card">
          <div class="stream-card-header">
            <h3>Live Roster Check-ins</h3>
            <span class="stream-counter-badge" style="${markedStudents === 0 ? 'color: #94A3B8;' : ''}">
              <span id="marked-count">${markedStudents}</span> / ${totalStudents}
            </span>
          </div>

          <div class="stream-list">
            ${studentsHTML}
          </div>
        </div>
      </div>
    </div>
  `;
};
