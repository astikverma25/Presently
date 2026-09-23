import { QRGenerator } from '../../utils/qrGenerator.js';
import { getLocalDateString } from '../../utils/dateUtils.js';
import { createDynamicQRPayload } from '../../utils/totpCrypto.js';
import { renderFacultySidebar } from './FacultySidebar.js';
import { renderFacultyTopbar } from './FacultyTopbar.js';
import { renderFacultyOverview } from './FacultyOverview.js';
import { renderFacultyLecturesView } from './FacultyLecturesView.js';
import { renderFacultyQRSession } from './FacultyQRSession.js';
import { renderStudentStreamItem } from './StudentStreamItem.js';
import { renderFacultyAttendanceRecord } from './FacultyAttendanceRecord.js';
import { FacultyService } from '../../services/facultyService.js';
import { QRSessionService } from '../../services/qrSessionService.js';
import { AttendanceService } from '../../services/attendanceService.js';

/**
 * Master Faculty Dashboard Module Coordinator
 * Connects directly to Supabase PostgreSQL Database
 */
export class FacultyDashboardApp {
  constructor(container) {
    this.container = container;
    this.currentTab = 'overview'; // 'overview' | 'my-lectures' | 'students' | 'qr-sessions' | 'attendance' | 'reports' | 'settings'
    this.profile = null;
    this.kpis = null;
    this.rawAssignments = [];
    this.lectures = [];
    this.lectureFilter = 'today'; // 'yesterday' | 'today' | 'tomorrow' | 'this_week' | 'custom'
    this.selectedLectureDate = getLocalDateString();
    this.sectionAttendance = [];
    this.activeLecture = {
      className: '',
      section: '',
      room: '',
      studentsCount: 0,
      expirySeconds: 15,
      id: null
    };
    this.attendanceRecords = [];
    this.currentAttendanceSection = '';
    this.currentAttendanceLectureId = '';
    this.currentAttendanceDate = getLocalDateString();
    this.unsavedChangesCount = 0;
    this.qrTimerInterval = null;
    this.secondsRemaining = 15;
    this.currentSessionId = null;
    this.activities = [];
    this.isSessionActive = false;
    this.currentQrDataUrl = '';
    this.liveStudents = [];
  }

