import { supabase, getCurrentUserProfile } from '../lib/supabaseClient.js';
import { verifyTotpPayload } from '../utils/totpCrypto.js';
import { getLocalDateString } from '../utils/dateUtils.js';

/**
 * Service to manage Student Attendance & Camera Scan operations directly on Supabase
 */
export class StudentService {
  /**
   * 1. Fetches current student profile and real calculated attendance metrics
   */
  static async getProfile() {
    try {
      let student = null;
      const user = await getCurrentUserProfile();

      if (user && user.role === 'student') {
        const { data: stdData } = await supabase
          .from('students')
          .select('*, sections:section_id(id, section_name, branch, semester)')
          .eq('id', user.id)
          .maybeSingle();
        student = stdData;
      }

      // If no auth user, fetch first real student from database
      if (!student) {
        const { data: firstStudent } = await supabase
          .from('students')
          .select('*, sections:section_id(id, section_name, branch, semester)')
          .order('roll_no', { ascending: true })
          .limit(1)
          .maybeSingle();
        student = firstStudent;
      }

      if (student) {
        // Calculate real attendance stats from database
        const { data: records } = await supabase
          .from('attendance_records')
          .select('id, status')
          .eq('student_id', student.id);

        const totalRecords = records?.length || 0;
        const attended = records?.filter(r => r.status === 'present')?.length || 0;
        const total = totalRecords > 0 ? totalRecords : 0;
        const percentage = total > 0 ? Math.round((attended / total) * 100) : 100;

        return {
          id: student.id,
          name: student.name,
          rollNumber: student.roll_no,
          email: student.personal_email || `${student.roll_no?.toLowerCase()}@university.edu`,
          sectionId: student.section_id,
          sectionName: student.sections?.section_name || '2A',
          className: `${student.branch || 'CSE'} - ${student.semester || '3rd'} Sem`,
          department: 'Computer Science & Engineering',
          attendedClasses: attended,
          totalClasses: total,
          attendancePercentage: percentage
        };
      }
    } catch (err) {
      console.warn('Could not fetch student profile from Supabase:', err);
    }

    return {
      id: 'demo-student',
      name: 'Student User',
      rollNumber: '2501530100001',
      email: 'student@university.edu',
      sectionName: '2A',
      className: 'B.Tech CSE',
      department: 'Computer Science & Engineering',
      attendedClasses: 0,
      totalClasses: 0,
      attendancePercentage: 100
    };
  }

  /**
   * 2. Fetches active live QR session or next scheduled lecture for this student's section
   */
  static async getCurrentLecture(studentSectionId = null, studentSectionName = '2A') {
    try {
      const todayDate = getLocalDateString();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dateParts = todayDate.split('-').map(Number);
      const parsedDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
      const currentDay = !isNaN(parsedDate.getTime()) ? dayNames[parsedDate.getDay()] : 'Monday';

      // Check if there is an ACTIVE live session right now for this student's section
      const { data: activeSessions } = await supabase
        .from('attendance_sessions')
        .select(`
          id,
          date,
          status,
          started_at,
          faculty_assignment:faculty_assignment_id(
            id,
            lec_id,
            lec_date,
            classes:class_id(class_name),
            sections:section_id(section_name),
            subjects:subject_id(subject_name, subject_code),
            faculty:faculty_id(name),
            rooms:room_id(room_number),
            time_slots:time_slot_id(start_time, end_time)
          )
        `)
        .eq('status', 'active')
        .order('started_at', { ascending: false });

      const matchedActive = (activeSessions || []).find(s => {
        const sec = s.faculty_assignment?.sections?.section_name || '';
        return sec.toLowerCase().includes(studentSectionName.toLowerCase()) || 
               studentSectionName.toLowerCase().includes(sec.toLowerCase());
      });

      if (matchedActive) {
        const fa = matchedActive.faculty_assignment;
        const timeSlot = fa?.time_slots ? `${fa.time_slots.start_time.slice(0, 5)} - ${fa.time_slots.end_time.slice(0, 5)}` : 'Live Now';
        return {
          id: fa?.id || null,
          sessionId: matchedActive.id,
          isLive: true,
          subjectName: fa?.subjects?.subject_name || 'Class Lecture',
          subjectCode: fa?.subjects?.subject_code || 'CS',
          roomNo: fa?.rooms?.room_number || 'Room 201',
          facultyName: fa?.faculty?.name || 'Faculty Instructor',
          timeWindow: timeSlot,
          badgeText: 'Live Session Active'
        };
      }

      // If no active session, fetch today's scheduled lectures for this section
      const { data: assignments } = await supabase
        .from('faculty_assignment')
        .select(`
          id,
          lec_id,
          lec_date,
          day_of_week,
          classes:class_id(class_name),
          sections:section_id(section_name),
          subjects:subject_id(subject_name, subject_code),
          faculty:faculty_id(name),
          rooms:room_id(room_number),
          time_slots:time_slot_id(start_time, end_time)
        `);

      const matchingAssignments = (assignments || []).filter(a => {
        const secMatch = (a.sections?.section_name || '').toLowerCase().includes(studentSectionName.toLowerCase()) ||
                         studentSectionName.toLowerCase().includes((a.sections?.section_name || '').toLowerCase());
        const dateMatch = a.lec_date === todayDate || (a.day_of_week && a.day_of_week.toLowerCase() === currentDay.toLowerCase());
        return secMatch && dateMatch;
      });

      if (matchingAssignments.length > 0) {
        const next = matchingAssignments[0];
        const timeSlot = next.time_slots ? `${next.time_slots.start_time.slice(0, 5)} - ${next.time_slots.end_time.slice(0, 5)}` : 'Scheduled Today';
        return {
          id: next.id,
          sessionId: null,
          isLive: false,
          subjectName: next.subjects?.subject_name || 'Class Lecture',
          subjectCode: next.subjects?.subject_code || 'CS',
          roomNo: next.rooms?.room_number || 'Room 201',
          facultyName: next.faculty?.name || 'Faculty Instructor',
          timeWindow: timeSlot,
          badgeText: 'Scheduled Today'
        };
      }
    } catch (err) {
      console.warn('Could not fetch current lecture:', err);
    }

    return {
      id: null,
      sessionId: null,
      isLive: false,
      subjectName: 'No Active Lecture',
      subjectCode: '—',
      roomNo: '—',
      facultyName: '—',
      timeWindow: 'No classes scheduled right now',
      badgeText: 'Standby'
    };
  }

