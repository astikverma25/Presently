/**
 * Real-time Student Attendance Stream Item Component
 */
export const renderStudentStreamItem = (student) => {
  const isMarked = student.status === 'marked';
  const timeText = student.markedTime ? ` • ${student.markedTime}` : '';

  return `
    <div class="stream-student-item" data-student-id="${student.id}" style="${!isMarked ? 'opacity: 0.6;' : 'background: rgba(16, 185, 129, 0.04); border: 1px solid rgba(16, 185, 129, 0.25);'}">
      <div class="student-left-details">
        <div class="student-avatar-badge ${student.colorClass}">
          ${isMarked ? student.initials : `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          `}
        </div>
        <div class="student-names-roll">
          <h4>${student.name}</h4>
          <p>Roll ${student.rollNumber}</p>
        </div>
      </div>
      <span class="student-status-tag ${isMarked ? 'marked' : ''}">
        ${isMarked ? `● Verified${timeText}` : 'Not marked'}
      </span>
    </div>
  `;
};
