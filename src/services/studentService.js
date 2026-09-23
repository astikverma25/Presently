import { supabase, getCurrentUserProfile } from '../lib/supabaseClient.js';
import { verifyTotpPayload } from '../utils/totpCrypto.js';
import { getIndianDateString, getIndianTimeVal, formatIndianDate, formatIndianTime } from '../utils/dateUtils.js';

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

      // If not authenticated or no student profile found, return null (Strict Auth Guard)
      if (!student) {
        return null;
      }

      if (student) {
        const sectionId = student.section_id || student.sections?.id;
        const studentSem = student.semester || student.sections?.semester || '3rd';
        const cleanSem = studentSem.toString().toLowerCase().replace(/[^0-9]/g, '').trim();

        // 1. Fetch all subjects for student's current semester
        const { data: allSubjects } = await supabase
          .from('subjects')
          .select('id, semester');

        const semesterSubjectIds = new Set(
          (allSubjects || [])
            .filter(sub => {
              const subSem = (sub.semester || '').toString().toLowerCase().replace(/[^0-9]/g, '').trim();
              return !cleanSem || subSem === cleanSem;
            })
            .map(s => s.id)
        );

        // 2. Calculate completed / delivered classes for student's section
        const todayIST = getIndianDateString();
        const currentTimeIST = getIndianTimeVal();
        let totalCompletedClasses = 0;

        if (sectionId) {
          const { data: assignments } = await supabase
            .from('faculty_assignment')
            .select('id, subject_id, section_id, lec_date, start_time, end_time, status')
            .eq('section_id', sectionId);

          (assignments || []).forEach(fa => {
            if (!fa.subject_id) return;
            if (semesterSubjectIds.size > 0 && !semesterSubjectIds.has(fa.subject_id)) return;

            const lecDate = fa.lec_date ? fa.lec_date.trim() : null;
            let isCompleted = false;

            if (fa.status === 'completed') {
              isCompleted = true;
            } else if (lecDate) {
              if (lecDate < todayIST) {
                isCompleted = true;
              } else if (lecDate === todayIST) {
                const startTime = fa.start_time ? fa.start_time.slice(0, 5) : '00:00';
                if (currentTimeIST >= startTime) {
                  isCompleted = true;
                }
              }
            }

            if (isCompleted) {
              totalCompletedClasses++;
            }
          });
        }

        // 3. Calculate attended classes for this student in this semester
        const { data: records } = await supabase
          .from('attendance_records')
          .select(`
            id,
            status,
            faculty_assignment:faculty_assignment_id (subject_id),
            attendance_sessions:session_id (
              faculty_assignment:faculty_assignment_id (subject_id)
            )
          `)
          .eq('student_id', student.id)
          .ilike('status', 'present');

        const attendedRecords = (records || []).filter(r => {
          const subId = r.faculty_assignment?.subject_id || r.attendance_sessions?.faculty_assignment?.subject_id;
          if (semesterSubjectIds.size > 0 && subId) {
            return semesterSubjectIds.has(subId);
          }
          return true;
        });

        const attended = attendedRecords.length;
        const total = Math.max(totalCompletedClasses, attended);
        const percentage = total > 0 ? Math.round((attended / total) * 100) : 100;

        return {
          id: student.id,
          name: student.name,
          rollNumber: student.roll_no,
          email: student.personal_email || `${student.roll_no?.toLowerCase()}@university.edu`,
          personalEmail: student.personal_email || '',
          phone: student.phone || '',
          parentContact: student.parent_contact || '',
          dateOfBirth: student.date_of_birth || '',
          admissionId: student.admission_id || '',
          sectionId: student.section_id,
          sectionName: student.sections?.section_name || '2A',
          semester: student.semester || student.sections?.semester || '3rd',
          branch: student.branch || student.sections?.branch || 'CSE',
          className: `${student.branch || 'CSE'} - ${student.semester || student.sections?.semester || '3rd'} Sem`,
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
      personalEmail: '',
      phone: '',
      parentContact: '',
      sectionName: '2A',
      semester: '4th',
      branch: 'CSE',
      className: 'B.Tech CSE - 4th Sem',
      department: 'Computer Science & Engineering',
      attendedClasses: 0,
      totalClasses: 0,
      attendancePercentage: 100
    };
  }

  /**
   * Updates student contact and personal details in Supabase
   */
  static async updateProfile(studentId, updates = {}) {
    try {
      if (!studentId || studentId === 'demo-student') {
        return { success: true, message: 'Demo profile updated successfully.' };
      }

      const payload = {};
      if (updates.name !== undefined) payload.name = updates.name.trim();
      if (updates.personalEmail !== undefined) payload.personal_email = updates.personalEmail.trim();
      if (updates.phone !== undefined) payload.phone = updates.phone.trim();
      if (updates.parentContact !== undefined) payload.parent_contact = updates.parentContact.trim();
      if (updates.admissionId !== undefined) payload.admission_id = updates.admissionId.trim();
      if (updates.dateOfBirth !== undefined) payload.date_of_birth = updates.dateOfBirth || null;

      const { data, error } = await supabase
        .from('students')
        .update(payload)
        .eq('id', studentId)
        .select('*, sections:section_id(id, section_name, branch, semester)')
        .single();

      if (error) throw error;
      return { success: true, message: 'Profile updated successfully!', student: data };
    } catch (err) {
      console.error('Failed to update student profile:', err);
      return { success: false, message: err?.message || 'Failed to update profile' };
    }
  }

  /**
   * Fetches list of available sections for selection
   */
  static async getAvailableSections() {
    try {
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .order('section_name');
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('Could not fetch sections:', err);
      return [];
    }
  }

  /**
   * 2. Fetches active live QR session or currently running scheduled lecture for this student's section & semester
   */
  static async getCurrentLecture(studentSectionId = null, studentSectionName = '2A', studentSemester = null) {
    try {
      const todayIST = getIndianDateString();
      const now = new Date();
      const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const istTimeStr = getIndianTimeVal();

      const toMinutes = (timeStr) => {
        if (!timeStr) return null;
        const parts = timeStr.toString().split(':').map(Number);
        if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          return parts[0] * 60 + parts[1];
        }
        return null;
      };

      const localMinutes = now.getHours() * 60 + now.getMinutes();
      const istMinutes = toMinutes(istTimeStr);

      const isTimeRunning = (startTimeStr, endTimeStr) => {
        const startMin = toMinutes(startTimeStr);
        const endMin = toMinutes(endTimeStr);
        if (startMin === null || endMin === null) return false;
        const runningLocal = (localMinutes >= startMin && localMinutes <= endMin);
        const runningIST = (istMinutes !== null && istMinutes >= startMin && istMinutes <= endMin);
        return runningLocal || runningIST;
      };

      const cleanSec = (s) => (s || '').toString().toLowerCase().replace(/^(sec|section)\s*/, '').replace(/[^a-z0-9]/g, '').trim();
      const matchSection = (assignmentSec) => {
        if (!assignmentSec) return false;
        if (studentSectionId && assignmentSec.id === studentSectionId) return true;
        if (studentSectionName && assignmentSec.section_name) {
          const s1 = cleanSec(assignmentSec.section_name);
          const s2 = cleanSec(studentSectionName);
          if (s1 === s2) return true;
          if (s1 && s2 && (s1.includes(s2) || s2.includes(s1))) return true;
        }
        return false;
      };

      const cleanSem = (s) => (s || '').toString().toLowerCase().replace(/[^0-9]/g, '').trim();
      const matchSemester = (assignmentSec, assignmentSub) => {
        if (!studentSemester) return true;
        const stdSem = cleanSem(studentSemester);
        if (!stdSem) return true;
        const secSem = cleanSem(assignmentSec?.semester);
        const subSem = cleanSem(assignmentSub?.semester);
        if (secSem && secSem === stdSem) return true;
        if (subSem && subSem === stdSem) return true;
        if (!secSem && !subSem) return true;
        return false;
      };

      const isTodayMatch = (lecDate) => {
        if (!lecDate) return false;
        return lecDate === todayIST || lecDate === todayLocal;
      };

      // 1. Check if there is an ACTIVE live QR session right now for this student's section
      const { data: activeSessions, error: sessErr } = await supabase
        .from('attendance_sessions')
        .select(`
          id,
          status,
          started_at,
          faculty_assignment:faculty_assignment_id (
            id,
            lec_id,
            lec_date,
            start_time,
            end_time,
            room_no,
            subject_id,
            section_id,
            faculty:faculty_id (id, name, department),
            subject:subject_id (id, subject_name, subject_code, semester),
            section:section_id (id, section_name, branch, semester)
          )
        `)
        .eq('status', 'active')
        .order('started_at', { ascending: false });

      if (sessErr) {
        console.warn('activeSessions query error:', sessErr.message);
      }

      const matchedActive = (activeSessions || []).find(s => {
        const fa = s.faculty_assignment;
        if (!fa) return false;
        const isSessToday = isTodayMatch(fa.lec_date) || isTodayMatch(getIndianDateString(s.started_at));
        if (!isSessToday) return false;
        const sec = fa.section || (fa.section_id ? { id: fa.section_id } : null);
        const sub = fa.subject;
        return matchSection(sec) && matchSemester(sec, sub);
      });

      if (matchedActive) {
        const fa = matchedActive.faculty_assignment;
        const sub = fa.subject;
        const timeSlot = fa.start_time && fa.end_time ? `${fa.start_time.slice(0, 5)} - ${fa.end_time.slice(0, 5)}` : 'Live Now';
        return {
          id: fa.id,
          lecId: fa.lec_id,
          sessionId: matchedActive.id,
          isLive: true,
          subjectName: sub ? `${sub.subject_name}${sub.subject_code ? ` (${sub.subject_code})` : ''}` : 'Class Lecture',
          subjectCode: sub?.subject_code || 'CS',
          roomNo: fa.room_no || 'Room 101',
          facultyName: fa.faculty?.name || 'Faculty Instructor',
          timeWindow: timeSlot,
          badgeText: 'Live Session Active'
        };
      }

      // 2. Fetch today's scheduled lectures from faculty_assignment
      const { data: assignments, error: assignErr } = await supabase
        .from('faculty_assignment')
        .select(`
          id,
          lec_id,
          lec_date,
          start_time,
          end_time,
          room_no,
          status,
          subject_id,
          section_id,
          faculty:faculty_id (id, name, department),
          subject:subject_id (id, subject_name, subject_code, semester),
          section:section_id (id, section_name, branch, semester)
        `)
        .order('start_time', { ascending: true });

      if (assignErr) {
        console.warn('assignments query error:', assignErr.message);
      }

      const studentTodayAssignments = (assignments || []).filter(a => {
        const sec = a.section || (a.section_id ? { id: a.section_id } : null);
        const sub = a.subject;
        return isTodayMatch(a.lec_date) && matchSection(sec) && matchSemester(sec, sub);
      });

      // Find if any lecture is currently running at this exact time
      const runningLecture = studentTodayAssignments.find(a => isTimeRunning(a.start_time, a.end_time));

      if (runningLecture) {
        const sub = runningLecture.subject;
        const start = runningLecture.start_time ? runningLecture.start_time.slice(0, 5) : '';
        const end = runningLecture.end_time ? runningLecture.end_time.slice(0, 5) : '';
        const timeSlot = start && end ? `${start} - ${end}` : 'Class In Progress';
        return {
          id: runningLecture.id,
          lecId: runningLecture.lec_id,
          sessionId: null,
          isLive: true,
          subjectName: sub ? `${sub.subject_name}${sub.subject_code ? ` (${sub.subject_code})` : ''}` : 'Class Lecture',
          subjectCode: sub?.subject_code || 'CS',
          roomNo: runningLecture.room_no || 'Room 101',
          facultyName: runningLecture.faculty?.name || 'Faculty Instructor',
          timeWindow: timeSlot,
          badgeText: 'Class In Progress'
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
      subjectCode: '',
      roomNo: '',
      facultyName: '',
      timeWindow: 'No classes scheduled right now',
      badgeText: 'Standby'
    };
  }

  /**
   * 3. Fetches real chronological attendance records for this student in descending order (latest first)
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
          faculty_assignment_id,
          student_id,
          status,
          marked_at,
          lecture_date,
          lec_id,
          verification_method,
          faculty_assignment:faculty_assignment_id (
            id,
            lec_id,
            lec_date,
            start_time,
            end_time,
            room_no,
            subject_id,
            section_id,
            subject:subject_id (id, subject_name, subject_code),
            section:section_id (id, section_name, branch, semester)
          ),
          attendance_sessions:session_id (
            id,
            started_at,
            faculty_assignment:faculty_assignment_id (
              id,
              lec_id,
              lec_date,
              start_time,
              end_time,
              room_no,
              subject_id,
              section_id,
              subject:subject_id (id, subject_name, subject_code),
              section:section_id (id, section_name, branch, semester)
            )
          )
        `)
        .eq('student_id', studentId);

      if (records && records.length) {
        // Collect missing assignment details by lec_id if needed
        const missingLecIds = records
          .filter(r => !r.faculty_assignment && !r.attendance_sessions?.faculty_assignment && r.lec_id)
          .map(r => r.lec_id);

        let lecIdMap = new Map();
        if (missingLecIds.length > 0) {
          const { data: faByLec } = await supabase
            .from('faculty_assignment')
            .select(`
              id,
              lec_id,
              lec_date,
              start_time,
              end_time,
              room_no,
              subject:subject_id (id, subject_name, subject_code),
              section:section_id (id, section_name, branch, semester)
            `)
            .in('lec_id', missingLecIds);

          (faByLec || []).forEach(fa => {
            if (fa.lec_id) lecIdMap.set(fa.lec_id, fa);
          });
        }

        const formattedList = records.map(r => {
          const sess = r.attendance_sessions;
          const fa = r.faculty_assignment || sess?.faculty_assignment || (r.lec_id ? lecIdMap.get(r.lec_id) : null);
          const sub = fa?.subject;
          const sec = fa?.section;

          const rawDate = r.lecture_date || fa?.lec_date || (r.marked_at ? r.marked_at.slice(0, 10) : getIndianDateString());
          const dateStr = formatIndianDate(rawDate, true);

          const timeStr = r.marked_at 
            ? formatIndianTime(r.marked_at) 
            : (fa?.start_time ? `${fa.start_time.slice(0, 5)} - ${fa.end_time ? fa.end_time.slice(0, 5) : ''}` : '—');

          const subjectName = sub?.subject_name 
            ? `${sub.subject_name}${sub.subject_code ? ` (${sub.subject_code})` : ''}`
            : (r.lec_id ? `Lecture ${r.lec_id}` : 'Class Lecture');

          // Numeric sort timestamp for strict descending order (latest first)
          const timestampVal = r.marked_at 
            ? new Date(r.marked_at).getTime() 
            : (rawDate ? new Date(`${rawDate}T${fa?.start_time || '00:00:00'}`).getTime() : 0);

          return {
            id: r.id,
            date: dateStr,
            time: timeStr,
            rawDate: rawDate,
            timestampVal: isNaN(timestampVal) ? 0 : timestampVal,
            subjectName: subjectName,
            subjectCode: sub?.subject_code || 'CS',
            roomNo: fa?.room_no || 'Room',
            status: r.status || 'present',
            verificationMethod: r.verification_method === 'qr_scan' ? 'QR Scan' : 'Manual'
          };
        });

        // Strict Descending Order (latest date/timestamp first)
        formattedList.sort((a, b) => b.timestampVal - a.timestampVal);

        return formattedList;
      }
    } catch (err) {
      console.warn('Could not fetch attendance records from DB:', err);
    }

    return [];
  }

  /**
   * 4. Fetches subject-wise and semester-wise attendance report for student
   */
  static async getSubjectAttendanceReport(studentId = null, semester = null) {
    try {
      // 1. Resolve student record to find section & semester
      let std = null;
      if (studentId) {
        const { data: stdData } = await supabase
          .from('students')
          .select('*, sections:section_id(*)')
          .eq('id', studentId)
          .maybeSingle();
        std = stdData;
      }

      if (!std) {
        const profile = await this.getProfile();
        studentId = profile.id;
        const { data: stdData } = await supabase
          .from('students')
          .select('*, sections:section_id(*)')
          .eq('id', studentId)
          .maybeSingle();
        std = stdData;
      }

      const effectiveSem = semester || std?.semester || std?.sections?.semester || '3rd';
      const cleanSem = effectiveSem.toString().toLowerCase().replace(/[^0-9]/g, '').trim();
      const sectionId = std?.section_id || std?.sections?.id;

      // 2. Fetch subjects for the specified semester
      const { data: allSubjects } = await supabase
        .from('subjects')
        .select('*')
        .order('subject_code', { ascending: true });

      const filteredSubjects = (allSubjects || []).filter(sub => {
        const subSem = (sub.semester || '').toString().toLowerCase().replace(/[^0-9]/g, '').trim();
        return !cleanSem || subSem === cleanSem;
      });

      const semesterSubjectIds = new Set(filteredSubjects.map(s => s.id));

      // 3. Fetch all attendance records of this student
      const { data: records } = await supabase
        .from('attendance_records')
        .select(`
          id,
          status,
          marked_at,
          lec_id,
          faculty_assignment_id,
          faculty_assignment:faculty_assignment_id (
            id,
            subject_id,
            section_id
          ),
          attendance_sessions:session_id (
            id,
            faculty_assignment:faculty_assignment_id (
              id,
              subject_id,
              section_id
            )
          )
        `)
        .eq('student_id', studentId);

      const todayIST = getIndianDateString();
      const currentTimeIST = getIndianTimeVal();

      // 4. Calculate delivered/completed classes directly from faculty_assignment using lecture date & time
      let totalCompletedBySubject = new Map();
      if (sectionId) {
        const { data: assignments } = await supabase
          .from('faculty_assignment')
          .select('id, subject_id, section_id, lec_date, start_time, end_time, status')
          .eq('section_id', sectionId);

        (assignments || []).forEach(fa => {
          if (!fa.subject_id) return;
          if (semesterSubjectIds.size > 0 && !semesterSubjectIds.has(fa.subject_id)) return;

          const lecDate = fa.lec_date ? fa.lec_date.trim() : null;
          let isCompleted = false;

          if (fa.status === 'completed') {
            isCompleted = true;
          } else if (lecDate) {
            if (lecDate < todayIST) {
              // Past date -> completed class
              isCompleted = true;
            } else if (lecDate === todayIST) {
              // Today's date -> completed if scheduled start time has passed or arrived
              const startTime = fa.start_time ? fa.start_time.slice(0, 5) : '00:00';
              if (currentTimeIST >= startTime) {
                isCompleted = true;
              }
            }
          }

          if (isCompleted) {
            const current = totalCompletedBySubject.get(fa.subject_id) || 0;
            totalCompletedBySubject.set(fa.subject_id, current + 1);
          }
        });
      }

      // 5. Map attendance metrics per subject (only completed/delivered classes)
      const subjectReport = filteredSubjects.map(sub => {
        const subjectRecords = (records || []).filter(r => {
          const subId = r.faculty_assignment?.subject_id || r.attendance_sessions?.faculty_assignment?.subject_id;
          return subId === sub.id;
        });

        const attended = subjectRecords.filter(r => (r.status || '').toLowerCase() === 'present').length;
        const conducted = totalCompletedBySubject.get(sub.id) || 0;
        
        // Total completed classes for this subject
        const total = Math.max(conducted, attended);
        const percentage = total > 0 ? Math.round((attended / total) * 100) : (attended > 0 ? 100 : 0);

        return {
          subjectId: sub.id,
          subjectCode: sub.subject_code || 'SUB',
          subjectName: sub.subject_name || 'Subject',
          semester: sub.semester || `${cleanSem}th`,
          attended: attended,
          total: total,
          percentage: percentage
        };
      });

      const totalAttended = subjectReport.reduce((acc, s) => acc + s.attended, 0);
      const totalClasses = subjectReport.reduce((acc, s) => acc + s.total, 0);
      const overallPercentage = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 100;

      return {
        semester: effectiveSem,
        totalAttended,
        totalClasses,
        overallPercentage,
        subjects: subjectReport
      };
    } catch (err) {
      console.warn('Could not generate subject attendance report:', err);
      return {
        semester: semester,
        totalAttended: 0,
        totalClasses: 0,
        overallPercentage: 100,
        subjects: []
      };
    }
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
            faculty_assignment_id,
            faculty_assignment:faculty_assignment_id (
              id,
              room_no,
              lec_date,
              lec_id,
              subject_id,
              section_id,
              section:section_id (id, section_name, branch, semester),
              subject:subject_id (id, subject_name, subject_code)
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
      const sessionSectionId = session?.faculty_assignment?.section_id;
      const sessionSectionName = session?.faculty_assignment?.section?.section_name || parsed.section;
      const sessionSubjectName = session?.faculty_assignment?.subject?.subject_name || parsed.className || 'Lecture';
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
      const lectureDateToSave = session?.faculty_assignment?.lec_date || parsed.lecDate || getIndianDateString();

      // 5. Duplicate & Existing Record Check
      let existingRecord = null;

      if (sessionIdToSave) {
        const { data: sessRec } = await supabase
          .from('attendance_records')
          .select('id, status, marked_at')
          .eq('session_id', sessionIdToSave)
          .eq('student_id', targetStudentId)
          .maybeSingle();
        existingRecord = sessRec;
      }

      if (!existingRecord && assignmentIdToSave) {
        const { data: assignRec } = await supabase
          .from('attendance_records')
          .select('id, status, marked_at')
          .eq('faculty_assignment_id', assignmentIdToSave)
          .eq('student_id', targetStudentId)
          .maybeSingle();
        existingRecord = assignRec;
      }

      if (existingRecord && (existingRecord.status || '').toLowerCase() === 'present') {
        const timeStr = existingRecord.marked_at 
          ? formatIndianTime(existingRecord.marked_at)
          : 'earlier in this session';
        return {
          success: false,
          isDuplicate: true,
          message: `You have already marked attendance for this lecture (recorded at ${timeStr})!`,
          record: existingRecord
        };
      }

      // Additional Check: Check if student already marked attendance for this lecture/assignment today
      if (assignmentIdToSave) {
        const { data: duplicateDateRecords } = await supabase
          .from('attendance_records')
          .select('id, status, marked_at, faculty_assignment_id, lecture_date, lec_id')
          .eq('student_id', targetStudentId)
          .eq('status', 'present');

        const alreadyMarkedToday = (duplicateDateRecords || []).find(r => 
          (r.faculty_assignment_id === assignmentIdToSave || (parsed.lecId && r.lec_id === parsed.lecId)) &&
          r.lecture_date === lectureDateToSave
        );

        if (alreadyMarkedToday) {
          const timeStr = alreadyMarkedToday.marked_at 
            ? formatIndianTime(alreadyMarkedToday.marked_at)
            : 'earlier today';
          return {
            success: false,
            isDuplicate: true,
            message: `Attendance for this class has already been recorded for today at ${timeStr}!`,
            record: alreadyMarkedToday
          };
        }
      }

      // 6. Record attendance: In-place UPDATE on existing record if it already exists (e.g. from previous absent mark)
      const recordPayload = {
        session_id: sessionIdToSave,
        student_id: targetStudentId,
        faculty_assignment_id: assignmentIdToSave,
        lec_id: parsed.lecId || null,
        lecture_date: lectureDateToSave,
        status: 'present',
        marked_at: new Date().toISOString(),
        verification_method: 'qr_scan'
      };

      if (existingRecord?.id) {
        recordPayload.id = existingRecord.id; // Instructs PostgreSQL to execute an in-place UPDATE
      }

      const { data: newRec, error: insertErr } = await supabase
        .from('attendance_records')
        .upsert([recordPayload])
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
