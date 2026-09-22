/**
 * Date & Time Utilities for Local Timezone (e.g. IST / UTC+5:30)
 * Prevents UTC-skew bugs where toISOString() shifts the date backward before 05:30 AM.
 */

/**
 * Returns date in YYYY-MM-DD format based on local device/browser timezone.
 * @param {Date|string|number} [dateInput=new Date()]
 * @returns {string} e.g. "2026-09-22"
 */
export const getLocalDateString = (dateInput = new Date()) => {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Formats YYYY-MM-DD string into a clean short date string (e.g. "22 Sept")
 * Avoids browser UTC-boundary parse skew.
 * @param {string} dateStr
 * @returns {string} e.g. "22 Sept"
 */
export const formatLocalDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-').map(Number);
  if (parts.length === 3) {
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  }
  return dateStr;
};