  async init() {
    this.container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: var(--font-sans); color: var(--text-muted);">
        <div style="text-align: center;">
          <div style="width: 40px; height: 40px; border: 3px solid #E0E7FF; border-top-color: #4F46E5; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px;"></div>
          <p style="font-weight: 600; color: #1E293B;">Loading Faculty Portal...</p>
        </div>
      </div>
      <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    `;

    try {
      this.profile = await FacultyService.getProfile();
      this.rawAssignments = await FacultyService.getAllAssignments(this.profile?.id);
      this.lectures = FacultyService.filterAndSortLectures(this.rawAssignments, this.lectureFilter, this.selectedLectureDate);
      this.kpis = await FacultyService.getKPIs(this.profile?.id, this.lectures);
      this.sectionAttendance = await FacultyService.getSectionAttendance(this.profile?.id);
      this.activities = await FacultyService.getRecentActivities();

      if (this.currentAttendanceSection) {
        await this.refreshAttendance();
      } else {
        this.attendanceRecords = [];
      }
    } catch (err) {
      console.error('Faculty portal initialization error:', err);
    } finally {
      await this.render();
    }
  }

  async refreshAttendance() {
    if (!this.currentAttendanceSection) {
      this.attendanceRecords = [];
      return;
    }

    const dateLectures = (this.rawAssignments || []).filter(l => 
      l.lecDate === this.currentAttendanceDate || l.rawLecDate === this.currentAttendanceDate
    );

    const sectionLectures = dateLectures.filter(l => 
      (l.section || '').toLowerCase() === this.currentAttendanceSection.toLowerCase()
    );

    if (sectionLectures.length === 1 && !this.currentAttendanceLectureId) {
      this.currentAttendanceLectureId = sectionLectures[0].id;
    }

    const matchedLecture = sectionLectures.find(l => l.id === this.currentAttendanceLectureId);

    this.attendanceRecords = await AttendanceService.getAttendanceRecords(
      this.currentAttendanceSection,
      this.currentAttendanceDate,
      matchedLecture?.id || null,
      matchedLecture?.lecId || null
    );
  }

  async generateDynamicQR() {
    try {
      const expirySec = this.activeLecture?.expirySeconds || 15;
      const payloadObj = await createDynamicQRPayload({
        sessionId: this.currentSessionId || 'sess-live',
        assignmentId: this.activeLecture?.id || null,
        lecId: this.activeLecture?.lecId || null,
        className: this.activeLecture?.className,
        section: this.activeLecture?.section
      }, expirySec);

      // Save token state to database session record
      await QRSessionService.updateSessionToken(this.currentSessionId, expirySec, payloadObj.sig);

      const payloadString = JSON.stringify(payloadObj);
      this.currentQrDataUrl = await QRGenerator.generateDataURL(payloadString, 280);

      const qrImg = this.container.querySelector('#qr-img-canvas');
      if (qrImg) {
        qrImg.src = this.currentQrDataUrl;
      }
    } catch (err) {
      console.warn('QR Code generation error:', err);
    }
  }

  async startLiveSession() {
    this.isSessionActive = true;
    const session = await QRSessionService.startSession(this.activeLecture.id, this.activeLecture.expirySeconds || 15);
    this.currentSessionId = session.id;
    this.liveStudents = await QRSessionService.getLiveSessionStudents(
      this.activeLecture.section, 
      this.currentSessionId, 
      this.activeLecture.id,
      this.currentAttendanceDate,
      this.activeLecture.lecId
    );
    await this.generateDynamicQR();
    await this.render();
  }

  async stopLiveSession() {
    clearInterval(this.qrTimerInterval);
    this.isSessionActive = false;
    await QRSessionService.closeSession(this.currentSessionId, {
      assignmentId: this.activeLecture?.id || null,
      lecId: this.activeLecture?.lecId || null,
      section: this.activeLecture?.section || '',
      sectionId: this.activeLecture?.sectionId || null,
      lectureDate: this.currentAttendanceDate || getLocalDateString(),
      className: this.activeLecture?.className || ''
    });

    // Update assignment status locally
    if (this.activeLecture?.id && this.rawAssignments) {
      const targetAssign = this.rawAssignments.find(a => a.id === this.activeLecture.id);
      if (targetAssign) {
        targetAssign.status = 'completed';
      }
    }

    alert(`Attendance session for ${this.activeLecture.className || 'Lecture'} - Sec ${this.activeLecture.section || ''} submitted and saved to database! All unscanned students have been marked absent.`);
    this.currentAttendanceSection = this.activeLecture.section || '2A';
    this.currentAttendanceLectureId = this.activeLecture.id || '';
    this.currentTab = 'attendance';
    await this.refreshAttendance();
    await this.render();
  }

  async render() {
    let mainViewHTML = '';

    if (this.currentTab === 'overview') {
      const todayLectures = FacultyService.filterAndSortLectures(
        this.rawAssignments, 
        'today', 
        getLocalDateString()
      );
      mainViewHTML = await renderFacultyOverview(
        todayLectures, 
        this.sectionAttendance, 
        this.kpis, 
        this.activities
      );
    } else if (this.currentTab === 'my-lectures') {
      this.lectures = FacultyService.filterAndSortLectures(
        this.rawAssignments, 
        this.lectureFilter, 
        this.selectedLectureDate
      );
      mainViewHTML = renderFacultyLecturesView(
        this.lectures, 
        this.lectureFilter, 
        this.selectedLectureDate, 
        this.rawAssignments
      );
    } else if (this.currentTab === 'qr-sessions') {
      if (this.activeLecture?.section && (!this.liveStudents || !this.liveStudents.length)) {
        this.liveStudents = await QRSessionService.getLiveSessionStudents(
          this.activeLecture.section, 
          this.currentSessionId, 
          this.activeLecture.id,
          this.currentAttendanceDate,
          this.activeLecture.lecId
        );
      }
      mainViewHTML = renderFacultyQRSession(
        this.activeLecture, 
        this.liveStudents, 
        this.rawAssignments, 
        this.isSessionActive, 
        this.currentQrDataUrl,
        this.currentAttendanceDate
      );
    } else if (this.currentTab === 'attendance' || this.currentTab === 'students' || this.currentTab === 'reports') {
      mainViewHTML = renderFacultyAttendanceRecord(
        this.attendanceRecords,
        {
          section: this.currentAttendanceSection,
          lectureId: this.currentAttendanceLectureId,
          date: this.currentAttendanceDate,
          unsavedCount: this.unsavedChangesCount
        },
        this.rawAssignments
      );
    } else {
      const todayLectures = FacultyService.filterAndSortLectures(
        this.rawAssignments, 
        'today', 
        getLocalDateString()
      );
      mainViewHTML = await renderFacultyOverview(
        todayLectures, 
        this.sectionAttendance, 
        this.kpis, 
        this.activities
      );
    }

    this.container.innerHTML = `
      <div class="dashboard-layout">
        ${renderFacultySidebar(this.currentTab)}
        <main class="dashboard-main">
          ${renderFacultyTopbar(this.profile)}
          <div class="dashboard-content-area">
            ${mainViewHTML}
          </div>
        </main>
      </div>
    `;

    this.attachEventListeners();

    if (this.currentTab === 'qr-sessions' && this.isSessionActive) {
      this.startQRCountdown();
    } else {
      clearInterval(this.qrTimerInterval);
    }
  }

  async syncLiveStream() {
    if (!this.activeLecture?.section) return;
    try {
      const updatedStudents = await QRSessionService.getLiveSessionStudents(
        this.activeLecture.section, 
        this.currentSessionId, 
        this.activeLecture.id,
        this.currentAttendanceDate,
        this.activeLecture.lecId
      );
      this.liveStudents = updatedStudents;
      
      const markedCount = updatedStudents.filter(s => s.status === 'marked').length;
      const markedCountEl = this.container.querySelector('#marked-count');
      if (markedCountEl) {
        markedCountEl.textContent = markedCount;
      }

      // Re-render the student stream list so newly checked-in students instantly float to the top
      const streamListEl = this.container.querySelector('.stream-list');
      if (streamListEl && updatedStudents.length > 0) {
        streamListEl.innerHTML = updatedStudents.map(renderStudentStreamItem).join('');
      }
    } catch (err) {
      console.warn('Sync live stream error:', err);
    }
  }

  startQRCountdown() {
    clearInterval(this.qrTimerInterval);
    const totalSec = this.activeLecture.expirySeconds || 15;
    this.secondsRemaining = totalSec;

    const progressBar = this.container.querySelector('#qr-progress-bar');
    const refreshLabel = this.container.querySelector('#qr-refresh-label');

    this.qrTimerInterval = setInterval(async () => {
      this.secondsRemaining--;
      if (progressBar) {
        const pct = Math.max(0, (this.secondsRemaining / totalSec) * 100);
        progressBar.style.width = `${pct}%`;
      }
      if (refreshLabel) {
        refreshLabel.textContent = `Refreshes in ${this.secondsRemaining}s`;
      }

      // Poll check-ins every 2 seconds for ultra-responsive live roster updates
      if (this.secondsRemaining % 2 === 0) {
        await this.syncLiveStream();
      }

      if (this.secondsRemaining <= 0) {
        this.secondsRemaining = totalSec;
        const qrBox = this.container.querySelector('#dynamic-qr-box');
        if (qrBox) {
          qrBox.style.opacity = '0.5';
          await this.generateDynamicQR();
          setTimeout(() => { if (qrBox) qrBox.style.opacity = '1'; }, 200);
        }
        await this.syncLiveStream();
      }
    }, 1000);
  }

  attachEventListeners() {
    // 1. Sidebar Nav
    this.container.querySelectorAll('.sidebar-nav-item button').forEach(btn => {
      btn.addEventListener('click', async () => {
        const nextTab = btn.getAttribute('data-nav');
        if (this.currentTab === nextTab) return;
        this.currentTab = nextTab;

        if (this.currentTab === 'my-lectures') {
          this.lectures = FacultyService.filterAndSortLectures(
            this.rawAssignments, 
            this.lectureFilter, 
            this.selectedLectureDate
          );
        } else if (this.currentTab === 'attendance' && this.currentAttendanceSection && !this.attendanceRecords.length) {
          await this.refreshAttendance();
        }

        await this.render();
      });
    });

    // 2. Date Filter Strip Pills (Yesterday, Today, Tomorrow, This Week)
    this.container.querySelectorAll('[data-lecture-filter]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const chosenFilter = btn.getAttribute('data-lecture-filter');
        this.lectureFilter = chosenFilter;
        
        const now = new Date();
        if (chosenFilter === 'today') {
          this.selectedLectureDate = getLocalDateString(now);
        } else if (chosenFilter === 'yesterday') {
          const y = new Date(now);
          y.setDate(y.getDate() - 1);
          this.selectedLectureDate = getLocalDateString(y);
        } else if (chosenFilter === 'tomorrow') {
          const t = new Date(now);
          t.setDate(t.getDate() + 1);
          this.selectedLectureDate = getLocalDateString(t);
        }

        this.lectures = FacultyService.filterAndSortLectures(
          this.rawAssignments, 
          this.lectureFilter, 
          this.selectedLectureDate
        );
        await this.render();
      });
    });

    // 3. Date Picker Input & Trigger Button in Filter Strip
    const dateInput = this.container.querySelector('#input-faculty-lecture-date');
    const dateTriggerBtn = this.container.querySelector('#btn-trigger-lecture-date');

    if (dateTriggerBtn && dateInput) {
      dateTriggerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof dateInput.showPicker === 'function') {
          dateInput.showPicker();
        } else {
          dateInput.click();
        }
      });

      dateInput.addEventListener('change', async (e) => {
        if (!e.target.value) return;
        this.selectedLectureDate = e.target.value;
        this.lectureFilter = 'custom';
        this.lectures = FacultyService.filterAndSortLectures(
          this.rawAssignments, 
          this.lectureFilter, 
          this.selectedLectureDate
        );
        await this.render();
      });
    }

    // 4. View Schedule Button in Overview Panel
    const viewScheduleBtn = this.container.querySelector('#btn-view-schedule');
    if (viewScheduleBtn) {
      viewScheduleBtn.addEventListener('click', async () => {
        this.currentTab = 'my-lectures';
        await this.render();
      });
    }

    const facultyLogoutBtn = this.container.querySelector('#btn-faculty-logout');
    if (facultyLogoutBtn) {
      facultyLogoutBtn.addEventListener('click', async () => {
        const { AuthService } = await import('../../services/authService.js');
        await AuthService.signOut();
      });
    }

    // 5. Overview: "Start attendance session" CTA
    const gotoQRBtn = this.container.querySelector('#btn-goto-qr-session');
    if (gotoQRBtn) {
      gotoQRBtn.addEventListener('click', async () => {
        this.currentTab = 'qr-sessions';
        await this.render();
      });
    }

    // 6. Overview & My Lectures: Lecture Cards Click
    this.container.querySelectorAll('.lecture-card').forEach(card => {
      card.addEventListener('click', async () => {
        const lName = card.getAttribute('data-class');
        const sName = card.getAttribute('data-section');
        const lId = card.getAttribute('data-lecture-id');

        const matched = this.lectures.find(l => l.id === lId) || 
                        this.rawAssignments.find(l => l.id === lId) || {
          id: lId,
          className: lName,
          section: sName,
          room: 'Room 201',
          studentsCount: 48,
          expirySeconds: 15
        };

        this.activeLecture = { ...matched, expirySeconds: 15 };
        this.currentAttendanceDate = matched.lecDate || getLocalDateString();
        this.currentAttendanceSection = matched.section;
        this.currentAttendanceLectureId = matched.id;
        this.liveStudents = await QRSessionService.getLiveSessionStudents(
          this.activeLecture.section, 
          this.currentSessionId, 
          this.activeLecture.id,
          this.currentAttendanceDate,
          this.activeLecture.lecId
        );
        this.currentTab = 'qr-sessions';
        await this.render();
      });
    });

    // 4. QR Session: Start session button (Header + Card)
    const startSessionBtn = this.container.querySelector('#btn-start-live-session');
    const startSessionCardBtn = this.container.querySelector('#btn-start-live-session-card');
    
    if (startSessionBtn) {
      startSessionBtn.addEventListener('click', async () => {
        await this.startLiveSession();
      });
    }
    if (startSessionCardBtn) {
      startSessionCardBtn.addEventListener('click', async () => {
        await this.startLiveSession();
      });
    }

    // 5. QR Session: End session button (Header + Card)
    const endSessionBtn = this.container.querySelector('#btn-end-live-session');
    const endSessionCardBtn = this.container.querySelector('#btn-end-live-session-card');
    
    if (endSessionBtn) {
      endSessionBtn.addEventListener('click', async () => {
        await this.stopLiveSession();
      });
    }
    if (endSessionCardBtn) {
      endSessionCardBtn.addEventListener('click', async () => {
        await this.stopLiveSession();
      });
    }

    // 6. QR Session: Configuration selectors (Date -> Section -> Lecture -> Expiry)
    const inputQrDate = this.container.querySelector('#input-qr-date');
    const selectQrSection = this.container.querySelector('#select-qr-section');
    const selectQrLecture = this.container.querySelector('#select-qr-lecture');
    const inputExpiry = this.container.querySelector('#input-expiry');

    if (inputQrDate) {
      inputQrDate.addEventListener('change', async (e) => {
        this.currentAttendanceDate = e.target.value;
        const dateLectures = (this.rawAssignments || []).filter(l => 
          l.lecDate === this.currentAttendanceDate || l.rawLecDate === this.currentAttendanceDate
        );
        const availableSections = [...new Set(dateLectures.map(l => l.section).filter(Boolean))];

        const isCurrentSecValid = this.activeLecture?.section && availableSections.some(s => (s || '').toLowerCase() === (this.activeLecture.section || '').toLowerCase());

        if (isCurrentSecValid) {
          const secLectures = dateLectures.filter(l => (l.section || '').toLowerCase() === this.activeLecture.section.toLowerCase());
          if (secLectures.length === 1) {
            this.activeLecture = { ...secLectures[0], expirySeconds: this.activeLecture?.expirySeconds || 15 };
          } else if (secLectures.some(l => l.id === this.activeLecture?.id)) {
            const matched = secLectures.find(l => l.id === this.activeLecture.id);
            this.activeLecture = { ...matched, expirySeconds: this.activeLecture?.expirySeconds || 15 };
          } else {
            this.activeLecture = {
              className: '',
              section: this.activeLecture.section,
              room: '',
              studentsCount: 0,
              expirySeconds: this.activeLecture?.expirySeconds || 15,
              id: null
            };
          }
        } else if (availableSections.length === 1) {
          const autoSec = availableSections[0];
          const secLectures = dateLectures.filter(l => (l.section || '').toLowerCase() === autoSec.toLowerCase());
          if (secLectures.length === 1) {
            this.activeLecture = { ...secLectures[0], expirySeconds: this.activeLecture?.expirySeconds || 15 };
          } else {
            this.activeLecture = {
              className: '',
              section: autoSec,
              room: '',
              studentsCount: 0,
              expirySeconds: this.activeLecture?.expirySeconds || 15,
              id: null
            };
          }
        } else {
          this.activeLecture = {
            className: '',
            section: '',
            room: '',
            studentsCount: 0,
            expirySeconds: this.activeLecture?.expirySeconds || 15,
            id: null
          };
        }

        this.liveStudents = await QRSessionService.getLiveSessionStudents(
          this.activeLecture?.section, 
          this.currentSessionId, 
          this.activeLecture?.id,
          this.currentAttendanceDate,
          this.activeLecture?.lecId
        );
        await this.render();
      });
    }

    if (selectQrSection) {
      selectQrSection.addEventListener('change', async (e) => {
        const chosenSec = e.target.value;
        const dateLectures = (this.rawAssignments || []).filter(l => 
          l.lecDate === this.currentAttendanceDate || l.rawLecDate === this.currentAttendanceDate
        );
        const sectionLectures = dateLectures.filter(l => 
          (l.section || '').toLowerCase() === (chosenSec || '').toLowerCase()
        );

        if (sectionLectures.length === 1) {
          this.activeLecture = { ...sectionLectures[0], expirySeconds: this.activeLecture?.expirySeconds || 15 };
        } else {
          this.activeLecture = {
            className: '',
            section: chosenSec,
            room: '',
            studentsCount: 0,
            expirySeconds: this.activeLecture?.expirySeconds || 15,
            id: null
          };
        }
        this.liveStudents = await QRSessionService.getLiveSessionStudents(
          this.activeLecture.section, 
          this.currentSessionId, 
          this.activeLecture.id,
          this.currentAttendanceDate,
          this.activeLecture.lecId
        );
        await this.render();
      });
    }

    if (selectQrLecture) {
      selectQrLecture.addEventListener('change', async (e) => {
        const chosenLecId = e.target.value;
        const matched = (this.rawAssignments || []).find(l => l.id === chosenLecId);
        if (matched) {
          this.activeLecture = { ...matched, expirySeconds: this.activeLecture?.expirySeconds || 15 };
          this.liveStudents = await QRSessionService.getLiveSessionStudents(
            this.activeLecture.section, 
            this.currentSessionId, 
            this.activeLecture.id,
            this.currentAttendanceDate,
            this.activeLecture.lecId
          );
          await this.render();
        }
      });
    }

    if (inputExpiry) {
      inputExpiry.addEventListener('change', (e) => {
        if (this.activeLecture) {
          this.activeLecture.expirySeconds = parseInt(e.target.value, 10) || 15;
        }
      });
    }

    // 6. Attendance Record View Events
    if (this.currentTab === 'attendance' || this.currentTab === 'students' || this.currentTab === 'reports') {
      // Toggle Status Pills (Present <-> Absent)
      this.container.querySelectorAll('.btn-status-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          const sno = parseInt(pill.getAttribute('data-sno'), 10);
          const currentStatus = pill.getAttribute('data-status');
          const newStatus = currentStatus === 'Present' ? 'Absent' : 'Present';

          const target = this.attendanceRecords.find(r => r.sNo === sno);
          if (target) {
            target.status = newStatus;
            target.markedAt = newStatus === 'Present' 
              ? new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) 
              : '—';
            this.unsavedChangesCount++;

            // Update UI element directly
            pill.setAttribute('data-status', newStatus);
            pill.className = `btn-status-pill ${newStatus.toLowerCase()}`;
            pill.textContent = newStatus;

            const row = pill.closest('tr');
            if (row) {
              const timeCol = row.querySelector('.col-time');
              if (timeCol) timeCol.textContent = target.markedAt;
            }

            const unsavedIndicator = this.container.querySelector('#unsaved-indicator');
            if (unsavedIndicator) {
              unsavedIndicator.textContent = `${this.unsavedChangesCount} unsaved changes`;
              unsavedIndicator.classList.add('has-unsaved');
            }

            const saveBtn = this.container.querySelector('#btn-save-attendance');
            if (saveBtn) {
              saveBtn.disabled = false;
              saveBtn.classList.remove('disabled');
              saveBtn.classList.add('active');
            }
          }
        });
      });

      // Export Attendance CSV
      const exportBtn = this.container.querySelector('#btn-export-attendance');
      if (exportBtn) {
        exportBtn.addEventListener('click', () => {
          const filename = `Attendance_${this.currentAttendanceSection.replace(/\s+/g, '_')}_${this.currentAttendanceDate}.csv`;
          AttendanceService.exportRecords(this.attendanceRecords, filename);
        });
      }

      // Save Changes
      const saveBtn = this.container.querySelector('#btn-save-attendance');
      if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
          saveBtn.disabled = true;
          saveBtn.textContent = 'Saving to Database...';

          try {
            const allAssignments = this.rawAssignments || this.lectures || [];
            const matchedLecture = allAssignments.find(l => l.id === this.currentAttendanceLectureId) ||
                                  allAssignments.find(l => (l.section || '').toLowerCase() === (this.currentAttendanceSection || '').toLowerCase() && (l.lecDate === this.currentAttendanceDate || l.rawLecDate === this.currentAttendanceDate)) ||
                                  allAssignments.find(l => (l.section || '').toLowerCase() === (this.currentAttendanceSection || '').toLowerCase());

            await AttendanceService.saveAttendanceChanges(
              this.currentAttendanceSection,
              this.currentAttendanceDate,
              this.attendanceRecords,
              {
                facultyAssignmentId: matchedLecture?.id || this.currentAttendanceLectureId || null,
                lecId: matchedLecture?.lecId || null
              }
            );
            this.unsavedChangesCount = 0;
            alert('Attendance records saved successfully!');
            await this.refreshAttendance();
            await this.render();
          } catch (err) {
            alert(`Failed to save attendance: ${err.message || 'Database error'}`);
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save changes';
          }
        });
      }

      // Section, Lecture, and Date Filter Selectors
      const selectAttSection = this.container.querySelector('#select-att-section');
      const selectAttLecture = this.container.querySelector('#select-att-lecture');
      const inputAttDate = this.container.querySelector('#input-att-date');

      if (selectAttSection) {
        selectAttSection.addEventListener('change', async (e) => {
          this.currentAttendanceSection = e.target.value;
          const dateLectures = (this.rawAssignments || []).filter(l => 
            l.lecDate === this.currentAttendanceDate || l.rawLecDate === this.currentAttendanceDate
          );
          const sectionLectures = dateLectures.filter(l => 
            (l.section || '').toLowerCase() === (this.currentAttendanceSection || '').toLowerCase()
          );
          if (sectionLectures.length === 1) {
            this.currentAttendanceLectureId = sectionLectures[0].id;
          } else {
            this.currentAttendanceLectureId = '';
          }
          await this.refreshAttendance();
          await this.render();
        });
      }

      if (selectAttLecture) {
        selectAttLecture.addEventListener('change', async (e) => {
          this.currentAttendanceLectureId = e.target.value;
          await this.refreshAttendance();
          await this.render();
        });
      }

      if (inputAttDate) {
        inputAttDate.addEventListener('change', async (e) => {
          this.currentAttendanceDate = e.target.value;
          const dateLectures = (this.rawAssignments || []).filter(l => 
            l.lecDate === this.currentAttendanceDate || l.rawLecDate === this.currentAttendanceDate
          );
          const availableSections = [...new Set(dateLectures.map(l => l.section).filter(Boolean))];
          if (this.currentAttendanceSection && !availableSections.some(s => s.toLowerCase() === this.currentAttendanceSection.toLowerCase())) {
            this.currentAttendanceSection = availableSections.length === 1 ? availableSections[0] : '';
            this.currentAttendanceLectureId = '';
          }
          await this.refreshAttendance();
          await this.render();
        });
      }
    }
  }
}

export const renderStaffDashboard = async (container) => {
  const app = new FacultyDashboardApp(container);
  await app.init();
};
