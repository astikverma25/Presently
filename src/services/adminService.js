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
      if (session?.user?.email) {
        if (session.user.name) {
          const initials = session.user.name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase();
          return {
            id: session.user.id || 'admin-root',
            name: session.user.name,
            email: session.user.email,
            role: 'Super Administrator',
            avatarInitials: initials || 'AD'
          };
        }

        const { data, error } = await supabase
          .from('admins')
          .select('*')
          .eq('email', session.user.email)
          .maybeSingle();

        if (data && !error) {
          return {
            id: data.id,
            name: data.name,
            email: data.email,
            role: data.role || 'Administrator',
            avatarInitials: data.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
          };
        }

        return {
          id: session.user.id,
          name: session.user.name || session.user.email.split('@')[0],
          email: session.user.email,
          role: 'Administrator',
          avatarInitials: (session.user.name || 'Admin').slice(0, 2).toUpperCase()
        };
      }

      // Check first admin in database
      const { data } = await supabase.from('admins').select('*').limit(1).maybeSingle();
      if (data) {
        return {
          id: data.id,
          name: data.name,
          email: data.email,
          role: data.role || 'Super Admin',
          avatarInitials: data.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
        };
      }
    } catch (err) {
      console.warn('Could not fetch real admin profile:', err);
    }

    return {
      id: 'admin-root',
      name: 'Vishal Gupta',
      email: 'vishalgupta@liet.in',
      role: 'Super Administrator',
      avatarInitials: 'VG'
    };
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
    const { data, error } = await supabase
      .from('faculty')
      .insert([
        {
          name: (facultyData.name || '').trim(),
          email: (facultyData.email || '').trim().toLowerCase(),
          department: facultyData.department || 'Computer Science & Engineering'
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
   * Reset a student's bound device / passkey
   */
  static async resetStudentDevice(studentId) {
    try {
      // 1. Try stored procedure if available
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('reset_student_device', {
        p_student_id: studentId
      });

      if (!rpcErr && rpcRes?.success) {
        return rpcRes;
      }
    } catch {
      // fallback
    }

    // Direct table update fallback
    const { data, error } = await supabase
      .from('students')
      .update({
        passkey_credential_id: null,
        passkey_public_key: null,
        device_bound_at: null,
        device_name: null
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


