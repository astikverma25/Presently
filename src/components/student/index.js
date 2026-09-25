import { getLocalDateString } from '../../utils/dateUtils.js';
import { renderStudentHeader } from './StudentHeader.js';
import { renderStudentOverview } from './StudentOverview.js';
import { renderStudentHistory } from './StudentHistory.js';
import { renderStudentReport } from './StudentReport.js';
import { renderStudentDrawer } from './StudentDrawer.js';
import { renderStudentScannerModal } from './StudentScannerModal.js';
import { renderStudentProfileModal } from './StudentProfileModal.js';
import { showScanFeedbackModal } from './ScanFeedbackModal.js';
import { StudentService } from '../../services/studentService.js';
import { QRScanner } from '../qr/QRScanner.js';
import { validateStrongPassword } from '../../utils/totpCrypto.js';
import { createThumbnailFromMedia, openCameraStream, stopCameraStream, renderStudentThumbnail } from '../../utils/avatarUtils.js';

/**
 * Master Student Dashboard Module Coordinator (Mobile-Responsive & Drawer-Enabled)
 */
export class StudentDashboardApp {
  constructor(container) {
    this.container = container;
    this.currentTab = 'overview'; // 'overview' | 'history' | 'report'
    this.selectedSemester = '3rd';
    this.profile = null;
    this.currentLecture = null;
    this.historyList = [];
    this.historyDateFilter = getLocalDateString();
    this.reportData = null;
    this.sections = [];
    this.qrScanner = null;
  }

  async init() {
    this.container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: var(--font-sans); color: var(--text-muted);">
        <div style="text-align: center;">
          <div style="width: 40px; height: 40px; border: 3px solid #E0E7FF; border-top-color: #4F46E5; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px;"></div>
          <p style="font-weight: 600; color: #1E293B;">Loading Student Portal...</p>
        </div>
      </div>
      <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    `;

    try {
      this.profile = await StudentService.getProfile();

      if (!this.profile) {
        // Strict Auth Guard: User is not logged in as a student
        this.container.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; padding: 24px; text-align: center; font-family: var(--font-sans); background: #F8FAFC;">
            <div style="width: 56px; height: 56px; border-radius: 50%; background: #EEF2FF; color: #4F46E5; display: flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 16px;">
              🔒
            </div>
            <h2 style="font-size: 18px; font-weight: 700; color: #1E293B; margin-bottom: 8px;">Student Login Required</h2>
            <p style="font-size: 13px; color: #64748B; max-width: 300px; margin-bottom: 20px;">Please log in with your institutional Roll Number to access your attendance.</p>
            <a href="/index.html" style="display: inline-block; padding: 10px 22px; background: #4F46E5; color: #FFFFFF; font-weight: 600; font-size: 13px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);">Go to Login</a>
          </div>
        `;
        setTimeout(() => {
          window.location.href = '/index.html';
        }, 1000);
        return;
      }

      this.selectedSemester = this.profile?.semester || '3rd';

      // Parallelize all dashboard queries to load data concurrently
      const [currentLecture, historyList, reportData, sections] = await Promise.all([
        StudentService.getCurrentLecture(this.profile?.sectionId, this.profile?.sectionName, this.profile?.semester),
        StudentService.getAttendanceHistory(this.profile?.id),
        StudentService.getSubjectAttendanceReport(this.profile?.id, this.selectedSemester, this.profile?.sectionId),
        StudentService.getAvailableSections()
      ]);

