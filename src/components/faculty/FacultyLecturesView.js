import { renderLectureCard } from './LectureCard.js';
import { renderFacultyLecturesStrip } from './FacultyLecturesStrip.js';
import { formatLocalDate, getLocalDateString } from '../../utils/dateUtils.js';

/**
 * Dedicated "My Lectures" Tab Screen Component
 * @param {Array} lectures - filtered and sorted lectures (current to upcoming)
 * @param {string} currentFilter - 'today' | 'yesterday' | 'tomorrow' | 'this_week' | 'custom'
 * @param {string} selectedDate - 'YYYY-MM-DD'
 * @param {Array} allAssignments - total assigned classes
 */
export const renderFacultyLecturesView = (
  lectures = [], 
  currentFilter = 'today', 
  selectedDate = getLocalDateString(),
  allAssignments = []
) => {
  const filterStripHTML = renderFacultyLecturesStrip(currentFilter, selectedDate);

  let emptyMessage = 'No lectures found for the selected filter.';
  let emptySubtext = 'Switch filters or select another date from the strip above.';

  if (currentFilter === 'today') {
    emptyMessage = 'No Lectures Scheduled for Today';
    emptySubtext = 'No timetable sessions are assigned for today. Switch to other filters or pick a date from the calendar strip.';
  } else if (currentFilter === 'yesterday') {
    emptyMessage = 'No Lectures Recorded for Yesterday';
    emptySubtext = 'There were no timetable sessions scheduled on yesterday\'s date.';
  } else if (currentFilter === 'tomorrow') {
    emptyMessage = 'No Lectures Scheduled for Tomorrow';
    emptySubtext = 'Enjoy your upcoming free time or check the weekly schedule.';
  } else if (currentFilter === 'this_week') {
    emptyMessage = 'No Lectures Scheduled for This Week';
    emptySubtext = 'Check with the administrator if new classes are yet to be assigned.';
  } else if (currentFilter === 'custom') {
    emptyMessage = `No Lectures on ${formatLocalDate(selectedDate)}`;
    emptySubtext = 'Select another date on the calendar strip to check assigned classes.';
  }

  const lecturesHTML = lectures.length > 0
    ? lectures.map(renderLectureCard).join('')
    : `
      <div class="overview-empty-state" style="padding: 40px 20px;">
        <div class="overview-empty-icon" style="width: 52px; height: 52px; border-radius: 14px; background: #EEF2FF; color: #4F46E5; margin-bottom: 16px;">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </div>
        <h4 style="font-size: 1.05rem; font-weight: 700; color: #1E293B; margin-bottom: 6px;">${emptyMessage}</h4>
        <p style="font-size: 0.88rem; color: #64748B; max-width: 420px; margin: 0 auto; line-height: 1.5;">${emptySubtext}</p>
      </div>
    `;

  const liveCount = lectures.filter(l => l.status === 'live').length;
  const upcomingCount = lectures.filter(l => l.status === 'upcoming' || l.status === 'starting_soon' || l.status === 'scheduled').length;

  return `
    <div class="my-lectures-view-container">
      <!-- Header -->
      <div class="content-header-row">
        <div class="content-header-titles">
          <h1>My Lectures</h1>
          <p>Filter your schedule, manage timetable classes, and start QR check-in sessions</p>
        </div>
        <div class="lecture-header-stats-badge">
          ${liveCount > 0 ? `<span class="live-status-pill"><span class="pulse-indicator-dot dot-live"></span>${liveCount} Class Live Now</span>` : ''}
          <span class="lectures-count-pill">${lectures.length} ${lectures.length === 1 ? 'Lecture' : 'Lectures'}</span>
        </div>
      </div>

      <!-- Main Schedule Card -->
      <div class="lectures-schedule-card">
        <!-- Date Selector Filter Strip -->
        <div class="schedule-strip-container">
          ${filterStripHTML}
        </div>

        <!-- Lectures List Container -->
        <div class="lectures-list schedule-list-area">
          ${lecturesHTML}
        </div>
      </div>
    </div>
  `;
};
