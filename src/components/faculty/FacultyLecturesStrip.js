import { formatLocalDate, getLocalDateString } from '../../utils/dateUtils.js';

/**
 * Small Strip Date Selector & Filter Buttons Component for Faculty Lectures
 * Includes: Yesterday, Today (default active), Tomorrow, This Week, and Date Picker button
 * @param {string} currentFilter - 'today' | 'yesterday' | 'tomorrow' | 'this_week' | 'custom'
 * @param {string} selectedDate - 'YYYY-MM-DD'
 */
export const renderFacultyLecturesStrip = (currentFilter = 'today', selectedDate = getLocalDateString()) => {
  const todayDate = getLocalDateString();
  const isCustom = currentFilter === 'custom';
  const displayDateText = isCustom 
    ? (selectedDate === todayDate ? 'Today' : formatLocalDate(selectedDate))
    : (selectedDate ? formatLocalDate(selectedDate) : 'Select date');

  return `
    <div class="lectures-filter-strip">
      <div class="strip-filter-pills">
        <button type="button" class="filter-pill ${currentFilter === 'yesterday' ? 'active' : ''}" data-lecture-filter="yesterday">
          Yesterday
        </button>
        <button type="button" class="filter-pill ${currentFilter === 'today' ? 'active' : ''}" data-lecture-filter="today">
          Today
        </button>
        <button type="button" class="filter-pill ${currentFilter === 'tomorrow' ? 'active' : ''}" data-lecture-filter="tomorrow">
          Tomorrow
        </button>
        <button type="button" class="filter-pill ${currentFilter === 'this_week' ? 'active' : ''}" data-lecture-filter="this_week">
          This week
        </button>
      </div>

      <div class="strip-date-selector">
        <div class="date-picker-trigger-wrapper">
          <input 
            type="date" 
            id="input-faculty-lecture-date" 
            class="hidden-native-date-input" 
            value="${selectedDate || todayDate}" 
            aria-label="Select lecture date"
          />
          <button 
            type="button" 
            class="btn-strip-date-picker ${isCustom ? 'active' : ''}" 
            id="btn-trigger-lecture-date"
            title="Pick a custom date"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span class="date-trigger-label" id="label-selected-lecture-date">${displayDateText}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="opacity: 0.6;">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;
};
