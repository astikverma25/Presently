import { getLocalDateString } from '../../utils/dateUtils.js';

/**
 * Weekly Multi-Slot Lecture Assignment View with Inline & Modal Editing
 */
export const renderAssignClassView = (assignments = [], subjects = [], sections = [], facultyList = []) => {
  const sectionOptionsHTML = sections.length > 0
    ? `<option value="" disabled selected>Select Classroom / Section...</option>` + sections.map(sec => `
        <option value="${sec.id}">${sec.section_name || sec.sectionName} (${sec.branch || 'CSE'} - ${sec.semester || '4th'})</option>
      `).join('')
    : '<option value="" disabled selected>No sections available (Add sections first)</option>';

  const facultyOptionsHTML = facultyList.length > 0
    ? `<option value="" disabled selected>Select Faculty Member...</option>` + facultyList.map(f => `
        <option value="${f.id}">${f.name} • ${f.department || 'General'}</option>
      `).join('')
    : '<option value="" disabled selected>No faculty available (Add faculty first)</option>';

  const subjectOptionsHTML = subjects.length > 0
    ? `<option value="" disabled selected>Select Lecture / Subject...</option>` + subjects.map(s => `
        <option value="${s.id}">${s.subject_name || s.subjectName} (${s.subject_code || s.subjectCode})</option>
      `).join('')
    : '<option value="" disabled selected>No subjects available (Add subjects first)</option>';

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

        return `
          <tr data-assignment-id="${a.id}">
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
            <td>
              <div style="display: flex; gap: 6px; align-items: center;">
                <button type="button" class="btn-edit-assignment" data-id="${a.id}" style="padding: 6px 10px; font-size: 0.78rem; font-weight: 700; border-radius: 8px; background: #EEF2FF; color: #4338CA; border: 1px solid #C7D2FE; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" title="Edit Assignment">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  <span>Edit</span>
                </button>
                <button type="button" class="btn-delete-assignment" data-id="${a.id}" style="padding: 6px 8px; font-size: 0.78rem; font-weight: 700; border-radius: 8px; background: #FFF1F2; color: #E11D48; border: 1px solid #FECDD3; cursor: pointer; display: inline-flex; align-items: center;" title="Delete Assignment">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('')
    : `
      <tr>
        <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 2.5rem;">
          No classes assigned yet. Use the form above to assign lecture sessions for a class & faculty.
        </td>
      </tr>
    `;

  return `
    <div class="admin-assignment-view">
      <!-- Create Faculty Assignment Card -->
      <div class="admin-card" style="margin-bottom: 24px;">
        <div class="admin-card-header" style="border-bottom: 1px solid #F1F5F9; padding-bottom: 16px; margin-bottom: 20px;">
          <div>
            <h3 style="font-size: 1.25rem; font-weight: 800; color: #0F172A;">Assign Lecture Schedule</h3>
            <p style="color: #64748B; font-size: 0.875rem; margin-top: 4px;">Link Classroom, Faculty, and Subject, then configure multiple date and time slots</p>
          </div>
        </div>

        <form id="form-assign-class">
          <!-- Section 1: Academic Association -->
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; margin-bottom: 22px;">
            <div style="font-size: 0.82rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #4338CA; margin-bottom: 14px;">
              1. Academic Details (Classroom, Faculty & Subject)
            </div>
            
            <div class="admin-form-grid">
              <div class="admin-form-group">
                <label>Select Classroom / Section *</label>
                <select name="sectionId" id="assign-section-select" class="admin-select" required>
                  ${sectionOptionsHTML}
                </select>
              </div>

              <div class="admin-form-group">
                <label>Assigned Faculty Member *</label>
                <select name="facultyId" id="assign-faculty-select" class="admin-select" required>
                  ${facultyOptionsHTML}
                </select>
              </div>

              <div class="admin-form-group full-width">
                <label>Lecture / Subject *</label>
                <select name="subjectId" id="assign-subject-select" class="admin-select" required>
                  ${subjectOptionsHTML}
                </select>
              </div>
            </div>
          </div>

          <!-- Section 2: Multi-Slot Timetable Builder -->
          <div style="margin-bottom: 22px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 12px;">
              <div>
                <div style="font-size: 0.82rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #4338CA;">
                  2. Scheduled Lecture Slots (Dates & Custom Timings)
                </div>
                <p style="font-size: 0.82rem; color: #64748B; margin-top: 2px;">Add multiple dates with different start and end times (e.g. double lectures or weekly schedule)</p>
              </div>

              <!-- Quick Presets -->
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button type="button" id="btn-preset-weekdays" class="btn btn-outline-pill" style="padding: 6px 12px; font-size: 0.78rem; font-weight: 700; height: auto;">
                  ⚡ Fill Mon-Fri (10-11 AM)
                </button>
                <button type="button" id="btn-clear-slots" style="padding: 6px 12px; font-size: 0.78rem; font-weight: 700; border-radius: 9999px; background: #FFF1F2; color: #E11D48; border: 1px solid #FECDD3; cursor: pointer;">
                  Reset Slots
                </button>
              </div>
            </div>

            <!-- Dynamic Slot Rows Container -->
            <div id="lecture-slots-container" style="display: flex; flex-direction: column; gap: 12px;">
              <!-- Slot rows injected via JS -->
            </div>

            <!-- Add Slot Action Row -->
            <div style="display: flex; align-items: center; margin-top: 14px; padding-top: 10px;">
              <button type="button" id="btn-add-slot" class="btn btn-outline-pill" style="padding: 10px 18px; font-size: 0.88rem; font-weight: 700; border-color: #4338CA; color: #4338CA; background: #EEF2FF;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                + Add Another Lecture Slot
              </button>
            </div>
          </div>

          <!-- Submit Button -->
          <div style="border-top: 1px solid #F1F5F9; padding-top: 18px; display: flex; align-items: center;">
            <button type="submit" class="btn-admin-submit" id="btn-submit-assignment" style="padding: 13px 32px; font-size: 0.95rem; font-weight: 700;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
              <span id="btn-submit-assignment-text">Save Lecture Assignments in Database</span>
            </button>
          </div>
        </form>
      </div>

      <!-- Existing Timetable Assignments Table -->
      <div class="admin-card">
        <div class="admin-card-header">
          <div>
            <h3>Active Lecture Assignments (${assignments.length})</h3>
            <p style="color: var(--text-muted); font-size: 0.875rem; margin-top: 4px;">Current faculty course and lecture allocations</p>
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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHTML}
          </tbody>
        </table>
      </div>

      <!-- Edit Assignment Modal -->
      <div id="modal-edit-assignment" class="modal-overlay" style="display: none;">
        <div class="modal-content" style="max-width: 540px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <div>
              <h3 style="font-size: 1.3rem; color: #0F172A; margin-bottom: 4px;">Edit Lecture Assignment</h3>
              <p style="font-size: 0.85rem; color: #64748B;" id="edit-assignment-subtitle">Update schedule date, timings or venue</p>
            </div>
            <button type="button" class="modal-close" id="btn-close-edit-modal" style="position: static; font-size: 1.5rem;">&times;</button>
          </div>

          <form id="form-edit-assignment">
            <input type="hidden" id="edit-assignment-id" name="assignmentId">

            <div style="display: flex; flex-direction: column; gap: 14px;">
              <!-- Read-only Course / Class Details -->
              <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px 14px;">
                <div style="font-size: 0.78rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Classroom & Subject</div>
                <div style="font-size: 0.95rem; font-weight: 700; color: #0F172A; margin-top: 2px;" id="edit-class-subject-text">—</div>
              </div>

              <!-- Faculty Selector -->
              <div class="admin-form-group">
                <label>Assigned Faculty *</label>
                <select name="facultyId" id="edit-faculty-select" class="admin-select" required>
                  ${facultyOptionsHTML}
                </select>
              </div>

              <!-- Scheduled Date -->
              <div class="admin-form-group">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <label style="margin-bottom: 0;">Scheduled Date *</label>
                  <span id="edit-slot-day-badge" style="font-size: 0.74rem; font-weight: 800; background: #EEF2FF; color: #4338CA; padding: 2px 8px; border-radius: 6px;">Day</span>
                </div>
                <input type="date" name="lecDate" id="edit-lec-date" class="admin-input" required style="font-weight: 600;">
              </div>

              <!-- Timings Row -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div class="admin-form-group">
                  <label>Start Time *</label>
                  <input type="time" name="startTime" id="edit-start-time" class="admin-input" required step="1" style="font-weight: 600;">
                </div>
                <div class="admin-form-group">
                  <label>End Time *</label>
                  <input type="time" name="endTime" id="edit-end-time" class="admin-input" required step="1" style="font-weight: 600;">
                </div>
              </div>

              <!-- Room / Lab Number -->
              <div class="admin-form-group">
                <label>Room / Lab Number *</label>
                <input type="text" name="roomNo" id="edit-room-no" class="admin-input" required placeholder="e.g. Room 101, Lab 3" style="font-weight: 600;">
              </div>
            </div>

            <!-- Modal Action Buttons -->
            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #F1F5F9;">
              <button type="button" id="btn-cancel-edit-assignment" class="btn-close-form" style="padding: 10px 18px;">
                Cancel
              </button>
              <button type="submit" class="btn btn-primary" id="btn-submit-edit-assignment" style="padding: 10px 24px; border-radius: 10px;">
                Update Assignment
              </button>
            </div>
          </form>
      <!-- Delete Confirmation Modal -->
      <div id="modal-delete-assignment" class="modal-overlay" style="display: none;">
        <div class="modal-content" style="max-width: 440px; text-align: center; padding: 28px 24px;">
          <div style="width: 52px; height: 52px; border-radius: 50%; background: #FEE2E2; color: #DC2626; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </div>

          <h3 style="font-size: 1.25rem; font-weight: 800; color: #0F172A; margin-bottom: 8px;">Delete Lecture Assignment?</h3>
          <p id="delete-assignment-message" style="font-size: 0.9rem; color: #64748B; margin-bottom: 20px; line-height: 1.5;">
            Are you sure you want to delete this scheduled lecture assignment? This action cannot be undone.
          </p>

          <input type="hidden" id="delete-assignment-id">

          <div style="display: flex; gap: 12px; justify-content: center;">
            <button type="button" id="btn-cancel-delete-modal" class="btn-close-form" style="padding: 10px 20px; font-weight: 600;">
              Cancel
            </button>
            <button type="button" id="btn-confirm-delete-assignment" style="padding: 10px 22px; font-size: 0.9rem; font-weight: 700; border-radius: 10px; background: #DC2626; color: #FFFFFF; border: none; cursor: pointer; transition: background 0.15s;">
              Yes, Delete Assignment
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
};
