import { getIndianDateString } from '../../utils/dateUtils.js';

/**
 * Calculates Monday to Saturday week details based on week offset
 * @param {number} weekOffset - 0 for current week, -1 for previous, +1 for next
 */
export const getWeekInfo = (weekOffset = 0) => {
  const todayIST = getIndianDateString();
  const [tYear, tMonth, tDay] = todayIST.split('-').map(Number);
  const baseDate = new Date(tYear, tMonth - 1, tDay);
  
  if (weekOffset !== 0) {
    baseDate.setDate(baseDate.getDate() + (weekOffset * 7));
  }

  // Find Monday (Mon = 1, Sun = 0)
  const dayOfWeek = baseDate.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() + diffToMonday);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNamesFull = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayNamesShort = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const days = [];
  for (let i = 0; i < 6; i++) {
    const curr = new Date(monday);
    curr.setDate(monday.getDate() + i);
    const y = curr.getFullYear();
    const m = String(curr.getMonth() + 1).padStart(2, '0');
    const d = String(curr.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    
    days.push({
      dateString: dateStr,
      dayIndex: i,
      dayNameFull: dayNamesFull[i],
      dayNameShort: dayNamesShort[i],
      formattedDate: `${d} ${monthNames[curr.getMonth()]}`,
      isToday: dateStr === todayIST,
      rawDate: curr
    });
  }

  const startDay = days[0];
  const endDay = days[days.length - 1];
  const dateRangeText = `${startDay.formattedDate} – ${endDay.formattedDate}, ${monday.getFullYear()}`;

  return {
    days,
    dateRangeText,
    isCurrentWeek: weekOffset === 0,
    weekOffset
  };
};

/**
 * Timeline Window Configuration (8:00 AM to 8:00 PM)
 */
export const TIMELINE_CONFIG = {
  startHour: 8,   // 8:00 AM (480 mins)
  endHour: 20,    // 8:00 PM (1200 mins)
  hours: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
};

/**
 * Converts HH:MM string to total minutes from midnight
 */
const parseTimeToMinutes = (timeStr, fallback = 480) => {
  if (!timeStr) return fallback;
  const clean = timeStr.toString().trim();
  const isPM = /pm/i.test(clean);
  const isAM = /am/i.test(clean);
  const numPart = clean.replace(/[^\d:]/g, '');
  const parts = numPart.split(':').map(Number);
  let h = parts[0] || 0;
  const m = parts[1] || 0;
  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;
  return h * 60 + m;
};

/**
 * Formats hour number to clean label (e.g. 8 -> "8:00 AM", 13 -> "1:00 PM")
 */
