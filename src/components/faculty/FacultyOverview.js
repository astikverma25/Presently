import { renderLectureCard } from './LectureCard.js';
import { renderAttendanceProgressBar } from './AttendanceProgressBar.js';
import { FacultyService } from '../../services/facultyService.js';

/**
 * Overview View Component (100% Real Live Supabase Data)
 * Exclusively displays Today's Lectures & Real-time Progress
 */
export const renderFacultyOverview = async (
  lectures = [], 
  sectionAttendance = [], 
  kpis = {}, 
  activities = []
) => {
  const lecturesHTML = lectures.length > 0
    ? lectures.map(renderLectureCard).join('')
    : `
      <div class="overview-empty-state" style="padding: 24px 16px;">
        <div class="overview-empty-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </div>
        <h4>No Lectures Scheduled Today</h4>
        <p>You have no classes remaining for today. Click <strong>View full schedule</strong> to view previous or upcoming dates.</p>
      </div>
    `;

  return `
    <div class="content-header-row">
      <div class="content-header-titles">
        <h1>Overview</h1>
        <p>Your lectures and sections, at a glance</p>
      </div>
    </div>

    <!-- Today's Lectures & Section-Wise Attendance -->
    <div class="dashboard-columns-grid">
      <div class="lectures-panel">
        <div class="panel-header-row">
          <h3>Today's lectures</h3>
          <button type="button" class="panel-link-btn" id="btn-view-schedule" style="background: none; border: none; color: #4338CA; font-weight: 600; cursor: pointer;">View full schedule</button>
        </div>

        <div class="lectures-list">
          ${lecturesHTML}
        </div>
      </div>

      <div class="section-attendance-panel">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
          <h3 style="margin: 0;">Section-wise attendance</h3>
          <span style="font-size: 0.72rem; font-weight: 700; background: #EEF2FF; color: #4F46E5; padding: 3px 10px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.04em;">Coming Soon</span>
        </div>

        <div style="padding: 36px 20px; text-align: center; background: #F8FAFC; border: 1.5px dashed #E2E8F0; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <div style="width: 44px; height: 44px; border-radius: 50%; background: #EEF2FF; color: #4F46E5; display: flex; align-items: center; justify-content: center; margin-bottom: 12px;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <h4 style="margin: 0 0 6px 0; font-size: 0.95rem; font-weight: 700; color: #1E293B;">Feature Coming Soon</h4>
          <p style="margin: 0; font-size: 0.82rem; color: #64748B; max-width: 250px; line-height: 1.45;">Section-wise attendance breakdown and comparative performance metrics will be available in an upcoming update.</p>
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="recent-activity-panel">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
        <h3 style="margin: 0;">Recent activity</h3>
        <span style="font-size: 0.72rem; font-weight: 700; background: #EEF2FF; color: #4F46E5; padding: 3px 10px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.04em;">Coming Soon</span>
      </div>

      <div style="padding: 24px 20px; text-align: center; background: #F8FAFC; border: 1.5px dashed #E2E8F0; border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 14px;">
        <div style="width: 40px; height: 40px; border-radius: 50%; background: #EEF2FF; color: #4F46E5; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
        </div>
        <div style="text-align: left;">
          <div style="font-size: 0.9rem; font-weight: 700; color: #1E293B;">Activity Log Coming Soon</div>
          <div style="font-size: 0.8rem; color: #64748B;">Live scan logs, attendance submission timestamps, and system audit events will be tracked here.</div>
        </div>
      </div>
    </div>
  `;
};

