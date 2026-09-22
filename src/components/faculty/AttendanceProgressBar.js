/**
 * Attendance Progress Bar for Section Analytics
 */
export const renderAttendanceProgressBar = (item) => `
  <div class="section-bar-item">
    <div class="section-bar-labels">
      <span>${item.sectionName}</span>
      <span>${item.percentage}%</span>
    </div>
    <div class="bar-track">
      <div class="bar-fill" style="width: ${item.percentage}%;"></div>
    </div>
  </div>
`;
