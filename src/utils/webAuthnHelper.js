/**
 * WebAuthn Platform Passkey Device Binding Utility
 * Powered by @simplewebauthn/browser for rock-solid hardware security enclave binding
 * (Android Keystore / Apple Secure Enclave / Windows Hello)
 */

import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
  bufferToBase64URLString,
  base64URLStringToBuffer
} from '@simplewebauthn/browser';

export { bufferToBase64URLString as bufferToBase64URL, base64URLStringToBuffer as base64URLToBuffer };

/**
 * Generate a random 32-byte Base64URL challenge
 */
function generateChallenge() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return bufferToBase64URLString(arr);
}

/**
 * Detect friendly device name from User-Agent & Hardware Specs
 */
export function detectDeviceName() {
  if (typeof navigator === 'undefined') return 'Mobile Device';
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return 'Apple iPhone';
  if (/iPad/i.test(ua)) return 'Apple iPad';
  if (/Android/i.test(ua)) {
    const match = ua.match(/Android\s+[\d\.]+;\s+([^;\)]+)/i);
    return match ? `Android (${match[1].trim()})` : 'Android Phone';
  }
  if (/Macintosh/i.test(ua)) return 'MacBook / Mac';
  if (/Windows/i.test(ua)) return 'Windows PC';
  return 'Personal Device';
}

/**
 * Check if WebAuthn platform authentication is available
 */
export async function isWebAuthnSupported() {
  if (typeof window === 'undefined') return false;
  if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return false;
  }
  return browserSupportsWebAuthn();
}

/**
 * 1. Register device passkey for a student (First-Time Setup)
 * Cryptographically binds this student account to this physical hardware security chip
 */
export async function registerDevicePasskey(student) {
  const deviceName = detectDeviceName();

  if (!browserSupportsWebAuthn()) {
    throw new Error('Your browser does not support WebAuthn passkeys. Please use Chrome, Safari, or Edge over HTTPS.');
  }

  const challenge = generateChallenge();
  const userIdRaw = new TextEncoder().encode((student.id || student.roll_no || 'student').slice(0, 36));
  const userIdBase64 = bufferToBase64URLString(userIdRaw);

  const rpConfig = {
    name: 'Presently Smart Attendance'
  };
  if (window.location.hostname && !/^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname)) {
    rpConfig.id = window.location.hostname;
  }

  const optionsJSON = {
    challenge: challenge,
    rp: rpConfig,
    user: {
      id: userIdBase64,
      name: (student.roll_no || student.email || 'student').toLowerCase(),
      displayName: student.name || 'Student'
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },  // ES256 (standard ECDSA on P-256)
      { alg: -257, type: 'public-key' } // RS256 (RSA with SHA-256)
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'preferred',
      residentKey: 'preferred',
      requireResidentKey: false
    },
    timeout: 60000,
    attestation: 'none'
  };

  try {
    const regResult = await startRegistration({ optionsJSON });
    if (!regResult || !regResult.id) {
      throw new Error('Failed to obtain passkey from device hardware.');
    }

    return {
      success: true,
      credentialId: regResult.id,
      publicKey: regResult.response?.publicKey || regResult.id,
      deviceName: deviceName,
      boundAt: new Date().toISOString(),
      type: 'webauthn'
    };
  } catch (err) {
    console.error('WebAuthn Registration Error:', err);
    if (err.name === 'NotAllowedError' || err.code === 'ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY') {
      throw new Error('Device Binding Cancelled: Please confirm your screen lock (fingerprint / PIN) to bind this phone.');
    }
    if (err.name === 'InvalidStateError') {
      throw new Error('This device is already registered with a passkey for this account.');
    }
    if (err.name === 'SecurityError') {
      throw new Error('Security Error: WebAuthn passkeys require a valid HTTPS connection. Please ensure you are accessing via the Cloudflare HTTPS URL.');
    }
    throw new Error(`Device Setup Error: ${err.message || 'Unable to register device passkey.'}`);
  }
}

/**
 * 2. Verify device passkey on login (Subsequent Logins)
 * Proves that the student is holding their physical registered device
 */
export async function verifyDevicePasskey(credentialId, deviceName = 'Personal Device') {
  if (!credentialId) {
    throw new Error('No registered device credential found for this student account.');
  }

  if (!browserSupportsWebAuthn()) {
    throw new Error('Hardware device authentication is not available on this browser.');
  }

  const challenge = generateChallenge();

  const optionsJSON = {
    challenge: challenge,
    allowCredentials: [
      {
        id: credentialId,
        type: 'public-key',
        transports: ['internal']
      }
    ],
    userVerification: 'preferred',
    timeout: 60000
  };

  if (window.location.hostname && !/^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname)) {
    optionsJSON.rpId = window.location.hostname;
  }

  try {
    const authResult = await startAuthentication({ optionsJSON });
    if (!authResult || !authResult.id) {
      throw new Error('Device verification could not be validated.');
    }

    return {
      success: true,
      credentialId: authResult.id,
      type: 'webauthn'
    };
  } catch (err) {
    console.error('WebAuthn Verification Error:', err);
    if (err.name === 'NotAllowedError') {
      throw new Error(`Access Denied: Verification cancelled or not matched. This account is locked to registered phone (${deviceName}).`);
    }
    throw new Error(`Access Denied: This student account is bound to another physical device (${deviceName}). Please use your registered phone or ask your administrator to reset device binding.`);
  }
}



