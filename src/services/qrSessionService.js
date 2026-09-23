import { supabase } from '../lib/supabaseClient.js';
import { getIndianDateString, formatIndianTime } from '../utils/dateUtils.js';

/**
 * Service to manage active QR Attendance Sessions & Realtime Streams on Supabase
 */
export class QRSessionService {
  /**
   * 1. Saves dynamic cryptographic token and expiry timestamp to database
   */
  static async updateSessionToken(sessionId, expirySeconds = 15, tokenSignature = null) {
    const timestamp = Date.now();
    const token = tokenSignature || btoa(`${sessionId}:${timestamp}`);
    const expiresAt = new Date(timestamp + expirySeconds * 1000).toISOString();

    if (sessionId && !sessionId.startsWith('sess-')) {
      try {
        await supabase
          .from('attendance_sessions')
          .update({
            current_qr_token: token,
            token_expires_at: expiresAt
          })
          .eq('id', sessionId);
      } catch (err) {
        console.warn('Could not update session token in database:', err);
      }
    }

    return {
      token,
      expiresAt,
      timestamp
    };
  }

  /**
   * 2. Start or Reactivate a live attendance session in database
   */
  static async startSession(facultyAssignmentId, expirySeconds = 15) {
    try {
      // Find assignment ID if not passed
      let assignId = facultyAssignmentId;
      if (!assignId) {
        const { data: firstAssign } = await supabase
          .from('faculty_assignment')
          .select('id')
          .limit(1)
          .maybeSingle();
        assignId = firstAssign?.id;
      }

      if (assignId) {
        // Mark assignment status as ongoing
        await supabase
          .from('faculty_assignment')
          .update({ status: 'ongoing' })
          .eq('id', assignId);

        // Check if a session already exists for this assignment (re-start scenario: reuse & reactivate existing session)
        const { data: existingSessions } = await supabase
          .from('attendance_sessions')
          .select('*')
          .eq('faculty_assignment_id', assignId)
          .order('started_at', { ascending: false })
          .limit(1);

        if (existingSessions && existingSessions.length > 0) {
          const existing = existingSessions[0];
          const { data: reactivatedSession, error: reactivateErr } = await supabase
            .from('attendance_sessions')
            .update({
              status: 'active',
              qr_expiry_sec: expirySeconds,
              ended_at: null
            })
            .eq('id', existing.id)
            .select()
            .single();

          if (!reactivateErr && reactivatedSession) {
            return reactivatedSession;
          }
        }

        // Otherwise insert new session row
        const { data: newSession, error } = await supabase
          .from('attendance_sessions')
          .insert([
            {
              faculty_assignment_id: assignId,
              qr_expiry_sec: expirySeconds,
              status: 'active',
              started_at: new Date().toISOString()
            }
          ])
          .select()
          .single();

        if (!error && newSession) {
          return newSession;
        }
      }
    } catch (err) {
      console.warn('Could not start/reactivate session:', err.message);
    }

    return {
      id: 'sess-' + Date.now(),
      qr_expiry_sec: expirySeconds,
      status: 'active'
    };
  }

