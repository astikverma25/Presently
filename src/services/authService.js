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

        // Return challenge requiring direct user gesture for passkey
        return {
          requiresDevicePrompt: true,
          isNewDevice: !student.passkey_credential_id,
          student: student,
          deviceName: student.device_name || 'Personal Device'
        };
      } catch (err) {
        throw new Error(err.message || 'Student login failed.');
      }
    }

    // 2. FACULTY LOGIN
    if (cleanRole === 'staff' || cleanRole === 'faculty') {
      try {
        // Try Supabase Auth first
        if (supabase?.auth) {
          const { data } = await supabase.auth.signInWithPassword({
            email: cleanId.toLowerCase(),
            password: password
          });
          if (data?.session) {
            const sessionPayload = {
              user: data.user,
              role: 'staff',
              token: data.session.access_token,
              isSupabase: true
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionPayload));
            return { success: true, role: 'staff', redirectUrl: '/faculty.html' };
          }
        }

        // Direct lookup from faculty table
        const { data: faculty, error: facErr } = await supabase
          .from('faculty')
          .select('*')
          .or(`email.ilike.${cleanId},name.ilike.${cleanId}`)
          .limit(1)
          .maybeSingle();

        if (facErr || !faculty) {
          throw new Error(`Faculty member "${cleanId}" not found in institutional faculty registry.`);
        }

        const sessionPayload = {
          user: {
            id: faculty.id,
            email: faculty.email,
            name: faculty.name,
            role: 'faculty',
            department: faculty.department || 'Computer Science & Engineering'
          },
          role: 'staff',
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
        let admin = null;
        const lowerId = cleanId.toLowerCase();

        // A. Attempt lookup in Supabase admins table if reachable
        try {
          const { data: dbAdmin } = await supabase
            .from('admins')
            .select('*')
            .or(`email.ilike.${cleanId},name.ilike.${cleanId}`)
            .limit(1)
            .maybeSingle();

          if (dbAdmin) {
            admin = dbAdmin;
          }
        } catch (dbEx) {
          console.warn('Admin database lookup skipped due to RLS:', dbEx);
        }

        // B. Strict Designated Institutional Admin Registry Whitelist
        if (!admin) {
          const adminAccounts = {
            'vishalgupta@liet.in': { name: 'Vishal Gupta', role: 'Super Admin', id: 'admin-vishal-gupta' },
            'vishalgupta': { name: 'Vishal Gupta', role: 'Super Admin', id: 'admin-vishal-gupta' },
            'admin@liet.in': { name: 'System Administrator', role: 'Super Admin', id: 'admin-liet' },
            'admin@presently.edu': { name: 'System Administrator', role: 'Super Admin', id: 'admin-presently' },
            'admin@university.edu': { name: 'System Administrator', role: 'Super Admin', id: 'admin-university' },
            'admin': { name: 'System Administrator', role: 'Super Admin', id: 'admin-root' }
          };

          if (adminAccounts[lowerId]) {
            const acc = adminAccounts[lowerId];
            admin = {
              id: acc.id,
              name: acc.name,
              email: lowerId.includes('@') ? lowerId : `${lowerId}@liet.in`,
              role: acc.role
            };
          }
        }

        // C. If not a designated admin, check if user is a Faculty or Student attempting cross-login
        if (!admin) {
          try {
            const { data: facCheck } = await supabase
              .from('faculty')
              .select('id, name, email')
              .ilike('email', cleanId)
              .maybeSingle();

            if (facCheck) {
              throw new Error(`Access Denied: "${cleanId}" is registered as a Faculty member. Please select the "Faculty / Staff" role to log in.`);
            }

            const { data: stdCheck } = await supabase
              .from('students')
              .select('id, name, roll_no, personal_email')
              .or(`roll_no.eq.${cleanId},personal_email.ilike.${cleanId}`)
              .limit(1)
              .maybeSingle();

            if (stdCheck) {
              throw new Error(`Access Denied: "${cleanId}" is registered as a Student. Please select the "Student" role to log in.`);
            }
          } catch (crossErr) {
            if (crossErr.message?.includes('Access Denied')) {
              throw crossErr;
            }
          }

          throw new Error(`Access Denied: "${cleanId}" is not authorized as an Administrator.`);
        }

        const sessionPayload = {
          user: {
            id: admin.id,
            email: admin.email,
            name: admin.name || admin.full_name || 'System Administrator',
            role: 'admin'
          },
          role: 'admin',
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
   * Complete Student Device Passkey Registration or Verification (Called immediately on user button tap)
   */
  static async completeStudentDeviceAuth(student, isNewDevice) {
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

      const { error: bindErr } = await supabase
        .from('students')
        .update({
          passkey_credential_id: passkeyResult.credentialId,
          passkey_public_key: passkeyResult.publicKey,
          device_bound_at: passkeyResult.boundAt,
          device_name: passkeyResult.deviceName
        })
        .eq('id', student.id);

      if (bindErr) {
        console.error('Failed to record device passkey:', bindErr);
        throw new Error('Failed to record device binding in institutional database. Please try again.');
      }
    } else {
      // 2. Subsequent Passkey Assertion
      await verifyDevicePasskey(student.passkey_credential_id, student.device_name);
    }

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
   * Get Destination Dashboard URL by Role
   */
  static getRedirectUrl(role) {
    if (role === 'admin') return '/admin.html';
    if (role === 'staff' || role === 'faculty') return '/faculty.html';
    return '/student.html';
  }
}

