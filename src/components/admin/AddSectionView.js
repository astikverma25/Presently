/**
 * Add Section Form & View
 * Matches Docs/Database_Schema_QR_Attendance_System.md (sections table)
 */
export const renderAddSectionView = (sectionsList = []) => {
  const tableRowsHTML = sectionsList.length > 0
    ? sectionsList.map((s, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${s.section_name || s.sectionName}</strong></td>
          <td><span class="badge-tag">${s.branch}</span></td>
          <td>Semester ${s.semester || '—'}</td>
          <td>${s.total_students || s.totalStudents || 0} Students</td>
        </tr>
      `).join('')
    : `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2.5rem;">
          No sections created yet. Create your first class section / batch above.
        </td>
      </tr>
    `;

  return `
    <div class="admin-section-view">
      <!-- Create Classroom Card -->
      <div class="admin-card">
        <div class="admin-card-header">
          <div>
            <h3>Create New Classroom / Section</h3>
            <p style="color: var(--text-muted); font-size: 0.875rem; margin-top: 4px;">Define academic classrooms & sections (e.g. 2A, 2B, 3B)</p>
          </div>
        </div>

        <form id="form-add-section">
          <div class="admin-form-grid">
            <div class="admin-form-group">
              <label>Classroom / Section Name *</label>
              <input type="text" name="sectionName" class="admin-input" required placeholder="e.g. 2A, 3B, Room 201">
            </div>

            <div class="admin-form-group">
              <label>Branch / Department *</label>
              <select name="branch" class="admin-select" required>
                <option value="" disabled selected>Select Branch / Department...</option>
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

            <div class="admin-form-group">
              <label>Estimated Capacity / Total Students</label>
              <input type="number" name="totalStudents" class="admin-input" placeholder="e.g. 50" min="1" max="500">
            </div>
          </div>

          <button type="submit" class="btn-admin-submit" id="btn-submit-section">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Save Classroom to Database
          </button>
        </form>
      </div>

      <!-- Existing Classrooms Table -->
      <div class="admin-card">
        <div class="admin-card-header">
          <div>
            <h3>Active Classrooms & Sections (${sectionsList.length})</h3>
            <p style="color: var(--text-muted); font-size: 0.875rem; margin-top: 4px;">All registered batches and sections</p>
          </div>
        </div>

        <table class="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Classroom / Section</th>
              <th>Branch</th>
              <th>Semester</th>
              <th>Capacity</th>
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