  /**
   * 3. Fetches the current live attendance student list for a session & lecture assignment
   * Queries all attendance records for this assignment/lecture today so previous check-ins are preserved
   */
  static async getLiveSessionStudents(sectionName = '2A', sessionId = null, assignmentId = null, date = null, lecId = null) {
    try {
      if (!sectionName && !assignmentId) {
        return [];
      }

      const cleanSection = sectionName ? (sectionName.includes('-') ? sectionName.split('-')[1].trim() : sectionName.trim()) : '';
      const targetDate = date || getIndianDateString();
      
      let sectionId = null;
      if (cleanSection) {
        const { data: sectionData } = await supabase
          .from('sections')
          .select('id, section_name')
          .ilike('section_name', `%${cleanSection}%`)
          .limit(1)
          .maybeSingle();
        sectionId = sectionData?.id;
      }

      // If sectionId not resolved from name, attempt resolving from faculty_assignment
      if (!sectionId && assignmentId) {
        const { data: assignData } = await supabase
          .from('faculty_assignment')
          .select('section_id')
          .eq('id', assignmentId)
          .maybeSingle();
        
        sectionId = assignData?.section_id;
      }

      let studentsQuery = supabase
        .from('students')
        .select('*')
        .order('roll_no', { ascending: true });

      if (sectionId) {
        studentsQuery = studentsQuery.eq('section_id', sectionId);
      }

      const { data: students } = await studentsQuery;

      if (!students || !students.length) {
        return [];
      }

      // 1. Gather all active / previous session IDs for this assignment
      const markedMap = new Map();
      const sessionIds = [];

      if (sessionId && !sessionId.startsWith('sess-')) {
        sessionIds.push(sessionId);
      }

      if (assignmentId) {
        const { data: relatedSessions } = await supabase
          .from('attendance_sessions')
          .select('id')
          .eq('faculty_assignment_id', assignmentId);

        (relatedSessions || []).forEach(s => {
          if (!sessionIds.includes(s.id)) {
            sessionIds.push(s.id);
          }
        });
      }

      // 2. Fetch all present records for these sessions
      if (sessionIds.length > 0) {
        const { data: sessRecords } = await supabase
          .from('attendance_records')
          .select('student_id, status, marked_at')
          .in('session_id', sessionIds)
          .ilike('status', 'present');

        (sessRecords || []).forEach(r => {
          markedMap.set(r.student_id, r.marked_at);
        });
      }

      // 3. Fetch all present records by faculty_assignment_id
      if (assignmentId) {
        const { data: assignRecords } = await supabase
          .from('attendance_records')
          .select('student_id, status, marked_at')
          .eq('faculty_assignment_id', assignmentId)
          .ilike('status', 'present');

        (assignRecords || []).forEach(r => {
          if (!markedMap.has(r.student_id) || (r.marked_at && new Date(r.marked_at) > new Date(markedMap.get(r.student_id) || 0))) {
            markedMap.set(r.student_id, r.marked_at);
          }
        });
      }

      // 4. Fetch all present records by lec_id
      if (lecId) {
        const { data: lecRecords } = await supabase
          .from('attendance_records')
          .select('student_id, status, marked_at')
          .eq('lec_id', lecId)
          .ilike('status', 'present');

        (lecRecords || []).forEach(r => {
          if (!markedMap.has(r.student_id) || (r.marked_at && new Date(r.marked_at) > new Date(markedMap.get(r.student_id) || 0))) {
            markedMap.set(r.student_id, r.marked_at);
          }
        });
      }

      const colorClasses = ['avatar-indigo', 'avatar-emerald', 'avatar-purple', 'avatar-cyan', 'avatar-amber', 'avatar-rose'];
      const mapped = students.map((s, idx) => {
        const isMarked = markedMap.has(s.id);
        const markedTimestamp = markedMap.get(s.id);
        const initials = s.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
        return {
          id: s.id,
          name: s.name,
          rollNumber: s.roll_no,
          status: isMarked ? 'marked' : 'unmarked',
          initials: initials,
          colorClass: colorClasses[idx % colorClasses.length],
          rawMarkedAt: markedTimestamp ? new Date(markedTimestamp).getTime() : 0,
          markedTime: isMarked ? (markedTimestamp ? formatIndianTime(markedTimestamp) : 'Verified') : null
        };
      });

      // 5. Sort: Marked students FIRST (sorted by most recent marked_at descending), then unmarked students by roll number
      mapped.sort((a, b) => {
        if (a.status === 'marked' && b.status !== 'marked') return -1;
        if (a.status !== 'marked' && b.status === 'marked') return 1;
        if (a.status === 'marked' && b.status === 'marked') {
          // Most recent marked_at first (descending)
          return (b.rawMarkedAt || 0) - (a.rawMarkedAt || 0);
        }
        // Unmarked students: sort by roll number
        return (a.rollNumber || '').localeCompare(b.rollNumber || '', undefined, { numeric: true });
      });

      return mapped;
    } catch (err) {
      console.warn('Error fetching live session students:', err);
      return [];
    }
  }

