/**
 * Add Class / Subject Form & View
 * Matches Docs/Database_Schema_QR_Attendance_System.md (subjects table)
 */
export const renderAddSubjectView = (subjectsList = []) => {
  const tableRowsHTML = subjectsList.length > 0
    ? subjectsList.map((s, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${s.subject_name || s.subjectName}</strong></td>
          <td><code>${s.subject_code || s.subjectCode}</code></td>
          <td><span class="badge-tag">${s.semester || '—'}</span></td>
        </tr>
      `).join('')
    : `
      <tr>
        <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 2.5rem;">
          No subjects created yet. Add your first class / subject above.
        </td>
      </tr>
    `;

  return `
    <div class="admin-subject-view">
      <!-- Create Subject Card -->
      <div class="admin-card">
        <div class="admin-card-header">
          <div>
            <h3>Add New Lecture / Subject</h3>
            <p style="color: var(--text-muted); font-size: 0.875rem; margin-top: 4px;">Define curriculum lectures & courses in the catalog</p>
          </div>
        </div>

        <form id="form-add-subject">
          <div class="admin-form-grid">
            <div class="admin-form-group">
              <label>Lecture / Subject Name *</label>
              <input type="text" name="subjectName" class="admin-input" required placeholder="e.g. Data Structures & Algorithms">
            </div>

            <div class="admin-form-group">
              <label>Lecture / Course Code * (Unique)</label>
              <input type="text" name="subjectCode" class="admin-input" required placeholder="e.g. CS401">
            </div>

            <div class="admin-form-group full-width">
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
          </div>

          <button type="submit" class="btn-admin-submit" id="btn-submit-subject">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Save Lecture to Database
          </button>
        </form>
      </div>

      <!-- Existing Subjects Table -->
      <div class="admin-card">
        <div class="admin-card-header">
          <div>
            <h3>Curriculum Lectures (${subjectsList.length})</h3>
            <p style="color: var(--text-muted); font-size: 0.875rem; margin-top: 4px;">All curriculum courses and subjects</p>
          </div>
        </div>

        <table class="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Lecture / Subject Name</th>
              <th>Course Code</th>
              <th>Semester</th>
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
