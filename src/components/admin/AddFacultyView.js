/**
 * Add Faculty Form & Directory View
 * Matches Docs/Database_Schema_QR_Attendance_System.md (faculty table)
 */
export const renderAddFacultyView = (facultyList = []) => {
  const tableRowsHTML = facultyList.length > 0
    ? facultyList.map((f, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${f.name}</strong></td>
          <td><code>${f.email}</code></td>
          <td><span class="badge-tag">${f.department || 'General'}</span></td>
          <td>${f.created_at ? new Date(f.created_at).toLocaleDateString() : '—'}</td>
        </tr>
      `).join('')
    : `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2.5rem;">
          No faculty members found in database. Register your first faculty member above.
        </td>
      </tr>
    `;

  return `
    <div class="admin-faculty-view">
      <!-- Create Faculty Card -->
      <div class="admin-card">
        <div class="admin-card-header">
          <div>
            <h3>Add New Faculty Member</h3>
            <p style="color: var(--text-muted); font-size: 0.875rem; margin-top: 4px;">Register a faculty account in Supabase</p>
          </div>
        </div>

        <form id="form-add-faculty">
          <div class="admin-form-grid">
            <div class="admin-form-group">
              <label>Faculty Full Name *</label>
              <input type="text" name="name" class="admin-input" required placeholder="e.g. Dr. Vishal Gupta">
            </div>

            <div class="admin-form-group">
              <label>Institutional Email * (Login Identifier)</label>
              <input type="email" name="email" class="admin-input" required placeholder="vishal.gupta@university.edu">
            </div>

            <div class="admin-form-group full-width">
              <label>Department *</label>
              <select name="department" class="admin-select" required>
                <option value="" disabled selected>Select Department...</option>
                <option value="Computer Science & Engineering">Computer Science & Engineering (CSE)</option>
                <option value="Information Technology">Information Technology (IT)</option>
                <option value="Electronics & Communication">Electronics & Communication (ECE)</option>
                <option value="Mechanical Engineering">Mechanical Engineering (ME)</option>
                <option value="Applied Sciences">Applied Sciences</option>
              </select>
            </div>
          </div>

          <button type="submit" class="btn-admin-submit" id="btn-submit-faculty">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Register Faculty in Database
          </button>
        </form>
      </div>

      <!-- Existing Faculty Table -->
      <div class="admin-card">
        <div class="admin-card-header">
          <div>
            <h3>Faculty Directory (${facultyList.length})</h3>
            <p style="color: var(--text-muted); font-size: 0.875rem; margin-top: 4px;">Live records from Supabase <code>faculty</code> table</p>
          </div>
        </div>

        <table class="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Faculty Name</th>
              <th>Login Email</th>
              <th>Department</th>
              <th>Registered Date</th>
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
