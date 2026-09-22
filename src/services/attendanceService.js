import { supabase } from '../lib/supabaseClient.js';
import { exportToCSV } from '../utils/exportHelpers.js';
import { getLocalDateString } from '../utils/dateUtils.js';

/**
 * Service to manage Real Attendance Records, Manual Overrides, and CSV Exports
 * Connected directly to Supabase public.attendance_records and public.students
 */
export class AttendanceService {
  /**
   * 1. Fetch live attendance records for a specific section and date
   */
  static async getAttendanceRecords(sectionName = '', date = '', assignmentId = null, lecId = null) {
    if (!sectionName) return [];

    try {
      const cleanSection = sectionName.includes('-') ? sectionName.split('-')[1].trim() : sectionName.trim();
      const targetDate = date || getLocalDateString();
      
      const { data: sectionData } = await supabase
        .from('sections')
        .select('id, section_name')
        .ilike('section_name', `%${cleanSection}%`)
        .limit(1)
        .maybeSingle();

      const sectionId = sectionData?.id;

      // Query students in this section
      let studentsQuery = supabase.from('students').select('*').order('roll_no', { ascending: true });
      if (sectionId) {
        studentsQuery = studentsQuery.eq('section_id', sectionId);
      }

      const { data: students, error: stdErr } = await studentsQuery;

      if (stdErr) {
        console.error('Error fetching students for attendance:', stdErr);
        return [];
      }

      if (!students || !students.length) {
        return [];
      }

      // Query attendance records for this date and/or lecture
      let attQuery = supabase
        .from('attendance_records')
        .select('*');

      if (lecId) {
        attQuery = attQuery.eq('lec_id', lecId);
      } else if (assignmentId) {
        attQuery = attQuery.eq('faculty_assignment_id', assignmentId);
      } else if (targetDate) {
        attQuery = attQuery.eq('lecture_date', targetDate);
      }

      const { data: attRecords } = await attQuery;

      const recordsMap = new Map();
      (attRecords || []).forEach(r => {
        recordsMap.set(r.student_id, r);
      });

      return students.map((s, idx) => {
        const existingRecord = recordsMap.get(s.id);
        const isPresent = existingRecord?.status === 'present';
        const markedTime = existingRecord?.marked_at 
          ? new Date(existingRecord.marked_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          : (isPresent ? 'Marked' : '—');

        return {
          sNo: idx + 1,
          id: existingRecord?.id || null,
          studentId: s.id,
          rollNo: s.roll_no || `2A-0${idx + 40}`,
          studentName: s.name,
          markedAt: isPresent ? markedTime : '—',
          status: isPresent ? 'Present' : 'Absent',
          verificationMethod: existingRecord?.verification_method || 'qr_scan',
          lecId: existingRecord?.lec_id || lecId || null,
          lectureDate: targetDate
        };
      });
    } catch (err) {
      console.error('getAttendanceRecords error:', err);
      return [];
    }
  }

  /**
   * 2. Save updated attendance manual overrides to database
   */
  static async saveAttendanceChanges(sectionName, date, records, extra = {}) {
    try {
      const targetDate = date || getLocalDateString();
      const assignmentId = extra.facultyAssignmentId || null;
      const lecId = extra.lecId || null;

      // Bulk upsert attendance records with lec_id and lecture_date
      const upsertPayload = records.map(r => ({
        student_id: r.studentId,
        faculty_assignment_id: assignmentId || r.facultyAssignmentId || null,
        lec_id: lecId || r.lecId || null,
        lecture_date: targetDate,
        status: (r.status || 'absent').toLowerCase(),
        marked_at: r.status === 'Present' ? (r.markedAt && r.markedAt !== '—' ? new Date().toISOString() : new Date().toISOString()) : null,
        verification_method: 'manual_override'
      }));

      const { error } = await supabase
        .from('attendance_records')
        .upsert(upsertPayload);

      if (error) {
        console.error('Error saving attendance changes:', error);
        throw error;
      }

      return {
        success: true,
        message: 'Attendance records updated successfully in Supabase!',
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      console.error('saveAttendanceChanges error:', err);
      throw err;
    }
  }

  /**
   * 3. Export records to CSV
   */
  static exportRecords(records, filename = 'attendance_report.csv') {
    const formatted = (records || []).map(r => ({
      'S.No': r.sNo,
      'Roll No': r.rollNo,
      'Student Name': r.studentName,
      'Marked At': r.markedAt,
      'Status': r.status
    }));
    exportToCSV(filename, formatted);
  }
}
