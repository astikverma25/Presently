/**
 * Single Source of Truth for Date & Time Operations
 * Standardized on Indian Standard Time (IST / Asia/Kolkata / UTC+5:30)
 * 
 * Rules:
 * 1. Calendar dates (lec_date, session date, lecture_date): Stored and compared as YYYY-MM-DD in IST.
 * 2. Timestamps (marked_at, started_at, token_expires_at): Stored in PostgreSQL TIMESTAMPTZ (UTC),
 *    and ALWAYS formatted into Indian Standard Time for display / export.
 * 3. Schedule times (start_time, end_time): Stored as HH:MM:SS in 24-hr IST.
 */

export const INDIAN_TIMEZONE = 'Asia/Kolkata';

/**
 * Returns date in YYYY-MM-DD format strictly in Indian Standard Time (IST).
 * Prevents UTC-skew bugs where toISOString() or local browser time shifts the date.
 * @param {Date|string|number} [dateInput=new Date()]
 * @returns {string} e.g. "2026-09-22"
 */
export const getIndianDateString = (dateInput = new Date()) => {
  try {
    let d;
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return dateInput; // already clean YYYY-MM-DD
    }
    if (dateInput instanceof Date) {
      d = isNaN(dateInput.getTime()) ? new Date() : dateInput;
    } else {
      d = new Date(dateInput);
      if (isNaN(d.getTime())) d = new Date();
    }

    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: INDIAN_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(d);
  } catch (err) {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }
};

/**
 * Returns current 24-hour time "HH:MM" in Indian Standard Time (IST).
 * @param {Date|string|number} [dateInput=new Date()]
 * @returns {string} e.g. "10:30", "18:05"
 */
export const getIndianTimeVal = (dateInput = new Date()) => {
  try {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    const validDate = isNaN(d.getTime()) ? new Date() : d;
    
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: INDIAN_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(validDate);
  } catch (err) {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }
};

/**
 * Returns full English Day Name in Indian Standard Time (e.g. "Monday", "Tuesday").
 * @param {Date|string|number} [dateInput=new Date()]
 * @returns {string}
 */
export const getIndianDayName = (dateInput = new Date()) => {
  try {
    let d;
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const parts = dateInput.split('-').map(Number);
      d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12, 0, 0));
    } else {
      d = dateInput instanceof Date ? dateInput : new Date(dateInput);
      if (isNaN(d.getTime())) d = new Date();
    }

    return new Intl.DateTimeFormat('en-US', {
      timeZone: INDIAN_TIMEZONE,
      weekday: 'long'
    }).format(d);
  } catch (err) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  }
};

/**
 * Formats a UTC timestamp (e.g. attendance_records.marked_at) into Indian Standard Time (12-hr with AM/PM).
 * @param {string|Date|number} utcTimestamp - e.g. "2026-09-22T04:35:00.000Z"
 * @returns {string} e.g. "10:05 AM"
 */
export const formatIndianTime = (utcTimestamp) => {
  if (!utcTimestamp || utcTimestamp === '—') return '—';
  try {
    const d = utcTimestamp instanceof Date ? utcTimestamp : new Date(utcTimestamp);
    if (isNaN(d.getTime())) return '—';

    return new Intl.DateTimeFormat('en-IN', {
      timeZone: INDIAN_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(d).toUpperCase();
  } catch (err) {
    return '—';
  }
};

/**
 * Formats YYYY-MM-DD string or timestamp into a clean short date string in Indian Standard Time (e.g. "22 Sept 2026" or "22 Sept").
 * Guaranteed zero UTC-boundary parse skew.
 * @param {string|Date} dateInput - e.g. "2026-09-22" or Date object
 * @param {boolean} [includeYear=false]
 * @returns {string} e.g. "22 Sept" or "22 Sept 2026"
 */
export const formatIndianDate = (dateInput, includeYear = false) => {
  if (!dateInput) return '';
  try {
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const parts = dateInput.split('-').map(Number);
      const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12, 0, 0));
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: INDIAN_TIMEZONE,
        day: '2-digit',
        month: 'short',
        ...(includeYear ? { year: 'numeric' } : {})
      }).format(d);
    }

    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);

    return new Intl.DateTimeFormat('en-GB', {
      timeZone: INDIAN_TIMEZONE,
      day: '2-digit',
      month: 'short',
      ...(includeYear ? { year: 'numeric' } : {})
    }).format(d);
  } catch (err) {
    return String(dateInput);
  }
};

/**
 * Formats a UTC timestamp into combined Indian Date & Time string.
 * @param {string|Date|number} utcTimestamp
 * @returns {string} e.g. "22 Sept 2026, 10:05 AM"
 */
export const formatIndianDateTime = (utcTimestamp) => {
  if (!utcTimestamp || utcTimestamp === '—') return '—';
  try {
    const d = utcTimestamp instanceof Date ? utcTimestamp : new Date(utcTimestamp);
    if (isNaN(d.getTime())) return '—';

    const datePart = new Intl.DateTimeFormat('en-GB', {
      timeZone: INDIAN_TIMEZONE,
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(d);

    const timePart = new Intl.DateTimeFormat('en-IN', {
      timeZone: INDIAN_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(d).toUpperCase();

    return `${datePart}, ${timePart}`;
  } catch (err) {
    return '—';
  }
};

/**
 * Compatibility Aliases
 */
export const getLocalDateString = getIndianDateString;
export const formatLocalDate = formatIndianDate;
