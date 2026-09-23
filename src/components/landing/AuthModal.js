import { AuthService } from '../../services/authService.js';

/**
 * Authentication & Role-Based Login Modal for Presently
 */
export const initAuthModal = () => {
  const modalHTML = `
    <div id="auth-modal" class="modal-overlay">
      <div class="modal-content" style="max-width: 460px;">
        <button class="modal-close" id="close-auth-modal">&times;</button>
        
        <!-- Standard Login View -->
        <div id="auth-main-view">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-size: 1.6rem; font-weight: 800; font-style: italic; color: #4338CA; margin-bottom: 4px;">Presently</div>
            <h3 style="font-size: 1.35rem; color: #0F172A; margin-bottom: 4px;">Sign in to your account</h3>
            <p style="font-size: 0.88rem; color: #64748B;">Select your institutional role to continue</p>
          </div>

          <!-- Role Selector -->
          <div class="role-selector" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px;">
            <button type="button" class="role-btn active" data-role="student" style="padding: 10px 6px; border: 1.5px solid #4338CA; background: #EEF2FF; border-radius: 12px; font-weight: 700; color: #4338CA; text-align: center; cursor: pointer; transition: all 0.15s;">
              <span style="display:block; font-size: 18px; margin-bottom: 2px;">🎓</span> Student
            </button>
            <button type="button" class="role-btn" data-role="staff" style="padding: 10px 6px; border: 1.5px solid #E2E8F0; background: #FFFFFF; border-radius: 12px; font-weight: 700; color: #475569; text-align: center; cursor: pointer; transition: all 0.15s;">
              <span style="display:block; font-size: 18px; margin-bottom: 2px;">👨‍🏫</span> Faculty
            </button>
            <button type="button" class="role-btn" data-role="admin" style="padding: 10px 6px; border: 1.5px solid #E2E8F0; background: #FFFFFF; border-radius: 12px; font-weight: 700; color: #475569; text-align: center; cursor: pointer; transition: all 0.15s;">
              <span style="display:block; font-size: 18px; margin-bottom: 2px;">🛡️</span> Admin
            </button>
          </div>

          <!-- Login Form -->
          <form id="auth-form" style="display: flex; flex-direction: column; gap: 14px;">
            <div>
              <label id="auth-id-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 6px; color: #334155;">University Roll No / Email</label>
              <input type="text" id="auth-email-input" required placeholder="e.g. 2501530100004 or student@university.edu" value="" style="width: 100%; padding: 11px 14px; border: 1px solid #CBD5E1; border-radius: 10px; font-size: 0.92rem; outline: none; font-family: inherit;">
            </div>
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label style="font-size: 0.85rem; font-weight: 600; color: #334155;">Password</label>
                <a href="#" style="font-size: 0.78rem; color: #4338CA; font-weight: 600;">Forgot password?</a>
              </div>
              <div style="position: relative; display: flex; align-items: center;">
                <input type="password" id="auth-password-input" required placeholder="••••••••" value="" style="width: 100%; padding: 11px 40px 11px 14px; border: 1px solid #CBD5E1; border-radius: 10px; font-size: 0.92rem; outline: none; font-family: inherit;">
                <button type="button" id="btn-toggle-password" style="position: absolute; right: 10px; background: none; border: none; cursor: pointer; color: #64748B; padding: 4px; display: flex; align-items: center; justify-content: center;" title="Show/Hide Password">
                  <svg id="icon-eye" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  <svg id="icon-eye-off" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: none;">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                </button>
              </div>
            </div>

            <div id="auth-error-msg" style="display: none; font-size: 0.8rem; color: #B91C1C; background: #FEE2E2; padding: 8px 12px; border-radius: 8px;"></div>

            <button type="submit" id="btn-submit-auth" class="btn btn-primary" style="width: 100%; margin-top: 6px; border-radius: 10px; padding: 12px;">
              Sign In to Portal
            </button>
          </form>
        </div>

        <!-- Student Device Binding / Verification Prompt -->
        <div id="device-auth-view" style="display: none; text-align: center; padding: 6px 0;">
          <div style="width: 60px; height: 60px; background: #EEF2FF; border: 2px solid #C7D2FE; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; font-size: 26px;">
            📱
          </div>
          <h3 id="device-prompt-title" style="font-size: 1.25rem; color: #0F172A; margin-bottom: 6px;">
            Device Security Authentication
          </h3>
          <p id="device-prompt-desc" style="font-size: 0.85rem; color: #64748B; margin-bottom: 16px; line-height: 1.45;">
            Tap below to authenticate with your phone screen lock / fingerprint.
          </p>

          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 14px; margin-bottom: 16px; text-align: left; display: flex; align-items: center; gap: 10px;">
            <div style="font-size: 22px;">🎓</div>
            <div>
              <div id="device-student-name" style="font-weight: 700; font-size: 0.9rem; color: #1E293B;">Student</div>
              <div id="device-student-meta" style="font-size: 0.78rem; color: #64748B;">Roll No: -</div>
            </div>
          </div>

          <div id="device-error-msg" style="display: none; font-size: 0.82rem; color: #B91C1C; background: #FEE2E2; padding: 10px 12px; border-radius: 8px; margin-bottom: 14px; text-align: left; line-height: 1.4;"></div>

          <button type="button" id="btn-trigger-passkey" class="btn btn-primary" style="width: 100%; padding: 13px; font-size: 0.95rem; border-radius: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <span>👆</span> Confirm Screen Lock / Biometrics
          </button>

          <button type="button" id="btn-cancel-device-prompt" style="background: none; border: none; color: #64748B; font-size: 0.82rem; margin-top: 14px; cursor: pointer; text-decoration: underline;">
            Cancel & Return to Login
          </button>
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  const modal = document.getElementById('auth-modal');
  const closeBtn = document.getElementById('close-auth-modal');
  const mainView = modal.querySelector('#auth-main-view');
  const deviceView = modal.querySelector('#device-auth-view');
  const roleButtons = modal.querySelectorAll('.role-btn');
  const idLabel = modal.querySelector('#auth-id-label');
  const emailInput = modal.querySelector('#auth-email-input');
  const passwordInput = modal.querySelector('#auth-password-input');
  const togglePasswordBtn = modal.querySelector('#btn-toggle-password');
  const iconEye = modal.querySelector('#icon-eye');
  const iconEyeOff = modal.querySelector('#icon-eye-off');
  const errorMsg = modal.querySelector('#auth-error-msg');
  const authForm = modal.querySelector('#auth-form');
  const submitBtn = modal.querySelector('#btn-submit-auth');

  // Device prompt elements
  const deviceTitle = modal.querySelector('#device-prompt-title');
  const deviceDesc = modal.querySelector('#device-prompt-desc');
  const deviceStudentName = modal.querySelector('#device-student-name');
  const deviceStudentMeta = modal.querySelector('#device-student-meta');
  const deviceErrorMsg = modal.querySelector('#device-error-msg');
  const btnTriggerPasskey = modal.querySelector('#btn-trigger-passkey');
  const btnCancelDevice = modal.querySelector('#btn-cancel-device-prompt');

  let activeStudentChallenge = null;

  const showMainView = () => {
    activeStudentChallenge = null;
    if (deviceView) deviceView.style.display = 'none';
    if (mainView) mainView.style.display = 'block';
    if (errorMsg) errorMsg.style.display = 'none';
  };

  const showDeviceView = (student, isNewDevice, deviceName) => {
    activeStudentChallenge = { student, isNewDevice, deviceName };
    if (mainView) mainView.style.display = 'none';
    if (deviceView) deviceView.style.display = 'block';
    if (deviceErrorMsg) deviceErrorMsg.style.display = 'none';

    if (deviceStudentName) deviceStudentName.textContent = student.name || 'Student';
    if (deviceStudentMeta) deviceStudentMeta.textContent = `Roll No: ${student.roll_no || student.personal_email || ''}`;

    if (isNewDevice) {
      if (deviceTitle) deviceTitle.textContent = 'Bind Student Device';
      if (deviceDesc) deviceDesc.textContent = 'This student account will be locked to this physical device hardware. Tap below to confirm screen lock or fingerprint.';
      if (btnTriggerPasskey) btnTriggerPasskey.innerHTML = '<span>🔐</span> Bind This Device (Screen Lock / PIN)';
    } else {
      if (deviceTitle) deviceTitle.textContent = 'Verify Registered Device';
      if (deviceDesc) deviceDesc.textContent = `Account bound to ${deviceName}. Tap below to verify your device screen lock or fingerprint.`;
      if (btnTriggerPasskey) btnTriggerPasskey.innerHTML = '<span>👆</span> Verify Device (Screen Lock / PIN)';
    }
  };

  if (btnCancelDevice) {
    btnCancelDevice.addEventListener('click', showMainView);
  }

  // Handle Passkey Action on direct user tap (Ensures active, unexpired User Gesture)
  if (btnTriggerPasskey) {
    btnTriggerPasskey.addEventListener('click', async () => {
      if (!activeStudentChallenge) return;
      const { student, isNewDevice } = activeStudentChallenge;

      if (deviceErrorMsg) deviceErrorMsg.style.display = 'none';
      btnTriggerPasskey.disabled = true;
      btnTriggerPasskey.innerHTML = '<span>⏳</span> Prompting device security...';

      try {
        const res = await AuthService.completeStudentDeviceAuth(student, isNewDevice);
        if (res.success) {
          btnTriggerPasskey.innerHTML = '<span>✅</span> Verified! Redirecting...';
          window.location.href = res.redirectUrl;
        } else {
          throw new Error('Authentication failed.');
        }
      } catch (err) {
        btnTriggerPasskey.disabled = false;
        btnTriggerPasskey.innerHTML = isNewDevice 
          ? '<span>🔄</span> Retry Device Binding' 
          : '<span>🔄</span> Retry Verification';
        if (deviceErrorMsg) {
          deviceErrorMsg.textContent = err.message || 'Device authentication failed. Please try again.';
          deviceErrorMsg.style.display = 'block';
        }
      }
    });
  }

  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      if (iconEye && iconEyeOff) {
        iconEye.style.display = isPassword ? 'none' : 'block';
        iconEyeOff.style.display = isPassword ? 'block' : 'none';
      }
    });
  }

  let selectedRole = 'student';

  const updateRoleState = (role) => {
    selectedRole = role;
    showMainView();
    roleButtons.forEach(b => {
      b.classList.remove('active');
      b.style.borderColor = '#E2E8F0';
      b.style.backgroundColor = '#FFFFFF';
      b.style.color = '#475569';
    });

    const activeBtn = modal.querySelector(`.role-btn[data-role="${role}"]`);
    if (activeBtn) {
      activeBtn.classList.add('active');
      activeBtn.style.borderColor = '#4338CA';
      activeBtn.style.backgroundColor = '#EEF2FF';
      activeBtn.style.color = '#4338CA';
    }

    if (idLabel && emailInput) {
      if (role === 'student') {
        idLabel.textContent = 'Institutional Roll No / Email';
        emailInput.placeholder = 'e.g. 2501530100004 or roll number';
      } else if (role === 'staff') {
        idLabel.textContent = 'Faculty Institutional Email';
        emailInput.placeholder = 'e.g. vishal.gupta@university.edu';
      } else {
        idLabel.textContent = 'Administrator Email / Username';
        emailInput.placeholder = 'e.g. admin@university.edu';
      }
    }
  };

  roleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const role = btn.getAttribute('data-role');
      updateRoleState(role);
    });
  });

  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (errorMsg) errorMsg.style.display = 'none';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying credentials...';
      }

      try {
        const email = emailInput.value;
        const password = passwordInput.value;
        const res = await AuthService.signIn(email, password, selectedRole);

        if (res.requiresDevicePrompt) {
          showDeviceView(res.student, res.isNewDevice, res.deviceName);
          return;
        }

        if (res.success) {
          window.location.href = res.redirectUrl;
        } else {
          throw new Error('Invalid credentials');
        }
      } catch (err) {
        if (errorMsg) {
          errorMsg.textContent = err.message || 'Authentication failed. Please check your credentials.';
          errorMsg.style.display = 'block';
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Sign In to Portal';
        }
      }
    });
  }

  closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });

  return {
    open: (role = 'student') => {
      updateRoleState(role);
      modal.classList.add('active');
    },
    close: () => modal.classList.remove('active')
  };
};

