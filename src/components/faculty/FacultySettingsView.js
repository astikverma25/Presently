/**
 * Faculty Settings View Component
 * Provides email change, password update, and account security management
 */
export const renderFacultySettingsView = (profile) => {
  const initials = profile?.name 
    ? profile.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() 
    : 'FC';

  return `
    <div class="faculty-settings-container" style="max-width: 920px; margin: 0 auto; padding-bottom: 40px;">
      <!-- Page Header -->
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 1.5rem; font-weight: 800; color: #0F172A; margin-bottom: 4px;">Faculty Account Settings</h2>
        <p style="font-size: 0.88rem; color: #64748B;">Manage your login credentials, official email, and security settings</p>
      </div>

      <!-- Account Overview Badge Card -->
      <div style="background: linear-gradient(135deg, #1E1B4B 0%, #312E81 100%); border-radius: 16px; padding: 24px; color: #FFFFFF; display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; box-shadow: 0 10px 25px -5px rgba(49, 46, 129, 0.2);">
        <div style="display: flex; align-items: center; gap: 18px;">
          <div style="width: 56px; height: 56px; border-radius: 14px; background: rgba(255,255,255,0.15); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; font-size: 1.3rem; font-weight: 800; border: 1px solid rgba(255,255,255,0.2);">
            ${initials}
          </div>
          <div>
            <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 4px;">${profile?.name || 'Faculty Member'}</h3>
            <div style="display: flex; align-items: center; gap: 10px; font-size: 0.82rem; color: #C7D2FE;">
              ${profile?.department ? `<span>🏛️ ${profile.department}</span><span>•</span>` : ''}
              <span>📧 ${profile?.email || 'faculty@university.edu'}</span>
            </div>
          </div>
        </div>
        <div style="background: rgba(255,255,255,0.12); padding: 6px 14px; border-radius: 20px; font-size: 0.78rem; font-weight: 600; border: 1px solid rgba(255,255,255,0.18);">
          Faculty / Instructor
        </div>
      </div>

      <!-- Settings Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: 24px;">
        
        <!-- Card 1: Change Password -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px; padding-bottom: 14px; border-bottom: 1px solid #F1F5F9;">
            <div style="width: 36px; height: 36px; border-radius: 10px; background: #EEF2FF; color: #4F46E5; display: flex; align-items: center; justify-content: center; font-size: 18px;">
              🔐
            </div>
            <div>
              <h4 style="font-size: 1rem; font-weight: 700; color: #1E293B;">Change Password</h4>
              <p style="font-size: 0.78rem; color: #64748B;">Update your Supabase Auth login password</p>
            </div>
          </div>

          <!-- Password Feedback Alert -->
          <div id="faculty-pwd-feedback" style="display: none; padding: 10px 14px; border-radius: 8px; font-size: 0.82rem; margin-bottom: 14px;"></div>

          <form id="form-faculty-change-password">
            <div style="margin-bottom: 14px;">
              <label style="display: block; font-size: 0.8rem; font-weight: 600; color: #475569; margin-bottom: 6px;">Current Password</label>
              <div style="position: relative;">
                <input type="password" id="faculty-current-password" placeholder="Enter current password" required
                  style="width: 100%; padding: 10px 40px 10px 12px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 0.88rem; outline: none; transition: border-color 0.2s;" />
                <button type="button" class="btn-toggle-fac-pwd" data-target="faculty-current-password" 
                  style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #64748B;">
                  👁️
                </button>
              </div>
            </div>

            <div style="margin-bottom: 14px;">
              <label style="display: block; font-size: 0.8rem; font-weight: 600; color: #475569; margin-bottom: 6px;">New Password</label>
              <div style="position: relative;">
                <input type="password" id="faculty-new-password" placeholder="Min 8 chars (A-Z, a-z, 0-9, special char)" minlength="8" required
                  style="width: 100%; padding: 10px 40px 10px 12px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 0.88rem; outline: none; transition: border-color 0.2s;" />
                <button type="button" class="btn-toggle-fac-pwd" data-target="faculty-new-password" 
                  style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #64748B;">
                  👁️
                </button>
              </div>
              <div style="font-size: 0.72rem; color: #64748B; margin-top: 4px;">
                Must contain at least 8 characters, including 1 uppercase, 1 lowercase, 1 number, and 1 special character (!@#$%^&*).
              </div>
            </div>

            <div style="margin-bottom: 18px;">
              <label style="display: block; font-size: 0.8rem; font-weight: 600; color: #475569; margin-bottom: 6px;">Confirm New Password</label>
              <div style="position: relative;">
                <input type="password" id="faculty-confirm-password" placeholder="Re-enter new password" minlength="8" required
                  style="width: 100%; padding: 10px 40px 10px 12px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 0.88rem; outline: none; transition: border-color 0.2s;" />
                <button type="button" class="btn-toggle-fac-pwd" data-target="faculty-confirm-password" 
                  style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #64748B;">
                  👁️
                </button>
              </div>
            </div>

            <button type="submit" id="btn-save-faculty-pwd"
              style="width: 100%; padding: 11px; background: #4F46E5; color: #FFFFFF; border: none; border-radius: 8px; font-size: 0.88rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: background 0.2s;">
              <span class="btn-text">Update Password</span>
              <span class="btn-spinner" style="display: none; width: 14px; height: 14px; border: 2px solid #FFFFFF; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></span>
            </button>
          </form>
        </div>

        <!-- Card 2: Change Official Email -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px; padding-bottom: 14px; border-bottom: 1px solid #F1F5F9;">
            <div style="width: 36px; height: 36px; border-radius: 10px; background: #ECFDF5; color: #059669; display: flex; align-items: center; justify-content: center; font-size: 18px;">
              📧
            </div>
            <div>
              <h4 style="font-size: 1rem; font-weight: 700; color: #1E293B;">Change Login Email</h4>
              <p style="font-size: 0.78rem; color: #64748B;">Update official institutional email address</p>
            </div>
          </div>

          <!-- Email Feedback Alert -->
          <div id="faculty-email-feedback" style="display: none; padding: 10px 14px; border-radius: 8px; font-size: 0.82rem; margin-bottom: 14px;"></div>

          <form id="form-faculty-change-email">
            <div style="margin-bottom: 14px;">
              <label style="display: block; font-size: 0.8rem; font-weight: 600; color: #475569; margin-bottom: 6px;">Current Email Address</label>
              <input type="email" value="${profile?.email || ''}" disabled
                style="width: 100%; padding: 10px 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 0.88rem; color: #64748B; cursor: not-allowed;" />
            </div>

            <div style="margin-bottom: 14px;">
              <label style="display: block; font-size: 0.8rem; font-weight: 600; color: #475569; margin-bottom: 6px;">Current Password (Verification)</label>
              <div style="position: relative;">
                <input type="password" id="faculty-email-current-password" placeholder="Enter your current password" required
                  style="width: 100%; padding: 10px 40px 10px 12px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 0.88rem; outline: none; transition: border-color 0.2s;" />
                <button type="button" class="btn-toggle-fac-pwd" data-target="faculty-email-current-password" 
                  style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #64748B;">
                  👁️
                </button>
              </div>
            </div>

            <div style="margin-bottom: 18px;">
              <label style="display: block; font-size: 0.8rem; font-weight: 600; color: #475569; margin-bottom: 6px;">New Email Address</label>
              <input type="email" id="faculty-new-email" placeholder="faculty.new@university.edu" required
                style="width: 100%; padding: 10px 12px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 0.88rem; outline: none; transition: border-color 0.2s;" />
              <div style="font-size: 0.72rem; color: #64748B; margin-top: 4px;">
                Updates both your Auth login credentials and institutional faculty registry.
              </div>
            </div>

            <button type="submit" id="btn-save-faculty-email"
              style="width: 100%; padding: 11px; background: #059669; color: #FFFFFF; border: none; border-radius: 8px; font-size: 0.88rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: background 0.2s;">
              <span class="btn-text">Update Email in Auth & DB</span>
              <span class="btn-spinner" style="display: none; width: 14px; height: 14px; border: 2px solid #FFFFFF; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></span>
            </button>
          </form>
        </div>

      </div>
    </div>
  `;
};
