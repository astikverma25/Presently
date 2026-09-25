import { getLocalDateString } from '../../utils/dateUtils.js';

/**
 * Faculty Attendance Reports View Component
 * Provides Section / Subject filtering, Date Range selection, Matrix Previews,
 * and standard Excel & CSV download capabilities.
 */
export const renderFacultyReportsView = (reportOptions = {}, currentConfig = {}, matrixData = null, isLoading = false) => {
  const sections = reportOptions.sections || [];
  const selectedSectionId = currentConfig.sectionId || '';
  const selectedSubjectId = currentConfig.subjectId || '';
  const startDate = currentConfig.startDate || '';
  const endDate = currentConfig.endDate || '';

  // 1. Find the selected section object to get its available subjects
  const currentSectionObj = sections.find((s) => s.sectionId === selectedSectionId) || null;
  const availableSubjects = currentSectionObj?.subjects || [];

  // 2. Build Section dropdown options (Only sections where faculty has lectures)
  let sectionOptionsHTML = '';
  if (sections.length === 0) {
    sectionOptionsHTML = '<option value="" disabled selected>No assigned classes found</option>';
  } else {
    sectionOptionsHTML = `
      <option value="" disabled ${!selectedSectionId ? 'selected' : ''}>Select Class / Section...</option>
    ` + sections.map((sec) => `
      <option value="${sec.sectionId}" ${sec.sectionId === selectedSectionId ? 'selected' : ''}>
        ${sec.displayName} (${sec.totalStudents || 0} students)
      </option>
    `).join('');
  }

  // 3. Build Subject dropdown options (Only specific subjects taught by this faculty in selected section)
  let subjectOptionsHTML = '';
  if (!selectedSectionId) {
    subjectOptionsHTML = '<option value="" disabled selected>Select Section first...</option>';
  } else if (availableSubjects.length === 0) {
    subjectOptionsHTML = '<option value="" disabled selected>No subjects assigned in this section</option>';
  } else {
    subjectOptionsHTML = availableSubjects.map((sub, idx) => `
      <option value="${sub.subjectId}" ${(sub.subjectId === selectedSubjectId || (!selectedSubjectId && idx === 0)) ? 'selected' : ''}>
        ${sub.displayName}
      </option>
    `).join('');
  }

  const isConfigReady = selectedSectionId && startDate && endDate;
  const hasData = matrixData && matrixData.students && matrixData.students.length > 0;

  // 4. Build Matrix Table Header & Rows
  let tableHeaderHTML = '';
  let tableBodyHTML = '';

  if (hasData) {
    tableHeaderHTML = `
      <tr>
        <th class="matrix-sticky-col col-sno" style="width: 50px;">S.No</th>
        <th class="matrix-sticky-col col-roll" style="width: 140px;">Roll No</th>
        <th class="matrix-sticky-col col-name" style="min-width: 160px;">Student Name</th>
        ${matrixData.activeDates.map((dateStr) => {
          const isConducted = matrixData.conductedDates.includes(dateStr);
          const dateParts = dateStr.split('-');
          const shortDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}` : dateStr;
          return `
            <th class="col-matrix-date ${isConducted ? 'is-conducted-header' : 'is-blank-header'}" title="${dateStr} ${isConducted ? '(Session Conducted)' : '(No Session)'}">
              <div class="matrix-date-title">${shortDate}</div>
              <div class="matrix-date-sub">${isConducted ? 'Active' : '—'}</div>
            </th>
          `;
        }).join('')}
        <th class="col-summary-stat" style="width: 80px;" title="Total Present Classes">Present</th>
        <th class="col-summary-stat" style="width: 80px;" title="Total Conducted Classes">Total</th>
        <th class="col-summary-pct" style="width: 90px;" title="Percentage">% Attended</th>
      </tr>
    `;

    tableBodyHTML = matrixData.students.map((s) => {
      const pctBadgeClass = s.percentage >= 75 ? 'pct-good' : (s.percentage >= 60 ? 'pct-warning' : 'pct-danger');

      const cellsHTML = s.dateCells.map((c) => {
        if (c.display === 'P') {
          return `<td class="cell-matrix-status cell-present"><span class="pill-matrix-p" title="${c.date}: Present">P</span></td>`;
        } else if (c.display === 'A') {
          return `<td class="cell-matrix-status cell-absent"><span class="pill-matrix-a" title="${c.date}: Absent">A</span></td>`;
        } else {
          return `<td class="cell-matrix-status cell-blank" title="${c.date}: No Attendance Taken"><span class="cell-dash">—</span></td>`;
        }
      }).join('');

      return `
        <tr class="matrix-table-row">
          <td class="matrix-sticky-col col-sno">${s.sNo}</td>
          <td class="matrix-sticky-col col-roll"><code>${s.rollNo}</code></td>
          <td class="matrix-sticky-col col-name"><strong>${s.name}</strong></td>
          ${cellsHTML}
          <td class="col-summary-stat"><strong>${s.presentCount}</strong></td>
          <td class="col-summary-stat text-muted">${s.conductedCount}</td>
          <td class="col-summary-pct">
            <span class="matrix-pct-pill ${pctBadgeClass}">${s.percentage}%</span>
          </td>
        </tr>
      `;
    }).join('');
  }

  return `
    <div class="faculty-reports-container">
      <!-- Top Title & Description -->
      <div class="reports-header-row">
        <div>
          <h1 class="reports-main-title">Download Attendance Report</h1>
          <p class="reports-sub-title">Generate institutional student attendance sheets formatted with date-wise P/A markers and export directly to Excel or CSV.</p>
        </div>
      </div>

      <!-- Report Configuration Card -->
      <div class="report-config-card">
        <div class="report-config-grid">
          <!-- 1. Class / Section Select -->
          <div class="report-form-group">
            <label for="report-select-section" class="report-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              Class / Section
            </label>
            <select class="report-select" id="report-select-section">
              ${sectionOptionsHTML}
            </select>
          </div>

          <!-- 2. Subject Select (filtered by section) -->
          <div class="report-form-group">
            <label for="report-select-subject" class="report-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
              Subject
            </label>
            <select class="report-select" id="report-select-subject" ${!selectedSectionId ? 'disabled style="opacity: 0.65; cursor: not-allowed;"' : ''}>
              ${subjectOptionsHTML}
            </select>
          </div>

          <!-- 3. Start Date -->
          <div class="report-form-group">
            <label for="report-date-start" class="report-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              Start Date
            </label>
            <input type="date" class="report-date-input" id="report-date-start" value="${startDate}">
          </div>

          <!-- 4. End Date -->
          <div class="report-form-group">
            <label for="report-date-end" class="report-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              End Date
            </label>
            <input type="date" class="report-date-input" id="report-date-end" value="${endDate}">
          </div>
        </div>

        <!-- Quick Date Range Presets & Action Row -->
        <div class="report-actions-row">
          <div class="report-presets-group">
            <span class="report-preset-label">Quick Range:</span>
            <button type="button" class="btn-preset-pill" data-preset="this_month">This Month</button>
            <button type="button" class="btn-preset-pill" data-preset="last_30_days">Last 30 Days</button>
            <button type="button" class="btn-preset-pill" data-preset="this_week">This Week</button>
          </div>

          <div class="report-download-group">
            <!-- Generate / Refresh Button -->
            <button type="button" class="btn-generate-report" id="btn-generate-report" ${!isConfigReady || isLoading ? 'disabled' : ''}>
              ${isLoading ? `
                <div class="btn-spinner"></div>
                Generating...
              ` : `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <polyline points="1 20 1 14 7 14"></polyline>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
                Generate Preview
              `}
            </button>

            <!-- Excel Download Button -->
            <button type="button" class="btn-download-excel" id="btn-download-excel" ${!hasData || isLoading ? 'disabled' : ''} title="Download standard formatted Excel sheet (.xls)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="8" y1="13" x2="16" y2="13"></line>
                <line x1="8" y1="17" x2="16" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <span>Download Excel (.xls)</span>
            </button>

            <!-- CSV Download Button -->
            <button type="button" class="btn-download-csv" id="btn-download-csv" ${!hasData || isLoading ? 'disabled' : ''} title="Download standard CSV matrix (.csv)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span>Download CSV</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Preview Summary & Table Card -->
      <div class="report-results-card">
        ${isLoading ? `
          <div class="report-loading-state">
            <div class="report-spinner-large"></div>
            <h3>Generating Attendance Matrix...</h3>
            <p>Querying verified student records across the selected date range.</p>
          </div>
        ` : (hasData ? `
          <!-- Summary Banner -->
          <div class="report-summary-banner">
            <div class="summary-metric-item">
              <span class="metric-label">Section</span>
              <strong class="metric-val">${matrixData.sectionInfo}</strong>
            </div>
            <div class="summary-metric-divider"></div>
            <div class="summary-metric-item">
              <span class="metric-label">Subject</span>
              <strong class="metric-val">${matrixData.subjectInfo}</strong>
            </div>
            <div class="summary-metric-divider"></div>
            <div class="summary-metric-item">
              <span class="metric-label">Date Range</span>
              <strong class="metric-val">${startDate} → ${endDate}</strong>
            </div>
            <div class="summary-metric-divider"></div>
            <div class="summary-metric-item">
              <span class="metric-label">Classes Conducted</span>
              <strong class="metric-val">${matrixData.totalConductedClasses} Classes</strong>
            </div>
            <div class="summary-metric-divider"></div>
            <div class="summary-metric-item">
              <span class="metric-label">Enrolled Students</span>
              <strong class="metric-val">${matrixData.totalStudents}</strong>
            </div>
            <div class="summary-metric-divider"></div>
            <div class="summary-metric-item">
              <span class="metric-label">Average Attendance</span>
              <strong class="metric-val metric-green">${matrixData.overallAvgPercentage}%</strong>
            </div>
          </div>

          <!-- Matrix Table Wrapper -->
          <div class="report-table-scroll-wrap">
            <table class="report-matrix-table">
              <thead>
                ${tableHeaderHTML}
              </thead>
              <tbody>
                ${tableBodyHTML}
              </tbody>
            </table>
          </div>

          <!-- Table Legend Footer -->
          <div class="report-table-legend-footer">
            <div class="legend-items">
              <div class="legend-item"><span class="legend-dot dot-p">P</span> Present</div>
              <div class="legend-item"><span class="legend-dot dot-a">A</span> Absent</div>
              <div class="legend-item"><span class="legend-dot dot-blank">—</span> No Lecture / Not Taken (Blank)</div>
            </div>
            <div class="legend-actions">
              <span>Showing ${matrixData.students.length} students</span>
            </div>
          </div>
        ` : `
          <!-- Empty / Initial State -->
          <div class="report-empty-state">
            <div class="report-empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
            </div>
            <h3>${!selectedSectionId ? 'Select a Class / Section to Begin' : 'Ready to Generate Report'}</h3>
            <p>${!selectedSectionId 
              ? 'Choose an assigned class, select your subject, and set a date range above to view and download date-wise attendance sheets.' 
              : 'Click <strong>Generate Preview</strong> or download directly to Excel/CSV.'}</p>
          </div>
        `)}
      </div>
    </div>
  `;
};