  /**
   * 3. Fetches real chronological attendance records for this student
   */
  static async getAttendanceHistory(studentId = null) {
    if (!studentId) {
      const profile = await this.getProfile();
      studentId = profile.id;
    }

    try {
      const { data: records, error } = await supabase
        .from('attendance_records')
        .select(`
          id,
          session_id,
          student_id,
          status,
          marked_at,
          verification_method,
          attendance_sessions:session_id (
            id,
            date,
            started_at,
            faculty_assignment:faculty_assignment_id (
              id,
              room_no,
              section_subjects:section_subject_id (
                subjects:subject_id (subject_name, subject_code),
                sections:section_id (section_name, branch, semester)
              )
            )
          )
        `)
        .eq('student_id', studentId)
        .order('marked_at', { ascending: false });

      if (records && records.length) {
        return records.map(r => {
          const sess = r.attendance_sessions;
          const fa = sess?.faculty_assignment;
          const ss = fa?.section_subjects;
          const sub = ss?.subjects;
          const sec = ss?.sections;

          const dateStr = sess?.date 
            ? new Date(sess.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            : (r.marked_at ? new Date(r.marked_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today');

          const timeStr = r.marked_at 
            ? new Date(r.marked_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) 
            : '—';

          const subjectName = sub?.subject_name 
            ? `${sub.subject_name}${sec?.section_name ? ` - Sec ${sec.section_name}` : ''}`
            : 'Class Lecture';

          return {
            id: r.id,
            date: dateStr,
            time: timeStr,
            subjectName: subjectName,
            subjectCode: sub?.subject_code || 'CS',
            roomNo: fa?.room_no || 'Room',
            status: r.status || 'present',
            verificationMethod: r.verification_method === 'qr_scan' ? 'QR Scan' : 'Manual'
          };
        });
      }
    } catch (err) {
      console.warn('Could not fetch attendance records from DB:', err);
    }

    return [];
  }

  /**
   * 4. Validates scanned dynamic QR token and marks attendance in Supabase
   */
  static async submitAttendanceScan(scannedPayload, studentId = null) {
    console.log('[StudentService] Processing QR scan verification:', scannedPayload);

    let parsed = scannedPayload;
    if (typeof scannedPayload === 'string') {
      try {
        parsed = JSON.parse(scannedPayload);
      } catch (e) {
        return { success: false, message: 'Invalid QR code format. Please scan a valid classroom QR.' };
      }
    }

    if (!parsed || !parsed.sessionId) {
      return { success: false, message: 'Unrecognized attendance QR code.' };
    }

    // 1. Cryptographic Time-Window (TOTP) Verification
    if (parsed.sig && parsed.ts) {
      const totpCheck = await verifyTotpPayload(parsed, parsed.expiresIn || 15, 5);
      if (!totpCheck.isValid) {
        return {
          success: false,
          message: totpCheck.reason || 'QR code expired or invalid.'
        };
      }
    }

    // 2. Resolve active session from Supabase
    try {
      let session = null;
      if (!parsed.sessionId.startsWith('sess-')) {
        const { data: sessData, error: sessErr } = await supabase
          .from('attendance_sessions')
          .select(`
            id,
            status,
            date,
            faculty_assignment_id,
            faculty_assignment:faculty_assignment_id (
              id,
              room_no,
              section_subjects:section_subject_id (
                id,
                section_id,
                subject_id,
                sections:section_id (id, section_name, branch, semester),
                subjects:subject_id (id, subject_name, subject_code)
              )
            )
          `)
          .eq('id', parsed.sessionId)
          .single();

        if (sessErr || !sessData) {
          return { success: false, message: 'Attendance session not found or already closed.' };
        }
        session = sessData;
      }

      if (session && session.status !== 'active') {
        return { success: false, message: 'This attendance session has ended.' };
      }

      // 3. Resolve student ID & enrolled section record
      let targetStudentId = studentId;
      let studentRecord = null;

      if (targetStudentId) {
        const { data: stdData } = await supabase
          .from('students')
          .select('id, name, roll_no, section_id, sections:section_id(id, section_name, branch, semester)')
          .eq('id', targetStudentId)
          .maybeSingle();
        studentRecord = stdData;
      }

      if (!studentRecord) {
        const profile = await this.getProfile();
        targetStudentId = profile?.id;
        const { data: stdData } = await supabase
          .from('students')
          .select('id, name, roll_no, section_id, sections:section_id(id, section_name, branch, semester)')
          .eq('id', targetStudentId)
          .maybeSingle();
        studentRecord = stdData;
      }

      if (!studentRecord || !targetStudentId) {
        return { success: false, message: 'Student identification not found. Please log in again.' };
      }

      // 4. Section Eligibility Check: Ensure student is in the section this lecture is scheduled for
      const sessionSectionId = session?.faculty_assignment?.section_subjects?.section_id;
      const sessionSectionName = session?.faculty_assignment?.section_subjects?.sections?.section_name || parsed.section;
      const sessionSubjectName = session?.faculty_assignment?.section_subjects?.subjects?.subject_name || parsed.className || 'Lecture';
      const studentSectionId = studentRecord.section_id;
      const studentSectionName = studentRecord.sections?.section_name || 'Enrolled Section';

      if (sessionSectionId && studentSectionId && sessionSectionId !== studentSectionId) {
        return {
          success: false,
          isWrongSection: true,
          message: `Access Denied: You are enrolled in Section ${studentSectionName}, but this attendance QR is for Section ${sessionSectionName} (${sessionSubjectName}).`,
          studentSection: studentSectionName,
          lectureSection: sessionSectionName,
          subjectName: sessionSubjectName
        };
      }

      const sessionIdToSave = session ? session.id : parsed.sessionId;
      const assignmentIdToSave = session ? session.faculty_assignment_id : parsed.assignmentId || null;
      const lectureDateToSave = session ? session.date : getLocalDateString();

      // 5. Duplicate Check: Check if attendance is ALREADY marked for this session
      const { data: existingSessionRecord } = await supabase
        .from('attendance_records')
        .select('id, status, marked_at')
        .eq('session_id', sessionIdToSave)
        .eq('student_id', targetStudentId)
        .maybeSingle();

      if (existingSessionRecord && existingSessionRecord.status === 'present') {
        const timeStr = existingSessionRecord.marked_at 
          ? new Date(existingSessionRecord.marked_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          : 'earlier in this session';
        return {
          success: false,
          isDuplicate: true,
          message: `You have already marked attendance for this lecture (recorded at ${timeStr})!`,
          record: existingSessionRecord
        };
      }

      // 5. Additional Check: Check if student already marked attendance for this lecture/assignment today
      if (assignmentIdToSave) {
        const { data: duplicateDateRecords } = await supabase
          .from('attendance_records')
          .select(`
            id,
            status,
            marked_at,
            attendance_sessions:session_id (
              id,
              date,
              faculty_assignment_id
            )
          `)
          .eq('student_id', targetStudentId)
          .eq('status', 'present');

        const alreadyMarkedToday = (duplicateDateRecords || []).find(r => 
          r.attendance_sessions?.faculty_assignment_id === assignmentIdToSave &&
          r.attendance_sessions?.date === lectureDateToSave
        );

        if (alreadyMarkedToday) {
          const timeStr = alreadyMarkedToday.marked_at 
            ? new Date(alreadyMarkedToday.marked_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            : 'earlier today';
          return {
            success: false,
            isDuplicate: true,
            message: `Attendance for this class has already been recorded for today at ${timeStr}!`,
            record: alreadyMarkedToday
          };
        }
      }

      // 6. Record attendance
      const { data: newRec, error: insertErr } = await supabase
        .from('attendance_records')
        .upsert([
          {
            session_id: sessionIdToSave,
            student_id: targetStudentId,
            faculty_assignment_id: assignmentIdToSave,
            lec_id: parsed.lecId || null,
            lecture_date: lectureDateToSave,
            status: 'present',
            marked_at: new Date().toISOString(),
            verification_method: 'qr_scan'
          }
        ], { onConflict: 'session_id,student_id' })
        .select()
        .single();

      if (insertErr) {
        console.error('Insert attendance error:', insertErr);
        return { success: false, message: 'Failed to record attendance: ' + insertErr.message };
      }

      return {
        success: true,
        message: `Attendance marked successfully for ${parsed.className || parsed.class || 'Lecture'}!`,
        record: newRec
      };
    } catch (err) {
      console.error('submitAttendanceScan DB error:', err);
      return { success: false, message: err.message || 'Database error during scan' };
    }
  }
}
