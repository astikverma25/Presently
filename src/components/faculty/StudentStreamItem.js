
import { renderStudentThumbnail } from '../../utils/avatarUtils.js';

/**
 * Real-time Student Attendance Stream Item Component
 * 2-Column Square Card Layout: Large Photo + Green Border (Present) + Name & Roll below
 */
export const renderStudentStreamItem = (student) => {
  const isMarked = student.status === 'marked';

  return `
    <div class="stream-student-card ${isMarked ? 'is-verified' : 'is-pending'}" data-student-id="${student.id}">
      <!-- 1. Large Main Photo Portrait (almost touching the border) -->
      <div class="stream-card-avatar-wrap">
        ${renderStudentThumbnail(student, { size: 112, isVerified: isMarked })}
      </div>

      <!-- 2. Student Identity (Name & Roll below photo) -->
      <div class="stream-card-details">
        <h4 class="stream-student-name" title="${student.name}">${student.name}</h4>
        <span class="stream-roll-pill">Roll <strong>${student.rollNumber}</strong></span>
      </div>
    </div>
  `;
};


