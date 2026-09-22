import { supabase } from '../lib/supabaseClient.js';
import { AuthService } from './authService.js';
import { getLocalDateString, formatLocalDate } from '../utils/dateUtils.js';

/**
 * Service to manage 100% Real Faculty Data & Assigned Lectures on Supabase
 */
export class FacultyService {
  /**
   * 1. Get Logged-in / Active Faculty Profile
   */
  static async getProfile() {
    try {
      const session = AuthService.getCurrentSession();
      const email = session?.user?.email;

      if (email) {
        const { data, error } = await supabase
          .from('faculty')
          .select('*')
          .ilike('email', email.trim())
          .maybeSingle();

        if (data && !error) {
          return {
            id: data.id,
            name: data.name,
            email: data.email,
            department: data.department || 'General',
            avatarInitials: data.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
          };
        }
      }

      // Check first faculty in database
      const { data: firstFac } = await supabase.from('faculty').select('*').limit(1).maybeSingle();
      if (firstFac) {
        return {
          id: firstFac.id,
          name: firstFac.name,
          email: firstFac.email,
          department: firstFac.department || 'General',
          avatarInitials: firstFac.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
        };
      }
    } catch (err) {
      console.warn('Error fetching faculty profile:', err);
    }

    return {
      id: null,
      name: 'Faculty Member',
      email: '',
      department: 'General',
      avatarInitials: 'FM'
    };
  }

