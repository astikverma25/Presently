/**
 * Cryptographic Time-Window (TOTP) Utility
 * Implements RFC 6238-inspired HMAC-SHA256 Time-Window verification
 * Native Web Crypto API - zero external dependencies, high performance (<1ms)
 */

const SYSTEM_HMAC_SECRET = 'PRESENTLY_SECURE_ATTENDANCE_HMAC_SECRET_2026';

/**
 * Converts string to ArrayBuffer
 */
function str2ab(str) {
  const enc = new TextEncoder();
  return enc.encode(str);
}

/**
 * Converts ArrayBuffer to Hex string
 */
function ab2hex(buf) {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Computes secure SHA-256 cryptographic hash of a student password
 */
export async function hashPassword(plainPassword, salt = 'PRESENTLY_STUDENT_SALT') {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${plainPassword}`);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  return ab2hex(hashBuf);
}

/**
 * Validates strong password rules:
 * - At least 8 characters
 * - At least 1 uppercase letter (A-Z)
 * - At least 1 lowercase letter (a-z)
 * - At least 1 number (0-9)
 * - At least 1 special character (!@#$%^&* etc.)
 */
export function validateStrongPassword(password) {
  if (!password || typeof password !== 'string') {
    return { isValid: false, message: 'Password cannot be empty.' };
  }
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter (A-Z).' };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter (a-z).' };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one number (0-9).' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one special character (e.g. !@#$%^&*).' };
  }
  return { isValid: true };
}

/**
 * Generates an HMAC-SHA256 signature for a session at a specific timestamp
 */
export async function generateTotpSignature(sessionId, timestamp, secret = SYSTEM_HMAC_SECRET) {
  try {
    const keyData = str2ab(`${secret}:${sessionId}`);
    const message = str2ab(`${sessionId}:${timestamp}`);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, message);
    return ab2hex(signatureBuffer).slice(0, 32); // 32-char compact cryptographic token
  } catch (err) {
    // Fallback simple hash if subtle crypto fails
    const raw = `${sessionId}:${timestamp}:${secret}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }
}

/**
 * Generates complete dynamic QR payload for faculty display
 */
export async function createDynamicQRPayload(sessionDetails, expirySec = 15) {
  const timestamp = Date.now();
  const sessionId = sessionDetails.sessionId || 'sess-live';
  const token = await generateTotpSignature(sessionId, timestamp);

  return {
    sessionId: sessionId,
    assignmentId: sessionDetails.assignmentId || null,
    lecId: sessionDetails.lecId || null,
    class: sessionDetails.className || sessionDetails.class || 'Class',
    section: sessionDetails.section || '2A',
    ts: timestamp,
    sig: token,
    expiresIn: expirySec
  };
}

/**
 * Verifies scanned student payload against time-window & cryptographic signature
 * @param {Object} payload Scanned QR payload
 * @param {number} expirySec Validity window in seconds (e.g. 15s)
 * @param {number} graceSec Network transit grace window in seconds (e.g. 5s)
 */
export async function verifyTotpPayload(payload, expirySec = 15, graceSec = 5) {
  if (!payload || !payload.sessionId || !payload.ts || !payload.sig) {
    return {
      isValid: false,
      reason: 'Invalid or incomplete QR code format'
    };
  }

  const now = Date.now();
  const ageSec = (now - payload.ts) / 1000;
  const maxAllowedAgeSec = (payload.expiresIn || expirySec) + graceSec;

  // 1. Future clock check (allows max 3s drift)
  if (ageSec < -3) {
    return {
      isValid: false,
      reason: 'Device clock out of sync. Please check your phone time settings.'
    };
  }

  // 2. Expiry check
  if (ageSec > maxAllowedAgeSec) {
    return {
      isValid: false,
      reason: `QR code expired (${Math.round(ageSec)}s old). Please scan the live projector screen.`
    };
  }

  // 3. Cryptographic Signature Verification
  const expectedSig = await generateTotpSignature(payload.sessionId, payload.ts);
  if (expectedSig !== payload.sig) {
    return {
      isValid: false,
      reason: 'Cryptographic signature mismatch. Possible tampered QR code.'
    };
  }

  return {
    isValid: true,
    ageSec: Math.round(ageSec * 10) / 10,
    sessionId: payload.sessionId,
    lecId: payload.lecId,
    assignmentId: payload.assignmentId
  };
}
