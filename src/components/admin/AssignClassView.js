/**
 * Assign Class Form & Timetable View
 * Matches Docs/Database_Schema_QR_Attendance_System.md (section_subjects & faculty_assignment tables)
 */
export const renderAssignClassView = (assignments = [], subjects = [], sections = [], facultyList = []) => {
  const subjectOptionsHTML = subjects.length > 0
    ? `<option value="" disabled selected>Select Lecture / Subject...</option>` + subjects.map(s => `
        <option value="${s.id}">${s.subject_name || s.subjectName} (${s.subject_code || s.subjectCode})</option>
      `).join('')
    : '<option value="" disabled selected>No subjects available (Add subjects first)</option>';

  const sectionOptionsHTML = sections.length > 0
    ? `<option value="" disabled selected>Select Classroom / Section...</option>` + sections.map(sec => `
        <option value="${sec.id}">${sec.section_name || sec.sectionName} (${sec.branch || 'CSE'} - ${sec.semester || '4th'})</option>
      `).join('')
    : '<option value="" disabled selected>No sections available (Add sections first)</option>';

  const facultyOptionsHTML = facultyList.length > 0
    ? `<option value="" disabled selected>Select Faculty Member...</option>` + facultyList.map(f => `
        <option value="${f.id}">${f.name} - ${f.department || 'General'}</option>
      `).join('')
    : '<option value="" disabled selected>No faculty available (Add faculty first)</option>';

  const tableRowsHTML = assignments.length > 0
    ? assignments.map((a, idx) => {
        const lecId = a.lec_id || `LEC-${(a.id || '').slice(0, 6).toUpperCase()}`;
        const lecDate = a.lec_date || '—';
        const subjectName = a.section_subject?.subject?.subject_name || a.subjectName || '—';
        const subjectCode = a.section_subject?.subject?.subject_code || a.subjectCode || '';
        const sectionName = a.section_subject?.section?.section_name || a.sectionName || '—';
        const facultyName = a.faculty?.name || a.facultyName || '—';
        const day = a.day_of_week || a.dayOfWeek || '—';
        const start = a.start_time || a.startTime || '';
        const end = a.end_time || a.endTime || '';
        const timeDisplay = start && end ? `${start.slice(0, 5)} - ${end.slice(0, 5)}` : (start || '—');
        const room = a.room_no || a.roomNo || '—';
        const status = a.status || 'scheduled';

        return `
          <tr>
            <td>${idx + 1}</td>
            <td>
              <code>${lecId}</code><br>
              <small style="color:var(--text-muted); font-weight:600;">${lecDate}</small>
            </td>
            <td><strong>${subjectName}</strong> <small style="color:var(--text-muted);">(${subjectCode})</small></td>
            <td><span class="badge-tag">Sec ${sectionName}</span></td>
            <td>${facultyName}</td>
            <td><strong>${day}</strong></td>
            <td>${timeDisplay}</td>
            <td><span class="badge-status-active">${room}</span></td>
          </tr>
        `;
      }).join('')
    : `
      <tr>
        <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2.5rem;">
          No classes assigned yet in database. Use the form above to assign a class to faculty.
        </td>
      </tr>
    `;

  return `
    <div class="admin-assignment-view">
      <!-- Create Faculty Assignment Card -->
      <div class="admin-card">
        <div class="admin-card-header">
          <div>
            <h3>Assign Lecture & Timetable to Faculty</h3>
            <p style="color: var(--text-muted); font-size: 0.875rem; margin-top: 4px;">Link Lecture Subject, Classroom Section, Faculty, and Scheduled Timings</p>
          </div>
        </div>

        <form id="form-assign-class">
          <div class="admin-form-grid">
            <div class="admin-form-group">
              <label>Select Lecture / Subject *</label>
              <select name="subjectId" class="admin-select" required>
                ${subjectOptionsHTML}
              </select>
            </div>

            <div class="admin-form-group">
              <label>Select Classroom / Section *</label>
              <select name="sectionId" class="admin-select" required>
                ${sectionOptionsHTML}
              </select>
            </div>

            <div class="admin-form-group">
              <label>Assign Faculty Member *</label>
              <select name="facultyId" class="admin-select" required>
                ${facultyOptionsHTML}
              </select>
            </div>

            <div class="admin-form-group">
              <label>Day of Week *</label>
              <select name="dayOfWeek" class="admin-select" required>
                <option value="" disabled selected>Select Day of Week...</option>
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
                <option value="Saturday">Saturday</option>
              </select>
            </div>

            <div class="admin-form-group">
              <label>Scheduled Date</label>
              <input type="date" name="lecDate" class="admin-input">
            </div>

            <div class="admin-form-group">
              <label>Start Time (HH:MM:SS) *</label>
              <input type="time" name="startTime" class="admin-input" required step="1">
            </div>

            <div class="admin-form-group">
              <label>End Time (HH:MM:SS) *</label>
              <input type="time" name="endTime" class="admin-input" required step="1">
            </div>

            <div class="admin-form-group">
              <label>Classroom / Lab Number *</label>
              <input type="text" name="roomNo" class="admin-input" required placeholder="e.g. Room 214, Lab 3">
            </div>
          </div>

          <button type="submit" class="btn-admin-submit" id="btn-submit-assignment">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Save Lecture Assignment in Database
          </button>
        </form>
      </div>

      <!-- Existing Timetable Assignments Table -->
      <div class="admin-card">
        <div class="admin-card-header">
          <div>
            <h3>Active Lecture Assignments (${assignments.length})</h3>
            <p style="color: var(--text-muted); font-size: 0.875rem; margin-top: 4px;">Live records from Supabase <code>faculty_assignment</code> table</p>
          </div>
        </div>

        <table class="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Lecture ID / Date</th>
              <th>Lecture Name</th>
              <th>Classroom</th>
              <th>Assigned Faculty</th>
              <th>Day</th>
              <th>Timing</th>
              <th>Room</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHTML}
          </tbody>
        </table>
      </div>
    </div>
  `;
};
