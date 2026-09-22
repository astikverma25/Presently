import { supabase } from '../lib/supabaseClient.js';
import { AuthService } from './authService.js';
import { getLocalDateString } from '../utils/dateUtils.js';

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
          semester: subjectData.semester || '4th'
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
          semester: sectionData.semester || '4th',
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
      semester: studentData.semester || '4th',
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
        day_of_week,
        start_time,
        end_time,
        room_no,
        created_at,
        faculty:faculty_id (
          id,
          name,
          email,
          department
        ),
        section_subject:section_subject_id (
          id,
          subject:subject_id (
            id,
            subject_name,
            subject_code
          ),
          section:section_id (
            id,
            section_name,
            branch,
            semester
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching assignments:', error.message);
      return [];
    }
    return data || [];
  }

  static async assignFaculty(assignmentData) {
    // 1. Find or create section_subjects link
    let sectionSubjectId = null;
    const { data: existingSS, error: ssFindErr } = await supabase
      .from('section_subjects')
      .select('id')
      .eq('subject_id', assignmentData.subjectId)
      .eq('section_id', assignmentData.sectionId)
      .maybeSingle();

    if (ssFindErr) {
      console.warn('Lookup section_subjects:', ssFindErr.message);
    }

    if (existingSS) {
      sectionSubjectId = existingSS.id;
    } else {
      const { data: newSS, error: ssInsertErr } = await supabase
        .from('section_subjects')
        .insert([
          {
            subject_id: assignmentData.subjectId,
            section_id: assignmentData.sectionId
          }
        ])
        .select()
        .single();

      if (ssInsertErr) {
        console.error('Error creating section_subject:', ssInsertErr);
        throw ssInsertErr;
      }
      sectionSubjectId = newSS.id;
    }

    // 2. Resolve slots list (Individual date, start_time, end_time, room_no per lecture)
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const getDayName = (dateStr) => {
      const d = new Date(dateStr + 'T00:00:00');
      return isNaN(d.getDay()) ? (assignmentData.dayOfWeek || 'Monday') : days[d.getDay()];
    };

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
          lecDate: assignmentData.lecDate || getLocalDateString(),
          startTime: assignmentData.startTime || '10:00:00',
          endTime: assignmentData.endTime || '11:00:00',
          roomNo: assignmentData.roomNo || 'Room 101'
        }
      ];
    }

    // 3. Build rows for batch insert
    const rows = slots.map(slot => {
      const dateStr = slot.lecDate || getLocalDateString();
      const dateCode = dateStr.replace(/-/g, '');
      const randSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
      const lecId = `LEC-${dateCode}-${randSuffix}`;
      const dayOfWeek = getDayName(dateStr);

      return {
        section_subject_id: sectionSubjectId,
        faculty_id: assignmentData.facultyId,
        lec_id: lecId,
        lec_date: dateStr,
        status: 'scheduled',
        day_of_week: dayOfWeek,
        start_time: slot.startTime || '10:00:00',
        end_time: slot.endTime || '11:00:00',
        room_no: (slot.roomNo || assignmentData.roomNo || 'Room 101').trim()
      };
    });

    // 4. Insert into faculty_assignment table
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
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const getDayName = (dateStr) => {
      const d = new Date(dateStr + 'T00:00:00');
      return isNaN(d.getDay()) ? (updateData.dayOfWeek || 'Monday') : days[d.getDay()];
    };

    const payload = {
      start_time: updateData.startTime,
      end_time: updateData.endTime,
      room_no: (updateData.roomNo || 'Room 101').trim()
    };

    if (updateData.facultyId) {
      payload.faculty_id = updateData.facultyId;
    }

    if (updateData.lecDate) {
      payload.lec_date = updateData.lecDate;
      payload.day_of_week = getDayName(updateData.lecDate);
    }

    if (updateData.status) {
      payload.status = updateData.status;
    }

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
}

