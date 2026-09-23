/**
 * Student Profile Edit & Update Modal Component
 */
export const renderStudentProfileModal = (profile) => {
  const initials = profile?.name 
    ? profile.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() 
    : 'ST';

  return `
    <div id="student-profile-modal" class="student-profile-modal-overlay">
      <div class="student-profile-card-modal">
        <!-- Modal Header -->
        <div class="profile-modal-header">
          <div class="profile-modal-title-row">
            <div class="profile-icon-badge">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <div>
              <h3 class="profile-modal-title">Update Profile</h3>
              <p class="profile-modal-subtitle">Manage your personal and contact details</p>
            </div>
          </div>
          <button type="button" class="btn-close-profile-modal" id="btn-close-profile-modal" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Student Summary Card (Read-only Academic info) -->
        <div class="profile-summary-box">
          <div class="profile-summary-avatar">${initials}</div>
          <div class="profile-summary-meta">
            <h4 class="profile-summary-name">${profile?.name || 'Student User'}</h4>
            <div class="profile-summary-tags">
              <span class="profile-meta-tag">Roll: <strong>${profile?.rollNumber || '—'}</strong></span>
              <span class="profile-meta-tag sec-tag">Sec ${profile?.sectionName || '2A'} • ${profile?.semester || '4th'} Sem</span>
            </div>
          </div>
        </div>

        <!-- Feedback Alert Container -->
        <div id="profile-update-feedback" class="profile-feedback-box" style="display: none;"></div>

        <!-- Profile Edit Form -->
        <form id="form-update-student-profile" class="profile-edit-form">
          <div class="profile-form-group">
            <label for="edit-student-name" class="profile-form-label">Full Name</label>
            <div class="profile-input-wrapper">
              <svg class="profile-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <input type="text" id="edit-student-name" name="name" class="profile-form-input profile-track-change" 
                value="${profile?.name || ''}" placeholder="Enter full name" required />
            </div>
          </div>

          <div class="profile-form-row">
            <div class="profile-form-group">
              <label for="edit-student-admission-id" class="profile-form-label">Admission ID</label>
              <div class="profile-input-wrapper">
                <svg class="profile-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="16" rx="2"></rect>
                  <line x1="7" y1="8" x2="17" y2="8"></line>
                  <line x1="7" y1="12" x2="13" y2="12"></line>
                </svg>
                <input type="text" id="edit-student-admission-id" name="admissionId" class="profile-form-input profile-track-change" 
                  value="${profile?.admissionId || ''}" placeholder="ADM-2024-XXXX" />
              </div>
            </div>

            <div class="profile-form-group">
              <label for="edit-student-dob" class="profile-form-label">Date of Birth (DOB)</label>
              <div class="profile-input-wrapper">
                <svg class="profile-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <input type="date" id="edit-student-dob" name="dateOfBirth" class="profile-form-input profile-track-change" 
                  value="${profile?.dateOfBirth || ''}" />
              </div>
            </div>
          </div>

          <div class="profile-form-group">
            <label for="edit-student-email" class="profile-form-label">Personal Email</label>
            <div class="profile-input-wrapper">
              <svg class="profile-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              <input type="email" id="edit-student-email" name="personalEmail" class="profile-form-input profile-track-change" 
                value="${profile?.personalEmail || ''}" placeholder="student@example.com" />
            </div>
          </div>

          <div class="profile-form-row">
            <div class="profile-form-group">
              <label for="edit-student-phone" class="profile-form-label">Mobile Number</label>
              <div class="profile-input-wrapper">
                <svg class="profile-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                <input type="tel" id="edit-student-phone" name="phone" class="profile-form-input profile-track-change" 
                  value="${profile?.phone || ''}" placeholder="+91 98765 43210" />
              </div>
            </div>

            <div class="profile-form-group">
              <label for="edit-student-parent-phone" class="profile-form-label">Parent / Guardian Contact</label>
              <div class="profile-input-wrapper">
                <svg class="profile-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <input type="tel" id="edit-student-parent-phone" name="parentContact" class="profile-form-input profile-track-change" 
                  value="${profile?.parentContact || ''}" placeholder="Emergency / Parent No." />
              </div>
            </div>
          </div>

          <!-- Form Actions -->
          <div class="profile-form-actions">
            <button type="button" class="btn-cancel-profile" id="btn-cancel-profile-edit">Cancel</button>
            <button type="submit" class="btn-save-profile" id="btn-save-profile" disabled>
              <span class="btn-text">Save Changes</span>
              <span class="btn-spinner" style="display: none;"></span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
};