  /**
   * 2. Get Today's Assigned Lectures for Faculty
   * Formats dates with exact local timezone (IST) and sorts today's lectures to the top
   */
  static async getTodayLectures(facultyId) {
    try {
      let query = supabase
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
          section_subject:section_subject_id (
            id,
            subject:subject_id (id, subject_name, subject_code),
            section:section_id (id, section_name, branch, semester, total_students)
          )
        `);

      if (facultyId) {
        query = query.eq('faculty_id', facultyId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching today lectures:', error.message);
        return [];
      }

      const todayDate = getLocalDateString();
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayDay = days[new Date().getDay()];

      const rawList = await Promise.all((data || []).map(async (a) => {
        const secSub = Array.isArray(a.section_subject) ? a.section_subject[0] : a.section_subject;
        const subObj = Array.isArray(secSub?.subject) ? secSub?.subject[0] : secSub?.subject;
        const secObj = Array.isArray(secSub?.section) ? secSub?.section[0] : secSub?.section;

        const subject = subObj?.subject_name || 'Lecture';
        const section = secObj?.section_name || 'General';
        const sectionId = secObj?.id;

        // Query real enrolled student count in students table for this section
        let count = 0;
        if (sectionId) {
          const { count: enrolledCount } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('section_id', sectionId);
          
          count = enrolledCount || secObj?.total_students || 0;
        } else {
          count = secObj?.total_students || 0;
        }

        const startTime = a.start_time ? a.start_time.slice(0, 5) : '10:00';
        const endTime = a.end_time ? a.end_time.slice(0, 5) : '11:00';
        const room = a.room_no || 'Room 201';
        const isToday = (a.lec_date === todayDate) || (a.day_of_week && a.day_of_week.toLowerCase() === todayDay.toLowerCase());
        
        const formattedDate = isToday ? formatLocalDate(todayDate) : formatLocalDate(a.lec_date);
        const dayShort = a.day_of_week ? a.day_of_week.slice(0, 3) : '';
        const shortDate = isToday ? `Today, ${formattedDate}` : `${dayShort ? `${dayShort}, ` : ''}${formattedDate}`;
        const lecId = a.lec_id || subObj?.subject_code || `LEC-${(a.id || '').slice(0, 4).toUpperCase()}`;

        return {
          id: a.id,
          lecId: lecId,
          lecDate: isToday ? todayDate : (a.lec_date || todayDate),
          shortDate: shortDate,
          className: subject,
          section: section,
          dayOfWeek: a.day_of_week,
          time: `${startTime} - ${endTime}`,
          room: room,
          studentsCount: count,
          isToday: isToday,
          startTimeVal: startTime,
          assignmentStatus: a.status || 'scheduled',
          sectionSubjectId: secSub?.id
        };
      }));

      // Sort: Today's lectures first (by start time), then other days
      rawList.sort((a, b) => {
        if (a.isToday && !b.isToday) return -1;
        if (!a.isToday && b.isToday) return 1;
        return (a.startTimeVal || '').localeCompare(b.startTimeVal || '');
      });

      // Assign badge text dynamically based on today's schedule
      let firstTodayFound = false;
      return rawList.map((l) => {
        let badgeText = l.dayOfWeek || 'Scheduled';
        let status = 'scheduled';

        if (l.isToday) {
          if (!firstTodayFound) {
            badgeText = 'Starting Soon';
            status = 'starting_soon';
            firstTodayFound = true;
          } else {
            badgeText = 'Today';
            status = 'scheduled';
          }
        }

        return {
          ...l,
          status,
          badgeText
        };
      });
    } catch (err) {
      console.error('getTodayLectures error:', err);
      return [];
    }
  }

  /**
   * 3. Get Real Faculty KPI Metrics
   */
  static async getKPIs(facultyId, lectures = []) {
    try {
      // 1. Total real students count from database
      const { count: studentCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });

      // 2. Total real sections count from database
      const { count: sectionCount } = await supabase
        .from('sections')
        .select('*', { count: 'exact', head: true });

      const lecturesTodayCount = lectures.length;
      let startingSoonText = 'No lectures scheduled';
      if (lecturesTodayCount > 0) {
        startingSoonText = `Next at ${lectures[0].time?.split(' - ')[0] || '10:00'}`;
      }

      return {
        lecturesToday: lecturesTodayCount,
        startingSoonText: startingSoonText,
        studentsEnrolled: studentCount || 0,
        sectionsCount: sectionCount || 0
      };
    } catch (err) {
      return {
        lecturesToday: lectures.length || 0,
        startingSoonText: 'No lectures scheduled',
        studentsEnrolled: 0,
        sectionsCount: 0
      };
    }
  }

  /**
  /**
   * 4. Get Real Section-wise Attendance Performance for Today's Lectures
   * Computes attendance percentage against total enrolled students in each section.
   * If a section has multiple lectures scheduled today, averages all of today's lectures.
   */
  static async getSectionAttendance(facultyId, date = null) {
    try {
      const todayDate = date || getLocalDateString();
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dateParts = todayDate.split('-').map(Number);
      const parsedDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
      const currentDay = !isNaN(parsedDate.getTime()) ? days[parsedDate.getDay()] : days[new Date().getDay()];

      // 1. Fetch all assignments belonging to this faculty member
      let assignQuery = supabase
        .from('faculty_assignment')
        .select(`
          id,
          lec_id,
          lec_date,
          day_of_week,
          start_time,
          end_time,
          section_subject:section_subject_id (
            id,
            subject:subject_id (id, subject_name, subject_code),
            section:section_id (id, section_name, branch, semester, total_students)
          )
        `);

      if (facultyId) {
        assignQuery = assignQuery.eq('faculty_id', facultyId);
      }

      const { data: assignments, error: assignErr } = await assignQuery;

      if (assignErr || !assignments || !assignments.length) {
        return [];
      }

      // 2. Group assignments by unique section
      const assignedSectionsMap = new Map();
      assignments.forEach(a => {
        const secSub = Array.isArray(a.section_subject) ? a.section_subject[0] : a.section_subject;
        const sec = Array.isArray(secSub?.section) ? secSub?.section[0] : secSub?.section;
        const sub = Array.isArray(secSub?.subject) ? secSub?.subject[0] : secSub?.subject;

        if (sec && sec.id) {
          if (!assignedSectionsMap.has(sec.id)) {
            assignedSectionsMap.set(sec.id, {
              sectionId: sec.id,
              sectionName: sec.section_name,
              branch: sec.branch || 'CSE',
              semester: sec.semester || '',
              totalStudents: sec.total_students || 0,
              assignments: [a]
            });
          } else {
            assignedSectionsMap.get(sec.id).assignments.push(a);
          }
        }
      });

      const assignedSections = Array.from(assignedSectionsMap.values());
      if (!assignedSections.length) {
        return [];
      }

      // 3. For each assigned section, evaluate today's lectures and compute accurate attendance %
      const stats = await Promise.all(
        assignedSections.map(async (sec) => {
          // A. Count total real enrolled students in this section
          const { count: realStudentsCount } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('section_id', sec.sectionId);

          const totalSectionPool = realStudentsCount || sec.totalStudents || 1;

          // B. Identify today's lectures for this section
          const scheduledTodayAssignments = sec.assignments.filter(a => {
            const dateMatch = a.lec_date === todayDate;
            const dayMatch = a.day_of_week && a.day_of_week.toLowerCase() === currentDay.toLowerCase();
            return dateMatch || dayMatch;
          });

          // Use scheduled today assignments; if none explicitly scheduled for this day, fallback to all assigned
          const targetAssignments = scheduledTodayAssignments.length > 0 
            ? scheduledTodayAssignments 
            : sec.assignments;

          // C. Calculate attendance percentage for each lecture today
          const lecturePercentages = await Promise.all(
            targetAssignments.map(async (assign) => {
              // Gather session IDs conducted today for this assignment
              const { data: todaySessions } = await supabase
                .from('attendance_sessions')
                .select('id')
                .eq('faculty_assignment_id', assign.id)
                .eq('date', todayDate);

              const sessionIds = (todaySessions || []).map(s => s.id);

              // Find unique students present for this assignment today
              const presentStudentIds = new Set();

              // 1) Check by session IDs
              if (sessionIds.length > 0) {
                const { data: sessRecords } = await supabase
                  .from('attendance_records')
                  .select('student_id')
                  .in('session_id', sessionIds)
                  .ilike('status', 'present');

                (sessRecords || []).forEach(r => presentStudentIds.add(r.student_id));
              }

              // 2) Check by faculty_assignment_id & todayDate
              const { data: assignRecords } = await supabase
                .from('attendance_records')
                .select('student_id')
                .eq('faculty_assignment_id', assign.id)
                .eq('lecture_date', todayDate)
                .ilike('status', 'present');

              (assignRecords || []).forEach(r => presentStudentIds.add(r.student_id));

              // 3) Check by lec_id if available
              if (assign.lec_id) {
                const { data: lecRecords } = await supabase
                  .from('attendance_records')
                  .select('student_id')
                  .eq('lec_id', assign.lec_id)
                  .eq('lecture_date', todayDate)
                  .ilike('status', 'present');

                (lecRecords || []).forEach(r => presentStudentIds.add(r.student_id));
              }

              const presentCount = presentStudentIds.size;
              const lecturePct = Math.min(100, Math.round((presentCount / totalSectionPool) * 100));
              return lecturePct;
            })
          );

          // D. Compute section average:
          // If 1 lecture today: that lecture's percentage
          // If >1 lectures today: average of all today's lectures
          // If no lectures scheduled today or 0 present: 0%
          let sectionAvgPct = 0;
          if (scheduledTodayAssignments.length > 0 && lecturePercentages.length > 0) {
            const sumPct = lecturePercentages.reduce((acc, curr) => acc + curr, 0);
            sectionAvgPct = Math.round(sumPct / lecturePercentages.length);
          } else if (lecturePercentages.length > 0) {
            const sumPct = lecturePercentages.reduce((acc, curr) => acc + curr, 0);
            sectionAvgPct = sumPct > 0 ? Math.round(sumPct / lecturePercentages.length) : 0;
          }

          return {
            sectionId: sec.sectionId,
            sectionName: `Section ${sec.sectionName} (${sec.branch})`,
            rawSectionName: sec.sectionName,
            percentage: sectionAvgPct,
            totalStudents: totalSectionPool,
            lecturesTodayCount: scheduledTodayAssignments.length
          };
        })
      );

      return stats;
    } catch (err) {
      console.error('getSectionAttendance error:', err);
      return [];
    }
  }

  /**
   * 5. Get Real Recent Activities from attendance_sessions
   */
  static async getRecentActivities() {
    try {
      const { data: sessions } = await supabase
        .from('attendance_sessions')
        .select(`
          id,
          date,
          status,
          started_at,
          ended_at,
          faculty_assignment (
            room_no,
            section_subject:section_subject_id (
              subject:subject_id (subject_name),
              section:section_id (section_name)
            )
          )
        `)
        .order('started_at', { ascending: false })
        .limit(5);

      if (!sessions || !sessions.length) {
        return [];
      }

      return sessions.map(s => {
        const subject = s.faculty_assignment?.section_subject?.subject?.subject_name || 'Lecture';
        const section = s.faculty_assignment?.section_subject?.section?.section_name || '';
        const isCompleted = s.status === 'completed';
        const timeAgo = s.started_at ? new Date(s.started_at).toLocaleDateString() : 'Today';

        return {
          title: isCompleted ? `QR session closed for ${subject} - Sec ${section}` : `Active QR session in ${subject} - Sec ${section}`,
          time: timeAgo,
          type: isCompleted ? 'completed' : 'active'
        };
      });
    } catch (err) {
      console.error('getRecentActivities error:', err);
      return [];
    }
  }

  /**
   * 6. Calculate Overall Attendance Average across today's sections
   */
  static calculateOverallAverage(sectionList) {
    if (!sectionList || !sectionList.length) return 0;
    const activeSections = sectionList.filter(s => (s.lecturesTodayCount && s.lecturesTodayCount > 0) || s.percentage > 0);
    const targetPool = activeSections.length > 0 ? activeSections : sectionList;
    const sum = targetPool.reduce((acc, curr) => acc + curr.percentage, 0);
    return Math.round(sum / targetPool.length);
  }
}
