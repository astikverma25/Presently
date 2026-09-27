import { QRGenerator } from '../../utils/qrGenerator.js';
import { getLocalDateString } from '../../utils/dateUtils.js';
import { generateSessionToken, createDynamicQRPayload, validateStrongPassword, uuidToBase64 } from '../../utils/totpCrypto.js';
import { renderFacultySidebar } from './FacultySidebar.js';
import { renderFacultyTopbar } from './FacultyTopbar.js';
import { renderFacultyOverview } from './FacultyOverview.js';
import { renderFacultyLecturesView } from './FacultyLecturesView.js';
import { renderFacultyQRSession } from './FacultyQRSession.js';
import { renderStudentStreamItem } from './StudentStreamItem.js';
import { renderFacultyAttendanceRecord } from './FacultyAttendanceRecord.js';
import { renderFacultyReportsView } from './FacultyReportsView.js';
import { renderFacultySettingsView } from './FacultySettingsView.js';
import { FacultyService } from '../../services/facultyService.js';
import { QRSessionService } from '../../services/qrSessionService.js';
import { AttendanceService } from '../../services/attendanceService.js';
import { ReportService } from '../../services/reportService.js';

/**
 * Master Faculty Dashboard Module Coordinator
 * Connects directly to Supabase PostgreSQL Database
 */
export class FacultyDashboardApp {
  constructor(container) {
    this.container = container;
    this.currentTab = 'overview'; // 'overview' | 'my-lectures' | 'students' | 'qr-sessions' | 'attendance' | 'reports' | 'settings'
    this.lectureViewMode = 'list'; // 'list' | 'timetable'
    this.timetableWeekOffset = 0; // 0 for current week, -1, +1, etc.
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
      expirySeconds: 10,
      id: null
    };
    this.attendanceRecords = [];
    this.currentAttendanceSection = '';
    this.currentAttendanceLectureId = '';
    this.currentAttendanceDate = getLocalDateString();
    this.unsavedChangesCount = 0;
    this.qrTimerInterval = null;
    this.secondsRemaining = 10;
    this.currentSessionId = null;
    this.activities = [];
    this.isSessionActive = false;
    this.currentQrDataUrl = '';
    this.liveStudents = [];
    this.reportOptions = { sections: [] };
    this.reportConfig = { sectionId: '', subjectId: 'all', startDate: '', endDate: '' };
    this.reportMatrixData = null;
    this.isReportLoading = false;
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

