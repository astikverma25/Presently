import { supabase } from '../lib/supabaseClient.js';
import { AuthService } from './authService.js';
import { getIndianDateString, getIndianDayName } from '../utils/dateUtils.js';

/**
 * Service to manage Real Admin Database Operations on Supabase
 * Direct integration with Supabase tables:
 * - faculty
 * - sections
 * - students
 * - subjects
 * - section_subjects
 * - faculty_assignment
 * - admins
 */
export class AdminService {
  /**
   * 0. Admin Profile & Session info
   */
  static async getProfile() {
    try {
      const session = AuthService.getCurrentSession();
      if (!session?.user || session.role !== 'admin') {
        return null;
      }

      const email = (session.user.email || '').trim().toLowerCase();
      if (!email) return null;

      // 1. Verify existence in public.admins database table
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .ilike('email', email)
        .maybeSingle();

      if (data && !error) {
        return {
          id: data.id,
          name: data.name || data.full_name || 'System Administrator',
          email: data.email,
          role: data.role || 'Administrator',
          avatarInitials: (data.name || 'AD').split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()
        };
      }

      // 2. Fallback to designated institutional super admin whitelist
      const designatedAdmins = {
        'vishalgupta@liet.in': { name: 'Vishal Gupta', role: 'Super Admin', id: 'admin-vishal-gupta' },
        'admin@liet.in': { name: 'System Administrator', role: 'Super Admin', id: 'admin-liet' },
        'admin@presently.edu': { name: 'System Administrator', role: 'Super Admin', id: 'admin-presently' },
        'admin@university.edu': { name: 'System Administrator', role: 'Super Admin', id: 'admin-university' }
      };

      if (designatedAdmins[email]) {
        const acc = designatedAdmins[email];
        return {
          id: acc.id,
          name: acc.name,
          email: email,
          role: acc.role,
          avatarInitials: acc.name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()
        };
      }

      // If email is not in public.admins or whitelist, invalidate session
      localStorage.removeItem('presently_auth_session');
      return null;
    } catch (err) {
      console.warn('Could not fetch real admin profile:', err);
    }

    return null;
  }

  /**
   * Helper: Assert active administrator session before any mutation
   */
  static assertAdminSession() {
    const session = AuthService.getCurrentSession();
    if (!session?.user || session.role !== 'admin') {
      throw new Error('Access Denied: You must be logged in as an administrator to perform this action.');
    }
    return session.user;
  }

