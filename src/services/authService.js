import { supabase } from '../lib/supabaseClient.js';
import { hashPassword } from '../utils/totpCrypto.js';
import { registerDevicePasskey, verifyDevicePasskey } from '../utils/webAuthnHelper.js';

const STORAGE_KEY = 'presently_auth_session';

/**
 * Authentication Service connected directly to Supabase PostgreSQL Tables
 */
export class AuthService {
  /**
   * Sign in with Roll Number / Institutional Email, Password and Role
   */
  static async signIn(identifier, password, role = 'student') {
    const cleanId = (identifier || '').trim();
    const cleanRole = role === 'faculty' ? 'staff' : role;

    if (!cleanId) {
      throw new Error('Please enter your institutional Email or Roll Number.');
    }
    if (!password) {
      throw new Error('Please enter your account password.');
    }

    // 1. STUDENT LOGIN (Hardware Device Binding via WebAuthn)
    if (cleanRole === 'student') {
      try {
        const enteredHash = await hashPassword(password);

        // Fetch student record from database including passkey details
        const { data: student, error: stdErr } = await supabase
          .from('students')
          .select('*, sections:section_id(id, section_name, branch, semester)')
          .or(`roll_no.eq.${cleanId},login_username.eq.${cleanId},personal_email.ilike.${cleanId}`)
          .limit(1)
          .maybeSingle();

        if (stdErr || !student) {
          throw new Error(`Student with Roll No / Username "${cleanId}" not found in institutional records.`);
        }

        // Verify password hash
        if (student.password_hash) {
          if (student.password_hash !== enteredHash && student.password_hash !== password) {
            throw new Error('Incorrect password. Please verify and try again.');
          }
        } else {
          // Initialize password if first time
          try {
            await supabase
              .from('students')
              .update({
                password_hash: enteredHash,
                login_username: student.roll_no
              })
              .eq('id', student.id);
          } catch (e) {
            console.warn('Could not persist initial password hash:', e);
          }
        }

        const isLocalDev = typeof import.meta !== 'undefined' && 
          import.meta.env?.DEV && 
          (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

        // On local dev server only (completely stripped from production builds)
        if (isLocalDev) {
          const sessionPayload = {
            user: {
              id: student.id,
              email: student.personal_email || `${student.roll_no}@university.edu`,
              name: student.name,
              roll_no: student.roll_no,
              section_id: student.section_id,
              section_name: student.sections?.section_name || '2A',
              class_name: `${student.branch || 'CSE'} - Sem ${student.semester || '3'}`
            },
            token: student.session_token || 'dev-local-token',
            role: 'student',
            isSupabase: true,
            isLocalDev: true,
            loggedAt: new Date().toISOString()
          };

          localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionPayload));
          return {
            success: true,
            role: 'student',
            redirectUrl: '/student.html'
          };
        }

        // Production / HTTPS: Return challenge requiring direct user gesture for passkey
        return {
          requiresDevicePrompt: true,
          isNewDevice: !student.passkey_credential_id,
          student: student,
          enteredPasswordHash: enteredHash,
          deviceName: student.device_name || 'Personal Device'
        };
      } catch (err) {
        throw new Error(err.message || 'Student login failed.');
      }
    }