      if (!this.profile || !this.profile.id) {
        // Strict Auth Guard: User is not logged in as a faculty member
        this.container.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; padding: 24px; text-align: center; font-family: var(--font-sans); background: #F8FAFC;">
            <div style="width: 56px; height: 56px; border-radius: 50%; background: #EEF2FF; color: #4F46E5; display: flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 16px;">
              🔒
            </div>
            <h2 style="font-size: 18px; font-weight: 700; color: #1E293B; margin-bottom: 8px;">Faculty Login Required</h2>
            <p style="font-size: 13px; color: #64748B; max-width: 300px; margin-bottom: 20px;">Please log in with your faculty institutional credentials to access this portal.</p>
            <a href="/index.html" style="display: inline-block; padding: 10px 22px; background: #4F46E5; color: #FFFFFF; font-weight: 600; font-size: 13px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);">Go to Login</a>
          </div>
        `;
        setTimeout(() => {
          window.location.href = '/index.html';
        }, 1000);
        return;
      }

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
      const visibleSec = this.activeLecture?.expirySeconds || 10;
      const graceSec = 3;
      const totalTtlSec = visibleSec + graceSec;
      const sessionId = this.currentSessionId || 'sess-live';
      const token = await generateSessionToken(sessionId);

      // Save token state and total expiration (10s visible + 3s grace window) to database
      await QRSessionService.updateSessionToken(sessionId, totalTtlSec, token);

      // Minimalist compact payload format: <compactSessionId>:<token> (22-char Base64URL UUID + 6-char token = 29 bytes)
      const payloadString = `${uuidToBase64(sessionId)}:${token}`;
      this.currentQrDataUrl = await QRGenerator.generateDataURL(payloadString, 1024);

      const qrImg = this.container.querySelector('#qr-img-canvas');
      if (qrImg) {
        qrImg.src = this.currentQrDataUrl;
      }

      // Ensure grace overlay is hidden when new QR is ready
      const graceOverlay = this.container.querySelector('#qr-grace-overlay');
      if (graceOverlay) {
        graceOverlay.classList.remove('active');
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
        this.rawAssignments,
        this.lectureViewMode,
        this.timetableWeekOffset
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
    } else if (this.currentTab === 'reports') {
      if (!this.reportConfig.startDate || !this.reportConfig.endDate) {
        const todayStr = getLocalDateString();
        const d = new Date(todayStr);
        d.setDate(1); // 1st of month
        this.reportConfig.startDate = d.toISOString().split('T')[0];
        this.reportConfig.endDate = todayStr;
      }

      if (!this.reportOptions.sections || this.reportOptions.sections.length === 0) {
        this.reportOptions = await ReportService.getFacultyReportOptions(this.profile?.id);
      }

      if (this.reportOptions.sections.length > 0) {
        if (!this.reportConfig.sectionId) {
          this.reportConfig.sectionId = this.reportOptions.sections[0].sectionId;
        }
        const activeSec = this.reportOptions.sections.find(s => s.sectionId === this.reportConfig.sectionId);
        if (activeSec?.subjects?.length > 0 && (!this.reportConfig.subjectId || this.reportConfig.subjectId === 'all')) {
          this.reportConfig.subjectId = activeSec.subjects[0].subjectId;
        }
      }

      mainViewHTML = renderFacultyReportsView(
        this.reportOptions,
        this.reportConfig,
        this.reportMatrixData,
        this.isReportLoading
      );
    } else if (this.currentTab === 'attendance' || this.currentTab === 'students') {
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
    } else if (this.currentTab === 'settings') {
      mainViewHTML = renderFacultySettingsView(this.profile);
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
    const visibleSec = this.activeLecture?.expirySeconds || 10;
    const graceSec = 3;
    this.timerPhase = 'active'; // 'active' | 'grace'
    this.secondsRemaining = visibleSec;
    this.graceRemaining = graceSec;

    const progressBar = this.container.querySelector('#qr-progress-bar');
    const refreshLabel = this.container.querySelector('#qr-refresh-label');
    const graceOverlay = this.container.querySelector('#qr-grace-overlay');
    const graceNum = this.container.querySelector('#qr-grace-countdown-num');
    const graceCircleBar = this.container.querySelector('#qr-grace-circle-bar');

    if (graceOverlay) {
      graceOverlay.classList.remove('active');
    }

    this.qrTimerInterval = setInterval(async () => {
      if (this.timerPhase === 'active') {
        this.secondsRemaining--;
        if (progressBar) {
          const pct = Math.max(0, (this.secondsRemaining / visibleSec) * 100);
          progressBar.style.width = `${pct}%`;
        }
        if (refreshLabel) {
          refreshLabel.textContent = `Refreshes in ${this.secondsRemaining}s`;
        }

        // Live check-in polling
        if (this.secondsRemaining % 2 === 0) {
          await this.syncLiveStream();
        }

        if (this.secondsRemaining <= 0) {
          // Enter 3-second Grace Window: Cover QR with sleek loading circle
          this.timerPhase = 'grace';
          this.graceRemaining = graceSec;
          if (graceOverlay) {
            graceOverlay.classList.add('active');
          }
          if (graceNum) {
            graceNum.textContent = `${this.graceRemaining}`;
          }
          if (graceCircleBar) {
            graceCircleBar.style.strokeDashoffset = '0';
          }
          if (refreshLabel) {
            refreshLabel.textContent = `Rotating attendance key in ${this.graceRemaining}s...`;
          }
        }
      } else if (this.timerPhase === 'grace') {
        this.graceRemaining--;
        if (graceNum) {
          graceNum.textContent = `${Math.max(1, this.graceRemaining)}`;
        }
        if (graceCircleBar) {
          const circumference = 150.8;
          const offset = circumference * (1 - (this.graceRemaining / graceSec));
          graceCircleBar.style.strokeDashoffset = `${offset}`;
        }
        if (refreshLabel) {
          refreshLabel.textContent = `Rotating attendance key in ${this.graceRemaining}s...`;
        }

        if (this.graceRemaining <= 0) {
          // Grace period finished -> Rotate to brand new QR code
          this.timerPhase = 'active';
          this.secondsRemaining = visibleSec;
          await this.generateDynamicQR();
          if (progressBar) {
            progressBar.style.width = `100%`;
          }
          if (refreshLabel) {
            refreshLabel.textContent = `Refreshes in ${this.secondsRemaining}s`;
          }
          await this.syncLiveStream();
        }
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

    // 3.5 Timetable View Switcher & Week Navigation
    this.container.querySelectorAll('[data-lecture-view]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const mode = btn.getAttribute('data-lecture-view');
        if (this.lectureViewMode === mode) return;
        this.lectureViewMode = mode;
        await this.render();
      });
    });

    const timetablePrevWeekBtn = this.container.querySelector('#btn-timetable-prev-week');
    if (timetablePrevWeekBtn) {
      timetablePrevWeekBtn.addEventListener('click', async () => {
        this.timetableWeekOffset -= 1;
        await this.render();
      });
    }

    const timetableNextWeekBtn = this.container.querySelector('#btn-timetable-next-week');
    if (timetableNextWeekBtn) {
      timetableNextWeekBtn.addEventListener('click', async () => {
        this.timetableWeekOffset += 1;
        await this.render();
      });
    }

    const timetableCurrentWeekBtn = this.container.querySelector('#btn-timetable-current-week');
    if (timetableCurrentWeekBtn) {
      timetableCurrentWeekBtn.addEventListener('click', async () => {
        this.timetableWeekOffset = 0;
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
          expirySeconds: 10
        };

        this.activeLecture = { ...matched, expirySeconds: this.activeLecture?.expirySeconds || 10 };
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

    // 5.5. Full Screen Projector Mode Controls (YouTube-style)
    const fsToggleBtn = this.container.querySelector('#btn-toggle-qr-fullscreen');
    const qrWorkspaceGrid = this.container.querySelector('#qr-live-workspace-grid');

    const updateFullscreenState = () => {
      const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement || qrWorkspaceGrid?.classList.contains('is-fullscreen-fallback'));
      const enterIcon = this.container.querySelector('.fs-icon-enter');
      const exitIcon = this.container.querySelector('.fs-icon-exit');
      const btnLabel = this.container.querySelector('.fs-btn-label');

      if (enterIcon) enterIcon.style.display = isFs ? 'none' : 'inline-block';
      if (exitIcon) exitIcon.style.display = isFs ? 'inline-block' : 'none';
      if (btnLabel) btnLabel.textContent = isFs ? 'Exit Full Screen' : 'Full Screen';
      if (fsToggleBtn) fsToggleBtn.title = isFs ? 'Exit Fullscreen (Esc or F)' : 'Full Screen Projector View (F)';
    };

    const toggleFullscreen = async () => {
      if (!qrWorkspaceGrid) return;

      const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);

      if (!isFs) {
        try {
          if (qrWorkspaceGrid.requestFullscreen) {
            await qrWorkspaceGrid.requestFullscreen();
          } else if (qrWorkspaceGrid.webkitRequestFullscreen) {
            await qrWorkspaceGrid.webkitRequestFullscreen();
          } else if (qrWorkspaceGrid.mozRequestFullScreen) {
            await qrWorkspaceGrid.mozRequestFullScreen();
          } else if (qrWorkspaceGrid.msRequestFullscreen) {
            await qrWorkspaceGrid.msRequestFullscreen();
          } else {
            qrWorkspaceGrid.classList.add('is-fullscreen-fallback');
          }
        } catch (err) {
          console.warn('Fullscreen request failed, using CSS fallback:', err);
          qrWorkspaceGrid.classList.toggle('is-fullscreen-fallback');
        }
      } else {
        try {
          if (document.exitFullscreen) {
            await document.exitFullscreen();
          } else if (document.webkitExitFullscreen) {
            await document.webkitExitFullscreen();
          } else if (document.mozCancelFullScreen) {
            await document.mozCancelFullScreen();
          } else if (document.msExitFullscreen) {
            await document.msExitFullscreen();
          }
        } catch (err) {
          console.warn('Exit fullscreen failed:', err);
        }
        qrWorkspaceGrid.classList.remove('is-fullscreen-fallback');
      }

      updateFullscreenState();
    };

    if (fsToggleBtn) {
      fsToggleBtn.addEventListener('click', toggleFullscreen);
    }

    document.addEventListener('fullscreenchange', updateFullscreenState);
    document.addEventListener('webkitfullscreenchange', updateFullscreenState);

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
          this.activeLecture.expirySeconds = parseInt(e.target.value, 10) || 10;
        }
      });
    }

    // 6. Attendance Record View Events
    if (this.currentTab === 'attendance' || this.currentTab === 'students') {
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

    // 7. Reports Tab Handlers (Section, Subject, Date Range, Matrix Preview, CSV / Excel Download)
    if (this.currentTab === 'reports') {
      const selectSection = this.container.querySelector('#report-select-section');
      const selectSubject = this.container.querySelector('#report-select-subject');
      const inputStartDate = this.container.querySelector('#report-date-start');
      const inputEndDate = this.container.querySelector('#report-date-end');
      const btnGenerate = this.container.querySelector('#btn-generate-report');
      const btnDownloadExcel = this.container.querySelector('#btn-download-excel');
      const btnDownloadCsv = this.container.querySelector('#btn-download-csv');
      const presetButtons = this.container.querySelectorAll('.btn-preset-pill');

      if (selectSection) {
        selectSection.addEventListener('change', async (e) => {
          this.reportConfig.sectionId = e.target.value;
          const activeSec = this.reportOptions.sections.find(s => s.sectionId === this.reportConfig.sectionId);
          this.reportConfig.subjectId = activeSec?.subjects?.[0]?.subjectId || '';
          this.reportMatrixData = null;
          await this.render();
        });
      }

      if (selectSubject) {
        selectSubject.addEventListener('change', (e) => {
          this.reportConfig.subjectId = e.target.value;
        });
      }

      if (inputStartDate) {
        inputStartDate.addEventListener('change', (e) => {
          this.reportConfig.startDate = e.target.value;
        });
      }

      if (inputEndDate) {
        inputEndDate.addEventListener('change', (e) => {
          this.reportConfig.endDate = e.target.value;
        });
      }

      presetButtons.forEach((btn) => {
        btn.addEventListener('click', async () => {
          const preset = btn.getAttribute('data-preset');
          const todayStr = getLocalDateString();
          const today = new Date(todayStr);

          if (preset === 'this_month') {
            const d = new Date(today);
            d.setDate(1);
            this.reportConfig.startDate = d.toISOString().split('T')[0];
            this.reportConfig.endDate = todayStr;
          } else if (preset === 'last_30_days') {
            const d = new Date(today);
            d.setDate(d.getDate() - 30);
            this.reportConfig.startDate = d.toISOString().split('T')[0];
            this.reportConfig.endDate = todayStr;
          } else if (preset === 'this_week') {
            const d = new Date(today);
            const day = d.getDay();
            const diff = (day === 0 ? -6 : 1) - day;
            d.setDate(d.getDate() + diff);
            this.reportConfig.startDate = d.toISOString().split('T')[0];
            this.reportConfig.endDate = todayStr;
          }

          if (this.reportConfig.sectionId) {
            await this.generateReportPreview();
          } else {
            await this.render();
          }
        });
      });

      if (btnGenerate) {
        btnGenerate.addEventListener('click', async () => {
          await this.generateReportPreview();
        });
      }

      if (btnDownloadExcel) {
        btnDownloadExcel.addEventListener('click', () => {
          if (this.reportMatrixData) {
            ReportService.exportMatrixToExcel(this.reportMatrixData);
          }
        });
      }

      if (btnDownloadCsv) {
        btnDownloadCsv.addEventListener('click', () => {
          if (this.reportMatrixData) {
            ReportService.exportMatrixToCSV(this.reportMatrixData);
          }
        });
      }
    }

    // 8. Settings Tab Handlers (Change Password & Change Email)
    if (this.currentTab === 'settings') {
      // Toggle password field visibility
      this.container.querySelectorAll('.btn-toggle-fac-pwd').forEach(btn => {
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

      // Change Password Form Submit
      const pwdForm = this.container.querySelector('#form-faculty-change-password');
      if (pwdForm) {
        pwdForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const currentPwd = pwdForm.querySelector('#faculty-current-password')?.value || '';
          const newPwd = pwdForm.querySelector('#faculty-new-password')?.value || '';
          const confirmPwd = pwdForm.querySelector('#faculty-confirm-password')?.value || '';
          const feedbackBox = this.container.querySelector('#faculty-pwd-feedback');
          const submitBtn = pwdForm.querySelector('#btn-save-faculty-pwd');
          const btnText = submitBtn?.querySelector('.btn-text');
          const btnSpinner = submitBtn?.querySelector('.btn-spinner');

          if (!currentPwd) {
            if (feedbackBox) {
              feedbackBox.style.display = 'block';
              feedbackBox.style.background = '#FEE2E2';
              feedbackBox.style.color = '#B91C1C';
              feedbackBox.textContent = 'Please enter your current password.';
            }
            return;
          }

          const pwdCheck = validateStrongPassword(newPwd);
          if (!pwdCheck.isValid) {
            if (feedbackBox) {
              feedbackBox.style.display = 'block';
              feedbackBox.style.background = '#FEE2E2';
              feedbackBox.style.color = '#B91C1C';
              feedbackBox.textContent = pwdCheck.message;
            }
            return;
          }

          if (newPwd !== confirmPwd) {
            if (feedbackBox) {
              feedbackBox.style.display = 'block';
              feedbackBox.style.background = '#FEE2E2';
              feedbackBox.style.color = '#B91C1C';
              feedbackBox.textContent = 'New password and confirmation do not match.';
            }
            return;
          }

          if (submitBtn) submitBtn.disabled = true;
          if (btnText) btnText.textContent = 'Updating...';
          if (btnSpinner) btnSpinner.style.display = 'inline-block';
          if (feedbackBox) feedbackBox.style.display = 'none';

          try {
            const res = await FacultyService.changePassword(currentPwd, newPwd);
            if (res.success) {
              if (feedbackBox) {
                feedbackBox.style.display = 'block';
                feedbackBox.style.background = '#ECFDF5';
                feedbackBox.style.color = '#047857';
                feedbackBox.textContent = 'Password updated successfully in Supabase Auth!';
              }
              pwdForm.reset();
            } else {
              if (feedbackBox) {
                feedbackBox.style.display = 'block';
                feedbackBox.style.background = '#FEE2E2';
                feedbackBox.style.color = '#B91C1C';
                feedbackBox.textContent = res.message || 'Failed to update password.';
              }
            }
          } catch (err) {
            if (feedbackBox) {
              feedbackBox.style.display = 'block';
              feedbackBox.style.background = '#FEE2E2';
              feedbackBox.style.color = '#B91C1C';
              feedbackBox.textContent = err?.message || 'Error updating password.';
            }
          } finally {
            if (submitBtn) submitBtn.disabled = false;
            if (btnText) btnText.textContent = 'Update Password';
            if (btnSpinner) btnSpinner.style.display = 'none';
          }
        });
      }

      // Change Email Form Submit
      const emailForm = this.container.querySelector('#form-faculty-change-email');
      if (emailForm) {
        emailForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const currentPwd = emailForm.querySelector('#faculty-email-current-password')?.value || '';
          const newEmail = emailForm.querySelector('#faculty-new-email')?.value || '';
          const feedbackBox = this.container.querySelector('#faculty-email-feedback');
          const submitBtn = emailForm.querySelector('#btn-save-faculty-email');
          const btnText = submitBtn?.querySelector('.btn-text');
          const btnSpinner = submitBtn?.querySelector('.btn-spinner');

          if (!currentPwd) {
            if (feedbackBox) {
              feedbackBox.style.display = 'block';
              feedbackBox.style.background = '#FEE2E2';
              feedbackBox.style.color = '#B91C1C';
              feedbackBox.textContent = 'Please enter your current password for security verification.';
            }
            return;
          }

          if (!newEmail || !newEmail.includes('@')) {
            if (feedbackBox) {
              feedbackBox.style.display = 'block';
              feedbackBox.style.background = '#FEE2E2';
              feedbackBox.style.color = '#B91C1C';
              feedbackBox.textContent = 'Please enter a valid email address.';
            }
            return;
          }

          if (submitBtn) submitBtn.disabled = true;
          if (btnText) btnText.textContent = 'Updating...';
          if (btnSpinner) btnSpinner.style.display = 'inline-block';
          if (feedbackBox) feedbackBox.style.display = 'none';

          try {
            const res = await FacultyService.changeEmail(this.profile?.id, newEmail, currentPwd);
            if (res.success) {
              if (feedbackBox) {
                feedbackBox.style.display = 'block';
                feedbackBox.style.background = '#ECFDF5';
                feedbackBox.style.color = '#047857';
                feedbackBox.textContent = res.message || 'Email updated successfully in both Supabase Auth and database!';
              }
              // Refresh profile
              this.profile = await FacultyService.getProfile();
              setTimeout(async () => {
                await this.render();
              }, 1200);
            } else {
              if (feedbackBox) {
                feedbackBox.style.display = 'block';
                feedbackBox.style.background = '#FEE2E2';
                feedbackBox.style.color = '#B91C1C';
                feedbackBox.textContent = res.message || 'Failed to update email.';
              }
            }
          } catch (err) {
            if (feedbackBox) {
              feedbackBox.style.display = 'block';
              feedbackBox.style.background = '#FEE2E2';
              feedbackBox.style.color = '#B91C1C';
              feedbackBox.textContent = err?.message || 'Error updating email.';
            }
          } finally {
            if (submitBtn) submitBtn.disabled = false;
            if (btnText) btnText.textContent = 'Update Email in Auth & DB';
            if (btnSpinner) btnSpinner.style.display = 'none';
          }
        });
      }
    }
  }

  /**
   * Generates Multi-Date Attendance Matrix for Reports
   */
  async generateReportPreview() {
    if (!this.reportConfig.sectionId) {
      alert('Please select a Class / Section first.');
      return;
    }
    if (!this.reportConfig.startDate || !this.reportConfig.endDate) {
      alert('Please select both Start Date and End Date.');
      return;
    }
    if (this.reportConfig.startDate > this.reportConfig.endDate) {
      alert('Start Date cannot be after End Date.');
      return;
    }

    this.isReportLoading = true;
    await this.render();

    try {
      this.reportMatrixData = await ReportService.generateAttendanceMatrix(
        this.profile?.id,
        this.reportConfig
      );
    } catch (err) {
      alert(`Failed to generate attendance report: ${err.message || 'Database error'}`);
      this.reportMatrixData = null;
    } finally {
      this.isReportLoading = false;
      await this.render();
    }
  }
}

export const renderStaffDashboard = async (container) => {
  const app = new FacultyDashboardApp(container);
  await app.init();
};
