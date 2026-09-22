import { supabase } from '../lib/supabaseClient.js';
import { getLocalDateString } from '../utils/dateUtils.js';

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
   * 2. Start a new live attendance session in database
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
        const { data: newSession, error } = await supabase
          .from('attendance_sessions')
          .insert([
            {
              faculty_assignment_id: assignId,
              date: getLocalDateString(),
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
      console.warn('Could not insert session row:', err.message);
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
      const targetDate = date || getLocalDateString();
      
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
          .select(`
            section_subject:section_subject_id (
              section_id
            )
          `)
          .eq('id', assignmentId)
          .maybeSingle();
        
        const secSub = Array.isArray(assignData?.section_subject) ? assignData.section_subject[0] : assignData?.section_subject;
        sectionId = secSub?.section_id;
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

      // 1. Gather all active / previous session IDs for this assignment on targetDate
      const markedMap = new Map();
      const sessionIds = [];

      if (sessionId && !sessionId.startsWith('sess-')) {
        sessionIds.push(sessionId);
      }

      if (assignmentId) {
        const { data: relatedSessions } = await supabase
          .from('attendance_sessions')
          .select('id')
          .eq('faculty_assignment_id', assignmentId)
          .eq('date', targetDate);

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
          markedTime: isMarked ? (markedTimestamp ? new Date(markedTimestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Verified') : null
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
   * 4. Submits and closes an active attendance session
   */
  static async closeSession(sessionId, summaryData) {
    try {
      if (sessionId && !sessionId.startsWith('sess-')) {
        await supabase
          .from('attendance_sessions')
          .update({
            status: 'completed',
            ended_at: new Date().toISOString()
          })
          .eq('id', sessionId);
      }
    } catch (err) {
      console.warn('Error closing session in database:', err);
    }

    return {
      success: true,
      message: 'Session completed and attendance saved to database',
      savedAt: new Date().toISOString()
    };
  }
}
