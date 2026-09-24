/**
 * Student Profile Edit & Password Update Modal Component
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
              <h3 class="profile-modal-title">Student Settings</h3>
              <p class="profile-modal-subtitle">Manage personal details and account security</p>
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
              <span class="profile-meta-tag">Roll: <strong>${profile?.rollNumber || profile?.roll_no || '—'}</strong></span>
              <span class="profile-meta-tag sec-tag">Sec ${profile?.sectionName || '2A'} • ${profile?.semester || '4th'} Sem</span>
            </div>
          </div>
        </div>

        <!-- Tab Navigation (Personal Details / Security & Password) -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; background: #F1F5F9; padding: 4px; border-radius: 10px;">
          <button type="button" id="tab-btn-personal" class="profile-tab-btn active" style="padding: 8px 12px; font-size: 0.85rem; font-weight: 700; border-radius: 8px; border: none; background: #FFFFFF; color: #4338CA; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; align-items: center; justify-content: center; gap: 6px;">
            <span>👤</span> Personal Info
          </button>
          <button type="button" id="tab-btn-security" class="profile-tab-btn" style="padding: 8px 12px; font-size: 0.85rem; font-weight: 700; border-radius: 8px; border: none; background: transparent; color: #64748B; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <span>🔐</span> Change Password
          </button>
        </div>

        <!-- Feedback Alert Container -->
        <div id="profile-update-feedback" class="profile-feedback-box" style="display: none; margin-bottom: 14px;"></div>

        <!-- Tab 1: Personal Profile Edit Form -->
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

        <!-- Tab 2: Change Password Form (Hidden by default) -->
        <form id="form-change-student-password" class="profile-edit-form" style="display: none;">
          <div class="profile-form-group">
            <label for="pwd-current" class="profile-form-label">Current Password</label>
            <div class="profile-input-wrapper" style="position: relative;">
              <svg class="profile-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <input type="password" id="pwd-current" name="currentPassword" class="profile-form-input" 
                placeholder="Enter current password" required style="padding-right: 40px;" />
              <button type="button" class="btn-toggle-pwd-field" data-target="pwd-current" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #64748B;">
                👁️
              </button>
            </div>
          </div>

          <div class="profile-form-group">
            <label for="pwd-new" class="profile-form-label">New Password</label>
            <div class="profile-input-wrapper" style="position: relative;">
              <svg class="profile-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
              <input type="password" id="pwd-new" name="newPassword" class="profile-form-input" 
                placeholder="Min 8 chars (A-Z, a-z, 0-9, special char)" minlength="8" required style="padding-right: 40px;" />
              <button type="button" class="btn-toggle-pwd-field" data-target="pwd-new" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #64748B;">
                👁️
              </button>
            </div>
            <div style="font-size: 0.72rem; color: #64748B; margin-top: 4px;">
              Must contain at least 8 characters, including 1 uppercase, 1 lowercase, 1 number, and 1 special character (!@#$%^&*).
            </div>
          </div>

          <div class="profile-form-group">
            <label for="pwd-confirm" class="profile-form-label">Confirm New Password</label>
            <div class="profile-input-wrapper" style="position: relative;">
              <svg class="profile-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <input type="password" id="pwd-confirm" name="confirmPassword" class="profile-form-input" 
                placeholder="Re-enter new password" minlength="8" required style="padding-right: 40px;" />
              <button type="button" class="btn-toggle-pwd-field" data-target="pwd-confirm" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #64748B;">
                👁️
              </button>
            </div>
          </div>

          <div class="profile-form-actions">
            <button type="button" class="btn-cancel-profile" id="btn-cancel-password-change">Cancel</button>
            <button type="submit" class="btn-save-profile" id="btn-submit-password" style="background: #4338CA;">
              <span class="btn-pwd-text">Update Password</span>
              <span class="btn-pwd-spinner" style="display: none;"></span>
            </button>
          </div>
        </form>

      </div>
    </div>
  `;
};

