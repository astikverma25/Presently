import { renderStudentHeader } from './StudentHeader.js';
import { renderStudentOverview } from './StudentOverview.js';
import { renderStudentHistory } from './StudentHistory.js';
import { renderStudentBottomNav } from './StudentBottomNav.js';
import { renderStudentScannerModal } from './StudentScannerModal.js';
import { showScanFeedbackModal } from './ScanFeedbackModal.js';
import { StudentService } from '../../services/studentService.js';
import { QRScanner } from '../qr/QRScanner.js';

/**
 * Master Student Dashboard Module Coordinator (Mobile-First)
 */
export class StudentDashboardApp {
  constructor(container) {
    this.container = container;
    this.currentTab = 'overview'; // 'overview' | 'history'
    this.profile = null;
    this.currentLecture = null;
    this.historyList = [];
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
      this.currentLecture = await StudentService.getCurrentLecture(this.profile?.sectionId, this.profile?.sectionName);
      this.historyList = await StudentService.getAttendanceHistory(this.profile?.id);
    } catch (err) {
      console.error('Student Portal load error:', err);
    } finally {
      await this.render();
    }
  }

  async render() {
    let tabContentHTML = '';
    if (this.currentTab === 'overview') {
      tabContentHTML = renderStudentOverview(this.profile, this.currentLecture, this.historyList);
    } else if (this.currentTab === 'history') {
      tabContentHTML = renderStudentHistory(this.historyList);
    } else {
      tabContentHTML = renderStudentOverview(this.profile, this.currentLecture, this.historyList);
    }

    this.container.innerHTML = `
      <div class="student-mobile-container">
        ${renderStudentHeader(this.profile)}
        
        <div class="student-scroll-content">
          ${tabContentHTML}
        </div>

        ${renderStudentBottomNav(this.currentTab)}
        ${renderStudentScannerModal()}
      </div>
    `;

    this.attachEventListeners();
  }

  attachEventListeners() {
    // 1. Bottom Nav Tab Switching
    this.container.querySelectorAll('.bottom-nav-item').forEach(btn => {
      btn.addEventListener('click', async () => {
        this.currentTab = btn.getAttribute('data-tab');
        if (this.currentTab === 'history') {
          this.historyList = await StudentService.getAttendanceHistory(this.profile?.id);
        } else if (this.currentTab === 'overview') {
          this.profile = await StudentService.getProfile();
          this.historyList = await StudentService.getAttendanceHistory(this.profile?.id);
          this.currentLecture = await StudentService.getCurrentLecture(this.profile?.sectionId, this.profile?.sectionName);
        }
        await this.render();
      });
    });

    const studentLogoutBtn = this.container.querySelector('#btn-student-logout');
    if (studentLogoutBtn) {
      studentLogoutBtn.addEventListener('click', async () => {
        const { AuthService } = await import('../../services/authService.js');
        await AuthService.signOut();
      });
    }

    // 2. Open Camera Scanner Modal
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

    // 3. Scan QR from Image file fallback
    if (fileQrInput) {
      fileQrInput.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
          const { Html5Qrcode } = await import('html5-qrcode');
          const scannerEl = this.container.querySelector('#camera-stream-viewport');
          if (scannerEl) {
            const html5Qr = new Html5Qrcode('camera-stream-viewport');
            const decodedText = await html5Qr.scanFile(file, true);
            
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
      this.qrScanner.start().catch(err => {
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
