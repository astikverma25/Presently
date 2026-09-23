/**
 * Student Attendance Report Component (Subject-wise & Semester-wise)
 */
export const renderStudentReport = (reportData, currentSemester = '3rd', availableSemesters = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th']) => {
  const subjects = reportData?.subjects || [];
  const totalAttended = reportData?.totalAttended || 0;
  const totalClasses = reportData?.totalClasses || 0;
  const overallPct = reportData?.overallPercentage !== undefined ? reportData.overallPercentage : 100;
  const isOverallEligible = overallPct >= 75;

  const cleanSemNum = parseInt(String(currentSemester || '').replace(/[^0-9]/g, ''), 10) || 1;
  const formattedSem = `Semester ${cleanSemNum}`;

  const subjectCardsHTML = subjects.map(sub => {
    const hasHeldClasses = sub.total > 0;
    const isSubEligible = hasHeldClasses ? sub.percentage >= 75 : true;
    const progressColor = !hasHeldClasses ? '#94A3B8' : (sub.percentage >= 75 ? '#10B981' : (sub.percentage >= 60 ? '#F59E0B' : '#EF4444'));
    const badgeBg = !hasHeldClasses ? '#F1F5F9' : (sub.percentage >= 75 ? '#ECFDF5' : (sub.percentage >= 60 ? '#FFFBEB' : '#FEF2F2'));
    const badgeColor = !hasHeldClasses ? '#64748B' : (sub.percentage >= 75 ? '#065F46' : (sub.percentage >= 60 ? '#92400E' : '#991B1B'));

    return `
      <div class="report-subject-card">
        <div class="report-subject-top">
          <div class="report-subject-info">
            <span class="report-subject-code">${sub.subjectCode || 'SUB'}</span>
            <h4 class="report-subject-name">${sub.subjectName}</h4>
          </div>
          <div class="report-subject-stats">
            <div class="report-stat-fraction"><strong>${sub.attended}</strong>/${sub.total}</div>
            <div class="report-stat-pct" style="color: ${progressColor};">${hasHeldClasses ? `${sub.percentage}%` : '—'}</div>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="report-progress-track">
          <div class="report-progress-fill" style="width: ${hasHeldClasses ? Math.min(sub.percentage, 100) : 0}%; background-color: ${progressColor};"></div>
        </div>

        <!-- Subject Bottom Meta -->
        <div class="report-subject-bottom">
          <span class="report-status-tag" style="background: ${badgeBg}; color: ${badgeColor};">
            ${!hasHeldClasses ? '● No Classes Held' : (isSubEligible ? '● Eligible (≥75%)' : '● Shortage (<75%)')}
          </span>
          <span class="report-classes-left">
            ${!hasHeldClasses 
              ? 'Sessions not yet conducted' 
              : (isSubEligible 
                ? 'Attendance on track' 
                : `Needs ${Math.max(0, Math.ceil((0.75 * sub.total - sub.attended) / 0.25))} more classes`)}
          </span>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="student-report-container">
      <!-- 1. Header with Current Enrolled Semester Badge -->
      <div class="report-header-filter" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <div>
          <h3 class="report-heading">Subject Attendance</h3>
          <p class="report-subheading">Subject-wise class breakdown</p>
        </div>
        <div style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; background: #EEF2FF; color: #4338CA; border: 1.5px solid #C7D2FE; border-radius: 9999px; font-size: 0.82rem; font-weight: 700;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>
          <span>${formattedSem}</span>
        </div>
      </div>

      <!-- 2. Subject Cards List -->
      <div class="report-subjects-list" id="report-subjects-container">
        ${subjects.length > 0 ? subjectCardsHTML : `
          <div class="report-empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="1.8" style="margin-bottom: 10px;">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            <p style="font-weight: 700; color: #334155; margin-bottom: 4px;">No Subjects Found</p>
            <p style="font-size: 0.8rem; color: #64748B;">No academic records registered for ${formattedSem}.</p>
          </div>
        `}
      </div>

      <!-- 3. Overall Total Attendance Card (Summary at last) -->
      <div class="report-total-card">
        <div class="report-total-header">
          <div class="report-total-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M18 20V10"></path>
              <path d="M12 20V4"></path>
              <path d="M6 20v-6"></path>
            </svg>
          </div>
          <div>
            <h4 class="report-total-title">Total Semester Attendance</h4>
            <p class="report-total-subtitle">Cumulative score for ${formattedSem}</p>
          </div>
        </div>

        <div class="report-total-numbers">
          <div class="report-total-attended-box">
            <span class="report-total-number">${totalAttended} / ${totalClasses}</span>
            <span class="report-total-label">Total Classes Attended</span>
          </div>
          <div class="report-total-pct-box">
            <span class="report-total-pct" style="color: ${isOverallEligible ? '#10B981' : '#EF4444'};">${overallPct}%</span>
            <span class="report-total-status" style="background: ${isOverallEligible ? '#ECFDF5' : '#FEF2F2'}; color: ${isOverallEligible ? '#065F46' : '#991B1B'};">
              ${isOverallEligible ? 'Examination Eligible' : 'Shortage Warning'}
            </span>
          </div>
        </div>
      </div>
    </div>
  `;
};
