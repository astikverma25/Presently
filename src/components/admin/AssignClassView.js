import { getIndianDateString, getIndianTimeVal, getIndianDayName } from '../../utils/dateUtils.js';

/**
 * Weekly Multi-Slot Lecture Assignment View with Inline & Modal Editing
 */
export const renderAssignClassView = (assignments = [], subjects = [], sections = [], facultyList = []) => {
  const todayIST = getIndianDateString();
  const currentTimeIST = getIndianTimeVal();

  // Helper to categorize assignment lifecycle status
  const getAssignmentStatus = (a) => {
    const lecDate = a.lec_date || '';
    const startTime = (a.start_time || a.startTime || '00:00:00').slice(0, 5);
    const endTime = (a.end_time || a.endTime || '23:59:00').slice(0, 5);
    const status = (a.status || '').toLowerCase();

    const isExplicitCompleted = status === 'completed';
    const isOngoing = status === 'ongoing';
    const isPastDate = !!(lecDate && lecDate < todayIST);
    const isPastTimeToday = (lecDate === todayIST) && (endTime < currentTimeIST);
    const isCurrentTimeSlotToday = (lecDate === todayIST) && (startTime <= currentTimeIST && endTime >= currentTimeIST);
    const isUpcomingTimeToday = (lecDate === todayIST) && (startTime > currentTimeIST);
    const isFutureDate = !!(lecDate && lecDate > todayIST);

    const isCompleted = isExplicitCompleted || isPastDate || isPastTimeToday;
    const isLive = !isCompleted && (isOngoing || isCurrentTimeSlotToday);

    let rank = 4; // Completed
    if (isLive) {
      rank = 1; // Live / In Progress
    } else if (isUpcomingTimeToday && !isCompleted) {
      rank = 2; // Upcoming Today
    } else if (isFutureDate && !isCompleted) {
      rank = 3; // Upcoming Next Days
    }

    return {
      isCompleted,
      isLive,
      isUpcomingToday: rank === 2,
      isUpcomingFuture: rank === 3,
      rank,
      startTime,
      endTime,
      lecDate
    };
  };

  // Sort assignments: Top Live (1) -> Upcoming Today (2) -> Upcoming Next Days (3) -> Completed (4)
  const sortedAssignments = [...assignments].sort((a, b) => {
    const stA = getAssignmentStatus(a);
    const stB = getAssignmentStatus(b);

    if (stA.rank !== stB.rank) {
      return stA.rank - stB.rank;
    }

    // Within completed (rank 4): most recent completed first (date descending, time descending)
    if (stA.rank === 4) {
      if (stA.lecDate !== stB.lecDate) {
        return stB.lecDate.localeCompare(stA.lecDate);
      }
      return stB.startTime.localeCompare(stA.startTime);
    }

    // Within Live / Upcoming (ranks 1, 2, 3): ascending date, then ascending start time
    if (stA.lecDate !== stB.lecDate) {
      return stA.lecDate.localeCompare(stB.lecDate);
    }
    return stA.startTime.localeCompare(stB.startTime);
  });

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

  const facultyFilterOptionsHTML = facultyList.map(f => `
    <option value="${f.id}">${f.name}</option>
  `).join('');

  const sectionFilterOptionsHTML = sections.map(sec => `
    <option value="${sec.id}">${sec.section_name || sec.sectionName} (${sec.branch || 'CSE'})</option>
  `).join('');

  const tableRowsHTML = sortedAssignments.length > 0
    ? sortedAssignments.map((a, idx) => {
        const { isCompleted, isLive } = getAssignmentStatus(a);
        const lecId = a.lec_id || `LEC-${(a.id || '').slice(0, 6).toUpperCase()}`;
        const lecDate = a.lec_date || '—';
        const rawDate = a.lec_date || '';
        const subjectName = a.subject?.subject_name || a.section_subject?.subject?.subject_name || a.subjectName || '—';
        const subjectCode = a.subject?.subject_code || a.section_subject?.subject?.subject_code || a.subjectCode || '';
        const sectionName = a.section?.section_name || a.section_subject?.section?.section_name || a.sectionName || '—';
        const sectionId = a.section_id || a.section?.id || a.section_subject?.section_id || '';
        const facultyId = a.faculty_id || a.faculty?.id || '';
        const facultyName = a.faculty?.name || a.facultyName || '—';
        const day = a.lec_date ? getIndianDayName(a.lec_date) : '—';
        const start = a.start_time || a.startTime || '';
        const end = a.end_time || a.endTime || '';
        const timeDisplay = start && end ? `${start.slice(0, 5)} - ${end.slice(0, 5)}` : (start || '—');
        const room = a.room_no || a.roomNo || '—';

        const rowClass = isCompleted ? 'assignment-table-row assignment-row-completed' : (isLive ? 'assignment-table-row assignment-row-live' : 'assignment-table-row');
        const rowStyle = isCompleted ? 'background: #F8FAFC; color: #64748B;' : '';

        // Status badge / Room badge
        let roomBadgeHTML = `<span class="badge-status-active">${room}</span>`;
        if (isCompleted) {
          roomBadgeHTML = `<span style="background: #F1F5F9; color: #64748B; font-size: 0.76rem; font-weight: 700; padding: 3px 8px; border-radius: 6px; border: 1px solid #E2E8F0;">${room}</span>`;
        } else if (isLive) {
          roomBadgeHTML = `<span style="background: #DCFCE7; color: #15803D; font-size: 0.78rem; font-weight: 800; padding: 3px 10px; border-radius: 9999px; display: inline-flex; align-items: center; gap: 4px;">● ${room}</span>`;
        }

        // Timing display with Live tag if currently running
        const timingHTML = isLive
          ? `<strong style="color: #15803D;">${timeDisplay}</strong> <span style="background: #DCFCE7; color: #15803D; font-size: 0.72rem; font-weight: 800; padding: 2px 6px; border-radius: 4px; margin-left: 4px; display: inline-block;">● Live</span>`
          : (isCompleted ? `<span style="color: #64748B;">${timeDisplay}</span>` : `<strong>${timeDisplay}</strong>`);

        // Actions column: hide Edit and Delete for completed lectures
        let actionsHTML = '';
        if (isCompleted) {
          actionsHTML = `
            <span style="display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; font-size: 0.78rem; font-weight: 700; border-radius: 6px; background: #F1F5F9; color: #64748B; border: 1px solid #E2E8F0;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Completed
            </span>
          `;
        } else {
          actionsHTML = `
            <div style="display: flex; gap: 8px; align-items: center; justify-content: flex-start;">
              <button type="button" class="btn-edit-assignment" data-id="${a.id}" style="padding: 7px 12px; font-size: 0.82rem; font-weight: 700; border-radius: 8px; background: #EEF2FF; color: #4338CA; border: 1.5px solid #C7D2FE; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s ease; box-shadow: 0 1px 2px rgba(67, 56, 202, 0.05);" title="Edit Assignment">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                <span style="pointer-events: none;">Edit</span>
              </button>

              <button type="button" class="btn-delete-assignment" data-id="${a.id}" style="padding: 7px 12px; font-size: 0.82rem; font-weight: 700; border-radius: 8px; background: #FFF1F2; color: #E11D48; border: 1.5px solid #FECDD3; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s ease; box-shadow: 0 1px 2px rgba(225, 29, 72, 0.05);" title="Delete Assignment">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                <span style="pointer-events: none;">Delete</span>
              </button>
            </div>
          `;
        }

        return `
          <tr class="${rowClass}" data-assignment-id="${a.id}" data-faculty-id="${facultyId}" data-lec-date="${rawDate}" data-section-id="${sectionId}" style="${rowStyle}">
            <td>${idx + 1}</td>
            <td>
              <code>${lecId}</code><br>
              <small style="color:var(--text-muted); font-weight:600;">${lecDate}</small>
            </td>
            <td><strong>${subjectName}</strong> <small style="color:var(--text-muted);">(${subjectCode})</small></td>
            <td><span class="badge-tag" style="${isCompleted ? 'background: #F1F5F9; color: #64748B;' : ''}">Sec ${sectionName}</span></td>
            <td>${facultyName}</td>
            <td><strong>${day}</strong></td>
            <td>${timingHTML}</td>
            <td>${roomBadgeHTML}</td>
            <td>${actionsHTML}</td>
          </tr>
        `;
      }).join('')
    : `
      <tr id="row-no-assignments-initial">
        <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 2.5rem;">
          No classes assigned yet. Use the form above to assign lecture sessions for a class & faculty.
        </td>
      </tr>
    `;

  return `
    <div class="admin-assignment-view">
      <!-- Create Faculty Assignment Card -->
      <div class="admin-card" style="margin-bottom: 24px;">
        <div class="admin-card-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #F1F5F9; padding-bottom: 16px; margin-bottom: 0;">
          <div>
            <h3 style="font-size: 1.25rem; font-weight: 800; color: #0F172A;">Assign Lecture Schedule</h3>
            <p style="color: #64748B; font-size: 0.875rem; margin-top: 4px;">Link Classroom, Faculty, and Subject, then configure multiple date and time slots</p>
          </div>
          <button type="button" id="btn-toggle-assign-form" class="btn btn-outline-pill" style="padding: 7px 16px; font-size: 0.82rem; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; border-radius: 9999px; background: #EEF2FF; color: #4338CA; border: 1.5px solid #C7D2FE; transition: all 0.2s ease;">
            <svg id="assign-toggle-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            <span id="assign-toggle-btn-text">Open</span>
          </button>
        </div>

        <div id="assign-form-container" style="display: none; padding-top: 20px;">
          <form id="form-assign-class">
            <!-- Section 1: Academic Association -->
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; margin-bottom: 22px;">
              <div style="font-size: 0.82rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #4338CA; margin-bottom: 14px;">
                1. Academic Details (Semester, Classroom, Subject & Faculty)
              </div>
              
              <div class="admin-form-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px;">
                <!-- 1. Select Semester -->
                <div class="admin-form-group">
                  <label style="font-weight: 700; color: #1E293B;">Select Semester *</label>
                  <select name="semester" id="assign-semester-select" class="admin-select" required>
                    <option value="" disabled selected>Select Academic Semester...</option>
                    <option value="1">Semester 1</option>
                    <option value="2">Semester 2</option>
                    <option value="3">Semester 3</option>
                    <option value="4">Semester 4</option>
                    <option value="5">Semester 5</option>
                    <option value="6">Semester 6</option>
                    <option value="7">Semester 7</option>
                    <option value="8">Semester 8</option>
                  </select>
                </div>

                <!-- 2. Classroom / Section (Filtered by Semester) -->
                <div class="admin-form-group">
                  <label style="font-weight: 700; color: #1E293B;">Select Classroom / Section *</label>
                  <select name="sectionId" id="assign-section-select" class="admin-select" required disabled>
                    <option value="" disabled selected>← Choose Semester first</option>
                  </select>
                </div>

                <!-- 3. Lecture / Subject (Filtered by Semester) -->
                <div class="admin-form-group">
                  <label style="font-weight: 700; color: #1E293B;">Lecture / Subject *</label>
                  <select name="subjectId" id="assign-subject-select" class="admin-select" required disabled>
                    <option value="" disabled selected>← Choose Semester first</option>
                  </select>
                </div>

                <!-- 4. Assigned Faculty Member -->
                <div class="admin-form-group">
                  <label style="font-weight: 700; color: #1E293B;">Assigned Faculty Member *</label>
                  <select name="facultyId" id="assign-faculty-select" class="admin-select" required>
                    ${facultyOptionsHTML}
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

            <!-- Submit Button & Cancel Action -->
            <div style="border-top: 1px solid #F1F5F9; padding-top: 18px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
              <button type="submit" class="btn-admin-submit" id="btn-submit-assignment" style="padding: 13px 32px; font-size: 0.95rem; font-weight: 700;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                <span id="btn-submit-assignment-text">Save Lecture Assignments in Database</span>
              </button>
              <button type="button" id="btn-cancel-assign-form" class="btn-close-form" style="padding: 11px 20px; font-weight: 600; font-size: 0.9rem;">
                Close Form
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Existing Timetable Assignments Table -->
      <div class="admin-card">
        <div class="admin-card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 18px; border-bottom: 1px solid #F1F5F9; padding-bottom: 16px;">
          <div>
            <h3 style="font-size: 1.25rem; font-weight: 800; color: #0F172A;">
              Active Lecture Assignments (<span id="visible-assignments-count">${assignments.length}</span>)
            </h3>
            <p style="color: var(--text-muted); font-size: 0.875rem; margin-top: 4px;">Current faculty course and lecture allocations</p>
          </div>

          <!-- Small Filter Controls: Faculty, Date, Class -->
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <!-- Faculty Filter -->
            <select id="filter-assignment-faculty" style="font-size: 0.78rem; font-weight: 600; padding: 4px 10px; height: 32px; border-radius: 8px; border: 1.5px solid #E2E8F0; background: #FFFFFF; color: #334155; cursor: pointer;" title="Filter by Faculty">
              <option value="all">All Faculty</option>
              ${facultyFilterOptionsHTML}
            </select>

            <!-- Date Filter -->
            <input type="date" id="filter-assignment-date" style="font-size: 0.78rem; font-weight: 600; padding: 3px 8px; height: 32px; border-radius: 8px; border: 1.5px solid #E2E8F0; background: #FFFFFF; color: #334155; cursor: pointer;" title="Filter by Lecture Date">

            <!-- Class / Section Filter -->
            <select id="filter-assignment-section" style="font-size: 0.78rem; font-weight: 600; padding: 4px 10px; height: 32px; border-radius: 8px; border: 1.5px solid #E2E8F0; background: #FFFFFF; color: #334155; cursor: pointer;" title="Filter by Class / Section">
              <option value="all">All Classes</option>
              ${sectionFilterOptionsHTML}
            </select>

            <!-- Reset Filter Button -->
            <button type="button" id="btn-reset-assignment-filters" style="height: 32px; padding: 0 10px; font-size: 0.75rem; font-weight: 700; border-radius: 8px; background: #F8FAFC; color: #64748B; border: 1px solid #CBD5E1; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: all 0.15s ease;" title="Reset filters">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
              <span>Reset</span>
            </button>
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
            <tr id="row-no-assignment-matches" style="display: none;">
              <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 2.5rem;">
                No lecture assignments match the selected filters.
              </td>
            </tr>
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
        </div>
      </div>

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
