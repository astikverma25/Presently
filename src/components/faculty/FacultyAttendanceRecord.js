import { getLocalDateString } from '../../utils/dateUtils.js';

/**
 * Faculty Attendance Record View Component
 * Matches Design_docs/teacher_dashbaord_attendance_view_design.png
 * Dynamic & Live Supabase Connected
 */
export const renderFacultyAttendanceRecord = (records = [], options = {}, assignedLectures = []) => {
  const currentSection = options.section || '';
  const currentDate = options.date || getLocalDateString();
  const currentLectureId = options.lectureId || '';
  const unsavedChangesCount = options.unsavedCount || 0;

  const presentCount = records.filter(r => r.status === 'Present').length;
  const absentCount = records.filter(r => r.status === 'Absent').length;

  // 1. Calculate Day of Week for the selected date
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dateParts = currentDate.split('-').map(Number);
  const parsedDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
  const selectedDayName = !isNaN(parsedDate.getTime()) ? dayNames[parsedDate.getDay()] : '';

  // 2. Filter lectures that are scheduled for this specific date / day
  const dateScheduledLectures = assignedLectures.filter(l => {
    const matchesExactDate = l.lecDate && l.lecDate === currentDate;
    const matchesDayOfWeek = l.dayOfWeek && selectedDayName && l.dayOfWeek.toLowerCase() === selectedDayName.toLowerCase();
    return matchesExactDate || matchesDayOfWeek;
  });

  // 3. Unique sections scheduled on this date
  const uniqueSections = [...new Set(dateScheduledLectures.map(l => l.section).filter(Boolean))];

  let sectionOptionsHTML = '';
  if (uniqueSections.length === 0) {
    sectionOptionsHTML = `<option value="" disabled selected>No classes scheduled for ${selectedDayName || 'this date'}</option>`;
  } else {
    sectionOptionsHTML = `
      <option value="" disabled ${!currentSection ? 'selected' : ''}>Select Section...</option>
    ` + uniqueSections.map(sec => {
      const isSel = currentSection.toLowerCase() === sec.toLowerCase();
      return `<option value="${sec}" ${isSel ? 'selected' : ''}>Section ${sec}</option>`;
    }).join('');
  }

  // 4. Filter assigned lectures for the selected section on this date
  const sectionLectures = dateScheduledLectures.filter(l => 
    currentSection && (l.section || '').toLowerCase() === currentSection.toLowerCase()
  );

  let lectureOptionsHTML = '';
  if (!currentSection) {
    lectureOptionsHTML = `<option value="" disabled selected>Select Section first...</option>`;
  } else if (sectionLectures.length === 0) {
    lectureOptionsHTML = `<option value="" disabled selected>No ${selectedDayName} lectures for Sec ${currentSection}</option>`;
  } else {
    lectureOptionsHTML = `
      <option value="" disabled ${!currentLectureId ? 'selected' : ''}>Select Lecture (${selectedDayName})...</option>
    ` + sectionLectures.map(l => {
      const isSel = currentLectureId === l.id;
      const title = `${l.className || 'Lecture'} (${l.time || 'Period'})`;
      return `<option value="${l.id}" ${isSel ? 'selected' : ''}>${title}</option>`;
    }).join('');
  }

  // Active lecture metadata
  const selectedLectureObj = sectionLectures.find(l => l.id === currentLectureId) || (sectionLectures.length === 1 ? sectionLectures[0] : null);

  let rowsHTML = '';
  if (!currentSection) {
    rowsHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 48px 24px;">
          <div class="table-empty-container">
            <div class="table-empty-icon" style="background: #EEF2FF; color: #4338CA;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
            </div>
            <h4>No Section Selected</h4>
            <p>Please select a classroom or section from the dropdown above to view attendance records.</p>
          </div>
        </td>
      </tr>
    `;
  } else if (!currentLectureId && sectionLectures.length > 1) {
    rowsHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 48px 24px;">
          <div class="table-empty-container">
            <div class="table-empty-icon" style="background: #EEF2FF; color: #4338CA;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <h4>Multiple Lectures Found for Section ${currentSection}</h4>
            <p>Please select a specific <strong>Lecture / Time Slot</strong> from the dropdown above to view and mark attendance.</p>
          </div>
        </td>
      </tr>
    `;
  } else if (records.length > 0) {
    rowsHTML = records.map(r => `
      <tr class="attendance-table-row" data-sno="${r.sNo}">
        <td class="col-sno">${r.sNo}</td>
        <td class="col-roll"><code>${r.rollNo}</code></td>
        <td class="col-name"><strong>${r.studentName}</strong></td>
        <td class="col-time">${r.markedAt}</td>
        <td class="col-status">
          <button type="button" class="btn-status-pill ${r.status.toLowerCase()}" data-status="${r.status}" data-sno="${r.sNo}">
            ${r.status}
          </button>
        </td>
      </tr>
    `).join('');
  } else {
    rowsHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 48px 24px;">
          <div class="table-empty-container">
            <div class="table-empty-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <h4>No Attendance Records Found</h4>
            <p>No attendance logs exist for <strong>Section ${currentSection}</strong> on <strong>${currentDate}</strong>.<br>Start a QR attendance session or select another date to view logs.</p>
          </div>
        </td>
      </tr>
    `;
  }

  return `
    <div class="attendance-record-view-container">
      <!-- Consolidated Single-Line Header: Title + Filters + Actions -->
      <div class="attendance-single-line-header">
        <div class="attendance-header-left">
          <h1 class="attendance-title-inline">Attendance Record</h1>
        </div>

        <div class="attendance-header-controls">
          <!-- 1. Date Filter (First option) -->
          <div class="filter-item-inline">
            <span class="filter-inline-label">Date</span>
            <div class="date-input-wrapper">
              <input type="date" class="config-date-input" id="input-att-date" value="${currentDate}">
            </div>
          </div>

          <!-- 2. Section Dropdown (Second option) -->
          <div class="filter-item-inline">
            <span class="filter-inline-label">Section</span>
            <select class="config-select" id="select-att-section">
              ${sectionOptionsHTML}
            </select>
          </div>

          <!-- 3. Lecture / Subject Dropdown (Third option, filtered by section) -->
          <div class="filter-item-inline">
            <span class="filter-inline-label">Lecture</span>
            <select class="config-select" id="select-att-lecture" ${!currentSection ? 'disabled style="opacity: 0.65; cursor: not-allowed;"' : ''}>
              ${lectureOptionsHTML}
            </select>
          </div>

          <div class="unsaved-status-indicator ${unsavedChangesCount > 0 ? 'has-unsaved' : ''}" id="unsaved-indicator">
            ${unsavedChangesCount} unsaved
          </div>

          <button type="button" class="btn-action-outline" id="btn-export-attendance" ${!currentSection || records.length === 0 ? 'disabled style="opacity:0.6; cursor:not-allowed;"' : ''}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Export CSV
          </button>

          <button type="button" class="btn-action-save ${unsavedChangesCount > 0 ? 'active' : 'disabled'}" id="btn-save-attendance" ${unsavedChangesCount === 0 || !currentSection ? 'disabled' : ''}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <line x1="7" y1="3" x2="7" y2="8" stroke-width="2.2"></line>
              <line x1="15" y1="3" x2="15" y2="8" stroke-width="2.2"></line>
            </svg>
            Save changes
          </button>
        </div>
      </div>

      <!-- Attendance Table Card -->
      <div class="attendance-table-card">
        <div class="attendance-table-body-wrapper">
          <table class="attendance-table">
            <thead>
              <tr>
                <th style="width: 70px;">S.No</th>
                <th style="width: 150px;">Roll no</th>
                <th>Student name</th>
                <th style="width: 140px;">Marked at</th>
                <th style="width: 130px;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHTML}
            </tbody>
          </table>
        </div>

        <!-- Table Footer Summary (Fixed & Always Visible at Bottom of Card) -->
        <div class="attendance-table-footer">
          <div class="footer-left-count">
            ${currentSection 
              ? `Showing ${records.length} students in Section ${currentSection} ${selectedLectureObj ? `• ${selectedLectureObj.className} (${selectedLectureObj.time})` : ''}` 
              : 'Please select a section and lecture above'}
          </div>

          <div class="footer-right-badges">
            <span class="badge-count-present">${presentCount} present</span>
            <span class="badge-count-absent">${absentCount} absent</span>
          </div>
        </div>
      </div>
    </div>
  `;
};