    // 2. FACULTY LOGIN
    if (cleanRole === 'staff' || cleanRole === 'faculty') {
      try {
        let facultyEmail = cleanId.toLowerCase();

        // 1. If username was provided instead of email, lookup faculty record to resolve email
        if (!facultyEmail.includes('@')) {
          const { data: facultyByName } = await supabase
            .from('faculty')
            .select('*')
            .ilike('name', cleanId)
            .limit(1)
            .maybeSingle();

          if (facultyByName?.email) {
            facultyEmail = facultyByName.email.toLowerCase();
          }
        }

        // 2. Strictly authenticate with Supabase Auth
        const { data: authRes, error: authErr } = await supabase.auth.signInWithPassword({
          email: facultyEmail,
          password: password
        });

        if (authErr || !authRes?.session) {
          throw new Error(authErr?.message || `Invalid credentials for faculty member "${cleanId}".`);
        }

        // 3. Find the exact matching faculty row for the authenticated user's email
        const authenticatedEmail = (authRes.user.email || facultyEmail).toLowerCase();
        const { data: facultyRecord } = await supabase
          .from('faculty')
          .select('*')
          .ilike('email', authenticatedEmail)
          .maybeSingle();

        const facultyUser = facultyRecord || {
          id: authRes.user.id,
          email: authenticatedEmail,
          name: authRes.user.user_metadata?.name || authenticatedEmail.split('@')[0],
          department: authRes.user.user_metadata?.department || ''
        };

        const sessionPayload = {
          user: {
            id: facultyUser.id,
            email: facultyUser.email || authenticatedEmail,
            name: facultyUser.name,
            role: 'faculty',
            department: facultyUser.department || ''
          },
          role: 'staff',
          token: authRes.session.access_token,
          isSupabase: true,
          loggedAt: new Date().toISOString()
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionPayload));
        return {
          success: true,
          role: 'staff',
          redirectUrl: '/faculty.html'
        };
      } catch (err) {
        throw new Error(err.message || 'Faculty login failed.');
      }
    }

    // 3. ADMIN LOGIN
    if (cleanRole === 'admin') {
      try {
        let adminEmail = cleanId.toLowerCase();

        // A. If username was provided without @, lookup in admins table to resolve email
        if (!adminEmail.includes('@')) {
          const { data: adminByName } = await supabase
            .from('admins')
            .select('*')
            .ilike('name', cleanId)
            .limit(1)
            .maybeSingle();

          if (adminByName?.email) {
            adminEmail = adminByName.email.toLowerCase();
          } else {
            // Check designated admin aliases
            const adminAliases = {
              'vishalgupta': 'vishalgupta@liet.in',
              'admin': 'admin@liet.in'
            };
            if (adminAliases[adminEmail]) {
              adminEmail = adminAliases[adminEmail];
            }
          }
        }

        // B. Strictly authenticate credentials with Supabase Auth
        const { data: authRes, error: authErr } = await supabase.auth.signInWithPassword({
          email: adminEmail,
          password: password
        });

        if (authErr || !authRes?.session) {
          throw new Error(authErr?.message || `Invalid credentials for administrator "${cleanId}".`);
        }

        // C. Verify authorization in public.admins table using the authenticated user's email
        const authenticatedEmail = (authRes.user.email || adminEmail).toLowerCase();
        let adminRecord = null;

        const { data: dbAdmin } = await supabase
          .from('admins')
          .select('*')
          .ilike('email', authenticatedEmail)
          .maybeSingle();

        if (dbAdmin) {
          adminRecord = dbAdmin;
        } else {
          // Whitelist fallback for initial system bootstrap
          const designatedAdmins = {
            'vishalgupta@liet.in': { name: 'Vishal Gupta', role: 'Super Admin', id: 'admin-vishal-gupta' },
            'admin@liet.in': { name: 'System Administrator', role: 'Super Admin', id: 'admin-liet' },
            'admin@presently.edu': { name: 'System Administrator', role: 'Super Admin', id: 'admin-presently' },
            'admin@university.edu': { name: 'System Administrator', role: 'Super Admin', id: 'admin-university' }
          };

          if (designatedAdmins[authenticatedEmail]) {
            const acc = designatedAdmins[authenticatedEmail];
            adminRecord = {
              id: acc.id,
              name: acc.name,
              email: authenticatedEmail,
              role: acc.role
            };
          }
        }

        // D. If not found in public.admins table or designated whitelist, deny access immediately
        if (!adminRecord) {
          await supabase.auth.signOut();
          throw new Error(`Access Denied: The account "${authenticatedEmail}" is not authorized as an Administrator in institutional records.`);
        }

        const sessionPayload = {
          user: {
            id: adminRecord.id || authRes.user.id,
            email: adminRecord.email || authenticatedEmail,
            name: adminRecord.name || adminRecord.full_name || 'System Administrator',
            role: 'admin'
          },
          role: 'admin',
          token: authRes.session.access_token,
          isSupabase: true,
          loggedAt: new Date().toISOString()
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionPayload));
        return {
          success: true,
          role: 'admin',
          redirectUrl: '/admin.html'
        };
      } catch (err) {
        throw new Error(err.message || 'Admin login failed.');
      }
    }

    throw new Error('Unknown user role.');
  }

  /**
   * Get Current Active Session
   */
  static getCurrentSession() {
    try {
      const item = localStorage.getItem(STORAGE_KEY);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }

  /**
   * Check if User is Logged In
   */
  static isAuthenticated() {
    return !!AuthService.getCurrentSession();
  }

  /**
   * Sign Out
   */
  static async signOut(requireConfirm = true) {
    if (requireConfirm) {
      const confirmed = window.confirm('Are you sure you want to log out?');
      if (!confirmed) return false;
    }
    try {
      if (supabase && supabase.auth) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Supabase signOut error:', err);
    } finally {
      localStorage.removeItem(STORAGE_KEY);
      window.location.href = '/index.html';
    }
    return true;
  }

  /**
   * Complete Student Device Passkey Registration or Verification via Secure Server RPC
   */
  static async completeStudentDeviceAuth(student, isNewDevice, enteredPasswordHash = '') {
    let sessionToken = null;
    let verifiedStudent = null;

    if (isNewDevice || !student.passkey_credential_id) {
      // 1. First-Time Passkey Registration (Hardware Security Enclave)
      const passkeyResult = await registerDevicePasskey({
        id: student.id,
        roll_no: student.roll_no,
        name: student.name,
        email: student.personal_email
      });

      if (!passkeyResult?.credentialId) {
        throw new Error('Device binding registration was not completed.');
      }

      // Secure Server-Side RPC (Prevents client-side direct updates)
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('bind_and_authorize_student_passkey', {
        p_student_id: student.id,
        p_password_hash: enteredPasswordHash,
        p_passkey_credential_id: passkeyResult.credentialId,
        p_passkey_public_key: passkeyResult.publicKey,
        p_device_name: passkeyResult.deviceName
      });

      if (rpcErr || !rpcRes?.success) {
        console.error('Server device binding error:', rpcErr || rpcRes);
        throw new Error(rpcRes?.message || rpcErr?.message || 'Failed to securely bind device in institutional database.');
      }

      sessionToken = rpcRes.session_token;
      verifiedStudent = rpcRes.student;
    } else {
      // 2. Subsequent Passkey Assertion
      await verifyDevicePasskey(student.passkey_credential_id, student.device_name);

      // Secure Server-Side RPC Verification
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('verify_and_authorize_student_login', {
        p_student_id: student.id,
        p_passkey_credential_id: student.passkey_credential_id
      });

      if (rpcErr || !rpcRes?.success) {
        console.error('Server passkey verification error:', rpcErr || rpcRes);
        throw new Error(rpcRes?.message || rpcErr?.message || 'Access Denied: Could not verify device credentials on server.');
      }

      sessionToken = rpcRes.session_token;
      verifiedStudent = rpcRes.student;
    }

    const sessionPayload = {
      user: {
        id: verifiedStudent?.id || student.id,
        email: verifiedStudent?.personal_email || student.personal_email || `${student.roll_no}@university.edu`,
        name: verifiedStudent?.name || student.name,
        roll_no: verifiedStudent?.roll_no || student.roll_no,
        section_id: verifiedStudent?.section_id || student.section_id,
        section_name: verifiedStudent?.section_name || student.sections?.section_name || '2A',
        class_name: `${verifiedStudent?.branch || student.branch || 'CSE'} - Sem ${verifiedStudent?.semester || student.semester || '3'}`
      },
      token: sessionToken,
      role: 'student',
      isSupabase: true,
      loggedAt: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionPayload));
    return {
      success: true,
      role: 'student',
      redirectUrl: '/student.html'
    };
  }

  /**
   * Validate Active Session with Backend (Prevents localStorage tampering)
   */
  static async validateActiveSession() {
    const session = AuthService.getCurrentSession();
    if (!session) return null;

    const isLocalDev = typeof import.meta !== 'undefined' && 
      import.meta.env?.DEV && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    if (session.role === 'student' && session.user?.id) {
      // Allow direct session validation during local development
      if (isLocalDev && session.isLocalDev) {
        return session;
      }

      if (!session.token) {
        // Missing backend token -> purge untrusted session
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }

      try {
        const { data: verifyRes, error } = await supabase.rpc('verify_student_session', {
          p_student_id: session.user.id,
          p_session_token: session.token
        });

        if (error || !verifyRes?.valid) {
          console.warn('Backend session verification failed:', error || verifyRes?.message);
          localStorage.removeItem(STORAGE_KEY);
          return null;
        }

        return session;
      } catch (err) {
        console.warn('Session check network error:', err);
        return session;
      }
    }

    return session;
  }

  /**
   * Get Destination Dashboard URL by Role
   */
  static getRedirectUrl(role) {
    if (role === 'admin') return '/admin.html';
    if (role === 'staff' || role === 'faculty') return '/faculty.html';
    return '/student.html';
  }
}