      this.currentLecture = currentLecture;
      this.historyList = historyList;
      this.reportData = reportData;
      this.sections = sections;
    } catch (err) {
      console.error('Student Portal load error:', err);
    } finally {
      if (this.profile) {
        await this.render();
      }
    }
  }

  async render() {
    const isLive = !!this.currentLecture;
    const historyCount = this.historyList?.length || 0;

    this.container.innerHTML = `
      <div class="student-mobile-container">
        ${renderStudentHeader(this.profile, this.currentTab, isLive, historyCount)}
        
        <main class="student-scroll-content">
          <div id="tab-pane-overview" class="student-tab-pane ${this.currentTab === 'overview' ? 'active' : ''}">
            ${renderStudentOverview(this.profile, this.currentLecture, this.historyList)}
          </div>
          <div id="tab-pane-history" class="student-tab-pane ${this.currentTab === 'history' ? 'active' : ''}">
            ${renderStudentHistory(this.historyList, this.historyDateFilter)}
          </div>
          <div id="tab-pane-report" class="student-tab-pane ${this.currentTab === 'report' ? 'active' : ''}">
            ${renderStudentReport(this.reportData, this.selectedSemester)}
          </div>
        </main>

        ${renderStudentDrawer(this.profile, this.currentTab, historyCount)}
        ${renderStudentProfileModal(this.profile)}
        ${renderStudentScannerModal()}
      </div>
    `;

    this.attachEventListeners();
  }

  attachEventListeners() {
    const drawer = this.container.querySelector('#student-drawer');
    const backdrop = this.container.querySelector('#student-drawer-backdrop');

    const openDrawer = () => {
      if (drawer) drawer.classList.add('active');
      if (backdrop) backdrop.classList.add('active');
      document.body.style.overflow = 'hidden';
    };

    const closeDrawer = () => {
      if (drawer) drawer.classList.remove('active');
      if (backdrop) backdrop.classList.remove('active');
      document.body.style.overflow = '';
    };

    // Helper: Bind History Tab Events (Date Picker Pill & Toggle All)
    const bindHistoryEvents = () => {
      const historyPane = this.container.querySelector('#tab-pane-history');
      if (!historyPane) return;

      const dateInput = historyPane.querySelector('#input-history-date');
      const allBtn = historyPane.querySelector('#btn-toggle-all-history');
      const viewAllBtn = historyPane.querySelector('#btn-history-view-all');

      if (dateInput) {
        dateInput.addEventListener('change', (e) => {
          this.historyDateFilter = e.target.value;
          historyPane.innerHTML = renderStudentHistory(this.historyList, this.historyDateFilter);
          bindHistoryEvents();
        });
      }

      if (allBtn) {
        allBtn.addEventListener('click', () => {
          if (!this.historyDateFilter) {
            this.historyDateFilter = getLocalDateString();
          } else {
            this.historyDateFilter = '';
          }
          historyPane.innerHTML = renderStudentHistory(this.historyList, this.historyDateFilter);
          bindHistoryEvents();
        });
      }

      if (viewAllBtn) {
        viewAllBtn.addEventListener('click', () => {
          this.historyDateFilter = '';
          historyPane.innerHTML = renderStudentHistory(this.historyList, this.historyDateFilter);
          bindHistoryEvents();
        });
      }
    };

    // 1. Drawer open/close triggers
    const menuToggleBtn = this.container.querySelector('#btn-student-menu-toggle');
    const profilePillBtn = this.container.querySelector('#btn-open-profile-menu');
    const closeDrawerBtn = this.container.querySelector('#btn-close-drawer');

    if (menuToggleBtn) menuToggleBtn.addEventListener('click', openDrawer);
    if (profilePillBtn) profilePillBtn.addEventListener('click', openDrawer);
    if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', closeDrawer);
    if (backdrop) backdrop.addEventListener('click', closeDrawer);

    // Initial binding for History pane
    bindHistoryEvents();

    // 2. Silky Smooth Tab Navigation (Instant Switch without DOM destruction)
    const switchTab = async (newTab) => {
      if (!newTab) return;
      closeDrawer();
      if (this.currentTab === newTab) return;

      this.currentTab = newTab;

      const overviewPane = this.container.querySelector('#tab-pane-overview');
      const historyPane = this.container.querySelector('#tab-pane-history');
      const reportPane = this.container.querySelector('#tab-pane-report');

      // Hide all panes first
      overviewPane?.classList.remove('active');
      historyPane?.classList.remove('active');
      reportPane?.classList.remove('active');

      // Show requested active pane
      if (newTab === 'overview') {
        overviewPane?.classList.add('active');
      } else if (newTab === 'history') {
        historyPane?.classList.add('active');
      } else if (newTab === 'report') {
        reportPane?.classList.add('active');
      }

      // Update Top Tab buttons
      this.container.querySelectorAll('.tab-switch-btn').forEach(btn => {
        const btnTab = btn.getAttribute('data-tab');
        if (btnTab === newTab) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });

      // Update Drawer items
      this.container.querySelectorAll('.drawer-nav-item[data-tab]').forEach(btn => {
        const btnTab = btn.getAttribute('data-tab');
        if (btnTab === newTab) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });

      // Smooth scroll to top of viewport
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Silent background sync
      if (newTab === 'report') {
        const freshReport = await StudentService.getSubjectAttendanceReport(this.profile?.id, this.selectedSemester, this.profile?.sectionId);
        this.reportData = freshReport;
        if (reportPane) {
          reportPane.innerHTML = renderStudentReport(this.reportData, this.selectedSemester);
        }
      } else if (newTab === 'history') {
        const freshHistory = await StudentService.getAttendanceHistory(this.profile?.id);
        if (freshHistory) {
          this.historyList = freshHistory;
        }
        if (historyPane) {
          historyPane.innerHTML = renderStudentHistory(this.historyList, this.historyDateFilter);
          bindHistoryEvents();
        }
      }
    };

    this.container.querySelectorAll('.tab-switch-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        switchTab(tab);
      });
    });

    this.container.querySelectorAll('.drawer-nav-item[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        switchTab(tab);
      });
    });

    // 3. Drawer Quick Actions & Profile Modal
    const drawerProfileBtn = this.container.querySelector('#btn-drawer-profile');
    const drawerScanBtn = this.container.querySelector('#btn-drawer-scan');
    const drawerRefreshBtn = this.container.querySelector('#btn-drawer-refresh');
    const drawerLogoutBtn = this.container.querySelector('#btn-drawer-logout');
    const profileModal = this.container.querySelector('#student-profile-modal');
    const closeProfileModalBtn = this.container.querySelector('#btn-close-profile-modal');
    const cancelProfileEditBtn = this.container.querySelector('#btn-cancel-profile-edit');
    const profileForm = this.container.querySelector('#form-update-student-profile');

    const openProfileModal = () => {
      closeDrawer();
      if (profileModal) profileModal.classList.add('active');
    };

    const closeProfileModal = () => {
      stopPhotoCapture();
      if (profileModal) profileModal.classList.remove('active');
    };

    if (drawerProfileBtn) drawerProfileBtn.addEventListener('click', openProfileModal);
    if (closeProfileModalBtn) closeProfileModalBtn.addEventListener('click', closeProfileModal);
    if (cancelProfileEditBtn) cancelProfileEditBtn.addEventListener('click', closeProfileModal);

    if (profileModal) {
      profileModal.addEventListener('click', (e) => {
        if (e.target === profileModal) closeProfileModal();
      });
    }

    // 3.5 Real-Time Student Photo Capture & Thumbnail Processing
    const photoCapturePanel = this.container.querySelector('#photo-capture-panel');
    const avatarActionWrap = this.container.querySelector('.profile-avatar-action-wrap');
    const triggerPhotoBtn = this.container.querySelector('#btn-trigger-photo-capture');
    const quickTakePhotoBtn = this.container.querySelector('#btn-quick-take-photo');
    const closePhotoCaptureBtn = this.container.querySelector('#btn-close-photo-capture');
    const videoEl = this.container.querySelector('#photo-capture-video');
    const overlayGuide = this.container.querySelector('#photo-capture-overlay-guide');
    const capturedPreviewImg = this.container.querySelector('#photo-captured-preview-img');
    const actionsLive = this.container.querySelector('#photo-capture-actions-live');
    const actionsPreview = this.container.querySelector('#photo-capture-actions-preview');
    const captureErrorBox = this.container.querySelector('#photo-capture-error');
    const snapBtn = this.container.querySelector('#btn-snap-photo');
    const uploadTriggerBtn = this.container.querySelector('#btn-upload-file-trigger');
    const fileInput = this.container.querySelector('#input-student-photo-file');
    const savePhotoBtn = this.container.querySelector('#btn-save-captured-photo');
    const retakePhotoBtn = this.container.querySelector('#btn-retake-photo');
    const avatarPreviewContainer = this.container.querySelector('#profile-modal-avatar-preview');

    let currentCapturedThumbnail = null;

    const startPhotoCapture = async () => {
      if (!photoCapturePanel) return;
      photoCapturePanel.style.display = 'block';
      if (actionsLive) actionsLive.style.display = 'flex';
      if (actionsPreview) actionsPreview.style.display = 'none';
      if (videoEl) videoEl.style.display = 'block';
      if (overlayGuide) overlayGuide.style.display = 'flex';
      if (capturedPreviewImg) capturedPreviewImg.style.display = 'none';
      if (captureErrorBox) captureErrorBox.style.display = 'none';

      try {
        await openCameraStream(videoEl, 'user');
      } catch (err) {
        console.warn('Could not open camera stream:', err);
        if (captureErrorBox) {
          captureErrorBox.innerHTML = `⚠️ <strong>Camera access:</strong> ${err.message || 'Permission denied or camera busy'}.<br><span style="font-size: 0.72rem; opacity: 0.9;">Please allow camera permissions in browser, or use <strong>"Upload File"</strong> to pick a photo.</span>`;
          captureErrorBox.style.display = 'block';
        }
      }
    };

    const stopPhotoCapture = () => {
      stopCameraStream(videoEl);
      if (photoCapturePanel) photoCapturePanel.style.display = 'none';
      if (captureErrorBox) captureErrorBox.style.display = 'none';
      currentCapturedThumbnail = null;
    };

    if (avatarActionWrap) avatarActionWrap.addEventListener('click', (e) => {
      // Don't trigger if file input itself was clicked directly
      if (e.target !== fileInput) startPhotoCapture();
    });
    if (triggerPhotoBtn) triggerPhotoBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      startPhotoCapture();
    });
    if (quickTakePhotoBtn) quickTakePhotoBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      startPhotoCapture();
    });
    if (closePhotoCaptureBtn) closePhotoCaptureBtn.addEventListener('click', stopPhotoCapture);

    // Snap photo from webcam stream
    if (snapBtn && videoEl) {
      snapBtn.addEventListener('click', async () => {
        try {
          const thumbUri = await createThumbnailFromMedia(videoEl, 256, 0.84);
          currentCapturedThumbnail = thumbUri;

          stopCameraStream(videoEl);
          if (videoEl) videoEl.style.display = 'none';
          if (overlayGuide) overlayGuide.style.display = 'none';
          if (capturedPreviewImg) {
            capturedPreviewImg.src = thumbUri;
            capturedPreviewImg.style.display = 'block';
          }
          if (actionsLive) actionsLive.style.display = 'none';
          if (actionsPreview) actionsPreview.style.display = 'flex';
        } catch (err) {
          console.error('Failed to capture frame:', err);
        }
      });
    }

    // Upload file picker
    if (uploadTriggerBtn && fileInput) {
      uploadTriggerBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          const thumbUri = await createThumbnailFromMedia(file, 256, 0.84);
          currentCapturedThumbnail = thumbUri;

          stopCameraStream(videoEl);
          if (videoEl) videoEl.style.display = 'none';
          if (overlayGuide) overlayGuide.style.display = 'none';
          if (capturedPreviewImg) {
            capturedPreviewImg.src = thumbUri;
            capturedPreviewImg.style.display = 'block';
          }
          if (actionsLive) actionsLive.style.display = 'none';
          if (actionsPreview) actionsPreview.style.display = 'flex';
        } catch (err) {
          console.error('Failed to process uploaded file:', err);
        }
      });
    }

    // Retake photo
    if (retakePhotoBtn) {
      retakePhotoBtn.addEventListener('click', startPhotoCapture);
    }

    // Save captured photo
    if (savePhotoBtn) {
      savePhotoBtn.addEventListener('click', async () => {
        if (!currentCapturedThumbnail || !this.profile?.id) return;
        savePhotoBtn.disabled = true;
        savePhotoBtn.textContent = 'Saving...';

        try {
          const res = await StudentService.updateProfilePhoto(this.profile.id, currentCapturedThumbnail);
          if (res.success) {
            this.profile.photoUrl = currentCapturedThumbnail;

            // Instant UI update across all portal components
            if (avatarPreviewContainer) {
              avatarPreviewContainer.innerHTML = renderStudentThumbnail(this.profile, { size: 58 });
            }
            const topbarAvatar = this.container.querySelector('#btn-open-profile-menu');
            if (topbarAvatar) {
              topbarAvatar.innerHTML = renderStudentThumbnail(this.profile, { size: 38 });
            }
            const drawerAvatarWrap = this.container.querySelector('.drawer-profile-row .student-thumb-wrapper');
            if (drawerAvatarWrap) {
              drawerAvatarWrap.outerHTML = renderStudentThumbnail(this.profile, { size: 46 });
            }

            if (feedbackBox) {
              feedbackBox.className = 'profile-feedback-box success';
              feedbackBox.textContent = '✅ Profile photo updated successfully!';
              feedbackBox.style.display = 'block';
            }
            stopPhotoCapture();
          } else {
            alert(res.message || 'Failed to update photo');
          }
        } catch (err) {
          console.error('Save photo error:', err);
        } finally {
          savePhotoBtn.disabled = false;
          savePhotoBtn.textContent = '✅ Save Thumbnail';
        }
      });
    }

    // 4. Profile Tabs & Modal Controls
    const tabBtnPersonal = this.container.querySelector('#tab-btn-personal');
    const tabBtnSecurity = this.container.querySelector('#tab-btn-security');
    const passwordForm = this.container.querySelector('#form-change-student-password');
    const cancelPasswordBtn = this.container.querySelector('#btn-cancel-password-change');
    const feedbackBox = this.container.querySelector('#profile-update-feedback');

    const switchProfileTab = (tab) => {
      if (feedbackBox) feedbackBox.style.display = 'none';
      if (tab === 'personal') {
        if (tabBtnPersonal) {
          tabBtnPersonal.classList.add('active');
          tabBtnPersonal.style.background = '#FFFFFF';
          tabBtnPersonal.style.color = '#4338CA';
          tabBtnPersonal.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
        }
        if (tabBtnSecurity) {
          tabBtnSecurity.classList.remove('active');
          tabBtnSecurity.style.background = 'transparent';
          tabBtnSecurity.style.color = '#64748B';
          tabBtnSecurity.style.boxShadow = 'none';
        }
        if (profileForm) profileForm.style.display = 'block';
        if (passwordForm) passwordForm.style.display = 'none';
      } else if (tab === 'security') {
        if (tabBtnSecurity) {
          tabBtnSecurity.classList.add('active');
          tabBtnSecurity.style.background = '#FFFFFF';
          tabBtnSecurity.style.color = '#4338CA';
          tabBtnSecurity.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
        }
        if (tabBtnPersonal) {
          tabBtnPersonal.classList.remove('active');
          tabBtnPersonal.style.background = 'transparent';
          tabBtnPersonal.style.color = '#64748B';
          tabBtnPersonal.style.boxShadow = 'none';
        }
        if (profileForm) profileForm.style.display = 'none';
        if (passwordForm) passwordForm.style.display = 'block';
      }
    };

    if (tabBtnPersonal) tabBtnPersonal.addEventListener('click', () => switchProfileTab('personal'));
    if (tabBtnSecurity) tabBtnSecurity.addEventListener('click', () => switchProfileTab('security'));
    if (cancelPasswordBtn) cancelPasswordBtn.addEventListener('click', closeProfileModal);

    // Password visibility toggle buttons
    this.container.querySelectorAll('.btn-toggle-pwd-field').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const input = this.container.querySelector(`#${targetId}`);
        if (input) {
          if (input.type === 'password') {
            input.type = 'text';
            btn.textContent = '🙈';
          } else {
            input.type = 'password';
            btn.textContent = '👁️';
          }
        }
      });
    });

    // 5. Change Password Form Submit
    if (passwordForm) {
      const submitPwdBtn = passwordForm.querySelector('#btn-submit-password');
      const btnPwdText = submitPwdBtn?.querySelector('.btn-pwd-text');
      const btnPwdSpinner = submitPwdBtn?.querySelector('.btn-pwd-spinner');

      passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = passwordForm.querySelector('#pwd-current')?.value || '';
        const newPassword = passwordForm.querySelector('#pwd-new')?.value || '';
        const confirmPassword = passwordForm.querySelector('#pwd-confirm')?.value || '';

        if (!currentPassword) {
          if (feedbackBox) {
            feedbackBox.className = 'profile-feedback-box error';
            feedbackBox.textContent = 'Please enter your current password.';
            feedbackBox.style.display = 'block';
          }
          return;
        }

        const pwdCheck = validateStrongPassword(newPassword);
        if (!pwdCheck.isValid) {
          if (feedbackBox) {
            feedbackBox.className = 'profile-feedback-box error';
            feedbackBox.textContent = pwdCheck.message;
            feedbackBox.style.display = 'block';
          }
          return;
        }

        if (newPassword !== confirmPassword) {
          if (feedbackBox) {
            feedbackBox.className = 'profile-feedback-box error';
            feedbackBox.textContent = 'New password and confirmation do not match.';
            feedbackBox.style.display = 'block';
          }
          return;
        }

        if (submitPwdBtn) submitPwdBtn.disabled = true;
        if (btnPwdText) btnPwdText.textContent = 'Updating...';
        if (btnPwdSpinner) btnPwdSpinner.style.display = 'inline-block';
        if (feedbackBox) feedbackBox.style.display = 'none';

        try {
          const res = await StudentService.changePassword(this.profile?.id, currentPassword, newPassword);

          if (res.success) {
            if (feedbackBox) {
              feedbackBox.className = 'profile-feedback-box success';
              feedbackBox.textContent = res.message || 'Password changed successfully!';
              feedbackBox.style.display = 'block';
            }
            passwordForm.reset();
            setTimeout(() => {
              closeProfileModal();
            }, 1200);
          } else {
            if (feedbackBox) {
              feedbackBox.className = 'profile-feedback-box error';
              feedbackBox.textContent = res.message || 'Failed to update password.';
              feedbackBox.style.display = 'block';
            }
          }
        } catch (err) {
          if (feedbackBox) {
            feedbackBox.className = 'profile-feedback-box error';
            feedbackBox.textContent = err?.message || 'Error updating password.';
            feedbackBox.style.display = 'block';
          }
        } finally {
          if (submitPwdBtn) submitPwdBtn.disabled = false;
          if (btnPwdText) btnPwdText.textContent = 'Update Password';
          if (btnPwdSpinner) btnPwdSpinner.style.display = 'none';
        }
      });
    }

    // 6. Profile Form Change Tracking & Submit
    if (profileForm) {
      const saveBtn = this.container.querySelector('#btn-save-profile');
      const trackedInputs = profileForm.querySelectorAll('.profile-track-change');

      // Record baseline values
      const initialValues = {};
      trackedInputs.forEach(input => {
        initialValues[input.name] = input.value || '';
      });

      const checkFormChanges = () => {
        let hasChanges = false;
        trackedInputs.forEach(input => {
          const initial = (initialValues[input.name] || '').trim();
          const current = (input.value || '').trim();
          if (initial !== current) {
            hasChanges = true;
          }
        });

        const nameInput = profileForm.querySelector('#edit-student-name');
        const isNameValid = nameInput && nameInput.value.trim().length > 0;

        if (saveBtn) {
          saveBtn.disabled = !(hasChanges && isNameValid);
        }
      };

      profileForm.addEventListener('input', checkFormChanges);
      profileForm.addEventListener('change', checkFormChanges);

      profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnText = saveBtn?.querySelector('.btn-text');
        const btnSpinner = saveBtn?.querySelector('.btn-spinner');

        const formData = new FormData(profileForm);
        const name = formData.get('name');
        const admissionId = formData.get('admissionId');
        const dateOfBirth = formData.get('dateOfBirth');
        const personalEmail = formData.get('personalEmail');
        const phone = formData.get('phone');
        const parentContact = formData.get('parentContact');

        if (saveBtn) saveBtn.disabled = true;
        if (btnText) btnText.textContent = 'Saving...';
        if (btnSpinner) btnSpinner.style.display = 'inline-block';
        if (feedbackBox) feedbackBox.style.display = 'none';

        try {
          const res = await StudentService.updateProfile(this.profile?.id, {
            name,
            admissionId,
            dateOfBirth,
            personalEmail,
            phone,
            parentContact
          });

          if (res.success) {
            if (feedbackBox) {
              feedbackBox.className = 'profile-feedback-box success';
              feedbackBox.textContent = 'Profile updated successfully!';
              feedbackBox.style.display = 'block';
            }

            // Refresh student state & re-render
            this.profile = await StudentService.getProfile();
            this.currentLecture = await StudentService.getCurrentLecture(this.profile?.sectionId, this.profile?.sectionName, this.profile?.semester);

            setTimeout(async () => {
              closeProfileModal();
              await this.render();
            }, 750);
          } else {
            if (feedbackBox) {
              feedbackBox.className = 'profile-feedback-box error';
              feedbackBox.textContent = res.message || 'Failed to update profile. Please try again.';
              feedbackBox.style.display = 'block';
            }
            if (saveBtn) saveBtn.disabled = false;
          }
        } catch (err) {
          if (feedbackBox) {
            feedbackBox.className = 'profile-feedback-box error';
            feedbackBox.textContent = err?.message || 'Unexpected error while updating profile.';
            feedbackBox.style.display = 'block';
          }
          if (saveBtn) saveBtn.disabled = false;
        } finally {
          if (btnText) btnText.textContent = 'Save Changes';
          if (btnSpinner) btnSpinner.style.display = 'none';
        }
      });
    }

    if (drawerScanBtn) {
      drawerScanBtn.addEventListener('click', () => {
        closeDrawer();
        const scannerModal = this.container.querySelector('#student-scanner-modal');
        if (scannerModal) {
          scannerModal.classList.add('active');
          this.startCameraStream();
        }
      });
    }

    if (drawerRefreshBtn) {
      drawerRefreshBtn.addEventListener('click', async () => {
        closeDrawer();
        drawerRefreshBtn.style.opacity = '0.5';
        try {
          const [freshProfile, freshHistory] = await Promise.all([
            StudentService.getProfile(),
            StudentService.getAttendanceHistory(this.profile?.id)
          ]);
          this.profile = freshProfile;
          this.historyList = freshHistory;
          this.currentLecture = await StudentService.getCurrentLecture(this.profile?.sectionId, this.profile?.sectionName, this.profile?.semester);
        } finally {
          await this.render();
        }
      });
    }

    if (drawerLogoutBtn) {
      drawerLogoutBtn.addEventListener('click', async () => {
        closeDrawer();
        const { AuthService } = await import('../../services/authService.js');
        await AuthService.signOut();
      });
    }

    // 4. Open Camera Scanner Modal from Overview / Action cards
    const openScannerBtn = this.container.querySelector('#btn-open-scanner');
    const scannerModal = this.container.querySelector('#student-scanner-modal');
    const closeScannerBtn = this.container.querySelector('#btn-close-scanner');
    const fileQrInput = this.container.querySelector('#input-qr-file');

    if (openScannerBtn && scannerModal) {
      openScannerBtn.addEventListener('click', () => {
        scannerModal.classList.add('active');
        this.startCameraStream();
      });
    }

    if (closeScannerBtn && scannerModal) {
      closeScannerBtn.addEventListener('click', () => {
        scannerModal.classList.remove('active');
        this.stopCameraStream();
      });
    }

    // 5. Camera Zoom Line & Button Controls (+ / - / slider / presets)
    const zoomSlider = this.container.querySelector('#scanner-zoom-slider');
    const zoomBadge = this.container.querySelector('#zoom-badge-text');
    const zoomInBtn = this.container.querySelector('#btn-zoom-in');
    const zoomOutBtn = this.container.querySelector('#btn-zoom-out');
    const zoomPresetBtns = this.container.querySelectorAll('.btn-zoom-preset');

    const setZoom = (val) => {
      const zoomNum = Math.max(1.0, Math.min(4.0, Number(val) || 1.0));
      const formatted = zoomNum.toFixed(1);
      if (zoomSlider) zoomSlider.value = formatted;
      if (zoomBadge) zoomBadge.textContent = `${formatted}x`;

      zoomPresetBtns.forEach(btn => {
        const pZoom = Number(btn.getAttribute('data-zoom'));
        if (Math.abs(pZoom - zoomNum) < 0.1) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });

      if (this.qrScanner) {
        this.qrScanner.applyZoom(zoomNum);
      }
    };

    if (zoomSlider) {
      zoomSlider.addEventListener('input', (e) => setZoom(e.target.value));
    }

    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => {
        const current = zoomSlider ? Number(zoomSlider.value) : 1.0;
        setZoom(current + 0.5);
      });
    }

    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => {
        const current = zoomSlider ? Number(zoomSlider.value) : 1.0;
        setZoom(current - 0.5);
      });
    }

    zoomPresetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const pZoom = btn.getAttribute('data-zoom');
        if (pZoom) setZoom(pZoom);
      });
    });

    // 6. Scan QR from Image file fallback
    if (fileQrInput) {
      fileQrInput.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
          const { Html5Qrcode } = await import('html5-qrcode');
          const { playScanBeep } = await import('../../utils/audioUtils.js');
          const scannerEl = this.container.querySelector('#camera-stream-viewport');
          if (scannerEl) {
            const html5Qr = new Html5Qrcode('camera-stream-viewport');
            const decodedText = await html5Qr.scanFile(file, true);
            
            // Audio & Haptic Feedback on successful QR detection
            playScanBeep();

            if (scannerModal) scannerModal.classList.remove('active');
            this.stopCameraStream();

            const res = await StudentService.submitAttendanceScan(decodedText, this.profile?.id);

            this.profile = await StudentService.getProfile();
            this.historyList = await StudentService.getAttendanceHistory(this.profile?.id);
            await this.render();

            showScanFeedbackModal({
              success: res.success,
              isDuplicate: res.isDuplicate,
              isWrongSection: res.isWrongSection,
              title: res.success 
                ? 'Attendance Verified!' 
                : (res.isWrongSection ? 'Section Mismatch / Unauthorized' : (res.isDuplicate ? 'Already Recorded' : 'Verification Failed')),
              message: res.message,
              subDetail: res.success 
                ? `Verified from Upload • ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` 
                : (res.isWrongSection ? `Enrolled: Sec ${res.studentSection || '—'} • Lecture: Sec ${res.lectureSection || '—'}` : (res.isDuplicate ? 'Your attendance is already saved in records.' : 'Please upload a valid active session QR'))
            });
          }
        } catch (err) {
          showScanFeedbackModal({
            success: false,
            title: 'Image Decode Failed',
            message: err?.message || 'No valid attendance QR code found in the selected image.'
          });
        }
      });
    }
  }

  startCameraStream() {
    try {
      this.qrScanner = new QRScanner('camera-stream-viewport', {
        onScanSuccess: async (decodedText) => {
          this.stopCameraStream();
          const modal = this.container.querySelector('#student-scanner-modal');
          if (modal) modal.classList.remove('active');

          const res = await StudentService.submitAttendanceScan(decodedText, this.profile?.id);
          
          this.profile = await StudentService.getProfile();
          this.historyList = await StudentService.getAttendanceHistory(this.profile?.id);
          await this.render();

          showScanFeedbackModal({
            success: res.success,
            isDuplicate: res.isDuplicate,
            isWrongSection: res.isWrongSection,
            title: res.success 
              ? 'Attendance Marked!' 
              : (res.isWrongSection ? 'Section Mismatch / Unauthorized' : (res.isDuplicate ? 'Already Recorded' : 'Verification Failed')),
            message: res.message,
            subDetail: res.success 
              ? `Dynamic Anti-Proxy Token Verified • ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` 
              : (res.isWrongSection ? `Enrolled: Sec ${res.studentSection || '—'} • Lecture: Sec ${res.lectureSection || '—'}` : (res.isDuplicate ? 'Your attendance is already saved in institutional records.' : 'Please scan the active live QR on the projector'))
          });
        }
      });
      this.qrScanner.start().then(() => {
        // Reset zoom slider to 1.0x on camera start
        const zoomSlider = this.container.querySelector('#scanner-zoom-slider');
        const zoomBadge = this.container.querySelector('#zoom-badge-text');
        if (zoomSlider) zoomSlider.value = '1.0';
        if (zoomBadge) zoomBadge.textContent = '1.0x';
      }).catch(err => {
        console.warn('Camera access unavailable (try using "Scan from Image" button):', err);
        const statusText = this.container.querySelector('#scanner-status-text');
        if (statusText) {
          statusText.textContent = 'Camera not available. Please use "Scan from Image" below.';
        }
      });
    } catch (err) {
      console.warn('Camera stream startup error:', err);
    }
  }



  stopCameraStream() {
    if (this.qrScanner) {
      this.qrScanner.stop().catch(() => {});
      this.qrScanner = null;
    }
  }
}

export const renderStudentDashboard = async (container) => {
  const app = new StudentDashboardApp(container);
  await app.init();
};