  /**
   * 1. Faculty Operations
   */
  static async getFaculty() {
    const { data, error } = await supabase
      .from('faculty')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching faculty:', error.message);
      return [];
    }
    return data || [];
  }

  static async addFaculty(facultyData) {
    AdminService.assertAdminSession();

    const { data, error } = await supabase
      .from('faculty')
      .insert([
        {
          name: (facultyData.name || '').trim(),
          email: (facultyData.email || '').trim().toLowerCase(),
          department: (facultyData.department || '').trim() || null
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error adding faculty:', error);
      throw error;
    }
    return data;
  }

  /**
   * 2. Subject / Course Operations
   */
  static async getSubjects() {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching subjects:', error.message);
      return [];
    }
    return data || [];
  }

  static async addSubject(subjectData) {
    AdminService.assertAdminSession();

    const { data, error } = await supabase
      .from('subjects')
      .insert([
        {
          subject_name: (subjectData.subjectName || '').trim(),
          subject_code: (subjectData.subjectCode || '').trim().toUpperCase(),
          semester: parseInt(String(subjectData.semester).replace(/[^0-9]/g, ''), 10) || 1
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error adding subject:', error);
      throw error;
    }
    return data;
  }

  /**
   * 3. Section Operations
   */
  static async getSections() {
    const { data, error } = await supabase
      .from('sections')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sections:', error.message);
      return [];
    }
    return data || [];
  }

  static async addSection(sectionData) {
    AdminService.assertAdminSession();

    const { data, error } = await supabase
      .from('sections')
      .insert([
        {
          section_name: (sectionData.sectionName || '').trim(),
          branch: sectionData.branch || 'CSE',
          semester: parseInt(String(sectionData.semester).replace(/[^0-9]/g, ''), 10) || 1,
          total_students: parseInt(sectionData.totalStudents, 10) || 50
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error adding section:', error);
      throw error;
    }
    return data;
  }

  /**
   * 4. Student Operations
   */
  static async getStudents() {
    const { data, error } = await supabase
      .from('students')
      .select(`
        *,
        sections (
          id,
          section_name,
          branch,
          semester
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching students:', error.message);
      return [];
    }
    return data || [];
  }

  static async addStudent(studentData) {
    AdminService.assertAdminSession();

    const payload = {
      name: (studentData.name || '').trim(),
      roll_no: (studentData.rollNo || '').trim().toUpperCase(),
      section_id: studentData.sectionId || null,
      branch: studentData.branch || 'CSE',
      semester: parseInt(String(studentData.semester).replace(/[^0-9]/g, ''), 10) || 1,
      personal_email: studentData.personalEmail ? studentData.personalEmail.trim().toLowerCase() : null,
      phone: studentData.phone ? studentData.phone.trim() : null,
      photo_url: studentData.photoUrl ? studentData.photoUrl.trim() : null,
      login_username: studentData.personalEmail ? studentData.personalEmail.trim().toLowerCase() : (studentData.rollNo || '').trim().toLowerCase(),
      account_status: 'active'
    };

    const { data, error } = await supabase
      .from('students')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('Error adding student:', error);
      throw error;
    }
    return data;
  }

  static async deleteStudent(studentId) {
    const admin = AdminService.assertAdminSession();

    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('admin_delete_student', {
        p_student_id: studentId,
        p_admin_email: admin.email
      });

      if (!rpcErr && rpcRes?.success) {
        return true;
      }
      if (rpcRes && rpcRes.success === false) {
        throw new Error(rpcRes.message || 'Failed to delete student.');
      }
    } catch (err) {
      if (err.message && err.message.includes('Access Denied')) {
        throw err;
      }
    }

    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', studentId);

    if (error) {
      console.error('Error deleting student:', error);
      throw error;
    }
    return true;
  }

  /**
   * 5. Faculty Assignment / Timetable Operations
   */
  static async getAssignments() {
    const { data, error } = await supabase
      .from('faculty_assignment')
      .select(`
        id,
        lec_id,
        lec_date,
        status,
        start_time,
        end_time,
        room_no,
        subject_id,
        section_id,
        faculty_id,
        faculty:faculty_id (id, name, email, department),
        subject:subject_id (id, subject_name, subject_code, semester),
        section:section_id (id, section_name, branch, semester, total_students)
      `)
      .order('lec_date', { ascending: true });

    if (error) {
      console.error('Error fetching assignments:', error.message);
      return [];
    }

    return (data || []).map(a => ({
      ...a,
      subject: a.subject,
      section: a.section
    }));
  }

  static async assignFaculty(assignmentData) {
    AdminService.assertAdminSession();

    // 1. Resolve slots list (Individual date, start_time, end_time, room_no per lecture)
    let slots = [];
    if (Array.isArray(assignmentData.slots) && assignmentData.slots.length > 0) {
      slots = assignmentData.slots;
    } else if (Array.isArray(assignmentData.dates) && assignmentData.dates.length > 0) {
      slots = assignmentData.dates.map(dStr => ({
        lecDate: dStr,
        startTime: assignmentData.startTime || '10:00:00',
        endTime: assignmentData.endTime || '11:00:00',
        roomNo: assignmentData.roomNo || 'Room 101'
      }));
    } else {
      slots = [
        {
          lecDate: assignmentData.lecDate || getIndianDateString(),
          startTime: assignmentData.startTime || '10:00:00',
          endTime: assignmentData.endTime || '11:00:00',
          roomNo: assignmentData.roomNo || 'Room 101'
        }
      ];
    }

    // 2. Direct rows for batch insert
    const rows = slots.map(slot => {
      const dateStr = slot.lecDate || getIndianDateString();
      const dateCode = dateStr.replace(/-/g, '');
      const randSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
      const lecId = `LEC-${dateCode}-${randSuffix}`;

      return {
        faculty_id: assignmentData.facultyId,
        subject_id: assignmentData.subjectId,
        section_id: assignmentData.sectionId,
        lec_id: lecId,
        lec_date: dateStr,
        status: 'scheduled',
        start_time: slot.startTime || '10:00:00',
        end_time: slot.endTime || '11:00:00',
        room_no: (slot.roomNo || assignmentData.roomNo || 'Room 101').trim()
      };
    });

    const { data, error } = await supabase
      .from('faculty_assignment')
      .insert(rows)
      .select();

    if (error) {
      console.error('Error creating faculty assignments:', error);
      throw error;
    }
    return data;
  }

  static async updateAssignment(id, updateData) {
    AdminService.assertAdminSession();

    const payload = {};
    if (updateData.startTime) payload.start_time = updateData.startTime;
    if (updateData.endTime) payload.end_time = updateData.endTime;
    if (updateData.roomNo) payload.room_no = updateData.roomNo.trim();
    if (updateData.facultyId) payload.faculty_id = updateData.facultyId;
    if (updateData.subjectId) payload.subject_id = updateData.subjectId;
    if (updateData.sectionId) payload.section_id = updateData.sectionId;
    if (updateData.lecDate) payload.lec_date = updateData.lecDate;
    if (updateData.status) payload.status = updateData.status;

    const { data, error } = await supabase
      .from('faculty_assignment')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating assignment:', error);
      throw error;
    }
    return data;
  }

  static async deleteAssignment(id) {
    const admin = AdminService.assertAdminSession();

    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('admin_delete_assignment', {
        p_assignment_id: id,
        p_admin_email: admin.email
      });

      if (!rpcErr && rpcRes?.success) {
        return true;
      }
      if (rpcRes && rpcRes.success === false) {
        throw new Error(rpcRes.message || 'Failed to delete assignment.');
      }
    } catch (err) {
      if (err.message && err.message.includes('Access Denied')) {
        throw err;
      }
    }

    const { error } = await supabase
      .from('faculty_assignment')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting assignment:', error);
      throw error;
    }
    return true;
  }

  /**
   * Reset a student's bound device / passkey (Admin Guarded)
   */
  static async resetStudentDevice(studentId) {
    const admin = AdminService.assertAdminSession();

    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('reset_student_device', {
        p_student_id: studentId,
        p_admin_email: admin.email
      });

      if (!rpcErr && rpcRes?.success) {
        return rpcRes;
      }
      if (rpcRes && rpcRes.success === false) {
        throw new Error(rpcRes.message || 'Failed to reset student device.');
      }
    } catch (err) {
      if (err.message && err.message.includes('Access Denied')) {
        throw err;
      }
    }

    // Direct table update fallback
    const { data, error } = await supabase
      .from('students')
      .update({
        passkey_credential_id: null,
        passkey_public_key: null,
        device_bound_at: null,
        device_name: null,
        session_token: null,
        session_expires_at: null
      })
      .eq('id', studentId)
      .select()
      .single();

    if (error) {
      console.error('Error resetting student device:', error);
      throw error;
    }

    return {
      success: true,
      message: 'Student device binding reset successfully. Student can now bind a new phone on next login.',
      student: data
    };
  }
}


