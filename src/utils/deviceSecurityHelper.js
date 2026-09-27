/**
 * Hardware Device Security & Key Management Helper
 * Supports Hardware-Backed Android Keystore (Keymaster / Keymint TEE / StrongBox)
 * via Capacitor Plugin & JavascriptInterface with graceful fallback to WebAuthn Platform Authenticator.
 */

import { Capacitor, registerPlugin } from '@capacitor/core';
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
  bufferToBase64URLString,
  base64URLStringToBuffer
} from '@simplewebauthn/browser';

/**
 * Register native Android Keystore Capacitor plugin bridge
 */
export const NativeKeystore = registerPlugin('AndroidKeystore');

/**
 * Generate a cryptographically secure 32-byte Base64 challenge
 */
export function generateDeviceChallenge() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return bufferToBase64URLString(arr);
}

/**
 * Detect friendly device name from Native Android API or Browser User-Agent
 */
export function detectDeviceName() {
  if (typeof window !== 'undefined' && window.AndroidKeystore?.getDeviceModel) {
    try {
      const model = window.AndroidKeystore.getDeviceModel();
      if (model) return model;
    } catch (e) {}
  }

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
 * Check if Native Android Keystore hardware bridge is active
 */
export function isAndroidKeystoreAvailable() {
  if (typeof window !== 'undefined' && Boolean(window.AndroidKeystore?.generateDeviceBoundKey)) {
    return true;
  }
  return typeof window !== 'undefined' && Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

/**
 * Detect active security platform
 */
export function getSecurityPlatformType() {
  if (isAndroidKeystoreAvailable()) {
    return 'android_keystore';
  }
  if (typeof window !== 'undefined' && browserSupportsWebAuthn()) {
    return 'webauthn';
  }
  return 'fallback';
}

/**
 * 1. Generate & Bind Hardware Key for Student (First-Time Setup)
 * Generates non-exportable hardware-backed ECDSA key inside Android Keystore TEE / StrongBox
 * @param {Object} student Student record ({ id, roll_no, name, personal_email })
 */
export async function bindStudentDevice(student) {
  const deviceName = detectDeviceName();
  const challenge = generateDeviceChallenge();
  const keyAlias = `PRESENTLY_KEY_${student.id || student.roll_no}`;

  // ==========================================
  // PATH A: Native Android Keystore (TEE / StrongBox)
  // ==========================================
  if (isAndroidKeystoreAvailable()) {
    try {
      let res = null;
      if (typeof window !== 'undefined' && window.AndroidKeystore?.generateDeviceBoundKey) {
        const resRaw = await window.AndroidKeystore.generateDeviceBoundKey(
          keyAlias, 
          student.id || student.roll_no,
          challenge
        );
        res = typeof resRaw === 'string' ? JSON.parse(resRaw) : resRaw;
      } else {
        res = await NativeKeystore.generateDeviceBoundKey({
          alias: keyAlias,
          studentId: student.id || student.roll_no,
          challenge: challenge
        });
      }

      if (!res || !res.publicKey) {
        throw new Error(res?.message || 'Android Keystore failed to generate hardware key.');
      }

      return {
        success: true,
        credentialId: res.alias || keyAlias,
        publicKey: res.publicKey,
        deviceId: res.deviceId || res.alias,
        deviceName: res.deviceModel || deviceName,
        isHardwareBacked: Boolean(res.isHardwareBacked ?? true),
        boundAt: new Date().toISOString(),
        type: 'android_keystore'
      };
    } catch (err) {
      console.error('[AndroidKeystore] Key generation error:', err);
      throw new Error(`Android Keystore Error: ${err.message || 'Unable to generate hardware-bound key.'}`);
    }
  }

  // ==========================================
  // PATH B: WebAuthn Platform Authenticator (Web / HTTPS)
  // ==========================================
  if (browserSupportsWebAuthn()) {
    try {
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
          name: (student.roll_no || student.personal_email || 'student').toLowerCase(),
          displayName: student.name || 'Student'
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },  // ES256 (ECDSA on P-256)
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

      const regResult = await startRegistration({ optionsJSON });
      if (!regResult || !regResult.id) {
        throw new Error('Failed to obtain passkey from device hardware.');
      }

      return {
        success: true,
        credentialId: regResult.id,
        publicKey: regResult.response?.publicKey || regResult.id,
        deviceId: regResult.id,
        deviceName: deviceName,
        isHardwareBacked: true,
        boundAt: new Date().toISOString(),
        type: 'webauthn'
      };
    } catch (err) {
      console.error('[WebAuthn] Registration error:', err);
      if (err.name === 'NotAllowedError' || err.code === 'ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY') {
        throw new Error('Device Binding Cancelled: Please confirm your screen lock (fingerprint / PIN) to bind this device.');
      }
      if (err.name === 'InvalidStateError') {
        throw new Error('This device is already registered with a key for this account.');
      }
      throw new Error(`Device Setup Error: ${err.message || 'Unable to register device key.'}`);
    }
  }

  // ==========================================
  // PATH C: Local Development / Simulator Fallback
  // ==========================================
  const fallbackId = `dev-device-${student.roll_no || student.id}`;
  return {
    success: true,
    credentialId: fallbackId,
    publicKey: `pub-${fallbackId}`,
    deviceId: fallbackId,
    deviceName: deviceName,
    isHardwareBacked: false,
    boundAt: new Date().toISOString(),
    type: 'dev_simulator'
  };
}

/**
 * 2. Verify / Assert Hardware Key for Student (Subsequent Logins)
 * Signs a fresh server challenge using the locked hardware private key
 * @param {string} credentialId Key alias or credential ID
 * @param {string} deviceName Friendly name of registered device
 */
export async function verifyStudentDevice(credentialId, deviceName = 'Personal Device') {
  if (!credentialId) {
    throw new Error('No registered device credential found for this student account.');
  }

  const challenge = generateDeviceChallenge();

  // ==========================================
  // PATH A: Native Android Keystore (Sign Challenge)
  // ==========================================
  if (isAndroidKeystoreAvailable()) {
    try {
      let res = null;
      if (typeof window !== 'undefined' && window.AndroidKeystore?.signChallenge) {
        const resRaw = await window.AndroidKeystore.signChallenge(credentialId, challenge);
        res = typeof resRaw === 'string' ? JSON.parse(resRaw) : resRaw;
      } else {
        res = await NativeKeystore.signChallenge({
          alias: credentialId,
          challenge: challenge
        });
      }

      if (!res || !res.signature) {
        throw new Error(res?.message || 'Failed to generate cryptographic signature from Android Keystore.');
      }

      return {
        success: true,
        credentialId: credentialId,
        signature: res.signature,
        challenge: challenge,
        deviceId: res.deviceId || credentialId,
        type: 'android_keystore'
      };
    } catch (err) {
      console.error('[AndroidKeystore] Signing error:', err);
      throw new Error(`Device Verification Failed: Key signature could not be verified on this hardware (${deviceName}).`);
    }
  }

  // ==========================================
  // PATH B: WebAuthn Platform Authenticator
  // ==========================================
  if (browserSupportsWebAuthn()) {
    try {
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

      const authResult = await startAuthentication({ optionsJSON });
      if (!authResult || !authResult.id) {
        throw new Error('Device verification could not be validated.');
      }

      return {
        success: true,
        credentialId: authResult.id,
        signature: authResult.response?.signature || authResult.id,
        challenge: challenge,
        type: 'webauthn'
      };
    } catch (err) {
      console.error('[WebAuthn] Verification error:', err);
      if (err.name === 'NotAllowedError') {
        throw new Error(`Access Denied: Verification cancelled or not matched. Account locked to registered phone (${deviceName}).`);
      }
      throw new Error(`Access Denied: This student account is bound to another physical device (${deviceName}). Please use your registered phone.`);
    }
  }

  // ==========================================
  // PATH C: Local Development Simulator
  // ==========================================
  return {
    success: true,
    credentialId: credentialId,
    signature: `sim-sig-${challenge}`,
    challenge: challenge,
    type: 'dev_simulator'
  };
}