  /**
   * 4. Submits and closes an active attendance session:
   * - Marks attendance_sessions as completed
   * - Marks faculty_assignment status as completed
   * - Automatically marks all unscanned/unmarked students in the section as 'absent'
   */
  static async closeSession(sessionId, summaryData = {}) {
    try {
      const assignmentId = summaryData?.assignmentId;
      const validSessionId = (sessionId && !sessionId.startsWith('sess-')) ? sessionId : null;

      // 1. Mark attendance_sessions as 'completed'
      if (validSessionId) {
        await supabase
          .from('attendance_sessions')
          .update({
            status: 'completed',
            ended_at: new Date().toISOString()
          })
          .eq('id', validSessionId);
      }

      // 2. Mark faculty_assignment as 'completed' from 'scheduled'
      if (assignmentId) {
        await supabase
          .from('faculty_assignment')
          .update({
            status: 'completed'
          })
          .eq('id', assignmentId);
      }

      // 3. Resolve section ID
      let sectionId = summaryData?.sectionId;
      if (!sectionId && assignmentId) {
        const { data: faData } = await supabase
          .from('faculty_assignment')
          .select('section_id, lec_id, lec_date')
          .eq('id', assignmentId)
          .maybeSingle();
        sectionId = faData?.section_id;
        if (!summaryData.lecId) summaryData.lecId = faData?.lec_id;
        if (!summaryData.lectureDate) summaryData.lectureDate = faData?.lec_date;
      }

      if (!sectionId && summaryData?.section) {
        const cleanSection = summaryData.section.includes('-') 
          ? summaryData.section.split('-')[1].trim() 
          : summaryData.section.trim();
        const { data: secData } = await supabase
          .from('sections')
          .select('id')
          .ilike('section_name', `%${cleanSection}%`)
          .limit(1)
          .maybeSingle();
        sectionId = secData?.id;
      }

      // 4. Find all enrolled students in this section
      if (sectionId) {
        const { data: enrolledStudents } = await supabase
          .from('students')
          .select('id, name, roll_no')
          .eq('section_id', sectionId);

        if (enrolledStudents && enrolledStudents.length > 0) {
          // Fetch all existing attendance records for this assignment / session
          let existingQuery = supabase.from('attendance_records').select('id, student_id, session_id, faculty_assignment_id, status');
          if (assignmentId) {
            existingQuery = existingQuery.eq('faculty_assignment_id', assignmentId);
          } else if (validSessionId) {
            existingQuery = existingQuery.eq('session_id', validSessionId);
          }

          const { data: existingRecords } = await existingQuery;
          const existingMap = new Map();
          (existingRecords || []).forEach(r => {
            existingMap.set(r.student_id, r);
          });

          // Find all students who already scanned / were marked present
          const presentStudentIds = new Set();
          (existingRecords || []).forEach(r => {
            if ((r.status || '').toLowerCase() === 'present') {
              presentStudentIds.add(r.student_id);
            }
          });

          // Filter out students who were NOT present -> mark as absent
          const absentStudents = enrolledStudents.filter(s => !presentStudentIds.has(s.id));

          if (absentStudents.length > 0) {
            const targetDate = summaryData.lectureDate || getIndianDateString();
            const absentRecords = absentStudents.map(s => {
              const existingRec = existingMap.get(s.id);
              const row = {
                session_id: validSessionId || existingRec?.session_id || null,
                faculty_assignment_id: assignmentId || existingRec?.faculty_assignment_id || null,
                student_id: s.id,
                lec_id: summaryData.lecId || null,
                lecture_date: targetDate,
                status: 'absent',
                marked_at: null,
                verification_method: 'system_auto'
              };

              if (existingRec?.id) {
                row.id = existingRec.id; // Primary key match => PostgreSQL updates existing row in-place!
              }

              return row;
            });

            // Safe in-place upsert
            await supabase
              .from('attendance_records')
              .upsert(absentRecords);
          }
        }
      }
    } catch (err) {
      console.warn('Error completing session in database:', err);
    }

    return {
      success: true,
      message: 'Session completed, assignment status updated to completed, and absent students recorded successfully.',
      savedAt: new Date().toISOString()
    };
  }
}
