/**
 * Individual Lecture Card Component
 */
export const renderLectureCard = (lecture) => {
  const isLive = lecture.status === 'live';
  const isStartingSoon = lecture.status === 'starting_soon';
  const isCompleted = lecture.status === 'completed';
  const isUpcoming = lecture.status === 'upcoming';

  let cardModifier = '';
  let badgeHTML = '';

  if (isLive) {
    cardModifier = 'highlight-card live-card';
    badgeHTML = `
      <div class="badge-live">
        <span class="pulse-indicator-dot dot-live"></span>
        ${lecture.badgeText || 'Live Now'}
      </div>
    `;
  } else if (isStartingSoon) {
    cardModifier = 'highlight-card';
    badgeHTML = `
      <div class="badge-starts-soon">
        <span class="pulse-indicator-dot"></span>
        ${lecture.badgeText || 'Starting Soon'}
      </div>
    `;
  } else if (isCompleted) {
    cardModifier = 'completed-card';
    badgeHTML = `
      <div class="badge-completed">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right: 3px;">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        ${lecture.badgeText || 'Completed'}
      </div>
    `;
  } else if (isUpcoming) {
    badgeHTML = `
      <div class="badge-upcoming">
        ${lecture.badgeText || 'Upcoming'}
      </div>
    `;
  } else {
    badgeHTML = `
      <div class="badge-time-relative">
        ${lecture.badgeText || 'Scheduled'}
      </div>
    `;
  }

  return `
    <div class="lecture-card ${cardModifier}" 
         data-lecture-id="${lecture.id}" 
         data-class="${lecture.className}" 
         data-section="${lecture.section}">
      <div class="lecture-details">
        <div class="lecture-title-row">
          <h4 class="lecture-title">${lecture.className}</h4>
          <span class="lecture-sec-pill">Sec ${lecture.section}</span>
          ${lecture.lecId ? `<span class="lecture-id-tag">${lecture.lecId}</span>` : ''}
        </div>
        <div class="lecture-meta-line">
          <span class="meta-time-span">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="vertical-align: -1px; margin-right: 3px;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            ${lecture.time}
          </span>
          <span class="meta-separator">•</span>
          <span class="meta-room-span">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -1px; margin-right: 2px;"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
            ${lecture.room}
          </span>
          <span class="meta-separator">•</span>
          <span class="meta-students-span">${lecture.studentsCount} students</span>
        </div>
      </div>

      <div class="lecture-card-right">
        ${badgeHTML}
        <span class="lecture-date-caption">${lecture.shortDate || ''}</span>
      </div>
    </div>
  `;
};