const formatHourLabel = (h) => {
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:00 ${period}`;
};

/**
 * Renders Proportional Timeline Schedule Grid:
 * Top Header = Time Scale (8 AM to 8 PM), Side Rows = Days of the Week.
 * Lecture blocks span their EXACT start-to-end time range with small compact text.
 * @param {Array} rawAssignments - All assignments strictly for logged-in faculty
 * @param {number} weekOffset - Current week offset
 */
export const renderFacultyTimetableView = (rawAssignments = [], weekOffset = 0) => {
  const weekInfo = getWeekInfo(weekOffset);
  const weekDatesSet = new Set(weekInfo.days.map(d => d.dateString));

  const startTotalMinutes = TIMELINE_CONFIG.startHour * 60; // 480
  const endTotalMinutes = TIMELINE_CONFIG.endHour * 60;     // 1200
  const totalTimelineMinutes = endTotalMinutes - startTotalMinutes; // 720 mins (12 hours)

  // Count total lectures this faculty has in the displayed week
  const weekLectures = (rawAssignments || []).filter(lec => {
    return weekDatesSet.has(lec.rawLecDate || lec.lecDate);
  });

  return `
    <div class="timetable-view-wrapper">
      <!-- Week Navigation Toolbar -->
      <div class="timetable-nav-toolbar">
        <div class="timetable-nav-left">
          <div class="timetable-week-btn-group">
            <button 
              type="button" 
              class="btn-timetable-nav" 
              id="btn-timetable-prev-week" 
              title="Previous Week"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
              <span>Prev Week</span>
            </button>

            <button 
              type="button" 
              class="btn-timetable-today ${weekInfo.isCurrentWeek ? 'active' : ''}" 
              id="btn-timetable-current-week" 
              title="Jump to Current Week"
            >
              Today / Current Week
            </button>

            <button 
              type="button" 
              class="btn-timetable-nav" 
              id="btn-timetable-next-week" 
              title="Next Week"
            >
              <span>Next Week</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>

          <div class="timetable-range-badge">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span class="range-text">${weekInfo.dateRangeText}</span>
          </div>
        </div>

        <div class="timetable-nav-right">
          <span class="timetable-count-pill">
            <strong>${weekLectures.length}</strong> ${weekLectures.length === 1 ? 'Lecture' : 'Lectures'} This Week
          </span>
        </div>
      </div>

      <!-- Proportional Timeline Grid Container -->
      <div class="timeline-schedule-container">
        <!-- Top Time Header Row -->
        <div class="timeline-header-row">
          <div class="timeline-side-col-header">
            <span>DAY / DATE</span>
          </div>

          <div class="timeline-time-scale-track">
            ${TIMELINE_CONFIG.hours.map(h => `
              <div class="time-scale-hour-cell">
                <span class="time-scale-label">${formatHourLabel(h)}</span>
                <span class="time-scale-tick"></span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Days Rows with Time-Proportional Lecture Blocks -->
        <div class="timeline-days-body">
          ${weekInfo.days.map(day => {
            // Find all lectures assigned to this faculty on this day
            const dayLectures = (rawAssignments || []).filter(lec => {
              const lDate = lec.rawLecDate || lec.lecDate;
              return lDate === day.dateString;
            });

            return `
              <div class="timeline-day-row ${day.isToday ? 'today-day-row' : ''}">
                <!-- Left Day & Date Pill Header -->
                <div class="timeline-day-side-cell ${day.isToday ? 'today-day-side-cell' : ''}">
                  <span class="tl-day-name">${day.dayNameShort}</span>
                  <span class="tl-day-date">${day.formattedDate}</span>
                  ${day.isToday ? '<span class="tl-today-tag">TODAY</span>' : ''}
                </div>

                <!-- Right Timeline Track with Proportional Blocks & Grid Guidelines -->
                <div class="timeline-day-track">
                  <!-- Background Hourly Guidelines -->
                  <div class="timeline-grid-guidelines" aria-hidden="true">
                    ${TIMELINE_CONFIG.hours.map(() => `
                      <div class="timeline-grid-line-col"></div>
                    `).join('')}
                  </div>

                  <!-- Actual Lecture Blocks Positioned by Time Range -->
                  ${dayLectures.map(lec => {
                    const startRaw = lec.startTimeVal || (lec.time ? lec.time.split('-')[0].trim() : '10:00');
                    const endRaw = lec.endTimeVal || (lec.time ? lec.time.split('-')[1].trim() : '11:00');
                    
                    const startMin = parseTimeToMinutes(startRaw, 600);
                    let endMin = parseTimeToMinutes(endRaw, startMin + 60);
                    if (endMin <= startMin) endMin = startMin + 60;

                    // Calculate proportional left and width percentages
                    const clampedStart = Math.max(startTotalMinutes, Math.min(endTotalMinutes, startMin));
                    const clampedEnd = Math.max(startTotalMinutes, Math.min(endTotalMinutes, endMin));
                    
                    const leftPct = ((clampedStart - startTotalMinutes) / totalTimelineMinutes) * 100;
                    const durationMins = clampedEnd - clampedStart;
                    const widthPct = Math.max(3.5, (durationMins / totalTimelineMinutes) * 100);

                    const timeDisplay = `${startRaw.slice(0, 5)} - ${endRaw.slice(0, 5)}`;

                    return `
                      <div 
                        class="timeline-lecture-block lecture-card ${lec.status === 'live' ? 'block-live' : ''}" 
                        style="left: ${leftPct.toFixed(2)}%; width: ${widthPct.toFixed(2)}%;"
                        data-lecture-id="${lec.id}"
                        data-class="${lec.className}"
                        data-section="${lec.section}"
                        title="${lec.className} (Sec ${lec.section || '2A'}) • ${timeDisplay} • ${lec.room || 'Room 101'} - Click to launch session"
                      >
                        <div class="tl-block-inner">
                          <div class="tl-block-top">
                            <span class="tl-block-subject">${lec.className}</span>
                            <span class="tl-block-section">Sec ${lec.section || '2A'}</span>
                          </div>

                          <div class="tl-block-bottom">
                            <span class="tl-block-time">🕒 ${timeDisplay}</span>
                            <span class="tl-block-room">📍 ${lec.room || 'Rm 101'}</span>
                          </div>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
};
