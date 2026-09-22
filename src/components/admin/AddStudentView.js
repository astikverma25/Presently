/**
 * Add Student Form and Roster View with Scalable Filter Dropdowns
 * Matches Docs/Database_Schema_QR_Attendance_System.md (students table)
 */
export const renderAddStudentView = (students = [], sections = []) => {
  // Compute section counts for dropdown options
  const sectionCounts = {};
  students.forEach(s => {
    const sec = s.sections?.section_name || s.section_name || s.sectionName || 'Unassigned';
    sectionCounts[sec] = (sectionCounts[sec] || 0) + 1;
  });

  const sectionFilterOptionsHTML = Object.entries(sectionCounts).map(([sec, count]) => `
    <option value="${sec.toLowerCase()}">Sec ${sec} (${count} students)</option>
  `).join('');

  const sectionOptionsHTML = sections.length > 0
    ? `<option value="" disabled selected>Select Section...</option>` + sections.map(s => `
        <option value="${s.id}">${s.section_name || s.sectionName} (${s.branch || 'CSE'} - Sem ${s.semester || '4th'})</option>
      `).join('')
    : '<option value="" disabled selected>No sections available (Create a section first)</option>';

  const tableRowsHTML = students.length > 0
    ? students.map((s, idx) => {
        const secName = s.sections?.section_name || s.section_name || s.sectionName || '—';
        const branchName = s.branch || s.sections?.branch || 'CSE';
        const semName = s.semester || s.sections?.semester || '4th';
        const rollNo = s.roll_no || s.rollNo || '';
        const email = s.personal_email || s.personalEmail || s.login_username || '—';
        const status = s.account_status || s.accountStatus || 'active';
        const searchKeywords = `${s.name} ${rollNo} ${secName} ${branchName} ${semName} ${email}`.toLowerCase();

        return `
          <tr class="student-table-row" 
              style="display: none;"
              data-section="${secName.toLowerCase()}" 
              data-branch="${branchName.toLowerCase()}" 
              data-semester="${semName.toLowerCase()}"
              data-status="${status.toLowerCase()}"
              data-search="${searchKeywords}">
            <td>${idx + 1}</td>
            <td><strong>${s.name}</strong></td>
            <td><code>${rollNo}</code></td>
            <td><span class="badge-tag">Sec ${secName}</span></td>
            <td>${branchName} • ${semName}</td>
            <td>${email}</td>
            <td><span class="badge-status-active">${status}</span></td>
          </tr>
        `;
      }).join('')
    : `
      <tr id="row-no-students">
        <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2.5rem;">
          No students enrolled yet in database. Click "+ Add New Student" above to enroll your first student.
        </td>
      </tr>
    `;

  const initialPromptRowHTML = `
    <tr id="row-select-classroom-prompt">
      <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 3rem 1.5rem;">
        <div style="width: 48px; height: 48px; border-radius: 50%; background: #EEF2FF; color: #4338CA; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px auto;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
        </div>
        <strong style="color: #0F172A; font-size: 1rem; display: block; margin-bottom: 4px;">No Classroom / Section Selected</strong>
        <p style="font-size: 0.88rem; max-width: 440px; margin: 0 auto; color: var(--admin-text-muted);">Please select a classroom or section from the dropdown above to load and display the students roster.</p>
      </td>
    </tr>
  `;

  return `
    <div class="admin-student-view">
      <!-- Action Bar Header -->
      <div class="admin-view-header">
        <div class="admin-view-header-title">
          <h2>
            Student Management
            <span class="badge-tag" id="badge-total-students" style="font-size: 0.82rem; padding: 4px 10px; border-radius: 9999px;">${students.length} Enrolled</span>
          </h2>
          <p>Institutional student records from Supabase database</p>
        </div>

        <button type="button" id="btn-toggle-student-form" class="btn-open-form">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>Add New Student</span>
        </button>
      </div>

      <!-- Collapsible Form Card (Closed by default) -->
      <div class="admin-card collapsible-form-card hidden" id="card-add-student">
        <div class="admin-card-header">
          <div>
            <h3>Add New Student</h3>
            <p style="color: var(--text-muted); font-size: 0.875rem; margin-top: 4px;">Enroll a student into the institutional database</p>
          </div>
          <button type="button" id="btn-close-student-form" class="btn-close-form">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            <span>Close</span>
          </button>
        </div>

        <form id="form-add-student">
          <div class="admin-form-grid">
            <div class="admin-form-group">
              <label>Full Name *</label>
              <input type="text" name="name" class="admin-input" required placeholder="e.g. Rahul Sharma">
            </div>

            <div class="admin-form-group">
              <label>Roll Number * (Unique)</label>
              <input type="text" name="rollNo" class="admin-input" required placeholder="e.g. 250153001001">
            </div>

            <div class="admin-form-group">
              <label>Assign Section *</label>
              <select name="sectionId" class="admin-select" required>
                ${sectionOptionsHTML}
              </select>
            </div>

            <div class="admin-form-group">
              <label>Branch *</label>
              <select name="branch" class="admin-select" required>
                <option value="" disabled selected>Select Branch...</option>
                <option value="CSE">Computer Science & Engineering (CSE)</option>
                <option value="IT">Information Technology (IT)</option>
                <option value="ECE">Electronics & Communication (ECE)</option>
                <option value="ME">Mechanical Engineering (ME)</option>
              </select>
            </div>

            <div class="admin-form-group">
              <label>Semester *</label>
              <select name="semester" class="admin-select" required>
                <option value="" disabled selected>Select Semester...</option>
                <option value="1st">1st Semester</option>
                <option value="2nd">2nd Semester</option>
                <option value="3rd">3rd Semester</option>
                <option value="4th">4th Semester</option>
                <option value="5th">5th Semester</option>
                <option value="6th">6th Semester</option>
                <option value="7th">7th Semester</option>
                <option value="8th">8th Semester</option>
              </select>
            </div>

            <div class="admin-form-group">
              <label>Personal / Academic Email</label>
              <input type="email" name="personalEmail" class="admin-input" placeholder="e.g. rahul.sharma@university.edu">
            </div>

            <div class="admin-form-group">
              <label>Phone Number</label>
              <input type="tel" name="phone" class="admin-input" placeholder="+91 98765 00000">
            </div>

            <div class="admin-form-group">
              <label>Photo URL (Optional)</label>
              <input type="url" name="photoUrl" class="admin-input" placeholder="https://.../photo.png">
            </div>
          </div>

          <div style="display: flex; gap: 12px; align-items: center;">
            <button type="submit" class="btn-admin-submit" id="btn-submit-student">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Save Student to Database
            </button>
            <button type="button" id="btn-cancel-student-form" class="btn-close-form" style="padding: 11px 18px;">
              Cancel
            </button>
          </div>
        </form>
      </div>

      <!-- Existing Students Table Card (Visible by default) -->
      <div class="admin-card">
        <div class="admin-card-header" style="margin-bottom: 0; border-bottom: none; padding-bottom: 0;">
          <div>
            <h3>Enrolled Students Roster (<span id="visible-students-count">0</span>)</h3>
            <p style="color: var(--text-muted); font-size: 0.875rem; margin-top: 4px;">Live records from Supabase <code>students</code> table</p>
          </div>
        </div>

        <!-- Scalable Dropdown Filter Toolbar -->
        <div class="admin-filter-bar">
          <div class="admin-filter-controls">
            <!-- Section / Classroom Dropdown (Default NONE) -->
            <select id="filter-student-section" class="admin-filter-select" style="font-weight: 700; border-color: #C7D2FE; background: #EEF2FF; color: #4338CA;">
              <option value="none" selected>Select Classroom / Section...</option>
              <option value="all">All Classrooms / Sections (${students.length})</option>
              ${sectionFilterOptionsHTML}
            </select>

            <!-- Branch Dropdown -->
            <select id="filter-student-branch" class="admin-filter-select">
              <option value="all">All Branches</option>
              <option value="cse">CSE</option>
              <option value="it">IT</option>
              <option value="ece">ECE</option>
              <option value="me">ME</option>
            </select>

            <!-- Semester Dropdown -->
            <select id="filter-student-semester" class="admin-filter-select">
              <option value="all">All Semesters</option>
              <option value="1st">1st Sem</option>
              <option value="2nd">2nd Sem</option>
              <option value="3rd">3rd Sem</option>
              <option value="4th">4th Sem</option>
              <option value="5th">5th Sem</option>
              <option value="6th">6th Sem</option>
              <option value="7th">7th Sem</option>
              <option value="8th">8th Sem</option>
            </select>

            <!-- Reset Button -->
            <button type="button" id="btn-reset-student-filters" class="btn-filter-reset" title="Reset all filters">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
              <span>Reset</span>
            </button>
          </div>

          <!-- Quick search input -->
          <div class="admin-quick-search-box">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" color="#64748B">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input type="text" id="input-student-search" placeholder="Search name, roll no...">
          </div>
        </div>

        <table class="admin-table" id="students-data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Student Name</th>
              <th>Roll No</th>
              <th>Section</th>
              <th>Branch / Sem</th>
              <th>Email</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${initialPromptRowHTML}
            ${tableRowsHTML}
          </tbody>
        </table>
      </div>
    </div>
  `;
};
