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
  const overallAverage = FacultyService.calculateOverallAverage(sectionAttendance);

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

  const progressBarsHTML = sectionAttendance.length > 0
    ? sectionAttendance.map(renderAttendanceProgressBar).join('')
    : `
      <div class="overview-empty-state" style="padding: 20px 12px;">
        <div class="overview-empty-icon" style="background: #F0FDF4; color: #16A34A;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
        </div>
        <h4>No Section Data Yet</h4>
        <p>Section attendance percentages will automatically populate here as sessions complete.</p>
      </div>
    `;

  const activitiesHTML = activities.length > 0
    ? activities.map(act => `
        <div class="activity-item">
          <div class="activity-icon-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <div class="activity-text">
            <strong>${act.title}</strong> <span class="activity-time">• ${act.time}</span>
          </div>
        </div>
      `).join('')
    : `
      <div style="color: #64748B; font-size: 0.88rem; display: flex; align-items: center; gap: 8px;">
        <div style="width: 8px; height: 8px; border-radius: 50%; background: #94A3B8;"></div>
        <span>No recent session activity recorded. Completed QR sessions will appear here.</span>
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
        <h3>Section-wise attendance</h3>

        <div class="section-bars-list">
          ${progressBarsHTML}
        </div>

        <div class="attendance-divider"></div>

        <div class="overall-average-row">
          <span>Overall average</span>
          <span class="overall-percent">${overallAverage}%</span>
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="recent-activity-panel">
      <h3>Recent activity</h3>
      <div class="activity-list">
        ${activitiesHTML}
      </div>
    </div>
  `;
};

